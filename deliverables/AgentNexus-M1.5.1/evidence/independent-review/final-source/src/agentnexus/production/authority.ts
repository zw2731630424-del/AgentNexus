import type { KeyObject } from 'node:crypto';
import { canonical, invariant, NexusError, sha256, uid, validateIdentity } from '../types.ts';
import type { Identity } from '../types.ts';
import type { ToolRequest } from '../gateway.ts';
import type { KernelStore } from '../storage.ts';
import type { FeatureRegistry } from '../features.ts';
import type { PolicyEngine } from '../policy.ts';
import { clockFor, metadata } from '../control.ts';
import { keys, snapshot } from '../runtime/contracts.ts';
import { ProductionIdentityRegistry } from './identity.ts';
import { ProductionAudit } from './audit.ts';
import { DeadlineGuard, grantMatches, json, nonce, productionIntent, REQUIRED_FEATURES, RESOURCE_KINDS, signed, validateGrant } from './contracts.ts';
import type { Grant, Runtime, Signed, Tool } from './contracts.ts';

/** Trusted Host owner. Never serialized or handed to an Agent/Worker. */
export class ProductionGateway {
  #audit:ProductionAudit; #tools:Map<string,Tool>; #leases=new Map<string,ReturnType<FeatureRegistry['acquire']>[]>();
  #deadlines=new DeadlineGuard();
  #pending=0;
  #preparedOwner:((grant:Grant)=>void)|undefined;
  readonly store:KernelStore;readonly features:FeatureRegistry;readonly policy:PolicyEngine;
  readonly identities:ProductionIdentityRegistry;readonly key:KeyObject;readonly slots:number;
  constructor(store:KernelStore,features:FeatureRegistry,policy:PolicyEngine,
    identities:ProductionIdentityRegistry,key:KeyObject,tools:Tool[],slots=4,preparedOwner?:(grant:Grant)=>void) {
    this.store=store;this.features=features;this.policy=policy;this.identities=identities;this.key=key;this.slots=slots;
    this.#audit=new ProductionAudit(store);this.#tools=new Map(tools.map(t=>[t.id,snapshot(t)]));
    this.#preparedOwner=preparedOwner;
    invariant(this.#tools.size===tools.length && Number.isSafeInteger(slots)&&slots>0&&slots<=16,'M14_CATALOG');
    for(const t of tools){invariant(t.policy_ids.length>0,'M14_POLICY_REQUIRED');policy.validateSelection(t.policy_ids);}
    store.db.exec(`
      CREATE TABLE IF NOT EXISTS m14_host_operations(operation TEXT PRIMARY KEY,runtime TEXT UNIQUE NOT NULL,boot TEXT NOT NULL,state TEXT NOT NULL,grant_body TEXT NOT NULL,inflight INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS m14_host_resources(resource TEXT NOT NULL,kind TEXT NOT NULL,operation TEXT NOT NULL,state TEXT NOT NULL,revision INTEGER NOT NULL,PRIMARY KEY(resource,kind));
      CREATE TABLE IF NOT EXISTS m14_release_authorizations(operation TEXT PRIMARY KEY,proof_hash TEXT NOT NULL,profile_hash TEXT NOT NULL,boot TEXT NOT NULL,resource_versions TEXT NOT NULL,consumed INTEGER NOT NULL DEFAULT 0);
    `);
  }
  #enabled(r:Runtime,tool:Tool):void {
    const scope={project_id:r.logical.project_id,agent_id:r.logical.agent_id,task_id:r.logical.task_id};
    for(const f of [...REQUIRED_FEATURES,tool.feature_id])invariant(this.features.resolve(f,scope).effective==='ON','M14_FEATURE_BLOCKED');
  }
  preview(identity:Identity,request:ToolRequest,runtimeId:string) {
    validateIdentity(identity);const r=this.identities.inspect(runtimeId);
    invariant(canonical(identity)===canonical({agent_id:r.logical.agent_id,project_id:r.logical.project_id,task_id:r.logical.task_id,session_id:r.logical.session_id}),'M14_LOGICAL_SCOPE');
    const req=snapshot(request);invariant(Object.keys(req).every(k=>['call_id','tool_id','tool_version','arguments','resource_id','approval_id','expected_feature_epoch','expected_policy_epoch'].includes(k)),'M14_REQUEST_FIELDS');
    invariant(typeof req.call_id==='string'&&/^[A-Za-z0-9_.:-]{1,128}$/.test(req.call_id),'INVALID_CALL_ID');
    const t=this.#tools.get(req.tool_id);invariant(t && t.version===req.tool_version && t.profile_hash===r.profile_hash,'M14_TOOL_PROFILE');
    invariant(typeof req.resource_id==='string'&&req.resource_id.startsWith(identity.project_id+':')&&req.resource_id.length<=256,'EXACT_RESOURCE_REQUIRED');
    return snapshot({intent_hash:productionIntent(identity,req,r),runtime:r,request:req,tool:t});
  }
  async issue(identity:Identity,request:ToolRequest,runtimeId:string):Promise<Signed<Grant>> {
    invariant(this.#pending<16,'M14_HOST_BACKPRESSURE');this.#pending++;
    try{return await this.#issue(identity,request,runtimeId);}finally{this.#pending--;}
  }
  async #issue(identity:Identity,request:ToolRequest,runtimeId:string):Promise<Signed<Grant>> {
    const p=this.preview(snapshot(identity),request,runtimeId),r=p.runtime,req=p.request,t=p.tool;
    await this.identities.recheck(runtimeId);this.#enabled(r,t);
    invariant(req.approval_id && this.policy.approvalValid(req.approval_id,p.intent_hash,identity),'SIDE_EFFECT_APPROVAL_REQUIRED');
    const scope={project_id:identity.project_id,agent_id:identity.agent_id,task_id:identity.task_id};
    const decision=this.policy.evaluate(t.policy_ids,{identity,intent_hash:p.intent_hash,approval_id:req.approval_id});
    invariant(decision.allowed,'POLICY_DENIED');
    const op=uid(),permit=uid(),lease=clockFor(this.store).issue(30000),m=metadata(this.store);
    invariant(req.expected_feature_epoch===undefined||req.expected_feature_epoch===m.feature_epoch,'FEATURE_EPOCH_STALE');
    invariant(req.expected_policy_epoch===undefined||req.expected_policy_epoch===m.policy_epoch,'POLICY_EPOCH_STALE');
    const approval=this.store.db.prepare('SELECT expires_at FROM control_approvals WHERE id=?').get(req.approval_id) as any;
    const g:Grant={schema:'agentnexus/remote-permit/1',permit_id:permit,approval_id:req.approval_id,operation_id:op,intent_hash:p.intent_hash,logical:r.logical,
      runtime_id:r.runtime_id,worker_instance_id:r.worker_instance_id,host_boot_id:r.host_boot_id,broker_boot_id:r.broker_boot_id,generation:r.generation,
      process:r.process,parent:r.parent,tool_id:t.id,tool_version:t.version,resource_id:req.resource_id!,profile_hash:r.profile_hash,
      policy_epoch:m.policy_epoch,feature_epoch:m.feature_epoch,issued_at:lease.issued_wall,expires_at:Math.min(lease.expires_at,approval.expires_at),nonce:nonce(),arguments_hash:sha256(canonical(req.arguments))};
    validateGrant(g); const leases=[this.features.acquire('runtime.broker.production',scope)];let committed=false;
    try{
      leases.push(this.features.acquire(t.feature_id,scope));
      this.store.transaction(()=>{
        this.#enabled(r,t);this.policy.assertModesCurrent(t.policy_ids,identity.project_id,m.policy_epoch);
        grantMatches(g,this.identities.inspect(runtimeId),metadata(this.store));
        invariant(this.policy.approvalValid(req.approval_id,p.intent_hash,identity),'APPROVAL_INVALID');
        invariant(!this.store.db.prepare('SELECT 1 FROM control_operations WHERE request_key=?').get(canonical({identity,call_id:req.call_id})),'DUPLICATE_OPERATION');
        invariant(!this.store.db.prepare('SELECT 1 FROM control_writers WHERE resource=?').get(req.resource_id!),'WORKSPACE_BUSY');
        invariant(Number((this.store.db.prepare("SELECT COUNT(*) n FROM m14_host_resources WHERE kind='PROCESS_SLOT' AND state<>'RELEASED'").get() as any).n)<this.slots,'M14_WORKER_QUOTA');
        this.#preparedOwner?.(g);
        this.store.db.prepare("INSERT INTO control_operations(operation_id,request_key,intent_hash,subject,state,permit_id,workspace,executor_state) VALUES(?,?,?,?,?,?,?,'UNKNOWN')").run(op,canonical({identity,call_id:req.call_id}),p.intent_hash,identity.agent_id,'CLAIMED',permit,req.resource_id!);
        this.store.db.prepare('INSERT INTO control_permits(id,operation_id,intent_hash,subject,expires_at,feature_epoch,policy_epoch,consumed,boot_id,deadline_mono,issued_wall) VALUES(?,?,?,?,?,?,?,1,?,?,?)').run(permit,op,p.intent_hash,identity.agent_id,g.expires_at,m.feature_epoch,m.policy_epoch,lease.boot_id,lease.deadline_mono,lease.issued_wall);
        invariant(this.store.db.prepare('UPDATE control_approvals SET consumed=1 WHERE id=? AND consumed=0').run(req.approval_id!).changes===1,'APPROVAL_REPLAY');
        this.store.db.prepare('INSERT INTO control_writers VALUES(?,?,?)').run(req.resource_id!,op,m.feature_epoch+1);
        this.store.db.prepare('INSERT INTO m14_host_operations(operation,runtime,boot,state,grant_body) VALUES(?,?,?,?,?)').run(op,runtimeId,this.identities.boot_id,'CLAIMED',canonical(g));
        for(const kind of RESOURCE_KINDS)invariant(this.store.db.prepare("INSERT INTO m14_host_resources VALUES(?,?,?,?,0) ON CONFLICT(resource,kind) DO UPDATE SET operation=excluded.operation,state='HELD',revision=m14_host_resources.revision+1 WHERE m14_host_resources.state='RELEASED'").run(kind==='WRITER'||kind==='WORKSPACE_LOCK'?req.resource_id!:r.worker_instance_id,kind,op,'HELD').changes===1,'M15_RESOURCE_BUSY');
        this.#audit.record('host','REMOTE_PERMIT_CONSUMED',g,op,json({decision,request_hash:sha256(canonical(req)),automatic_retry:false}),g.resource_id);
      });committed=true;
      this.#leases.set(op,leases); await this.#audit.barrier();
      // Peer identity may have changed during the durable barrier. An uncertain authorization stays consumed.
      await this.identities.recheck(runtimeId);this.fence(g);
      const packet=signed(g,this.key);
      this.#audit.record('host','PERMIT_BRIDGED',g,op,json({grant_hash:sha256(canonical(packet))}),g.resource_id);await this.#audit.barrier();
      this.fence(g);return packet;
    }catch(error){
      for(const l of leases)l.release();
      try{this.retire(op);}catch{}
      if(committed){try{await this.quarantine(op,(error as any).code??'ISSUE_UNCERTAIN');}catch{/* No grant is returned on audit failure. */}}
      if(committed){const failure=new NexusError((error as any).code??'M14_AUTHORIZATION_UNCERTAIN',(error as any).message);Object.defineProperty(failure,'operation_id',{value:op});throw failure;}
      throw error;
    }
  }
  fence(g:Grant):void {
    this.#deadlines.check(g.issued_at,g.expires_at);
    const r=this.identities.inspect(g.runtime_id),t=this.#tools.get(g.tool_id);invariant(t&&t.version===g.tool_version&&t.profile_hash===g.profile_hash,'M14_TOOL_PROFILE');
    grantMatches(g,r,metadata(this.store));this.#enabled(r,t);
    invariant(this.policy.approvalValid(g.approval_id,g.intent_hash,g.logical,1),'M14_APPROVAL_REVOKED');
    const permit=this.store.db.prepare('SELECT * FROM control_permits WHERE id=? AND operation_id=? AND consumed=1').get(g.permit_id,g.operation_id) as any;
    invariant(permit&&permit.intent_hash===g.intent_hash&&permit.subject===g.logical.agent_id&&clockFor(this.store).valid(permit),'M14_PERMIT_EXPIRED');
    this.policy.assertModesCurrent(t.policy_ids,g.logical.project_id,g.policy_epoch);
    const row=this.store.db.prepare('SELECT state,grant_body,boot FROM m14_host_operations WHERE operation=?').get(g.operation_id) as any;
    invariant(row && row.grant_body===canonical(g) && row.boot===this.identities.boot_id && ['CLAIMED','START_INTENT','STARTED'].includes(row.state),'M14_HOST_OPERATION');
    const ls=this.#leases.get(g.operation_id);invariant(ls&&ls.every(l=>!l.signal.aborted),'M14_LEASE_REVOKED');
  }
  retire(operation:string):void {for(const l of this.#leases.get(operation)??[])l.release();this.#leases.delete(operation);this.store.db.prepare('UPDATE m14_host_operations SET inflight=0 WHERE operation=?').run(operation);}
  async quarantine(operation:string,reason:string):Promise<void> {
    this.retire(operation);
    const row=this.store.db.prepare('SELECT grant_body FROM m14_host_operations WHERE operation=?').get(operation) as any;invariant(row,'M14_OPERATION_UNKNOWN');const g=JSON.parse(row.grant_body) as Grant;
    this.store.transaction(()=>{
      this.store.db.prepare("UPDATE m14_host_operations SET state='UNKNOWN_QUARANTINED' WHERE operation=?").run(operation);
      this.store.db.prepare("UPDATE m14_host_resources SET state='UNKNOWN_QUARANTINED',revision=revision+1 WHERE operation=? AND state<>'RELEASED'").run(operation);
      this.store.db.prepare("UPDATE control_operations SET state='INDETERMINATE',executor_state='UNKNOWN' WHERE operation_id=?").run(operation);
      this.#audit.record('reconciliation','UNKNOWN_QUARANTINED',g,operation,json({reason,automatic_retry:false}),g.resource_id);
    });await this.#audit.barrier();
  }
  async recover():Promise<void> {
    let after='';
    while(true){const rows=this.store.db.prepare("SELECT operation FROM m14_host_operations WHERE operation>? AND boot<>? AND state<>'RELEASED' ORDER BY operation LIMIT 32").all(after,this.identities.boot_id) as any[];
      if(!rows.length)break;for(const row of rows){await this.quarantine(row.operation,'HOST_RESTART_REQUIRES_OS_RECONCILIATION');after=row.operation;}}
  }
}
