import type { KeyObject } from 'node:crypto';
import { canonical, invariant, NexusError, sha256 } from '../types.ts';
import type { ArtifactRef } from '../types.ts';
import type { KernelStore } from '../storage.ts';
import { hash, id, keys, snapshot } from '../runtime/contracts.ts';
import { authenticated, DeadlineGuard, json } from './contracts.ts';
import type { Epochs, Runtime, Signed } from './contracts.ts';
import { ProductionAudit } from './audit.ts';
import { clockFor } from '../control.ts';

export type FileGrant={schema:'agentnexus/file-permit/1';operation_id:string;runtime_id:string;worker_instance_id:string;host_boot_id:string;project_id:string;task_id:string;resource_id:string;profile_hash:string;path:string;action:'READ'|'CREATE'|'SUBMIT';expected_hash:string|null;content_hash:string|null;max_bytes:number;nonce:string;issued_at:number;expires_at:number;policy_epoch:number;feature_epoch:number};
export type FileResource={id:string;project_id:string;task_id:string|null;root:string;kind:'PROJECT_READ_ONLY'|'TASK'|'TEMP'|'OUTPUT';quota_bytes:number};
export type NativeFile={data:Uint8Array;file_id:string;sha256:string;bytes:number;links:number;assurance:'REAL_WINDOWS'|'SIMULATED'};
export interface NativeFileOwner {read(root:string,path:string,maxBytes:number,signal?:AbortSignal):Promise<NativeFile>;create(root:string,path:string,bytes:Uint8Array,signal?:AbortSignal):Promise<NativeFile>;}
export function relativeFile(path:unknown):asserts path is string {
  invariant(typeof path==='string'&&path.length>0&&path.length<=512&&!/[\x00-\x1f\x7f:]/.test(path)&&!path.startsWith('/')&&!path.startsWith('\\'),'M14_FILE_PATH');
  invariant(!path.includes('\\'),'M14_FILE_PATH');
  for(const part of path.split('/'))invariant(part.length>0&&part!=='.'&&part!=='..'&&!/[. ]$/.test(part)&&!/[<>"|?*]/.test(part)&&!/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),'M14_FILE_PATH');
}
/** Handles and OS boundary enforcement belong to NativeFileOwner, never string-prefix checks. */
export class FileBroker {
  #store:KernelStore;#key:KeyObject;#current:(id:string)=>Runtime;#epochs:()=>Epochs;#owner:NativeFileOwner;
  #resources:Map<string,FileResource>;#audit:ProductionAudit;#pending=0;#enabled:()=>boolean;
  #native=new Set<Promise<NativeFile>>();#leases=new Map<string,ReturnType<ReturnType<typeof clockFor>['issue']>>();
  #deadlines=new DeadlineGuard();
  #alive:((runtimeId:string)=>Promise<unknown>)|undefined;
  constructor(store:KernelStore,key:KeyObject,current:(id:string)=>Runtime,epochs:()=>Epochs,owner:NativeFileOwner,resources:FileResource[],enabled:()=>boolean,liveIdentity?:(runtimeId:string)=>Promise<unknown>){
    this.#store=store;this.#key=key;this.#current=current;this.#epochs=epochs;this.#owner=owner;this.#enabled=enabled;this.#resources=new Map(resources.map(r=>[r.id,snapshot(r)]));this.#audit=new ProductionAudit(store);
    this.#alive=liveIdentity;
    invariant(this.#resources.size===resources.length,'M14_FILE_RESOURCES');
    for(const r of resources)invariant(r.id.startsWith(r.project_id+':')&&Number.isSafeInteger(r.quota_bytes)&&r.quota_bytes>0,'M14_FILE_RESOURCE');
    store.db.exec(`CREATE TABLE IF NOT EXISTS m14_file_requests(nonce TEXT PRIMARY KEY,operation TEXT NOT NULL,state TEXT NOT NULL,body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS m14_file_claims(resource TEXT NOT NULL,path TEXT NOT NULL,operation TEXT NOT NULL,reserved_bytes INTEGER NOT NULL,PRIMARY KEY(resource,path));`);
  }
  #check(g:FileGrant):{r:Runtime;resource:FileResource}{
    invariant(this.#enabled()&&!this.#store.faulted,'M14_FILE_BROKER_UNAVAILABLE');
    clockFor(this.#store).issue(1); // Observe wall rollback even when a signed grant is already expired.
    keys(g,['schema','operation_id','runtime_id','worker_instance_id','host_boot_id','project_id','task_id','resource_id','profile_hash','path','action','expected_hash','content_hash','max_bytes','nonce','issued_at','expires_at','policy_epoch','feature_epoch']);
    invariant(g.schema==='agentnexus/file-permit/1'&&['READ','CREATE','SUBMIT'].includes(g.action),'M14_FILE_GRANT');
    for(const value of [g.operation_id,g.runtime_id,g.worker_instance_id,g.host_boot_id,g.project_id,g.task_id])id(value);
    hash(g.nonce);hash(g.profile_hash);if(g.expected_hash!==null)hash(g.expected_hash);if(g.content_hash!==null)hash(g.content_hash);
    relativeFile(g.path);invariant(Number.isSafeInteger(g.max_bytes)&&g.max_bytes>0&&g.max_bytes<=32768,'M14_FILE_RPC_LIMIT');
    invariant(Number.isSafeInteger(g.issued_at)&&Number.isSafeInteger(g.expires_at)&&g.expires_at>g.issued_at&&g.expires_at-g.issued_at<=30000,'M14_FILE_EXPIRY');
    this.#deadlines.check(g.issued_at,g.expires_at);
    if(!this.#leases.has(g.nonce)){
      invariant(this.#leases.size<4096,'M14_FILE_LEDGER_FULL');
      this.#leases.set(g.nonce,clockFor(this.#store).issue(g.expires_at-Date.now()));
    }
    invariant(clockFor(this.#store).valid(this.#leases.get(g.nonce)!),'M14_FILE_EXPIRY');
    const r=this.#current(g.runtime_id),resource=this.#resources.get(g.resource_id),epoch=this.#epochs();
    invariant(r.state==='ACTIVE'&&r.worker_instance_id===g.worker_instance_id&&r.host_boot_id===g.host_boot_id&&r.host_boot_id===clockFor(this.#store).boot_id&&r.profile_hash===g.profile_hash&&r.logical.project_id===g.project_id&&r.logical.task_id===g.task_id,'M14_FILE_IDENTITY');
    invariant(epoch.feature_epoch===g.feature_epoch&&epoch.policy_epoch===g.policy_epoch,'M14_EPOCH_STALE');
    invariant(resource&&resource.project_id===g.project_id&&(resource.task_id===null||resource.task_id===g.task_id),'M14_FILE_RESOURCE');
    invariant(g.action!=='CREATE'||resource.kind!=='PROJECT_READ_ONLY','M14_READ_ONLY_RESOURCE');
    return {r,resource};
  }
  async execute(packet:Signed<FileGrant>,content?:Uint8Array):Promise<{artifact:ArtifactRef;file_id:string;sha256:string;assurance:string}> {
    invariant(this.#pending<8,'M14_FILE_BACKPRESSURE');this.#pending++;
    let grant:FileGrant|undefined;let runtime:Runtime|undefined;
    try{
      invariant(content===undefined||(content instanceof Uint8Array&&content.byteLength<=32768),'M14_FILE_RPC_LIMIT');
      // Take ownership before the first await. A Worker cannot mutate approved bytes during the audit barrier.
      const bytes=content===undefined?undefined:Buffer.from(content);
      const g=authenticated(packet,this.#key);grant=g;const {r,resource}=this.#check(g);runtime=r;
      await this.#alive?.(g.runtime_id);this.#check(g);
      if(g.action==='CREATE')invariant(bytes instanceof Uint8Array&&bytes.byteLength<=g.max_bytes&&sha256(bytes)===g.content_hash&&g.expected_hash===null,'M14_FILE_CONTENT');
      else invariant(bytes===undefined&&g.content_hash===null,'M14_FILE_CONTENT');
      this.#store.transaction(()=>{
        this.#check(g);invariant(Number((this.#store.db.prepare('SELECT COUNT(*) n FROM m14_file_requests').get() as any).n)<4096,'M14_FILE_LEDGER_FULL');
        invariant(!this.#store.db.prepare('SELECT 1 FROM m14_file_requests WHERE nonce=?').get(g.nonce),'M14_FILE_REPLAY');
        this.#store.db.prepare('INSERT INTO m14_file_requests VALUES(?,?,?,?)').run(g.nonce,g.operation_id,'CONSUMED',canonical(g));
        if(g.action==='CREATE'){
          const used=Number((this.#store.db.prepare('SELECT COALESCE(SUM(reserved_bytes),0) n FROM m14_file_claims WHERE resource=?').get(resource.id) as any).n);
          invariant(used+g.max_bytes<=resource.quota_bytes,'M14_FILE_QUOTA');
          this.#store.db.prepare('INSERT INTO m14_file_claims VALUES(?,?,?,?)').run(resource.id,g.path.toLowerCase(),g.operation_id,g.max_bytes);
        }
        this.#audit.record('file','AUTHORIZED',r,g.operation_id,json({action:g.action,path:g.path,nonce:g.nonce,max_bytes:g.max_bytes}),g.resource_id);
      });await this.#audit.barrier();await this.#alive?.(g.runtime_id);this.#check(g);
      const file=await this.#observe(signal=>{this.#check(g);return g.action==='CREATE'?this.#owner.create(resource.root,g.path,bytes!,signal):this.#owner.read(resource.root,g.path,g.max_bytes,signal);},g.expires_at);
      invariant(file.assurance===r.assurance&&file.links===1&&file.bytes===file.data.byteLength&&file.bytes<=g.max_bytes&&sha256(file.data)===file.sha256,'M14_FILE_OBSERVATION');
      invariant(g.expected_hash===null||g.expected_hash===file.sha256,'M14_FILE_VERSION_CHANGED');
      invariant(g.action!=='CREATE'||g.content_hash===file.sha256,'M14_FILE_CONTENT_CHANGED');
      const artifact=await this.#store.artifacts.putBytes(file.data,{maxBytes:g.max_bytes,media_type:'application/octet-stream'});
      this.#store.transaction(()=>{
        this.#store.db.prepare("UPDATE m14_file_requests SET state='RESULT' WHERE nonce=?").run(g.nonce);
        this.#audit.record('file','RESULT',r,g.operation_id,json({action:g.action,path:g.path,file_id:file.file_id,version_sha256:file.sha256,bytes:file.bytes,artifact,assurance:file.assurance}),g.resource_id);
      });await this.#audit.barrier();return {artifact,file_id:file.file_id,sha256:file.sha256,assurance:file.assurance};
    }catch(error){
      if(grant&&runtime){try{this.#store.transaction(()=>{this.#store.db.prepare("UPDATE m14_file_requests SET state='UNKNOWN_QUARANTINED' WHERE nonce=?").run(grant!.nonce);this.#audit.record('file','INDETERMINATE',runtime!,grant!.operation_id,json({reason:(error as any).code??'FILE_FAILED',automatic_retry:false}),grant!.resource_id);});await this.#audit.barrier();}catch{}}
      throw error;
    }finally{this.#pending--;}
  }
  async #observe(work:(signal:AbortSignal)=>Promise<NativeFile>,expires:number):Promise<NativeFile>{
    invariant(this.#native.size<8,'M14_FILE_NATIVE_UNSETTLED');const cancel=new AbortController();
    const native=Promise.resolve().then(()=>{cancel.signal.throwIfAborted();return work(cancel.signal);});this.#native.add(native);
    void native.then(()=>this.#native.delete(native),()=>this.#native.delete(native));
    let timer:ReturnType<typeof setTimeout>|undefined;
    const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{reject(new NexusError('M14_FILE_DEADLINE'));cancel.abort();},Math.max(1,Math.min(2000,expires-Date.now())));});
    try{return await Promise.race([native,timeout]);}finally{clearTimeout(timer);}
  }
  stats(){return {pending:this.#pending,unsettled_native:this.#native.size};}
}
