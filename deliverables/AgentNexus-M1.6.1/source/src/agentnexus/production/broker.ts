import type { KeyObject } from 'node:crypto';
import { canonical, invariant, NexusError, sha256 } from '../types.ts';
import type { ArtifactRef, Json } from '../types.ts';
import type { KernelStore } from '../storage.ts';
import { clockFor } from '../control.ts';
import { performance } from 'node:perf_hooks';
import { keys, snapshot } from '../runtime/contracts.ts';
import { authenticated, DeadlineGuard, grantMatches, json, signed,RESOURCE_KINDS } from './contracts.ts';
import type { Epochs, Grant, Runtime, Signed, Tool } from './contracts.ts';
import { ProductionAudit } from './audit.ts';
import { TrustedEndpoint } from './transport.ts';
import { QualificationGate } from './qualification.ts';
import { buildExitProof } from './exit.ts';
import type { ExitEvidence, ExitProof } from './exit.ts';

export interface SupervisedRun {
  stdout:AsyncIterable<Uint8Array>;stderr:AsyncIterable<Uint8Array>;exit:Promise<ExitEvidence>;
  terminate(reason:string):void;
}
export interface ProcessSupervisor {
  readonly helper_hash:string;
  // Must validate a pre-bound, pinned Worker. No arbitrary execute callback in the untrusted request.
  ready(runtime:Runtime,grant:Grant,args:Json,signal:AbortSignal):Promise<void>;
  start(runtime:Runtime,grant:Grant,args:Json):SupervisedRun;
}
export type OwnerReleaseReceipt={schema:'agentnexus/owner-release/1';operation_id:string;intent_hash:string;proof_hash:string;host_boot_id:string;broker_boot_id:string;resource_versions:{resource:string;kind:typeof RESOURCE_KINDS[number];state:'RELEASED';revision:number}[];nonce:string;issued_at:number;expires_at:number};
type Options={store:KernelStore;host_key:KeyObject;broker_key:KeyObject;endpoint:TrustedEndpoint;gate:QualificationGate;
  supervisor:ProcessSupervisor;runtime:(id:string)=>Runtime;epochs:()=>Epochs;features:()=>boolean;hostFence:(g:Grant)=>Promise<void>;tools:Tool[];max_workers?:number};
