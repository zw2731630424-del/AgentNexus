import { createHash } from 'node:crypto';
import { lstat, open, realpath, mkdir, link, rename, unlink } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { dirname, join, parse, relative, resolve, sep } from 'node:path';
import { CHUNK_BYTES, syncDirectory } from '../artifacts.ts';
import { metadata } from '../control.ts';
import { intentHash } from '../gateway.ts';
import type { ToolContext, ToolDefinition } from '../gateway.ts';
import { relativeFile } from '../production/file-broker.ts';
import { auditEvent, canonical, invariant, NexusError, now, sha256 } from '../types.ts';
import type { ArtifactRef, Json } from '../types.ts';
import { identifier, identityOf, snapshot } from './contracts.ts';
import type { Subject } from './contracts.ts';
import type { NativeState } from './state.ts';
import type { ContextAssembly, ContextSource } from './context.ts';
import type { Reservation } from '../resources/contracts.ts';

export type FileIdentity = { device:string; inode:string; birth_ns:string };
export type FileObservation = { identity:FileIdentity; sha256:string; bytes:number };
export type StorageStage = 'REQUESTED'|'AUTHORIZED'|'WRITE_INTENT'|'TEMP_OBJECT_CREATED'|'CONTENT_WRITTEN'|'CONTENT_VERIFIED'|'PUBLISH_READY'|'PUBLISHED'|'AUDIT_ACKNOWLEDGED'|'FAILED_BEFORE_PUBLISH'|'INDETERMINATE'|'RECONCILED';
export type StorageRequest = { resource_id:string; path:string; mode:'CREATE'|'REPLACE'; expected_version:number|null; expected_sha256:string|null; source:ContextSource };
export type StorageResourceInput = { id:string; project_id:string; task_id:string|null; root:string; quota_bytes:number; max_file_bytes:number };
type StorageResource = StorageResourceInput & { revision:number; root_identity:FileIdentity };
export type StorageWrite = { id:string; revision:number; state:StorageStage; subject:Subject; boot_id:string; request:StorageRequest; request_hash:string;
  reservation_id:string; intent_hash:string; feature_epoch:number; policy_epoch:number; version:number; previous:FileObservation|null;
  temp_path:string; temp_identity:FileIdentity|null; published:FileObservation|null; artifact_ref:ArtifactRef; reason:string|null; updated_at:string; recovery_from?:StorageStage };
type Version = { id:string; revision:number; version:number; operation_id:string; resource_id:string; path:string; file:FileObservation; artifact_ref:ArtifactRef };
type Claim = { revision:number; operation_id:string; resource_id:string; bytes:number; state:'HELD'|'COMMITTED'|'ABORTED' };
export type StorageOwnerOptions = { maxConcurrent?:number; onStage?:(stage:StorageStage,operation:StorageWrite)=>Promise<void>|void;
  beforeIO?:(phase:'CREATE_TEMP'|'WRITE_CHUNK'|'PUBLISH'|'UNLINK_TEMP',operation:StorageWrite)=>Promise<void>|void };
const TERMINAL = new Set<StorageStage>(['AUDIT_ACKNOWLEDGED','FAILED_BEFORE_PUBLISH','RECONCILED']);
const sameIdentity=(a:FileIdentity,b:FileIdentity)=>canonical(a)===canonical(b);
const keyFor=(resource:string,path:string)=>sha256(resource+'\0'+(process.platform==='win32'?path.toLowerCase():path));
const fold=(path:string)=>process.platform==='win32'?path.toLowerCase():path;
const within=(a:string,b:string)=>fold(a)===fold(b)||fold(a).startsWith(fold(b)+sep);
function identityOfStat(s:{dev:bigint;ino:bigint;birthtimeNs:bigint}):FileIdentity{return {device:String(s.dev),inode:String(s.ino),birth_ns:String(s.birthtimeNs)};}
async function missing(path:string):Promise<boolean>{try{await lstat(path);return false;}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return true;throw e;}}

