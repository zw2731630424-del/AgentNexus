import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir,mkdtemp,readFile,writeFile,readdir,stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { storageFixture,prepare,execute,limits } from './m161-storage-fixture.ts';
import { openHarness } from '../../src/agentnexus/harness/index.ts';
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { sha256 } from '../../src/agentnexus/types.ts';
import type { StorageWrite } from '../../src/agentnexus/harness/storage-owner.ts';
import type { Budget } from '../../src/agentnexus/resources/contracts.ts';
const base=process.env.AGENTNEXUS_TEST_DATA_ROOT??join(tmpdir(),'AgentNexus-M161');await mkdir(base,{recursive:true});
const fixture=()=>mkdtemp(join(base,'storage-'));

test('M161 STORAGE real atomic CREATE binds exact approval, content, Artifact/Audit and persistent budget ownership',async()=>{
  const root=await fixture(),h=await storageFixture(root);
  try{const content=Buffer.from('owned publication');await prepare(h,content,content.length);const result=await execute(h);assert.equal(result.state,'SUCCEEDED',result.reason??'');
    const writes=h.state.list<StorageWrite>('STORAGE_WRITE',{limit:32});assert.equal(writes.length,1);const w=writes[0];assert.equal(w.state,'AUDIT_ACKNOWLEDGED');assert.equal(w.published!.sha256,sha256(content));assert.equal(w.published!.bytes,content.length);
    assert.equal((await readFile(join(root,'files/result.txt'))).toString(),content.toString());assert.equal((await stat(join(root,'files/result.txt'))).nlink,1);
    assert.equal(h.state.get<Budget>('resource_budget','platform')!.held.disk_bytes,content.length);assert.equal(h.state.get<Budget>('resource_budget','platform')!.held.workers,0);
    assert.equal(h.state.get<Budget>('resource_budget',h.inspectAgent('writer').subject.resource_budget_id)!.held.disk_bytes,0);assert.equal(h.state.count('resource_storage_claim'),1);
    assert.equal((await h.administration.reconcileStorage(w.id)).id,w.id);assert.equal(h.state.count('STORAGE_WRITE'),1);
    await assert.rejects(h.administration.dispatch('task'),/TASK_DISPATCH_STATE/);assert.equal(h.state.count('STORAGE_WRITE'),1);await h.store.verify();
  }finally{await h.close();}
});

test('M161 STORAGE unauthorized write is rejected before files and before owner intent',async()=>{
  const root=await fixture(),h=await storageFixture(root);try{await prepare(h,Buffer.from('data'),4);await h.administration.resumeTask('task');const result=await h.administration.dispatch('task');
    assert.equal(result.state,'WAITING');assert.equal(h.state.count('STORAGE_WRITE'),0);assert.deepEqual(await readdir(join(root,'files')),[]);
    await assert.rejects(h.administration.requestStorageWrite('task',{resource_id:'other:files'}),/STORAGE_REQUEST/);
    assert.equal('store' in h.bindAgent('writer'),false);
  }finally{await h.close();}
});

test('M161 STORAGE no-clobber CREATE preserves unowned history',async()=>{
  const root=await fixture(),h=await storageFixture(root);try{await writeFile(join(root,'files/result.txt'),'historical bytes');await prepare(h,Buffer.from('new'),3);const result=await execute(h);
    assert.equal(result.state,'UNKNOWN_QUARANTINED');assert.equal((await readFile(join(root,'files/result.txt'))).toString(),'historical bytes');assert.equal(h.state.count('STORAGE_WRITE'),0);
    assert.equal(h.state.get<Budget>('resource_budget','platform')!.held.disk_bytes,3);
  }finally{await h.close();}
});

test('M161 STORAGE REPLACE requires the exact owned version; original Artifact remains reconstructible',async()=>{
  const root=await fixture(),h=await storageFixture(root);try{
    await prepare(h,Buffer.from('old'),3);assert.equal((await execute(h)).state,'SUCCEEDED');const old=h.administration.storageVersion('project:files','result.txt')!;
    await h.administration.createAgent({id:'next',project_id:'project',task_id:'next-task',type:'DEVELOPMENT',budget:{...limits,workers:1},file_scope:['project:files'],tools:[{tool_id:'native.storage.write',version:'1',capability:'LOCAL_WRITE',resources:['project:files']}]});
    await prepare(h,Buffer.from('replacement'),11,{mode:'REPLACE',expected_version:old.version,expected_sha256:old.file.sha256},'next','next-task');assert.equal((await execute(h,'next-task')).state,'SUCCEEDED');
    assert.equal((await readFile(join(root,'files/result.txt'))).toString(),'replacement');const current=h.administration.storageVersion('project:files','result.txt')!;assert.equal(current.version,2);assert.notDeepEqual(current.file.identity,old.file.identity);
    const chunks:Buffer[]=[];for await(const c of h.store.artifacts.read(old.artifact_ref))chunks.push(Buffer.from(c));assert.equal(Buffer.concat(chunks).toString(),'old');assert.equal(h.state.get<Budget>('resource_budget','platform')!.held.disk_bytes,14);
  }finally{await h.close();}
});

