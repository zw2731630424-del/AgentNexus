import { canonical, invariant } from '../types.ts';
import { identifier, snapshot, subject as validateSubject } from '../harness/contracts.ts';
import type { Subject } from '../harness/contracts.ts';
import type { NativeState } from '../harness/state.ts';
import { add, CAPACITY_KEYS, heldFor, RESOURCE_KEYS, RESOURCE_LIMITS, vector } from './contracts.ts';
import type { Accounting, Budget, BudgetInput, Closure, ClosureKind, Reservation, ReserveInput, ResourceKey } from './contracts.ts';
import { assertStrictCpuQualified } from './registry.ts';

const BUDGET='resource_budget', RESERVATION='resource_reservation', CLOSURE='resource_closure';
const FEATURES=['resource.registry','resource.worker.budget','resource.project.budget','resource.platform.budget'] as const;
type TokenBinding={closure:string;reservation:string;revision:number;operation:string;boot:string};
/** Trusted projection owner. No method grants OS execution or releases historical claims. */
export class BudgetManager {
  #state:NativeState; #closures=new WeakMap<object,TokenBinding>();
  constructor(state:NativeState){this.#state=state;}
  #admin(admin:unknown,subject:Subject):void{this.#state.checkAdmin(admin);validateSubject(subject);}
  #enabled(subject:Subject):void{for(const f of FEATURES)this.#state.require(f,subject);}
  #reservation(id:string,subject:Subject):Reservation {
    const r=this.#state.get<Reservation>(RESERVATION,id);invariant(r,'RESOURCE_RESERVATION_UNKNOWN');
    invariant(canonical(r.subject)===canonical(subject),'RESOURCE_SUBJECT_MISMATCH');return r;
  }
  #budgets(r:Reservation):Budget[]{
    const ids=[r.budget_ids.worker,r.budget_ids.project,r.budget_ids.platform];
    invariant(new Set(ids).size===3,'RESOURCE_BUDGET_SCOPE');
    return ids.map((id,index)=>{const b=this.#state.get<Budget>(BUDGET,id);invariant(b&&b.scope===['WORKER','PROJECT','PLATFORM'][index]&&b.owner_id===[r.subject.runtime_instance_id,r.subject.project_id,'platform'][index],'RESOURCE_BUDGET_SCOPE');return b;});
  }
  #save(r:Reservation,changes:Partial<Reservation>):Reservation {const next=snapshot({...r,...changes,revision:r.revision+1});this.#state.update(RESERVATION,r.id,r.revision,next.state,next);return next;}
  #saveBudget(b:Budget,changes:Partial<Budget>):void {const next={...b,...changes,revision:b.revision+1};this.#state.update(BUDGET,b.id,b.revision,next.state,next);}
  #uniqueOwner(scope:Budget['scope'],owner:string):void {
    let after:string|undefined;for(;;){const rows=this.#state.list<Budget>(BUDGET,{...(after?{after}:{}),limit:RESOURCE_LIMITS.page});if(!rows.length)return;
      invariant(!rows.some(b=>b.scope===scope&&b.owner_id===owner),'RESOURCE_BUDGET_OWNER_EXISTS');after=rows[rows.length-1].id;
    }
  }
  #fits(r:Reservation,budgets:Budget[]):boolean{return budgets.every(b=>b.state==='OPEN'&&RESOURCE_KEYS.every(k=>add(add(b.spent[k],b.held[k]),r.amounts[k])<=b.limits[k]));}
  #hold(r:Reservation,budgets:Budget[]):void {for(const b of budgets){const held={...b.held};for(const k of RESOURCE_KEYS)held[k]=add(held[k],r.amounts[k]);this.#saveBudget(b,{held});}}
  async configure(admin:unknown,subject:Subject,input:BudgetInput):Promise<Budget>{
    this.#admin(admin,subject);this.#enabled(subject);const p=snapshot(input);identifier(p.id);identifier(p.owner_id);
    invariant(['WORKER','PROJECT','PLATFORM'].includes(p.scope)&&p.owner_id===(p.scope==='WORKER'?subject.runtime_instance_id:p.scope==='PROJECT'?subject.project_id:'platform'),'RESOURCE_BUDGET_SCOPE');
    if(p.scope==='WORKER')invariant(p.id===subject.resource_budget_id,'RESOURCE_BUDGET_BINDING');
    const limits=vector(p.limits);
    return this.#state.change(subject,'RESOURCE_BUDGET_CONFIGURED',()=>{this.#enabled(subject);const existing=this.#state.get<Budget>(BUDGET,p.id);if(existing){invariant(existing.scope===p.scope&&existing.owner_id===p.owner_id&&canonical(existing.limits)===canonical(limits),'RESOURCE_BUDGET_IMMUTABLE');return existing;}
      invariant(this.#state.count(BUDGET)<RESOURCE_LIMITS.budgets,'RESOURCE_BUDGET_LIMIT');this.#uniqueOwner(p.scope,p.owner_id);const b:Budget={id:p.id,revision:0,scope:p.scope,owner_id:p.owner_id,limits,held:vector(),spent:vector(),state:'OPEN'};this.#state.insert(BUDGET,p.id,subject,b.state,b);return snapshot(b);},{budget_id:p.id,scope:p.scope});
  }
  inspect(admin:unknown,subject:Subject,id:string):Reservation{this.#admin(admin,subject);return this.#reservation(id,subject);}
  budget(admin:unknown,id:string):Budget{this.#state.checkAdmin(admin);const b=this.#state.get<Budget>(BUDGET,id);invariant(b,'RESOURCE_BUDGET_UNKNOWN');return b;}
  async reserve(admin:unknown,subject:Subject,input:ReserveInput):Promise<Reservation>{
    this.#admin(admin,subject);this.#enabled(subject);const p=snapshot(input);for(const id of [p.id,p.operation_id,p.worker_budget_id,p.project_budget_id,p.platform_budget_id])identifier(id);
    invariant(p.worker_budget_id===subject.resource_budget_id,'RESOURCE_BUDGET_BINDING');
    invariant(['SIMULATED','APPLICATION_BOUND','STRICT_OS'].includes(p.mode)&&typeof p.wait==='boolean','RESOURCE_MODE');if(p.mode==='STRICT_OS')assertStrictCpuQualified('ANY');
    invariant(Number.isSafeInteger(p.expires_at)&&p.expires_at>Date.now(),'RESOURCE_EXPIRED');const amounts=vector(p.amounts);
    if(amounts.cpu_user_us||amounts.cpu_kernel_us)this.#state.require('resource.cpu.accounting',subject);
    const r:Reservation={id:p.id,revision:0,state:'RESERVED',subject:snapshot(subject),operation_id:p.operation_id,boot_id:this.#state.boot_id,mode:p.mode,budget_ids:{worker:p.worker_budget_id,project:p.project_budget_id,platform:p.platform_budget_id},amounts,accounted:vector(),sequence:0,expires_at:p.expires_at,reason:null,last_evidence_hash:null,accounting_complete:false,accounting_source:null};
    return this.#state.change(subject,'RESOURCE_RESERVED',()=>{this.#enabled(subject);invariant(p.expires_at>Date.now(),'RESOURCE_EXPIRED');invariant(!this.#state.get(RESERVATION,p.id),'RESOURCE_RESERVATION_REPLAY');
      invariant(this.#state.count(RESERVATION)<RESOURCE_LIMITS.reservations,'RESOURCE_RESERVATION_LIMIT');const budgets=this.#budgets(r);
      if(this.#fits(r,budgets))this.#hold(r,budgets);else{r.state=p.wait?'WAITING':'REJECTED';r.reason='INSUFFICIENT_BUDGET';if(p.wait)invariant(this.#state.count(RESERVATION,{state:'WAITING'})<RESOURCE_LIMITS.waiting,'RESOURCE_WAIT_LIMIT');}
      this.#state.insert(RESERVATION,r.id,subject,r.state,r);return snapshot(r);},{reservation_id:r.id,budget_ids:r.budget_ids,mode:r.mode,os_execution_authorized:false},p.operation_id);
  }
  async start(admin:unknown,subject:Subject,id:string):Promise<Reservation>{
    this.#admin(admin,subject);this.#enabled(subject);const operation=this.#reservation(id,subject).operation_id;
    return this.#state.change(subject,'RESOURCE_STARTED',()=>{this.#enabled(subject);const r=this.#reservation(id,subject);invariant(r.state==='RESERVED'&&r.boot_id===this.#state.boot_id&&r.expires_at>Date.now(),'RESOURCE_START_STATE');if(r.amounts.cpu_user_us||r.amounts.cpu_kernel_us)this.#state.require('resource.cpu.accounting',subject);invariant(this.#budgets(r).every(b=>b.state==='OPEN'),'RESOURCE_BUDGET_OVERDRAWN');return this.#save(r,{state:'ACTIVE'});},{reservation_id:id,os_execution_authorized:false},operation);
  }
  async account(admin:unknown,subject:Subject,id:string,input:Accounting):Promise<Reservation>{
    this.#admin(admin,subject);const p=snapshot(input),values=vector(p.values);invariant(Number.isSafeInteger(p.sequence)&&p.sequence>0&&typeof p.complete==='boolean'&&/^[a-f0-9]{64}$/.test(p.evidence_hash),'RESOURCE_ACCOUNTING');
    invariant(['SIMULATED','TRUSTED_APPLICATION','WINDOWS_JOB','LINUX_CGROUP'].includes(p.source),'RESOURCE_ACCOUNTING_SOURCE');const operation=this.#reservation(id,subject).operation_id;
    return this.#state.change(subject,'RESOURCE_ACCOUNTED',()=>{const r=this.#reservation(id,subject);invariant(['ACTIVE','UNKNOWN_QUARANTINED'].includes(r.state)&&r.boot_id===this.#state.boot_id&&p.sequence===r.sequence+1,'RESOURCE_ACCOUNTING_SEQUENCE');
      invariant((r.mode==='SIMULATED')===(p.source==='SIMULATED'),'RESOURCE_ACCOUNTING_SOURCE');for(const k of RESOURCE_KEYS)invariant(values[k]>=r.accounted[k],'RESOURCE_ACCOUNTING_ROLLBACK');
      const over=RESOURCE_KEYS.some(k=>values[k]>r.amounts[k]);const next={...r,accounted:values};
      for(const b of this.#budgets(r)){const held={...b.held},spent={...b.spent};for(const k of RESOURCE_KEYS){if(!CAPACITY_KEYS.includes(k)){spent[k]=add(spent[k],values[k]-r.accounted[k]);held[k]-=heldFor(r,k)-heldFor(next,k);invariant(held[k]>=0,'RESOURCE_LEDGER_CORRUPT');}}
        const drawn=over||RESOURCE_KEYS.some(k=>add(spent[k],held[k])>b.limits[k]);this.#saveBudget(b,{held,spent,state:drawn?'OVERDRAWN':b.state});}
      return this.#save(r,{accounted:values,sequence:p.sequence,state:over?'UNKNOWN_QUARANTINED':r.state,reason:over?'OBSERVED_OVER_BUDGET':r.reason,last_evidence_hash:p.evidence_hash,accounting_complete:p.complete,accounting_source:p.source});
    },{reservation_id:id,source:p.source,evidence_hash:p.evidence_hash,complete:p.complete},operation);
  }
  async unknown(admin:unknown,subject:Subject,id:string,reason:string):Promise<Reservation>{
    this.#admin(admin,subject);invariant(typeof reason==='string'&&reason.length>=1&&reason.length<=1024,'RESOURCE_REASON');const operation=this.#reservation(id,subject).operation_id;
    return this.#state.change(subject,'RESOURCE_UNKNOWN',()=>{const r=this.#reservation(id,subject);invariant(['RESERVED','ACTIVE','UNKNOWN_QUARANTINED'].includes(r.state),'RESOURCE_UNKNOWN_STATE');return this.#save(r,{state:'UNKNOWN_QUARANTINED',reason});},{reservation_id:id,reason,capacity_released:false},operation);
  }
  async issueClosure(admin:unknown,subject:Subject,id:string,kind:ClosureKind):Promise<object>{
    this.#admin(admin,subject);invariant(['NEVER_STARTED','SIMULATED_SETTLED'].includes(kind),'RESOURCE_CLOSURE_KIND');const token=Object.freeze({}),operation=this.#reservation(id,subject).operation_id;
    const c=await this.#state.change(subject,'RESOURCE_CLOSURE_ISSUED',()=>{const r=this.#reservation(id,subject);invariant(r.boot_id===this.#state.boot_id,'RESOURCE_OLD_BOOT');
      invariant(kind==='NEVER_STARTED'?r.state==='RESERVED':r.state==='ACTIVE'&&r.mode==='SIMULATED'&&r.accounting_complete&&r.accounting_source==='SIMULATED','RESOURCE_CLOSURE_UNVERIFIED');
      invariant(this.#state.count(CLOSURE)<RESOURCE_LIMITS.closures,'RESOURCE_CLOSURE_LIMIT');invariant(!this.#state.get(CLOSURE,id),'RESOURCE_CLOSURE_ALREADY_ISSUED');
      const closure:Closure={id,revision:0,reservation_id:id,reservation_revision:r.revision,operation_id:r.operation_id,boot_id:r.boot_id,kind,state:'ISSUED'};this.#state.insert(CLOSURE,closure.id,subject,closure.state,closure);return closure;},{reservation_id:id,kind,production_release_authority:false},operation);
    this.#closures.set(token,{closure:c.id,reservation:id,revision:c.reservation_revision,operation:c.operation_id,boot:c.boot_id});return token;
  }
  async release(admin:unknown,subject:Subject,id:string,token:object):Promise<Reservation>{
    this.#admin(admin,subject);const binding=this.#closures.get(token);invariant(binding&&binding.reservation===id&&binding.boot===this.#state.boot_id,'RESOURCE_CLOSURE_REQUIRED');
    const result=await this.#state.change(subject,'RESOURCE_RELEASED',()=>{const r=this.#reservation(id,subject),c=this.#state.get<Closure>(CLOSURE,binding.closure);
      invariant(c&&c.state==='ISSUED'&&r.revision===binding.revision&&r.operation_id===binding.operation&&r.boot_id===binding.boot&&c.reservation_revision===r.revision&&c.operation_id===r.operation_id,'RESOURCE_CLOSURE_STALE');
      invariant(c.kind==='NEVER_STARTED'?r.state==='RESERVED':r.state==='ACTIVE'&&r.mode==='SIMULATED'&&r.accounting_complete,'RESOURCE_CLOSURE_UNVERIFIED');
      for(const b of this.#budgets(r)){const held={...b.held};for(const k of RESOURCE_KEYS){held[k]-=heldFor(r,k);invariant(held[k]>=0,'RESOURCE_LEDGER_CORRUPT');}this.#saveBudget(b,{held});}
      this.#state.update(CLOSURE,c.id,c.revision,'CONSUMED',{...c,state:'CONSUMED',revision:c.revision+1});return this.#save(r,{state:'RELEASED',reason:null});
    },{reservation_id:id,closure_id:binding.closure,production_release_authority:false},binding.operation);this.#closures.delete(token);return result;
  }
  async releaseProduction(admin:unknown,subject:Subject,_id:string,_evidence:unknown):Promise<never>{this.#admin(admin,subject);invariant(false,'M16_PRODUCTION_RESOURCE_RELEASE_BLOCKED');}
  async cancelWait(admin:unknown,subject:Subject,id:string,reason='CANCELLED'):Promise<Reservation>{
    this.#admin(admin,subject);invariant(typeof reason==='string'&&reason.length>=1&&reason.length<=1024,'RESOURCE_REASON');const operation=this.#reservation(id,subject).operation_id;
    return this.#state.change(subject,'RESOURCE_WAIT_CANCELLED',()=>{const r=this.#reservation(id,subject);invariant(r.state==='WAITING','RESOURCE_WAIT_CANCEL_STATE');return this.#save(r,{state:'REJECTED',reason});},{reservation_id:id,reason,held_changed:false},operation);
  }
  async drainWaiters(admin:unknown,subject:Subject,limit:number=RESOURCE_LIMITS.page):Promise<Reservation[]>{
    this.#admin(admin,subject);this.#enabled(subject);invariant(Number.isSafeInteger(limit)&&limit>0&&limit<=RESOURCE_LIMITS.page,'RESOURCE_PAGE_LIMIT');
    const changed:Reservation[]=[];for(const row of this.#state.list<Reservation>(RESERVATION,{project_id:subject.project_id,agent_id:subject.agent_id,task_id:subject.task_id,state:'WAITING',limit})){
      if(canonical(row.subject)!==canonical(subject))continue;
      const result=await this.#state.change(subject,'RESOURCE_WAIT_DRAINED',()=>{this.#enabled(subject);const r=this.#reservation(row.id,subject);if(r.state!=='WAITING')return null;
        if(r.boot_id!==this.#state.boot_id||r.expires_at<=Date.now())return this.#save(r,{state:'REJECTED',reason:r.boot_id!==this.#state.boot_id?'OLD_BOOT_WAIT':'WAIT_EXPIRED'});
        const budgets=this.#budgets(r);if(!this.#fits(r,budgets))return null;this.#hold(r,budgets);return this.#save(r,{state:'RESERVED',reason:null});
      },{reservation_id:row.id,budget_ids:row.budget_ids},row.operation_id);if(result)changed.push(result);
    }return changed;
  }
  async recover(admin:unknown,subject:Subject):Promise<number>{
    this.#admin(admin,subject);let after:string|undefined,total=0;
    for(;;){const rows=this.#state.list<Reservation>(RESERVATION,{...(after?{after}:{}),limit:RESOURCE_LIMITS.page});if(!rows.length)break;
      for(const row of rows){if(row.boot_id===this.#state.boot_id||!['WAITING','RESERVED','ACTIVE'].includes(row.state))continue;
        total+=await this.#state.change(row.subject,'RESOURCE_RECOVERED',()=>{const r=this.#state.get<Reservation>(RESERVATION,row.id)!;
          if(r.boot_id===this.#state.boot_id||!['WAITING','RESERVED','ACTIVE'].includes(r.state))return 0;
          this.#save(r,{state:r.state==='WAITING'?'REJECTED':'UNKNOWN_QUARANTINED',reason:r.state==='WAITING'?'OLD_BOOT_WAIT':'HOST_RESTART_REQUIRES_OWNER_RECONCILIATION'});return 1;
        },{reservation_id:row.id,budget_ids:row.budget_ids,capacity_released:false,automatic_retry:false},row.operation_id);
      }after=rows[rows.length-1].id;
    }return total;
  }
}
