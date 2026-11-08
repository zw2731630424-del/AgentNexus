import { canonical, invariant, NexusError, uid } from '../types.ts';
import { performance } from 'node:perf_hooks';
import { snapshot, profileHash, sameProcess, validateLogical, validateProcess } from '../runtime/contracts.ts';
import type { LogicalIdentity, ProcessIdentity, SandboxProfile } from '../runtime/contracts.ts';
import type { KernelStore } from '../storage.ts';
import { clockFor } from '../control.ts';
import { ProductionAudit } from './audit.ts';
import { json, validateRuntime } from './contracts.ts';
import type { Assurance, Runtime } from './contracts.ts';

export type PinnedProcess = { process: ProcessIdentity; parent: ProcessIdentity; alive: boolean; profile_hash: string; assurance: Assurance };
export interface IdentityObserver {
  // Only a trusted Supervisor can mint these handles; the untrusted API takes no PID/SID.
  inspect(handle: object,signal?:AbortSignal): Promise<PinnedProcess>;
}
export class ProductionIdentityRegistry {
  #handles=new Map<string,object>(); #audit:ProductionAudit;
  #observations=new Set<Promise<PinnedProcess>>();#closed=false;#pendingBinds=0;#shutdown=new AbortController();
  readonly boot_id:string;
  readonly store:KernelStore;readonly observer:IdentityObserver;
  constructor(store:KernelStore,observer:IdentityObserver) {
    this.store=store;this.observer=observer;
    this.boot_id=clockFor(store).boot_id;this.#audit=new ProductionAudit(store);
    store.db.exec('CREATE TABLE IF NOT EXISTS m14_identities(id TEXT PRIMARY KEY,body TEXT NOT NULL);');
  }
  async bind(logical:LogicalIdentity,handle:object,profile:SandboxProfile,brokerBoot:string):Promise<Runtime> {
    invariant(!this.#closed&&this.#pendingBinds<32,'M14_IDENTITY_BACKPRESSURE');this.#pendingBinds++;
    try{return await this.#bind(logical,handle,profile,brokerBoot);}finally{this.#pendingBinds--;}
  }
  async #bind(logical:LogicalIdentity,handle:object,profile:SandboxProfile,brokerBoot:string):Promise<Runtime> {
    const l=snapshot(logical),p=snapshot(profile);validateLogical(l);const ph=profileHash(p);
    invariant(this.#handles.size<32,'M14_IDENTITY_LIMIT');
    const observed=snapshot(await this.#observe(handle)); validateProcess(observed.process);validateProcess(observed.parent);
    invariant(observed.alive && observed.profile_hash===ph,'M14_PROCESS_NOT_PINNED');
    const generation=Number((this.store.db.prepare("SELECT COALESCE(MAX(json_extract(body,'$.generation')),0)+1 n FROM m14_identities").get() as any).n);
    const r:Runtime={runtime_id:uid(),logical:l,process:observed.process,parent:observed.parent,worker_instance_id:uid(),host_boot_id:this.boot_id,broker_boot_id:brokerBoot,generation,profile:p,profile_hash:ph,state:'ACTIVE',assurance:observed.assurance};
    validateRuntime(r);
    this.store.transaction(()=>{
      invariant(!this.#closed&&this.#handles.size<32,'M14_IDENTITY_LIMIT');
      invariant(!this.store.db.prepare("SELECT 1 FROM m14_identities WHERE json_extract(body,'$.process.pid')=? AND json_extract(body,'$.state')='ACTIVE'").get(r.process.pid),'M14_PROCESS_ALREADY_BOUND');
      this.store.db.prepare('INSERT INTO m14_identities VALUES(?,?)').run(r.runtime_id,canonical(r));
      this.#audit.record('worker','IDENTITY_BOUND',r,r.runtime_id,json({assurance:r.assurance}));
    });
    this.#handles.set(r.runtime_id,handle);await this.#audit.barrier(); return snapshot(r);
  }
  inspect(id:string):Runtime {
    invariant(!this.#closed,'M14_IDENTITY_CLOSED');
    const row=this.store.db.prepare('SELECT body FROM m14_identities WHERE id=?').get(id) as any;
    invariant(row,'M14_RUNTIME_UNKNOWN');const r=JSON.parse(row.body) as Runtime;validateRuntime(r);return snapshot(r);
  }
  async recheck(id:string):Promise<Runtime> {
    const r=this.inspect(id),handle=this.#handles.get(id);
    invariant(r.state==='ACTIVE' && r.host_boot_id===this.boot_id && handle,'M14_IDENTITY_REVOKED');
    const actual=await this.#observe(handle);
    if(!actual.alive || !sameProcess(r.process,actual.process) || !sameProcess(r.parent,actual.parent) || actual.profile_hash!==r.profile_hash || actual.assurance!==r.assurance){
      await this.revoke(id,'OS_IDENTITY_REPLACED'); invariant(false,'M14_OS_IDENTITY_CHANGED');
    }
    invariant(this.inspect(id).state==='ACTIVE','M14_IDENTITY_REVOKED');return r;
  }
  async revoke(id:string,reason:string):Promise<void> {
    const r=this.inspect(id); this.#handles.delete(id);
    this.store.transaction(()=>{
      this.store.db.prepare('UPDATE m14_identities SET body=? WHERE id=?').run(canonical({...r,state:'REVOKED'}),id);
      this.#audit.record('worker','REVOKED',r,id,json({reason}));
    });await this.#audit.barrier();
  }
  async recover():Promise<void> {
    let after='';
    while(true){
      const rows=this.store.db.prepare('SELECT id,body FROM m14_identities WHERE id>? ORDER BY id LIMIT 32').all(after) as any[];
      if(!rows.length)break;
      this.store.transaction(()=>{for(const row of rows){const r=JSON.parse(row.body) as Runtime;if(r.host_boot_id!==this.boot_id && r.state==='ACTIVE'){
        this.store.db.prepare('UPDATE m14_identities SET body=? WHERE id=?').run(canonical({...r,state:'UNKNOWN_QUARANTINED'}),row.id);
        this.#audit.record('reconciliation','UNKNOWN_QUARANTINED',r,row.id,json({process:'UNKNOWN',job:'UNKNOWN',output:'UNKNOWN',sandbox:'UNKNOWN',automatic_retry:false}));
      }after=row.id;}});await this.#audit.barrier();
    }
  }
  async #observe(handle:object):Promise<PinnedProcess>{
    invariant(!this.#closed&&this.#observations.size<32,'M14_IDENTITY_OBSERVER_LIMIT');const cancel=new AbortController(),deadline=performance.now()+2000;
    const abort=()=>cancel.abort(new NexusError('M14_IDENTITY_CLOSED'));this.#shutdown.signal.addEventListener('abort',abort,{once:true});
    const native=Promise.resolve().then(()=>{cancel.signal.throwIfAborted();return this.observer.inspect(handle,cancel.signal);});this.#observations.add(native);
    void native.then(()=>this.#observations.delete(native),()=>this.#observations.delete(native));
    let timer:ReturnType<typeof setTimeout>|undefined;
    const timed=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{reject(new NexusError('M14_IDENTITY_DEADLINE'));cancel.abort();},2000);});
    const closed=new Promise<never>((_,reject)=>{cancel.signal.addEventListener('abort',()=>reject(new NexusError('M14_IDENTITY_CLOSED')),{once:true});});
    try{const value=await Promise.race([native,timed,closed]);invariant(!this.#closed&&performance.now()<deadline,'M14_IDENTITY_DEADLINE');return value;}
    finally{clearTimeout(timer);this.#shutdown.signal.removeEventListener('abort',abort);}
  }
  close():void{this.#closed=true;this.#shutdown.abort();this.#handles.clear();}
  stats(){return {pending_binds:this.#pendingBinds,unsettled:this.#observations.size};}
}
