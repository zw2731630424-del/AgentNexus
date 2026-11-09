import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { initializeControl, metadata } from '../../src/agentnexus/control.ts';
import { RuntimeControl } from '../../src/agentnexus/runtime/control.ts';
import { ExecutionBroker } from '../../src/agentnexus/runtime/broker.ts';
import { AuditProducerSDK } from '../../src/agentnexus/runtime/audit.ts';
import { encodeFrame, decodeFrame, FrameReader } from '../../src/agentnexus/runtime/ipc.ts';
import { canonical, invariant, sha256, uid } from '../../src/agentnexus/types.ts';
import { openHost } from '../../src/agentnexus/host.ts';
import type { Envelope, ExitObservation, ProcessIdentity, ObservationProvider, SandboxProfile } from '../../src/agentnexus/runtime/contracts.ts';

const logical={agent_id:'agent',project_id:'project',task_id:'task',session_id:'session',role:'worker'};
const processIdentity: ProcessIdentity={os:'windows',principal:'S-1-5-21-123-456-789-1001',pid:12,start_id:'123456789',os_session:'1'};
const parent={...processIdentity,pid:11,start_id:'123456788'};
const profile: SandboxProfile={id:'contract-only',version:1,os:'windows',os_version:'model',principal:processIdentity.principal,accessible:['workspace'],read_only:[],writable:['workspace'],network:'DENY',limits:{memory_bytes:1048576,cpu_ms:1000,wall_ms:2000,file_bytes:1048576,processes:4,output_bytes:65536},lifetime:'ONE_OPERATION',exit_requirement:'COMPLETE_PROCESS_TREE'};
async function caseRoot(){const base=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT??'.workflow-kit/runtime/AgentNexus-M1.3/data','runtime'); await mkdir(base,{recursive:true});return mkdtemp(join(base,'case-'));}
async function fixture(t: test.TestContext){
  const root=await caseRoot(),store=await KernelStore.open(root);initializeControl(store);
  const token=Object.freeze({}),channel=Object.freeze({}),flags={on:true};
  let peer=structuredClone(processIdentity);
  let exit:ExitObservation={process:processIdentity,parent,container_id:'model-job',members:[{process:processIdentity,exit_code:0,exited:true}],termination_requested_at:null,root_exited:true,tree_empty:true,membership_complete:false,unknown_members:true,handles_closed:false,outputs_closed:false,observed_at:new Date().toISOString(),source:'MODEL'};
  const provider:ObservationProvider={assurance:'MODEL',peer:async c=>{invariant(c===channel,'MODEL_UNKNOWN_CHANNEL');return structuredClone(peer);},exit:async()=>structuredClone(exit)};
  const admin=(a:unknown)=>invariant(a===token,'ADMIN_CAPABILITY_REQUIRED');
  const control=new RuntimeControl(store,admin,provider,()=>flags.on);
  const b=await control.create(token,logical,processIdentity,parent,profile);
  t.after(async()=>{await control.close();await store.close();});
  return {root,store,token,channel,control,b,flags,provider,admin,setPeer:(p:ProcessIdentity)=>{peer=p;},setExit:(o:Partial<ExitObservation>)=>{exit={...exit,...o};}};
}
async function active(t:test.TestContext){const f=await fixture(t);const connection=await f.control.authenticate(f.token,f.b.runtime_id,f.channel);await f.control.activate(f.token,connection.handle);return {...f,connection};}
async function request(f:Awaited<ReturnType<typeof active>>,changes:Partial<Envelope>={},kind:'PURE'|'READ_ONLY'|'PROCESS'='PURE',lifetime=10000){
  const payload={tool:'synthetic-echo',value:1},operation_id=f.b.runtime_id,payload_hash=sha256(canonical(payload));
  const capability_id=await f.control.issue(f.token,f.connection.handle,{operation_id,resource_id:'project:synthetic',payload_hash,kind},lifetime);
  const m=metadata(f.store);
  const expiry=JSON.parse((f.store.db.prepare('SELECT lease FROM runtime_capabilities WHERE id=?').get(capability_id) as any).lease).expires_at;
  const e:Envelope={schema:'agentnexus/ipc/1',...logical,request_id:uid(),runtime_id:f.b.runtime_id,runtime_session_id:f.b.runtime_session_id,worker_instance_id:f.b.worker_instance_id,operation_id,capability_id,resource_id:'project:synthetic',policy_epoch:m.policy_epoch,feature_epoch:m.feature_epoch,payload_hash,nonce:randomBytes(32).toString('hex'),deadline:Math.min(expiry,Date.now()+9000),connection_id:f.connection.connection_id,profile_hash:f.b.profile_hash,payload,...changes};
  delete (e as any).role;
  return {e,frame:encodeFrame(e,f.connection.secret).subarray(4)};
}
test('M13-IDENTITY: only trusted bootstrap creates bindings; malformed logical/process/profile denied',async t=>{
  const f=await fixture(t);
  await assert.rejects(f.control.create({},logical,processIdentity,parent,profile),{code:'ADMIN_CAPABILITY_REQUIRED'});
  await assert.rejects(f.control.create(f.token,{...logical,os_user:'admin'} as any,processIdentity,parent,profile),{code:'RUNTIME_INVALID_FIELDS'});
  await assert.rejects(f.control.create(f.token,logical,{...processIdentity,start_id:''},parent,profile),{code:'RUNTIME_INVALID_PROCESS'});
  await assert.rejects(f.control.create(f.token,logical,{...processIdentity,pid:13},parent,{...profile,network:'ALLOW'} as any),{code:'RUNTIME_INVALID_PROFILE'});
  assert.equal(f.control.inspect(f.token,f.b.runtime_id).state,'CREATED'); assert.equal(Object.isFrozen(f.b.process),true);
});
test('M13-IDENTITY: real peer tuple required; PID reuse, SID and session mismatch rejected in contract model',async t=>{
  const f=await fixture(t);
  for(const p of [{...processIdentity,start_id:'999'},{...processIdentity,pid:99},{...processIdentity,principal:'S-1-5-18'},{...processIdentity,os_session:'2'}]){
    f.setPeer(p);await assert.rejects(f.control.authenticate(f.token,f.b.runtime_id,f.channel),{code:'IPC_PEER_MISMATCH'});
  }
});
test('M13-IDENTITY: CREATED/AUTHENTICATED/ACTIVE/REVOKING/REVOKED audited; revoke is immediate',async t=>{
  const f=await active(t),{frame}=await request(f);
  const revoked=f.control.revoke(f.token,f.b.runtime_id,'Task authorization explicitly revoked');
  await assert.rejects(f.control.consume(f.connection.handle,frame),{code:'IPC_UNAUTHENTICATED'});await revoked;
  assert.equal(f.control.inspect(f.token,f.b.runtime_id).state,'REVOKED');
  const records=f.store.query('audit',{project_id:'project',limit:100});
  assert.ok(records.some((r:any)=>r.body.detail.observation?.state==='REVOKING'));
});
test('M13-IPC: exact contract request consumes one capability and returns no execution authority',async t=>{
  const f=await active(t),{frame}=await request(f);const r=await f.control.consume(f.connection.handle,frame);
  assert.equal(r.status,'AUTHORIZED_CONTRACT_ONLY');assert.equal(r.execution,'BLOCKED');
  await assert.rejects(f.control.consume(f.connection.handle,frame),{code:'CAPABILITY_INVALID'});
  assert.equal((f.store.db.prepare('SELECT COUNT(*) n FROM runtime_requests').get() as any).n,1);
});
test('M13-IPC: authenticated Worker cannot change logical/runtime/task/instance/resource/profile/payload',async t=>{
  const f=await active(t);
  const changes:Partial<Envelope>[]=[{agent_id:'other'},{task_id:'other'},{session_id:'other'},{worker_instance_id:'other'},{runtime_id:'other'},{runtime_session_id:'other'},{connection_id:'other'},{profile_hash:'a'.repeat(64)},{resource_id:'project:other'},{payload:{value:2},payload_hash:sha256(canonical({value:2}))}];
  for(const change of changes){const {frame}=await request(f,change);await assert.rejects(f.control.consume(f.connection.handle,frame));}
  assert.equal((f.store.db.prepare('SELECT COUNT(*) n FROM runtime_requests').get() as any).n,0);
});
test('M13-IPC: concurrent duplicate, request/operation and nonce replay reject atomically',async t=>{
  const f=await active(t),{frame,e}=await request(f);
  const results=await Promise.allSettled(Array.from({length:8},()=>f.control.consume(f.connection.handle,frame)));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const fresh=await request(f,{nonce:e.nonce});await assert.rejects(f.control.consume(f.connection.handle,fresh.frame),{code:'IPC_REPLAY'});
  const sameOp=await request(f,{operation_id:e.operation_id});await assert.rejects(f.control.consume(f.connection.handle,sameOp.frame),{code:'IPC_REPLAY'});
});
test('M13-IPC: MAC tamper, invalid UTF8, unknown/duplicate keys and malformed frame fail closed',async t=>{
  const f=await active(t),{frame,e}=await request(f);const p=JSON.parse(frame.toString());p.mac='0'.repeat(64);
  assert.throws(()=>decodeFrame(Buffer.from(canonical(p)),f.connection.secret),{code:'IPC_MAC'});
  assert.throws(()=>decodeFrame(Buffer.from([0xff]),f.connection.secret));
  assert.throws(()=>decodeFrame(Buffer.from('{"mac":"x","mac":"y","envelope":{}}'),f.connection.secret),{code:'IPC_NONCANONICAL'});
  assert.throws(()=>encodeFrame({...e,admin:true} as any,f.connection.secret),{code:'RUNTIME_INVALID_FIELDS'});
  const reader=new FrameReader(),all=encodeFrame(e,f.connection.secret);assert.equal(reader.push(all.subarray(0,2)),null);assert.equal(reader.push(all.subarray(2,7)),null);assert.deepEqual(reader.push(all.subarray(7)),frame);
  const bad=new FrameReader();assert.throws(()=>bad.push(Buffer.from([0,1,0,1])),{code:'IPC_FRAME_LIMIT'});assert.throws(()=>bad.push(Buffer.from([1])),{code:'IPC_READER_CLOSED'});
  assert.throws(()=>new FrameReader().push(Buffer.concat([all,all])),{code:'IPC_PIPELINING_FORBIDDEN'});
});
test('M13-IPC: expiry, clock lease and epochs reject old capabilities',async t=>{
  const f=await active(t),a=await request(f,{},'PURE',30);await delay(40);await assert.rejects(f.control.consume(f.connection.handle,a.frame),{code:'IPC_EXPIRED'});
  const b=await request(f);f.store.db.exec('UPDATE control_meta SET policy_epoch=policy_epoch+1');await assert.rejects(f.control.consume(f.connection.handle,b.frame),{code:'IPC_EPOCH_STALE'});
});
test('M13-IPC: revocation while peer observation is pending fences consume',async t=>{
  const f=await active(t),{frame}=await request(f);let resume!:(p:ProcessIdentity)=>void;
  f.provider.peer=async()=>new Promise(r=>{resume=r;});const consuming=f.control.consume(f.connection.handle,frame);await delay(1);
  const checked=assert.rejects(consuming,{code:'IPC_CONNECTION_CLOSED'});
  await f.control.revoke(f.token,f.b.runtime_id,'Revoke while native peer lookup is pending');resume(processIdentity);
  await checked;assert.equal((f.store.db.prepare('SELECT COUNT(*) n FROM runtime_requests').get() as any).n,0);
});
test('M13-IPC: authorization barrier failure consumes no second request and retains original operation',async t=>{
  const f=await active(t),{frame,e}=await request(f),flush=f.store.flush.bind(f.store);let changed=false;
  f.store.flush=async()=>{await flush();if(!changed&&f.store.db.prepare('SELECT 1 FROM runtime_requests').get()){changed=true;f.store.db.exec('UPDATE control_meta SET feature_epoch=feature_epoch+1');}};
  try {await assert.rejects(f.control.consume(f.connection.handle,frame),{code:'IPC_AUTHORIZATION_REVOKED'});}finally{f.store.flush=flush;}
  assert.equal((f.store.db.prepare('SELECT operation FROM runtime_requests').get() as any).operation,e.operation_id);
  await assert.rejects(f.control.consume(f.connection.handle,frame));
});
test('M13-FEATURE: OFF blocks new IPC; Broker remains blocked for every capability and mode',async t=>{
  const f=await active(t),{frame}=await request(f);f.flags.on=false;await assert.rejects(f.control.consume(f.connection.handle,frame),{code:'RUNTIME_FEATURE_UNAVAILABLE'});
  const broker=new ExecutionBroker();for(const kind of ['PURE','READ_ONLY','LOCAL_WRITE','PROCESS','EXTERNAL_EFFECT'])for(const mode of ['ENFORCE','AUDIT_ONLY','DISABLED'])assert.throws(()=>broker.dispatch({kind,mode,requires_sandbox:false,verified:true}),{code:'BROKER_OS_DEPLOYMENT_BLOCKED'});
});
test('M13-IPC: PROCESS capability cannot use protocol-only admission',async t=>{
  const f=await active(t),{frame}=await request(f,{},'PROCESS');await assert.rejects(f.control.consume(f.connection.handle,frame),{code:'BROKER_PROFILE_NOT_VERIFIED'});
});
test('M13-RECOVERY: IPC loss preserves operation ID and all five resource reservations',async t=>{
  const f=await active(t),{frame,e}=await request(f);await f.control.consume(f.connection.handle,frame);
  await f.control.reserve(f.token,f.b.runtime_id,e.operation_id,['WRITER','WORKSPACE_LOCK','WORKER_QUOTA','PROCESS_SLOT','SANDBOX_RESERVATION'].map(kind=>({kind:kind as any,resource:'project:'+kind})));
  await f.control.disconnect(f.connection.handle);
  assert.equal(f.control.inspect(f.token,f.b.runtime_id).state,'UNKNOWN_QUARANTINED');
  assert.equal((f.store.db.prepare('SELECT operation,state FROM runtime_requests').get() as any).operation,e.operation_id);
  assert.equal((f.store.db.prepare('SELECT COUNT(*) n FROM runtime_resources WHERE state=\'UNKNOWN_QUARANTINED\'').get() as any).n,5);
});
test('M13-EXIT: incomplete evidence, parent-only exit and even complete MODEL proof cannot release',async t=>{
  const f=await active(t),operation=uid();await f.control.reserve(f.token,f.b.runtime_id,operation,[{kind:'WRITER',resource:'project:locked'}]);
  const proof=await f.control.observeExit(f.token,f.b.runtime_id,operation);assert.equal(proof.state,'PROCESS_EXITED');assert.equal(proof.production_release_authority,false);
  await assert.rejects(f.control.release(f.token,f.b.runtime_id,operation,proof.proof_id),{code:'FULL_OS_PROFILE_NOT_VERIFIED'});
  await assert.rejects(f.control.release(f.token,f.b.runtime_id,uid(),proof.proof_id),{code:'EXIT_PROOF_REQUIRED'});
  assert.equal((f.store.db.prepare('SELECT state FROM runtime_resources').get() as any).state,'UNKNOWN_QUARANTINED');
  assert.throws(()=>f.store.db.prepare("DELETE FROM runtime_exit_proofs").run(),/append only/);
});
test('M13-EXIT: termination request is separate from tree exit and abnormal exit is independent state',async t=>{
  const f=await active(t),operation=uid();await f.control.reserve(f.token,f.b.runtime_id,operation,[{kind:'PROCESS_SLOT',resource:'project:slot'}]);f.setExit({root_exited:false,tree_empty:false,termination_requested_at:new Date().toISOString(),members:[{process:processIdentity,exited:false,exit_code:null}]});
  const proof=await f.control.observeExit(f.token,f.b.runtime_id,operation);assert.equal(proof.state,'TERMINATION_REQUESTED');assert.equal(f.control.inspect(f.token,f.b.runtime_id).state,'ACTIVE');
  f.setExit({root_exited:true,members:[{process:processIdentity,exited:true,exit_code:77}]});await f.control.observeExit(f.token,f.b.runtime_id,operation);assert.equal(f.control.inspect(f.token,f.b.runtime_id).state,'ABNORMAL_EXIT');
});
test('M13-EXIT: mismatched start identity and untrusted proof source are rejected',async t=>{
  const f=await active(t),operation=uid();await f.control.reserve(f.token,f.b.runtime_id,operation,[{kind:'PROCESS_SLOT',resource:'project:slot'}]);f.setExit({process:{...processIdentity,start_id:'999'}});await assert.rejects(f.control.observeExit(f.token,f.b.runtime_id,operation),{code:'EXIT_IDENTITY_MISMATCH'});
  f.setExit({process:processIdentity,source:'WINDOWS_PRIMITIVE'});await assert.rejects(f.control.observeExit(f.token,f.b.runtime_id,operation),{code:'EXIT_IDENTITY_MISMATCH'});
});
test('M13-RECOVERY: new Host boot quarantines old identities and resources; original M12 Writer remains',async t=>{
  const f=await active(t),operation=uid();await f.control.reserve(f.token,f.b.runtime_id,operation,[{kind:'WRITER',resource:'project:new'}]);
  f.store.db.prepare('INSERT INTO control_operations(operation_id,request_key,intent_hash,subject,state,executor_state) VALUES(?,?,?,?,?,?)').run(operation,'m12-key','a'.repeat(64),'agent','INDETERMINATE','UNKNOWN');
  f.store.db.prepare('INSERT INTO control_writers VALUES(?,?,?)').run('project:original',operation,1);
  await f.control.close();await f.store.close();
  const store=await KernelStore.open(f.root);initializeControl(store);const restored=new RuntimeControl(store,f.admin,f.provider,()=>true);
  try{await restored.recover();assert.equal(restored.inspect(f.token,f.b.runtime_id).state,'UNKNOWN_QUARANTINED');assert.equal((store.db.prepare('SELECT state FROM runtime_resources').get() as any).state,'UNKNOWN_QUARANTINED');assert.ok(store.db.prepare('SELECT 1 FROM control_writers WHERE operation_id=?').get(operation));await assert.rejects(restored.authenticate(f.token,f.b.runtime_id,f.channel),{code:'RUNTIME_AUTH_STATE'});}finally{await restored.close();await store.close();}
});
test('M13-AUDIT: Worker producer cannot declare RESULT; correlation records append',async t=>{
  const f=await fixture(t),sdk=new AuditProducerSDK(f.store),c={operation_id:uid(),runtime_id:f.b.runtime_id,worker_instance_id:f.b.worker_instance_id,sandbox_profile_id:profile.id,resource_id:'project:synthetic'};
  assert.throws(()=>sdk.producer('worker',true),{code:'AUDIT_RESULT_OWNER'});assert.throws(()=>sdk.producer('worker').emit(logical,c,'RESULT'),{code:'AUDIT_RESULT_OWNER'});
  sdk.producer('ipc').emit(logical,c,'REQUESTED');sdk.producer('process',true).emit(logical,c,'RESULT',{observation:'trusted owner only'});await f.store.flush();
  assert.ok(f.store.query('audit',{project_id:'project'}).some((r:any)=>r.body.operation_id===c.operation_id&&r.body.detail.runtime_id===f.b.runtime_id));
});
test('M13-FEATURE: Host Agent facade has no runtime/admin and independent owners cannot be disabled',async()=>{
  const host=await openHost(await caseRoot()),agent=host.bindAgent({agent_id:logical.agent_id,project_id:logical.project_id,task_id:logical.task_id,session_id:logical.session_id});
  try{assert.equal((agent as any).runtime,undefined);assert.equal((agent as any).administration,undefined);assert.equal(host.administration.runtime.brokerStatus().status,'BLOCKED');
    for(const owner of ['P.RUNTIME_IDENTITY','P.IPC_PEER','P.WORKER_SCOPE','P.SANDBOX_PROFILE','P.PROCESS_OWNER','P.EXIT_PROOF','P.RESOURCE_RELEASE'])await assert.rejects(host.administration.prepareMode({scope:{},mode:'DISABLED',policy_ids:[owner],reason:'Attempt to disable independent OS owner',expires_at:new Date(Date.now()+10000).toISOString()},host.administration.metadata().policy_revision),{code:'NON_DEGRADABLE_POLICY'});
    assert.equal((await agent.request({call_id:'echo',tool_id:'native.echo',tool_version:'1',arguments:{value:1}})).status,'PASS');
  }finally{await agent.close();await host.close();}
});
test('M13-IR: exit observation cannot attach to unowned operation; one-operation profile is fixed',async t=>{
  const f=await active(t);await assert.rejects(f.control.observeExit(f.token,f.b.runtime_id,uid()),{code:'RUNTIME_OPERATION_MISMATCH'});
  const a=await request(f);await assert.rejects(f.control.issue(f.token,f.connection.handle,{operation_id:uid(),resource_id:a.e.resource_id,payload_hash:a.e.payload_hash,kind:'PURE'}),{code:'RUNTIME_OPERATION_MISMATCH'});
  assert.equal((f.store.db.prepare('SELECT COUNT(*) n FROM runtime_exit_proofs').get() as any).n,0);
});
test('M13-IR: stalled peer observation times out; unresolved native work remains bounded',async t=>{
  const f=await active(t),a=await request(f,{},'PURE',1000);f.provider.peer=async()=>new Promise<ProcessIdentity>(()=>{});
  const stuck=Array.from({length:32},()=>f.control.consume(f.connection.handle,a.frame).then(()=> 'AUTHORIZED',e=>e.code));
  await delay(1100);const outcomes=await Promise.all(stuck);assert.ok(outcomes.every(x=>x==='RUNTIME_OBSERVATION_TIMEOUT'),JSON.stringify(outcomes));
  f.provider.peer=async()=>structuredClone(processIdentity);const fresh=await request(f);await assert.rejects(f.control.consume(f.connection.handle,fresh.frame),{code:'NATIVE_OBSERVER_UNSETTLED'});
});
test('M13-IR: terminal observed exit recycles authenticated connection slots without releasing resources',async t=>{
  const f=await fixture(t);
  for(let i=0;i<33;i++){
    const p={...processIdentity,pid:100+i,start_id:String(900000+i)};const b=await f.control.create(f.token,{...logical,session_id:'exit-'+i},p,parent,profile);f.setPeer(p);
    const c=await f.control.authenticate(f.token,b.runtime_id,f.channel);await f.control.activate(f.token,c.handle);const op=uid();
    await f.control.reserve(f.token,b.runtime_id,op,[{kind:'PROCESS_SLOT',resource:'project:exit-slot-'+i}]);
    f.setExit({process:p,parent,members:[{process:p,exited:true,exit_code:0}],root_exited:true,tree_empty:true});await f.control.observeExit(f.token,b.runtime_id,op);
    await f.control.revoke(f.token,b.runtime_id,'Idempotent cleanup after observed exit');
  }
  assert.equal((f.store.db.prepare('SELECT COUNT(*) n FROM runtime_resources WHERE state<>\'RELEASED\'').get() as any).n,33);
});
test('M13-IR: logical session close revokes its runtime binding',async()=>{
  const provider:ObservationProvider={assurance:'MODEL',peer:async()=>processIdentity,exit:async()=>{throw new Error('unused');}};
  const host=await openHost(await caseRoot(),{runtimeObservationProvider:provider}),actor={agent_id:logical.agent_id,project_id:logical.project_id,task_id:logical.task_id,session_id:logical.session_id},agent=host.bindAgent(actor);
  try {const b=await host.administration.runtime.create(logical,processIdentity,parent,profile),c=await host.administration.runtime.authenticate(b.runtime_id,{});await host.administration.runtime.activate(c.handle);await agent.close();assert.equal(host.administration.runtime.inspect(b.runtime_id).state,'REVOKED');}
  finally {await agent.close();await host.close();}
});
test('M13-IR: contradictory root or tree observations cannot create proof',async t=>{
  const f=await active(t),op=uid();await f.control.reserve(f.token,f.b.runtime_id,op,[{kind:'PROCESS_SLOT',resource:'project:slot'}]);
  f.setExit({root_exited:true,tree_empty:true,members:[{process:processIdentity,exited:false,exit_code:null}]});
  await assert.rejects(f.control.observeExit(f.token,f.b.runtime_id,op),{code:'EXIT_CONTRADICTORY_OBSERVATION'});
});
test('M13-CRASH: actual Host process kill before/after proof and at release barrier retains all reservations',async t=>{
  for(const mode of ['resources-held','proof-recorded','release-barrier'])await t.test(mode,async()=>{
    const root=await caseRoot();const child=spawn(process.execPath,[fileURLToPath(new URL('./runtime-crash-child.mjs',import.meta.url)),root,mode],{shell:false,windowsHide:true,env:{SystemRoot:process.env.SystemRoot,WINDIR:process.env.WINDIR},stdio:['ignore','ignore','ignore','ipc']});
    const exited=once(child,'exit');let timer:ReturnType<typeof setTimeout>|undefined;
    try {
      const message=await Promise.race([once(child,'message'),exited.then(()=>{throw new Error('Crash fixture exited before checkpoint');}),new Promise<never>((_r,reject)=>{timer=setTimeout(()=>reject(new Error('Crash fixture checkpoint timeout')),10000);})]);
      const checkpoint=message[0] as any;child.kill('SIGKILL');await exited;
      assert.equal((await KernelStore.recoverAbandonedLock(root)).recovered,true);
      const host=await openHost(root);
      try {const state=host.administration.runtime.inspect(checkpoint.runtime_id).state;assert.ok(['UNKNOWN_QUARANTINED','REVOKED'].includes(state));const rows=host.store.db.prepare('SELECT operation,state FROM runtime_resources').all() as any[];assert.equal(rows.length,5);assert.ok(rows.every(r=>r.operation===checkpoint.operation_id&&r.state==='UNKNOWN_QUARANTINED'));if(checkpoint.proof_id)await assert.rejects(host.administration.runtime.release(checkpoint.runtime_id,checkpoint.operation_id,checkpoint.proof_id),{code:'FULL_OS_PROFILE_NOT_VERIFIED'});}
      finally{await host.close();}
    }finally{if(timer)clearTimeout(timer);if(child.exitCode===null&&child.signalCode===null){child.kill();await exited;}}
  });
});