test('M161 STORAGE bounded streaming verifies 3 MiB without materializing the input in the request',async()=>{
  const root=await fixture(),h=await storageFixture(root);try{const bytes=3*1024*1024;async function* chunks(){for(let i=0;i<bytes/65536;i++)yield Buffer.alloc(65536,65);}
    await prepare(h,chunks(),bytes);assert.equal((await execute(h)).state,'SUCCEEDED');const v=h.administration.storageVersion('project:files','result.txt')!;assert.equal(v.file.bytes,bytes);assert.equal((await stat(join(root,'files/result.txt'))).size,bytes);
    assert(h.store.artifacts.stats.maxInputChunk<=65536);
  }finally{await h.close();}
});

for(const code of ['ENOSPC','EACCES'])test(`M161 STORAGE injected ${code} before publication leaves no target and quarantines original operation`,async()=>{
  const root=await fixture(),h=await storageFixture(root,{storage:{beforeIO:phase=>{if(phase==='WRITE_CHUNK')throw Object.assign(new Error('synthetic I/O fault'),{code});}}});
  try{await prepare(h,Buffer.from('data'),4);const result=await execute(h);assert.equal(result.state,'UNKNOWN_QUARANTINED');const w=h.state.list<StorageWrite>('STORAGE_WRITE',{limit:1})[0];assert.equal(w.state,'FAILED_BEFORE_PUBLISH');assert.equal(w.reason,code);assert.deepEqual(await readdir(join(root,'files')),[]);assert.equal(h.state.get<Budget>('resource_budget','platform')!.held.disk_bytes,4);await assert.rejects(h.administration.resumeTask('task'),/TASK_RESUME_STATE/);
  }finally{await h.close();}
});

test('M161 STORAGE publish-link gap is reconciled by identity/hash without republishing',async()=>{
  const root=await fixture();let failed=false;const h=await storageFixture(root,{storage:{beforeIO:phase=>{if(phase==='UNLINK_TEMP'&&!failed){failed=true;throw Object.assign(new Error('synthetic unlink interruption'),{code:'EIO'});}}}});
  try{await prepare(h,Buffer.from('data'),4);assert.equal((await execute(h)).state,'UNKNOWN_QUARANTINED');const w=h.state.list<StorageWrite>('STORAGE_WRITE',{limit:1})[0];assert.equal(w.state,'INDETERMINATE');assert.equal((await stat(join(root,'files/result.txt'))).nlink,2);
    const r=await h.administration.reconcileStorage(w.id);assert.equal(r.state,'RECONCILED');assert.equal((await stat(join(root,'files/result.txt'))).nlink,1);assert.equal(h.state.get<Budget>('resource_budget','platform')!.held.workers,1);
    assert.equal((await h.administration.reconcileStorage(w.id)).id,w.id);
  }finally{await h.close();}
});

test('M161 STORAGE concurrent same-resource writers conflict before the second file effect',async()=>{
  const root=await fixture();let release!:()=>void,ready!:()=>void;const reached=new Promise<void>(r=>ready=r),gate=new Promise<void>(r=>release=r);let blocked=false;
  const h=await storageFixture(root,{storage:{onStage:async stage=>{if(stage==='WRITE_INTENT'&&!blocked){blocked=true;ready();await gate;}}}});
  try{await h.administration.createAgent({id:'second',project_id:'project',task_id:'second-task',type:'DEVELOPMENT',budget:{...limits,workers:1},file_scope:['project:files'],tools:[{tool_id:'native.storage.write',version:'1',capability:'LOCAL_WRITE',resources:['project:files']}]});
    await prepare(h,Buffer.from('first'),5);await prepare(h,Buffer.from('second'),6,{},'second','second-task');const first=execute(h);await reached;
    const second=await execute(h,'second-task');assert.equal(second.state,'FAILED');assert.equal(second.reason,'WORKSPACE_BUSY');release();assert.equal((await first).state,'SUCCEEDED');assert.equal(h.state.count('STORAGE_WRITE'),1);assert.equal((await readFile(join(root,'files/result.txt'))).toString(),'first');
  }finally{release();await h.close();}
});