/** Independent Broker owner with a durable consume-before-start ledger. */
export class ProductionExecutionBroker {
  readonly boot_id:string;#o:Options;#audit:ProductionAudit;#tools:Map<string,Tool>;
  #active=new Map<string,SupervisedRun>();#unsettled=new Set<Promise<unknown>>();#pending=0;#closed=false;#abort=new AbortController();
  #deadlines=new DeadlineGuard();
  #channels=new Map<object,string>();
  constructor(options:Options){
    this.#o=options;this.boot_id=clockFor(options.store).boot_id;this.#audit=new ProductionAudit(options.store);this.#tools=new Map(options.tools.map(t=>[t.id,snapshot(t)]));
    invariant(this.#tools.size===options.tools.length,'M14_BROKER_CATALOG');
    invariant(Number.isSafeInteger(options.max_workers??4)&&(options.max_workers??4)>0&&(options.max_workers??4)<=16,'M14_WORKER_LIMIT');
    options.store.db.exec(`
      CREATE TABLE IF NOT EXISTS m14_broker_operations(operation TEXT PRIMARY KEY,permit TEXT UNIQUE NOT NULL,nonce TEXT UNIQUE NOT NULL,runtime TEXT UNIQUE NOT NULL,boot TEXT NOT NULL,state TEXT NOT NULL,body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS m14_broker_requests(request TEXT PRIMARY KEY,connection TEXT NOT NULL,nonce TEXT NOT NULL,operation TEXT UNIQUE NOT NULL,UNIQUE(connection,nonce));
      CREATE TABLE IF NOT EXISTS m14_broker_proofs(id TEXT PRIMARY KEY,operation TEXT UNIQUE NOT NULL,body TEXT NOT NULL,hash TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS m14_broker_proof_no_update BEFORE UPDATE ON m14_broker_proofs BEGIN SELECT RAISE(ABORT,'append only'); END;
      CREATE TRIGGER IF NOT EXISTS m14_broker_proof_no_delete BEFORE DELETE ON m14_broker_proofs BEGIN SELECT RAISE(ABORT,'append only'); END;
      CREATE TABLE IF NOT EXISTS m15_broker_releases(operation TEXT PRIMARY KEY,nonce TEXT UNIQUE NOT NULL,body TEXT NOT NULL);
    `);
  }
  #check(g:Grant,args:Json):{runtime:Runtime;tool:Tool} {
    clockFor(this.#o.store).issue(1);
    this.#deadlines.check(g.issued_at,g.expires_at);
    invariant(!this.#closed&&!this.#o.store.faulted,'M14_BROKER_UNAVAILABLE');invariant(this.#o.features(),'M14_FEATURE_BLOCKED');
    const runtime=this.#o.runtime(g.runtime_id);grantMatches(g,runtime,this.#o.epochs());invariant(g.broker_boot_id===this.boot_id,'M14_BROKER_BOOT_STALE');
    const tool=this.#tools.get(g.tool_id);invariant(tool&&tool.version===g.tool_version&&tool.profile_hash===g.profile_hash,'M14_TOOL_PROFILE');
    invariant(sha256(canonical(args))===g.arguments_hash,'M14_ARGUMENTS_CHANGED');this.#o.gate.admit(runtime,tool,this.#o.supervisor.helper_hash);
    return {runtime,tool};
  }
  async #bounded<T>(work:(signal:AbortSignal)=>Promise<T>,deadline:number):Promise<T>{
    invariant(deadline>Date.now(),'M14_SUPERVISOR_DEADLINE');const monotonic=performance.now()+deadline-Date.now();
    invariant(this.#unsettled.size<32,'M14_SUPERVISOR_UNSETTLED');const controller=new AbortController();
    const aborted=()=>controller.abort(new NexusError('M14_BROKER_CLOSED'));this.#abort.signal.addEventListener('abort',aborted,{once:true});
    const task=Promise.resolve().then(()=>{controller.signal.throwIfAborted();invariant(deadline>Date.now()&&performance.now()<monotonic,'M14_SUPERVISOR_DEADLINE');return work(controller.signal);});this.#unsettled.add(task);void task.then(()=>this.#unsettled.delete(task),()=>this.#unsettled.delete(task));
    let timer:ReturnType<typeof setTimeout>|undefined;
    const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{reject(new NexusError('M14_SUPERVISOR_DEADLINE'));controller.abort();},Math.max(1,Math.min(30000,deadline-Date.now())));});
    const cancel=new Promise<never>((_,reject)=>{controller.signal.addEventListener('abort',()=>reject(new NexusError('M14_BROKER_CLOSED')),{once:true});});
    try{const value=await Promise.race([task,timeout,cancel]);invariant(deadline>Date.now()&&performance.now()<monotonic,'M14_SUPERVISOR_DEADLINE');return value;}finally{clearTimeout(timer);this.#abort.signal.removeEventListener('abort',aborted);}
  }
  async dispatch(channel:object,body:Uint8Array):Promise<{status:'PASS'|'SIMULATED'|'INCONCLUSIVE'|'FAIL';proof:Signed<ExitProof>}> {
    invariant(this.#pending<16,'M14_BROKER_BACKPRESSURE');this.#pending++;let consumed:Grant|null=null;let run:SupervisedRun|undefined;
    let timer:ReturnType<typeof setTimeout>|undefined;const outputCancel=new AbortController();
    try{
      const {envelope:e}=await this.#o.endpoint.receive(channel,body);
      keys(e.payload,['grant','arguments']);const payload=e.payload as unknown as {grant:Signed<Grant>;arguments:Json};
      const g=authenticated(payload.grant,this.#o.host_key),args=snapshot(payload.arguments);
      const {runtime,tool}=this.#check(g,args);
      invariant(e.operation_id===g.operation_id&&e.capability_id===g.permit_id&&e.resource_id===g.resource_id&&e.runtime_id===g.runtime_id&&e.worker_instance_id===g.worker_instance_id&&e.profile_hash===g.profile_hash&&e.policy_epoch===g.policy_epoch&&e.feature_epoch===g.feature_epoch&&e.deadline<=g.expires_at,'M14_REQUEST_GRANT_MISMATCH');
      this.#o.store.transaction(()=>{
        this.#check(g,args);
        invariant(Number((this.#o.store.db.prepare('SELECT COUNT(*) n FROM m14_broker_operations').get() as any).n)<4096,'M14_PERMIT_LEDGER_FULL');
        invariant(Number((this.#o.store.db.prepare("SELECT COUNT(*) n FROM m14_broker_operations WHERE state<>'RELEASED'").get() as any).n)<(this.#o.max_workers??4),'M14_WORKER_QUOTA');
        invariant(!this.#o.store.db.prepare('SELECT 1 FROM m14_broker_operations WHERE operation=? OR permit=? OR nonce=? OR runtime=?').get(g.operation_id,g.permit_id,g.nonce,g.runtime_id),'M14_PERMIT_REPLAY');
        invariant(!this.#o.store.db.prepare('SELECT 1 FROM m14_broker_requests WHERE request=? OR (connection=? AND nonce=?)').get(e.request_id,e.connection_id,e.nonce),'M14_REQUEST_REPLAY');
        this.#o.store.db.prepare('INSERT INTO m14_broker_operations VALUES(?,?,?,?,?,?,?)').run(g.operation_id,g.permit_id,g.nonce,g.runtime_id,this.boot_id,'CONSUMED',canonical(g));
        this.#o.store.db.prepare('INSERT INTO m14_broker_requests VALUES(?,?,?,?)').run(e.request_id,e.connection_id,e.nonce,g.operation_id);
        this.#audit.record('broker','AUTHORIZED',g,g.operation_id,json({request_id:e.request_id,intent_hash:g.intent_hash,assurance:runtime.assurance}),g.resource_id);
      });consumed=g;this.#channels.set(channel,g.operation_id);await this.#audit.barrier();
      await this.#bounded(signal=>this.#o.supervisor.ready(runtime,g,args,signal),Math.min(e.deadline,Date.now()+2000));
      await this.#bounded(()=>this.#o.hostFence(g),Math.min(e.deadline,Date.now()+2000));
      await this.#o.endpoint.recheck(channel,e.deadline);this.#check(g,args);
      this.#o.store.transaction(()=>{
        this.#o.store.db.prepare("UPDATE m14_broker_operations SET state='START_INTENT' WHERE operation=? AND state='CONSUMED'").run(g.operation_id);
        this.#audit.record('sandbox','PROFILE_CHECKED',g,g.operation_id,json({profile_hash:g.profile_hash,helper_hash:this.#o.supervisor.helper_hash,assurance:runtime.assurance}),g.resource_id);
        this.#audit.record('process','START_INTENT',g,g.operation_id,json({automatic_retry:false}),g.resource_id);
      });await this.#audit.barrier();
      // Host's commit fence and OS peer are checked after the durable start intent, not just on initial admission.
      await this.#bounded(()=>this.#o.hostFence(g),Math.min(e.deadline,Date.now()+2000));
      await this.#o.endpoint.recheck(channel,e.deadline);this.#check(g,args);
      invariant(e.deadline>Date.now(),'M14_IPC_EXPIRED');
      run=this.#o.supervisor.start(runtime,g,args);this.#active.set(g.operation_id,run);
      this.#o.store.transaction(()=>{
        this.#o.store.db.prepare("UPDATE m14_broker_operations SET state='STARTED' WHERE operation=?").run(g.operation_id);
        this.#audit.record('process','STARTED',g,g.operation_id,json({source:runtime.assurance}),g.resource_id);
      });await this.#audit.barrier();
      const current=run;let bytes=0;
      async function* bounded(source:AsyncIterable<Uint8Array>){
        for await(const chunk of source){invariant(chunk instanceof Uint8Array&&chunk.length<=65536,'M14_OUTPUT_CHUNK_LIMIT');bytes+=chunk.length;invariant(bytes<=runtime.profile.limits.output_bytes,'M14_OUTPUT_LIMIT');yield chunk;}
      }
      const stop=(reason:string)=>{current.terminate(reason);if(!outputCancel.signal.aborted)outputCancel.abort(new NexusError(reason));};
      timer=setTimeout(()=>stop('M14_EXECUTION_DEADLINE'),runtime.profile.limits.wall_ms);
      const stdout=this.#o.store.artifacts.put(bounded(current.stdout),{maxBytes:runtime.profile.limits.output_bytes,signal:outputCancel.signal,media_type:'application/octet-stream'});
      const stderr=this.#o.store.artifacts.put(bounded(current.stderr),{maxBytes:runtime.profile.limits.output_bytes,signal:outputCancel.signal,media_type:'application/octet-stream'});
      // Attach handlers immediately: artifact failure must terminate the controlled process, even if the other producer stalls.
      void stdout.catch(()=>stop('M14_STDOUT_FAILED'));void stderr.catch(()=>stop('M14_STDERR_FAILED'));
      const completion=Promise.all([stdout,stderr,current.exit] as const);
      const [outRef,errRef,evidence]=await this.#bounded(()=>completion,Date.now()+runtime.profile.limits.wall_ms+1000);
      invariant(evidence.source===runtime.assurance,'M14_OBSERVER_ASSURANCE');
      const qualification=this.#o.gate.admit(runtime,tool,this.#o.supervisor.helper_hash);
      const proof=buildExitProof(g,evidence,outRef,errRef,qualification.evidence_hash);
      this.#o.store.transaction(()=>{
        this.#o.store.db.prepare('INSERT INTO m14_broker_proofs VALUES(?,?,?,?)').run(proof.proof_id,g.operation_id,canonical(proof),proof.evidence_hash);
        this.#o.store.db.prepare("UPDATE m14_broker_operations SET state=? WHERE operation=?").run(proof.state,g.operation_id);
        for(const state of proof.states)this.#audit.record(state==='OUTPUT_PRODUCERS_SETTLED'?'process':'exit_proof',state,g,g.operation_id,json({proof_id:proof.proof_id,evidence_hash:proof.evidence_hash}),g.resource_id);
        this.#audit.record('broker','RESULT',g,g.operation_id,json({proof_id:proof.proof_id,stdout_hash:outRef.sha256,stderr_hash:errRef.sha256,resources_released:false}),g.resource_id);
      });await this.#audit.barrier();
      // A returned observation is not necessarily a terminal process tree.
      this.#o.endpoint.disconnect(channel);
      const settled=proof.state==='EXIT_VERIFIED'||(runtime.assurance==='SIMULATED'&&proof.states.includes('PROCESS_TREE_EXITED')&&proof.states.includes('OUTPUT_PRODUCERS_SETTLED')&&evidence.handles_closed);
      if(settled){this.#active.delete(g.operation_id);this.#channels.delete(channel);}
      else{run.terminate('EXIT_UNVERIFIED');await this.quarantine(g.operation_id,'INCOMPLETE_EXIT_EVIDENCE');}
      const failed=evidence.members.some(m=>m.exited&&m.exit_code!==0);
      return {status:runtime.assurance==='SIMULATED'?'SIMULATED':proof.state!=='EXIT_VERIFIED'?'INCONCLUSIVE':failed?'FAIL':'PASS',proof:signed(proof,this.#o.broker_key)};
    }catch(error){
      if(run){try{run.terminate((error as any).code??'M14_DISPATCH_FAILED');}catch{}void run.exit.catch(()=>{});}
      outputCancel.abort(error);
      if(consumed){try{await this.quarantine(consumed.operation_id,(error as any).code??'DISPATCH_UNCERTAIN');}catch{/* Audit failure never returns successful execution. */}}
      throw error;
    }finally{clearTimeout(timer);this.#pending--;}
  }
  async quarantine(operation:string,reason:string):Promise<void>{
    const row=this.#o.store.db.prepare('SELECT body FROM m14_broker_operations WHERE operation=?').get(operation) as any;invariant(row,'M14_OPERATION_UNKNOWN');const g=JSON.parse(row.body) as Grant;
    this.#o.store.transaction(()=>{this.#o.store.db.prepare("UPDATE m14_broker_operations SET state='UNKNOWN_QUARANTINED' WHERE operation=?").run(operation);
      this.#audit.record('reconciliation','UNKNOWN_QUARANTINED',g,operation,json({reason,process:'UNKNOWN',job:'UNKNOWN',outputs:'UNKNOWN',sandbox:'UNKNOWN',resources:'HELD',automatic_retry:false}),g.resource_id);
    });await this.#audit.barrier();
  }
  async recover():Promise<void>{
    let after='';while(true){const rows=this.#o.store.db.prepare("SELECT operation FROM m14_broker_operations WHERE operation>? AND state<>'RELEASED' ORDER BY operation LIMIT 32").all(after) as any[];
      if(!rows.length)break;for(const row of rows){await this.quarantine(row.operation,'BROKER_RESTART_OS_RECHECK_REQUIRED');after=row.operation;}}
  }
  async disconnect(channel:object):Promise<void>{const operation=this.#channels.get(channel);this.#o.endpoint.disconnect(channel);if(operation){const run=this.#active.get(operation);if(run)run.terminate('IPC_DISCONNECTED');await this.quarantine(operation,'IPC_DISCONNECTED');}}
  async acknowledgeOwnerRelease(packet:Signed<OwnerReleaseReceipt>):Promise<void>{
    const r=authenticated(packet,this.#o.host_key);keys(r,['schema','operation_id','intent_hash','proof_hash','host_boot_id','broker_boot_id','resource_versions','nonce','issued_at','expires_at']);
    invariant(r.schema==='agentnexus/owner-release/1'&&/^[a-f0-9]{64}$/.test(r.nonce)&&Number.isSafeInteger(r.issued_at)&&Number.isSafeInteger(r.expires_at)&&r.expires_at>r.issued_at&&r.expires_at-r.issued_at<=30000,'M15_RELEASE_RECEIPT');this.#deadlines.check(r.issued_at,r.expires_at);
    const op=this.#o.store.db.prepare('SELECT body,state FROM m14_broker_operations WHERE operation=?').get(r.operation_id) as {body:string;state:string}|undefined;
    const row=this.#o.store.db.prepare('SELECT body FROM m14_broker_proofs WHERE operation=?').get(r.operation_id) as {body:string}|undefined;invariant(op&&row,'M15_BROKER_PROOF_REQUIRED');const g=JSON.parse(op.body) as Grant,p=JSON.parse(row.body) as ExitProof;
    invariant(p.state==='EXIT_VERIFIED'&&p.production_release_authority&&p.observation.source==='REAL_WINDOWS'&&p.evidence_hash===r.proof_hash&&g.intent_hash===r.intent_hash&&g.host_boot_id===r.host_boot_id&&g.broker_boot_id===r.broker_boot_id,'M15_BROKER_RELEASE_PROOF');
    invariant(Array.isArray(r.resource_versions)&&r.resource_versions.length===5&&new Set(r.resource_versions.map(v=>v.kind)).size===5,'M15_BROKER_RELEASE_RESOURCES');for(const v of r.resource_versions){keys(v,['resource','kind','state','revision']);invariant(RESOURCE_KINDS.includes(v.kind)&&v.state==='RELEASED'&&Number.isSafeInteger(v.revision)&&v.revision>0&&v.resource===(v.kind==='WRITER'||v.kind==='WORKSPACE_LOCK'?g.resource_id:g.worker_instance_id),'M15_BROKER_RELEASE_RESOURCES');}
    this.#o.store.transaction(()=>{invariant(!this.#closed&&!this.#o.store.faulted,'M14_BROKER_UNAVAILABLE');const old=this.#o.store.db.prepare('SELECT body FROM m15_broker_releases WHERE operation=?').get(r.operation_id) as {body:string}|undefined;if(old){const prior=JSON.parse(old.body) as OwnerReleaseReceipt;invariant(prior.proof_hash===r.proof_hash&&prior.intent_hash===r.intent_hash&&canonical(prior.resource_versions)===canonical(r.resource_versions),'M15_RELEASE_REPLAY');return;}
      this.#o.store.db.prepare('INSERT INTO m15_broker_releases VALUES(?,?,?)').run(r.operation_id,r.nonce,canonical(r));this.#o.store.db.prepare("UPDATE m14_broker_operations SET state='RELEASED' WHERE operation=?").run(r.operation_id);
      this.#audit.record('reconciliation','BROKER_RESOURCE_RELEASED',g,g.operation_id,json({proof_hash:r.proof_hash,receipt_hash:sha256(canonical(packet)),resource_versions:r.resource_versions}),g.resource_id);
    });await this.#audit.barrier();
  }
  close():void{this.#closed=true;this.#abort.abort();this.#o.endpoint.close();for(const run of this.#active.values())run.terminate('BROKER_SHUTDOWN');}
  stats(){return {pending:this.#pending,active:this.#active.size,unsettled:this.#unsettled.size};}
}