/** Single trusted owner of a managed local namespace. This is not a hostile-worker OS sandbox. */
export class StorageOwner {
  #state:NativeState; #context:ContextAssembly; #options:StorageOwnerOptions; #active=new Set<string>();
  constructor(state:NativeState,context:ContextAssembly,options:StorageOwnerOptions={}){
    invariant(Number.isSafeInteger(options.maxConcurrent??2)&&(options.maxConcurrent??2)>=1&&(options.maxConcurrent??2)<=2,'STORAGE_CONCURRENCY');
    this.#state=state;this.#context=context;this.#options=options;
  }
  #resource(id:string):StorageResource {const r=this.#state.get<StorageResource>('STORAGE_RESOURCE',id);invariant(r,'STORAGE_RESOURCE_UNKNOWN');return r;}
  inspect(admin:unknown,id:string):StorageWrite {this.#state.checkAdmin(admin);const w=this.#state.get<StorageWrite>('STORAGE_WRITE',id);invariant(w,'STORAGE_OPERATION_UNKNOWN');return w;}
  version(admin:unknown,resource:string,path:string):Version|null{this.#state.checkAdmin(admin);relativeFile(path);return this.#state.get<Version>('STORAGE_VERSION',keyFor(resource,path));}
  async #directory(path:string):Promise<FileIdentity>{
    const absolute=resolve(path);let cursor=parse(absolute).root;
    for(const part of relative(cursor,absolute).split(sep).filter(Boolean)){
      cursor=join(cursor,part);const st=await lstat(cursor,{bigint:true});invariant(st.isDirectory()&&!st.isSymbolicLink(),'STORAGE_UNSAFE_DIRECTORY');
    }
    invariant(fold(await realpath(absolute))===fold(absolute),'STORAGE_UNSAFE_DIRECTORY');
    return identityOfStat(await lstat(absolute,{bigint:true}));
  }
  async register(admin:unknown,actor:Subject,input:StorageResourceInput):Promise<void>{
    this.#state.checkAdmin(admin);const p=snapshot(input);identifier(p.id);identifier(p.project_id);if(p.task_id!==null)identifier(p.task_id);
    invariant(p.id.startsWith(p.project_id+':')&&actor.project_id===p.project_id,'STORAGE_RESOURCE_SCOPE');
    invariant(Number.isSafeInteger(p.quota_bytes)&&p.quota_bytes>0&&p.quota_bytes<=1024*1024*1024&&Number.isSafeInteger(p.max_file_bytes)&&p.max_file_bytes>=0&&p.max_file_bytes<=64*1024*1024&&p.max_file_bytes<=p.quota_bytes,'STORAGE_QUOTA');
    const root=resolve(p.root);invariant(!within(root,this.#state.store.root)&&!within(this.#state.store.root,root),'STORAGE_MANAGEMENT_BOUNDARY');
    await mkdir(root,{recursive:true});const rootIdentity=await this.#directory(root);
    await this.#state.change(actor,'STORAGE_RESOURCE_REGISTERED',()=>{
      invariant(this.#state.count('STORAGE_RESOURCE')<32,'STORAGE_RESOURCE_LIMIT');invariant(!this.#state.get('STORAGE_RESOURCE',p.id),'STORAGE_RESOURCE_DUPLICATE');
      for(const r of this.#state.list<StorageResource>('STORAGE_RESOURCE',{limit:32}))invariant(!within(root,r.root)&&!within(r.root,root),'STORAGE_RESOURCE_OVERLAP');
      this.#state.insert('STORAGE_RESOURCE',p.id,actor,'REGISTERED',{...p,root,root_identity:rootIdentity,revision:0});
    },{resource_id:p.id,root_sha256:sha256(root),quota_bytes:p.quota_bytes});
  }
  validate(input:unknown):StorageRequest{
    const p=snapshot(input) as StorageRequest;
    invariant(Object.keys(p).sort().join(',')==='expected_sha256,expected_version,mode,path,resource_id,source','STORAGE_REQUEST');
    identifier(p.resource_id);relativeFile(p.path);
    invariant(p.path.split('/').length<=16&&!p.path.split('/').some(s=>s.toLowerCase().startsWith('.anx-')),'STORAGE_PATH');
    invariant(['CREATE','REPLACE'].includes(p.mode),'STORAGE_MODE');
    invariant(p.mode==='CREATE'?p.expected_version===null&&p.expected_sha256===null:Number.isSafeInteger(p.expected_version)&&p.expected_version!>=1&&/^[a-f0-9]{64}$/.test(p.expected_sha256??''),'STORAGE_OVERWRITE_POLICY');
    invariant(p.source&&p.source.offset===0&&p.source.length===p.source.payload_ref.bytes,'STORAGE_FULL_SOURCE_REQUIRED');return p;
  }
  tool(admin:unknown,resolveActor:(id:string)=>Subject):ToolDefinition{
    this.#state.checkAdmin(admin);
    return {id:'native.storage.write',version:'1',feature_id:'native.storage-owner',policy_ids:['P.PROJECT_RULE_CHANGE'],requires_sandbox:false,capability:'LOCAL_WRITE',timeout_ms:30000,
      schema:args=>{this.validate(args);},writer_resource:args=>this.validate(args).resource_id,
      execute:async(args,ctx)=>{const w=await this.write(admin,resolveActor(ctx.identity.agent_id),ctx,this.validate(args));return {data:{operation_id:w.id,state:w.state,version:w.version,file:w.published,artifact_ref:w.artifact_ref} as unknown as Json,artifact_refs:[w.artifact_ref]};}};
  }
  async #paths(r:StorageResource,path:string):Promise<{target:string;parent_identity:FileIdentity}>{
    invariant(sameIdentity(await this.#directory(r.root),r.root_identity),'STORAGE_ROOT_CHANGED');const target=join(r.root,...path.split('/'));
    invariant(within(target,r.root),'STORAGE_PATH');return {target,parent_identity:await this.#directory(dirname(target))};
  }
  async #observe(path:string,max:number,expectedLinks=1):Promise<FileObservation>{
    const before=await lstat(path,{bigint:true});invariant(before.isFile()&&!before.isSymbolicLink()&&before.nlink===BigInt(expectedLinks)&&before.size<=BigInt(max),'STORAGE_UNSAFE_FILE');
    const handle=await open(path,'r');try{
      const start=await handle.stat({bigint:true});invariant(sameIdentity(identityOfStat(before),identityOfStat(start)),'STORAGE_FILE_CHANGED');
      const hash=createHash('sha256'),chunk=Buffer.alloc(CHUNK_BYTES);let bytes=0;
      for(;;){const r=await handle.read(chunk,0,Math.min(chunk.length,max+1-bytes),bytes);if(r.bytesRead===0)break;bytes+=r.bytesRead;invariant(bytes<=max,'STORAGE_FILE_LIMIT');hash.update(chunk.subarray(0,r.bytesRead));}
      const end=await handle.stat({bigint:true}),after=await lstat(path,{bigint:true});
      invariant(sameIdentity(identityOfStat(start),identityOfStat(after))&&start.size===end.size&&start.mtimeNs===end.mtimeNs&&end.nlink===BigInt(expectedLinks)&&BigInt(bytes)===end.size,'STORAGE_FILE_CHANGED');
      return {identity:identityOfStat(end),sha256:hash.digest('hex'),bytes};
    }finally{await handle.close();}
  }
  async #stage(id:string,state:StorageStage,changes:Partial<StorageWrite>={}):Promise<StorageWrite>{
    const old=this.#state.get<StorageWrite>('STORAGE_WRITE',id)!;
    const result=await this.#state.change(old.subject,'STORAGE_'+state,()=>{
      const w=this.#state.get<StorageWrite>('STORAGE_WRITE',id)!;const next={...w,...changes,state,revision:w.revision+1,updated_at:now()};this.#state.update('STORAGE_WRITE',id,w.revision,state,next);return snapshot(next);
    },{operation_id:id,resource_id:old.request.resource_id,path:old.request.path,content_sha256:old.artifact_ref.sha256,published:changes.published??null},id);
    await this.#options.onStage?.(state,result);return result;
  }
  #authorization(actor:Subject,ctx:ToolContext,request:StorageRequest):{intent_hash:string;feature_epoch:number;policy_epoch:number}{
    invariant(canonical(ctx.identity)===canonical(identityOf(actor))&&ctx.resource_id===request.resource_id,'STORAGE_IDENTITY');
    const row=this.#state.store.db.prepare('SELECT * FROM control_operations WHERE operation_id=?').get(ctx.operation_id) as {intent_hash:string;request_key:string;state:string;workspace:string;permit_id:string}|undefined;
    invariant(row&&row.state==='CLAIMED'&&row.workspace===request.resource_id,'STORAGE_AUTHORIZATION_REQUIRED');
    const key=JSON.parse(row.request_key) as {call_id:string};
    invariant(intentHash(identityOf(actor),{call_id:key.call_id,tool_id:'native.storage.write',tool_version:'1',arguments:request as unknown as Json,resource_id:request.resource_id})===row.intent_hash,'STORAGE_INTENT_MISMATCH');
    const permit=this.#state.store.db.prepare('SELECT * FROM control_permits WHERE id=? AND operation_id=? AND consumed=1').get(row.permit_id,ctx.operation_id) as {feature_epoch:number;policy_epoch:number}|undefined;
    invariant(permit&&this.#state.store.db.prepare('SELECT 1 FROM control_approvals WHERE intent_hash=? AND consumed=1').get(row.intent_hash),'STORAGE_AUTHORIZATION_REQUIRED');
    return {intent_hash:row.intent_hash,feature_epoch:permit.feature_epoch,policy_epoch:permit.policy_epoch};
  }
  #fence(w:StorageWrite,signal?:AbortSignal):void{
    invariant(!signal?.aborted,'STORAGE_CANCELLED');this.#state.require('native.storage-owner',w.subject);const epochs=metadata(this.#state.store);
    invariant(epochs.feature_epoch===w.feature_epoch&&epochs.policy_epoch===w.policy_epoch,'STORAGE_AUTHORIZATION_STALE');
    invariant(this.#state.get<{state:string}>('PROJECT',w.subject.project_id)?.state==='ACTIVE','PROJECT_NOT_ACTIVE');
  }
  async write(admin:unknown,actor:Subject,ctx:ToolContext,input:StorageRequest):Promise<StorageWrite>{
    this.#state.checkAdmin(admin);const p=this.validate(input);actor=snapshot(actor);identifier(ctx.operation_id);
    invariant(!this.#active.has(ctx.operation_id)&&this.#active.size<(this.#options.maxConcurrent??2),'STORAGE_BACKPRESSURE');
    const old=this.#state.get<StorageWrite>('STORAGE_WRITE',ctx.operation_id);
    if(old){invariant(old.request_hash===sha256(canonical(p))&&old.subject.project_id===actor.project_id&&old.subject.task_id===actor.task_id&&old.subject.agent_id===actor.agent_id,'STORAGE_OPERATION_CONFLICT');invariant(['AUDIT_ACKNOWLEDGED','RECONCILED'].includes(old.state),'STORAGE_RECONCILIATION_REQUIRED');return old;}
    this.#active.add(ctx.operation_id);let handle:FileHandle|undefined,record:StorageWrite|undefined,publishAttempted=false;
    try{
      const authorization=this.#authorization(actor,ctx,p),r=this.#resource(p.resource_id);this.#context.validate(actor,p.source);
      invariant(r.project_id===actor.project_id&&(r.task_id===null||r.task_id===actor.task_id),'STORAGE_RESOURCE_SCOPE');
      invariant(p.source.length<=r.max_file_bytes,'STORAGE_FILE_LIMIT');
      const task=this.#state.get<{reservation_id:string|null}>('TASK',actor.task_id),reservation=task?.reservation_id?this.#state.get<Reservation>('resource_reservation',task.reservation_id):null;
      invariant(reservation&&reservation.state==='ACTIVE'&&canonical(reservation.subject)===canonical(actor),'STORAGE_RESOURCE_RESERVATION_REQUIRED');
      const paths=await this.#paths(r,p.path),versionKey=keyFor(r.id,p.path),version=this.#state.get<Version>('STORAGE_VERSION',versionKey);
      let previous:FileObservation|null=null;
      if(p.mode==='CREATE')invariant(!version&&await missing(paths.target),'STORAGE_FILE_EXISTS');
      else{invariant(version&&version.version===p.expected_version&&version.file.sha256===p.expected_sha256,'STORAGE_VERSION_CONFLICT');previous=await this.#observe(paths.target,r.max_file_bytes);invariant(canonical(previous)===canonical(version.file),'STORAGE_VERSION_CONFLICT');}
      record={id:ctx.operation_id,revision:0,state:'REQUESTED',subject:actor,boot_id:this.#state.boot_id,request:p,request_hash:sha256(canonical(p)),reservation_id:reservation.id,...authorization,
        version:(version?.version??0)+1,previous,temp_path:join(dirname(paths.target),'.anx-'+sha256(ctx.operation_id)+'.tmp'),temp_identity:null,published:null,artifact_ref:p.source.payload_ref,reason:null,updated_at:now()};
      const initial=record;
      await this.#state.change(actor,'STORAGE_REQUESTED',()=>{
        this.#fence(initial,ctx.signal);invariant(this.#state.count('STORAGE_WRITE')<4096,'STORAGE_OPERATION_LIMIT');
        let used=0,taskUsed=0;let after:string|undefined;
        for(;;){const page=this.#state.list<StorageWrite>('STORAGE_WRITE',{...(after?{after}:{}),limit:100});if(!page.length)break;for(const w of page){if(w.state==='FAILED_BEFORE_PUBLISH')continue;if(w.request.resource_id===r.id)used+=w.artifact_ref.bytes;if(w.reservation_id===reservation.id)taskUsed+=w.artifact_ref.bytes;}after=page.at(-1)!.id;}
        invariant(used+initial.artifact_ref.bytes<=r.quota_bytes&&taskUsed+initial.artifact_ref.bytes<=reservation.amounts.disk_bytes,'STORAGE_DISK_BUDGET');
        const claim=this.#state.get<Claim>('STORAGE_CLAIM',versionKey);invariant(!claim||claim.state==='ABORTED'||claim.state==='COMMITTED','STORAGE_FILE_BUSY');
        const next:Claim={revision:claim?claim.revision+1:0,operation_id:initial.id,resource_id:r.id,bytes:initial.artifact_ref.bytes,state:'HELD'};
        if(claim)this.#state.update('STORAGE_CLAIM',versionKey,claim.revision,'HELD',next);else this.#state.insert('STORAGE_CLAIM',versionKey,actor,'HELD',next);
        this.#state.insert('STORAGE_WRITE',initial.id,actor,'REQUESTED',initial);
      },{request_hash:initial.request_hash,artifact_ref:initial.artifact_ref},initial.id);
      await this.#options.onStage?.('REQUESTED',record);
      record=await this.#stage(record.id,'AUTHORIZED');record=await this.#stage(record.id,'WRITE_INTENT');
      this.#fence(record,ctx.signal);await this.#options.beforeIO?.('CREATE_TEMP',record);handle=await open(record.temp_path,'wx+',0o600);
      const temp=await handle.stat({bigint:true});record=await this.#stage(record.id,'TEMP_OBJECT_CREATED',{temp_identity:identityOfStat(temp)});
      let bytes=0;const hash=createHash('sha256');
      for await(const incoming of this.#state.store.artifacts.read(record.artifact_ref)){
        this.#fence(record,ctx.signal);invariant(incoming.length<=CHUNK_BYTES&&bytes+incoming.length<=record.artifact_ref.bytes,'STORAGE_CONTENT_LIMIT');
        const chunk=Buffer.from(incoming);await this.#options.beforeIO?.('WRITE_CHUNK',record);let offset=0;
        while(offset<chunk.length){const result=await handle.write(chunk,offset,chunk.length-offset,bytes+offset);invariant(result.bytesWritten>0,'STORAGE_IO');offset+=result.bytesWritten;}
        bytes+=chunk.length;hash.update(chunk);
      }
      invariant(bytes===record.artifact_ref.bytes&&hash.digest('hex')===record.artifact_ref.sha256,'STORAGE_CONTENT_HASH');await handle.sync();
      record=await this.#stage(record.id,'CONTENT_WRITTEN');await handle.close();handle=undefined;
      const verified=await this.#observe(record.temp_path,r.max_file_bytes);invariant(sameIdentity(verified.identity,record.temp_identity!)&&verified.sha256===record.artifact_ref.sha256&&verified.bytes===record.artifact_ref.bytes,'STORAGE_CONTENT_HASH');
      record=await this.#stage(record.id,'CONTENT_VERIFIED');
      const latest=await this.#paths(r,p.path);invariant(sameIdentity(latest.parent_identity,paths.parent_identity),'STORAGE_PARENT_CHANGED');
      if(p.mode==='REPLACE')invariant(canonical(await this.#observe(paths.target,r.max_file_bytes))===canonical(previous),'STORAGE_VERSION_CONFLICT');else invariant(await missing(paths.target),'STORAGE_FILE_EXISTS');
      record=await this.#stage(record.id,'PUBLISH_READY');await this.#options.beforeIO?.('PUBLISH',record);this.#fence(record,ctx.signal);
      // The namespace is owned by this trusted Host. CREATE uses no-clobber link; REPLACE requires an explicit owned version CAS.
      publishAttempted=true;if(p.mode==='CREATE'){await link(record.temp_path,paths.target);await this.#options.beforeIO?.('UNLINK_TEMP',record);await unlink(record.temp_path);}else await rename(record.temp_path,paths.target);
      await syncDirectory(dirname(paths.target));const published=await this.#observe(paths.target,r.max_file_bytes);
      invariant(sameIdentity(published.identity,record.temp_identity!)&&published.sha256===record.artifact_ref.sha256&&published.bytes===record.artifact_ref.bytes,'STORAGE_PUBLICATION_UNVERIFIED');
      record=await this.#stage(record.id,'PUBLISHED',{published});return await this.#ack(record,false);
    }catch(error){
      await handle?.close().catch(()=>{});handle=undefined;
      if(record&&!this.#state.faulted){
        const reason=error instanceof NexusError?error.code:(error as NodeJS.ErrnoException).code??'STORAGE_IO_FAILURE';
        if(publishAttempted)await this.#stage(record.id,'INDETERMINATE',{reason}).catch(()=>{});
        else{let clean=false;try{if(await missing(record.temp_path))clean=true;else if(record.temp_identity){const info=await lstat(record.temp_path,{bigint:true});if(sameIdentity(identityOfStat(info),record.temp_identity)&&info.isFile()&&!info.isSymbolicLink()){await unlink(record.temp_path);clean=true;}}}catch{/* Keep ownership if cleanup is uncertain. */}
          if(clean)await this.#abort(record,reason).catch(()=>{});else await this.#stage(record.id,'INDETERMINATE',{reason,recovery_from:record.state}).catch(()=>{});}
      }
      throw error;
    }finally{this.#active.delete(ctx.operation_id);await handle?.close().catch(()=>{});}
  }
  async #abort(w:StorageWrite,reason:string):Promise<StorageWrite>{
    const result=await this.#state.change(w.subject,'STORAGE_FAILED_BEFORE_PUBLISH',()=>{
      const current=this.#state.get<StorageWrite>('STORAGE_WRITE',w.id)!;const id=keyFor(w.request.resource_id,w.request.path),c=this.#state.get<Claim>('STORAGE_CLAIM',id)!;
      invariant(c.operation_id===w.id,'STORAGE_CLAIM_CHANGED');this.#state.update('STORAGE_CLAIM',id,c.revision,'ABORTED',{...c,state:'ABORTED',revision:c.revision+1});
      const next={...current,state:'FAILED_BEFORE_PUBLISH' as const,reason,revision:current.revision+1,updated_at:now()};this.#state.update('STORAGE_WRITE',w.id,current.revision,next.state,next);return snapshot(next);
    },{operation_id:w.id,capacity_released:false,automatic_retry:false},w.id);await this.#options.onStage?.('FAILED_BEFORE_PUBLISH',result);return result;
  }
  async #ack(w:StorageWrite,reconciled:boolean):Promise<StorageWrite>{
    invariant(w.published,'STORAGE_PUBLICATION_UNVERIFIED');
    for await(const _chunk of this.#state.store.artifacts.read(w.artifact_ref)){/* full original content hash barrier */}
    const resource=this.#resource(w.request.resource_id),paths=await this.#paths(resource,w.request.path);
    invariant(canonical(await this.#observe(paths.target,resource.max_file_bytes))===canonical(w.published),'STORAGE_PUBLICATION_CHANGED_BEFORE_ACK');
    const finalState:StorageStage=reconciled?'RECONCILED':'AUDIT_ACKNOWLEDGED';
    const result=await this.#state.change(w.subject,'STORAGE_'+finalState,()=>{
      const current=this.#state.get<StorageWrite>('STORAGE_WRITE',w.id)!;invariant(['PUBLISHED','INDETERMINATE','PUBLISH_READY'].includes(current.state),'STORAGE_ACK_STATE');
      const id=keyFor(w.request.resource_id,w.request.path),version=this.#state.get<Version>('STORAGE_VERSION',id);
      invariant(!version||version.operation_id===w.id||version.version===w.version-1,'STORAGE_VERSION_CONFLICT');
      const next:Version={id,revision:version?version.revision+1:0,version:w.version,operation_id:w.id,resource_id:w.request.resource_id,path:w.request.path,file:w.published!,artifact_ref:w.artifact_ref};
      if(version)this.#state.update('STORAGE_VERSION',id,version.revision,'CURRENT',next);else this.#state.insert('STORAGE_VERSION',id,w.subject,'CURRENT',next);
      const c=this.#state.get<Claim>('STORAGE_CLAIM',id)!;invariant(c.operation_id===w.id,'STORAGE_CLAIM_CHANGED');this.#state.update('STORAGE_CLAIM',id,c.revision,'COMMITTED',{...c,state:'COMMITTED',revision:c.revision+1});
      const nextWrite={...current,published:w.published,state:finalState,reason:null,revision:current.revision+1,updated_at:now()};this.#state.update('STORAGE_WRITE',w.id,current.revision,finalState,nextWrite);
      this.#state.store.audit(auditEvent(identityOf(w.subject),{operation_id:w.id,operation_type:'STORAGE_COMMIT',phase:finalState,execution_status:finalState,artifact_refs:[w.artifact_ref],context_event_refs:[w.request.source.event_id],detail:{version:w.version,file:w.published,filesystem_transaction:false,automatic_retry:false} as unknown as Json}));return snapshot(nextWrite);
    },{operation_id:w.id,artifact_id:w.artifact_ref.artifact_id,file:w.published},w.id);
    await this.#options.onStage?.(finalState,result);return result;
  }
  acknowledged(id:string):boolean{
    const w=this.#state.get<StorageWrite>('STORAGE_WRITE',id);if(!w||!['AUDIT_ACKNOWLEDGED','RECONCILED'].includes(w.state)||!w.published)return false;
    return !!this.#state.store.db.prepare("SELECT 1 FROM anx_records r JOIN anx_exports e USING(seq) WHERE r.operation_id=? AND r.domain='audit' AND json_extract(r.body,'$.operation_type')='STORAGE_COMMIT'").get(id);
  }
  async recover(admin:unknown):Promise<number>{
    this.#state.checkAdmin(admin);let after:string|undefined,count=0;
    for(;;){const page=this.#state.list<StorageWrite>('STORAGE_WRITE',{...(after?{after}:{}),limit:32});if(!page.length)break;
      for(const w of page)if(w.boot_id!==this.#state.boot_id&&!TERMINAL.has(w.state)&&w.state!=='INDETERMINATE'){await this.#stage(w.id,'INDETERMINATE',{reason:'HOST_RESTART_REQUIRES_EXPLICIT_RECONCILIATION',recovery_from:w.state});count++;}after=page.at(-1)!.id;
    }return count;
  }
  async reconcile(admin:unknown,id:string):Promise<StorageWrite>{
    this.#state.checkAdmin(admin);invariant(!this.#active.has(id),'STORAGE_EXECUTOR_ACTIVE');invariant(this.#active.size<(this.#options.maxConcurrent??2),'STORAGE_BACKPRESSURE');
    this.#active.add(id);try{return await this.#reconcile(admin,id);}finally{this.#active.delete(id);}
  }
  async #reconcile(admin:unknown,id:string):Promise<StorageWrite>{
    let w=this.inspect(admin,id);if(w.state==='FAILED_BEFORE_PUBLISH')return w;
    if(this.acknowledged(id))return w;invariant(['INDETERMINATE','PUBLISHED','PUBLISH_READY'].includes(w.state),'STORAGE_RECONCILIATION_REQUIRED');
    const r=this.#resource(w.request.resource_id),paths=await this.#paths(r,w.request.path);
    try{
      if(w.recovery_from&&['REQUESTED','AUTHORIZED','WRITE_INTENT','TEMP_OBJECT_CREATED','CONTENT_WRITTEN','CONTENT_VERIFIED'].includes(w.recovery_from)){
        if(w.previous)invariant(canonical(await this.#observe(paths.target,r.max_file_bytes))===canonical(w.previous),'STORAGE_RECONCILIATION_UNVERIFIED');else invariant(await missing(paths.target),'STORAGE_RECONCILIATION_UNVERIFIED');
        if(!await missing(w.temp_path)){invariant(w.temp_identity,'STORAGE_RECONCILIATION_UNVERIFIED');const temp=await lstat(w.temp_path,{bigint:true});invariant(temp.isFile()&&!temp.isSymbolicLink()&&temp.nlink===1n&&sameIdentity(identityOfStat(temp),w.temp_identity),'STORAGE_RECONCILIATION_UNVERIFIED');await unlink(w.temp_path);}
        return await this.#abort(w,'EXPLICIT_RECONCILIATION_CONFIRMED_NO_PUBLICATION');
      }
      invariant(w.temp_identity,'STORAGE_RECONCILIATION_UNVERIFIED');
      const targetInfo=await lstat(paths.target,{bigint:true});
      if(targetInfo.nlink===2n){
        const target=await this.#observe(paths.target,r.max_file_bytes,2),temp=await this.#observe(w.temp_path,r.max_file_bytes,2);
        invariant(sameIdentity(target.identity,w.temp_identity)&&canonical(target)===canonical(temp)&&target.sha256===w.artifact_ref.sha256&&target.bytes===w.artifact_ref.bytes,'STORAGE_RECONCILIATION_UNVERIFIED');
        // Explicit owner reconciliation removes only its proven second name, never republishes content.
        await unlink(w.temp_path);
      }
      const actual=await this.#observe(paths.target,r.max_file_bytes);
      invariant(sameIdentity(actual.identity,w.temp_identity)&&actual.sha256===w.artifact_ref.sha256&&actual.bytes===w.artifact_ref.bytes,'STORAGE_RECONCILIATION_UNVERIFIED');
      w={...w,published:actual};return await this.#ack(w,true);
    }catch(e){if(w.state!=='INDETERMINATE')await this.#stage(id,'INDETERMINATE',{reason:'RECONCILIATION_EVIDENCE_INSUFFICIENT'});throw e;}
  }
  activeCount():number{return this.#active.size;}
}