test('M161 STORAGE changed bytes between publication and ACK stay UNKNOWN and cannot be reconciled by pathname',async()=>{
  const root=await fixture();const h=await storageFixture(root,{storage:{onStage:async stage=>{if(stage==='PUBLISHED')await writeFile(join(root,'files/result.txt'),'xxxx');}}});
  try{await prepare(h,Buffer.from('data'),4);assert.equal((await execute(h)).state,'UNKNOWN_QUARANTINED');const w=h.state.list<StorageWrite>('STORAGE_WRITE',{limit:1})[0];assert.equal(w.state,'INDETERMINATE');assert.equal(w.reason,'STORAGE_PUBLICATION_CHANGED_BEFORE_ACK');
    await assert.rejects(h.administration.reconcileStorage(w.id),/STORAGE_RECONCILIATION_UNVERIFIED/);assert.equal(h.administration.inspectStorage(w.id).state,'INDETERMINATE');assert.equal(h.state.count('resource_storage_claim'),0);assert.equal(h.state.get<Budget>('resource_budget','platform')!.held.disk_bytes,4);
  }finally{await h.close();}
});

test('M161 STORAGE persistent resource quota rejects a second allocation before a temporary object',async()=>{
  const root=await fixture(),h=await storageFixture(root,{},10);try{
    await prepare(h,Buffer.from('first'),5);assert.equal((await execute(h)).state,'SUCCEEDED');
    await h.administration.createAgent({id:'next',project_id:'project',task_id:'next-task',type:'DEVELOPMENT',budget:{...limits,workers:1},file_scope:['project:files'],tools:[{tool_id:'native.storage.write',version:'1',capability:'LOCAL_WRITE',resources:['project:files']}]});
    await prepare(h,Buffer.from('second'),6,{path:'other.txt'},'next','next-task');assert.equal((await execute(h,'next-task')).state,'UNKNOWN_QUARANTINED');
    assert.deepEqual(await readdir(join(root,'files')),['result.txt']);assert.equal(h.state.count('STORAGE_WRITE'),1);assert.equal((await readFile(join(root,'files/result.txt'))).toString(),'first');
  }finally{await h.close();}
});

for(const stage of ['REQUESTED','AUTHORIZED','WRITE_INTENT','TEMP_OBJECT_CREATED','WRITE_CHUNK','CONTENT_WRITTEN','CONTENT_VERIFIED','PUBLISH_READY','UNLINK_TEMP','PUBLISHED','AUDIT_ACKNOWLEDGED'])test(`M161 STORAGE REAL_PROCESS_CRASH at ${stage} preserves evidence and never automatically retries`,async()=>{
  const root=await fixture(),child=spawn(process.execPath,[fileURLToPath(new URL('./m161-storage-child.mjs',import.meta.url)),root,stage],{windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});
  let stderr='';child.stderr!.on('data',c=>{if(stderr.length<65536)stderr+=c;});const exited=once(child,'exit');let timer:ReturnType<typeof setTimeout>|undefined;let id:string;
  try{const event=await Promise.race([once(child,'message'),exited.then(()=>{throw Error('child exited before crash point: '+stderr);}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('child stage timeout: '+stderr)),15000);})]);id=(event[0] as {operation_id:string}).operation_id;}
  finally{clearTimeout(timer);child.kill();await exited;}
  const lock=await KernelStore.recoverAbandonedLock(join(root,'host'));assert.equal(lock.recovered,true);const h=await openHarness(join(root,'host'));
  try{assert.equal(h.state.count('STORAGE_WRITE'),1);const before=h.administration.inspectStorage(id!);
    if(['UNLINK_TEMP','PUBLISHED'].includes(stage)){const recovered=await h.administration.reconcileStorage(id!);assert.equal(recovered.state,'RECONCILED');assert.equal((await readFile(join(root,'files/result.txt'))).toString(),'durable child content');}
    else if(stage==='AUDIT_ACKNOWLEDGED'){assert.equal(before.state,'AUDIT_ACKNOWLEDGED');assert.equal((await h.administration.reconcileStorage(id!)).id,id!);}
    else if(stage==='PUBLISH_READY'){assert.equal(before.state,'INDETERMINATE');await assert.rejects(h.administration.reconcileStorage(id!));assert.equal(h.administration.inspectStorage(id!).state,'INDETERMINATE');}
    else{assert.equal(before.state,'INDETERMINATE');assert.equal((await h.administration.reconcileStorage(id!)).state,'FAILED_BEFORE_PUBLISH');assert.deepEqual(await readdir(join(root,'files')),[]);}
    assert.equal(h.inspectTask('task').state,'UNKNOWN_QUARANTINED');assert.equal(h.state.get<Budget>('resource_budget','platform')!.held.workers,1);assert.equal(h.state.count('STORAGE_WRITE'),1);await assert.rejects(h.administration.resumeTask('task'),/TASK_RESUME_STATE/);await h.store.verify();
  }finally{await h.close();}
});
