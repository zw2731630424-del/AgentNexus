import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir,mkdtemp,readFile } from 'node:fs/promises';
import { join,resolve } from 'node:path';
import { generateKeyPairSync } from 'node:crypto';
import { fork } from 'node:child_process';
import type { ForkOptions } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { ArtifactStore } from '../../src/agentnexus/artifacts.ts';
import { setTimeout as delay } from 'node:timers/promises';
import { openHost } from '../../src/agentnexus/host.ts';
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { clockFor,initializeControl,metadata } from '../../src/agentnexus/control.ts';
import { canonical,invariant,sha256,uid } from '../../src/agentnexus/types.ts';
import type { Json } from '../../src/agentnexus/types.ts';
import { profileHash } from '../../src/agentnexus/runtime/contracts.ts';
import type { Envelope,ProcessIdentity,SandboxProfile } from '../../src/agentnexus/runtime/contracts.ts';
import { encodeFrame } from '../../src/agentnexus/runtime/ipc.ts';
import { authenticated,DeadlineGuard,nonce,productionIntent,REQUIRED_FEATURES,signed } from '../../src/agentnexus/production/contracts.ts';
import type { Grant,Runtime,Tool } from '../../src/agentnexus/production/contracts.ts';
import { ProductionIdentityRegistry } from '../../src/agentnexus/production/identity.ts';
import { ProductionGateway } from '../../src/agentnexus/production/authority.ts';
import { ProductionAudit } from '../../src/agentnexus/production/audit.ts';
import { ProductionHost } from '../../src/agentnexus/production/host.ts';
import { TrustedEndpoint } from '../../src/agentnexus/production/transport.ts';
import { QualificationGate,COMBINATION_CHECKS } from '../../src/agentnexus/production/qualification.ts';
import type { Qualification } from '../../src/agentnexus/production/qualification.ts';
import { ProductionExecutionBroker } from '../../src/agentnexus/production/broker.ts';
import type { ProcessSupervisor,SupervisedRun } from '../../src/agentnexus/production/broker.ts';
import { buildExitProof,ExitProofVerifier } from '../../src/agentnexus/production/exit.ts';
import type { ExitEvidence } from '../../src/agentnexus/production/exit.ts';
import { FileBroker,relativeFile } from '../../src/agentnexus/production/file-broker.ts';
import type { FileGrant,NativeFile,NativeFileOwner } from '../../src/agentnexus/production/file-broker.ts';

// All identities, qualifications and Supervisor observations in this file are SIMULATED.
// Actual Node/SQLite/ArtifactStore/crypto/atomic transactions are executed.
const logical={agent_id:'m14-agent',project_id:'m14-project',task_id:'task',session_id:'session',role:'worker'};
const identity={agent_id:logical.agent_id,project_id:logical.project_id,task_id:logical.task_id,session_id:logical.session_id};
const processId:ProcessIdentity={os:'windows',principal:'S-1-5-21-10-20-30-1002',pid:1202,start_id:'10002000',os_session:'2'};
const parent:ProcessIdentity={...processId,principal:'S-1-5-21-10-20-30-1001',pid:1201,start_id:'10001000'};
const profile:SandboxProfile={id:'AgentNexus.M14.Worker',version:1,os:'windows',os_version:'SIMULATED',principal:processId.principal,accessible:['task'],read_only:['runtime'],writable:['output'],network:'DENY',limits:{memory_bytes:67108864,cpu_ms:1000,wall_ms:1000,file_bytes:32768,processes:4,output_bytes:65536},lifetime:'ONE_OPERATION',exit_requirement:'COMPLETE_PROCESS_TREE'};
const helperHash=sha256('synthetic-helper'),tool:Tool={id:'m14.synthetic',version:'1',feature_id:'tool.test',policy_ids:['P.COMMAND_RISK'],capability:'PROCESS',profile_hash:profileHash(profile),executable_hash:sha256('synthetic-worker')};
async function root(){const b=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT??'.workflow-kit/runtime/AgentNexus-M1.4/data','m14');await mkdir(b,{recursive:true});return mkdtemp(join(b,'case-'));}
function evidence(g:Grant,changes:Partial<ExitEvidence>={}):ExitEvidence{return {source:'SIMULATED',observation_id:uid(),process:g.process,parent:g.parent,job_id:'simulated-job',job_membership_verified:true,job_empty:true,membership_complete:true,unknown_members:false,members:[{process:g.process,parent:g.parent,exited:true,exit_code:0,handle_signaled:true}],root_exited:true,handles_closed:true,termination_requested_at:null,observed_at:new Date().toISOString(),sandbox:{profile_hash:g.profile_hash,token_verified:true,network_verified:true,filesystem_verified:true,limits_verified:true,settled:true},outputs:{stdout:{eof:true,producer_closed:true,producer_id:'sim-stdout'},stderr:{eof:true,producer_closed:true,producer_id:'sim-stderr'}},...changes};}
async function fixture(t:test.TestContext,options:{qualify?:boolean;maxWorkers?:number}={}){
  const base=await root(),host=await openHost(join(base,'host'));const store=await KernelStore.open(join(base,'broker'));initializeControl(store);
  const hostKeys=generateKeyPairSync('ed25519'),brokerKeys=generateKeyPairSync('ed25519'),qualKeys=generateKeyPairSync('ed25519');
  const definitions=JSON.parse(await readFile(new URL('../../config/agentnexus/features.json',import.meta.url),'utf8')).features;
  const enable=new Set<string>();
  const visit=(id:string)=>{const d=definitions.find((d:any)=>d.id===id);for(const dep of d.depends_on)visit(dep);if(d.kind!=='CORE')enable.add(id);};
  for(const f of REQUIRED_FEATURES)visit(f);
  for(const f of enable)host.administration.registerModule(f);
  const change=await host.administration.previewFeatures([...enable].map(id=>({id,scope:{},state:'ON' as const})),host.administration.metadata().feature_revision);
  await host.administration.commitFeatures(change.challenge_id,change.preview_hash);
  const state={peer:structuredClone(processId),alive:true,profile:profileHash(profile),starts:0,terminations:0,features:true,hostClosed:false,ready:async()=>{},fence:async()=>{},extra:{} as Partial<ExitEvidence>,stdout:[Buffer.from('out')],stderr:[Buffer.from('err')],stallOutput:false,stallExit:false};
  const handle=Object.freeze({}),raw=Object.freeze({});
  const registry=new ProductionIdentityRegistry(host.store,{inspect:async h=>{invariant(h===handle,'FIXTURE_HANDLE');return {process:state.peer,parent,alive:state.alive,profile_hash:state.profile,assurance:'SIMULATED'};}});
  let bound:Runtime;
  const endpoint=new TrustedEndpoint({peer:async c=>{invariant(c===raw,'FIXTURE_CHANNEL');return state.peer;},close(){}},id=>registry.inspect(id),new ProductionAudit(store));
  const qualification:Qualification={schema:'agentnexus/qualification/1',profile_hash:profileHash(profile),helper_hash:helperHash,tool_hash:tool.executable_hash,host_sid:parent.principal,worker_sid:processId.principal,os_version:profile.os_version,assurance:'SIMULATED',checks:[...COMBINATION_CHECKS],evidence_hash:sha256('SIMULATED_QUALIFICATION'),expires_at:Date.now()+60000};
  const gate=new QualificationGate(qualKeys.publicKey,options.qualify===false?[]:[signed(qualification,qualKeys.privateKey)]);
  const supervisor:ProcessSupervisor={helper_hash:helperHash,ready:async()=>state.ready(),start(_r,g){state.starts++;
    async function* output(chunks:Buffer[]){for(const c of chunks)yield c;if(state.stallOutput)await new Promise(()=>{});}
    return {stdout:output(state.stdout),stderr:output(state.stderr),exit:state.stallExit?new Promise(()=>{}):Promise.resolve(evidence(g,state.extra)),terminate(){state.terminations++;}};
  }};
  const authority=new ProductionGateway(host.store,host.features,host.policy,registry,hostKeys.privateKey,[tool],options.maxWorkers??4);
  const broker=new ProductionExecutionBroker({store,host_key:hostKeys.publicKey,broker_key:brokerKeys.privateKey,endpoint,gate,supervisor,runtime:id=>registry.inspect(id),epochs:()=>metadata(host.store),features:()=>state.features,hostFence:async g=>{await state.fence();authority.fence(g);},tools:[tool],max_workers:options.maxWorkers??4});
  bound=await registry.bind(logical,handle,profile,broker.boot_id);
  const connection=await endpoint.admit(bound.runtime_id,raw);
  const req={call_id:'call-'+uid(),tool_id:tool.id,tool_version:tool.version,arguments:{mode:'fixed-synthetic'},resource_id:logical.project_id+':output'};
  async function issue(request=req){const preview=authority.preview(identity,request,bound.runtime_id);const approval_id=await host.administration.approve(preview.intent_hash,identity,'M14 explicit SIMULATED execution fixture');return authority.issue(identity,{...request,approval_id},bound.runtime_id);}
  function frame(packet:ReturnType<typeof signed<Grant>>,args:Json=req.arguments,change:Partial<Envelope>={}){const g=packet.body,payload={grant:packet,arguments:args};const e:Envelope={schema:'agentnexus/ipc/1',...identity,request_id:uid(),runtime_id:bound.runtime_id,runtime_session_id:bound.worker_instance_id,worker_instance_id:bound.worker_instance_id,operation_id:g.operation_id,capability_id:g.permit_id,resource_id:g.resource_id,policy_epoch:g.policy_epoch,feature_epoch:g.feature_epoch,payload_hash:sha256(canonical(payload)),nonce:nonce(),deadline:g.expires_at,connection_id:connection.connection_id,profile_hash:bound.profile_hash,payload,...change};return encodeFrame(e,connection.secret).subarray(4);}
  t.after(async()=>{broker.close();if(!state.hostClosed){for(const row of host.store.db.prepare('SELECT operation FROM m14_host_operations').all() as any[])authority.retire(row.operation);await host.close();}await store.close();});
  return {base,host,store,registry,bound,handle,raw,endpoint,connection,state,authority,broker,issue,frame,req,hostKeys,brokerKeys,qualKeys,qualification,gate};
}

test('M14-PERMIT SIMULATED: exact approval bridges consumed original Permit and retains five resources',async t=>{
  const f=await fixture(t),packet=await f.issue(),g=authenticated(packet,f.hostKeys.publicKey);
  assert.equal((f.host.store.db.prepare('SELECT consumed FROM control_approvals WHERE id=?').get(g.approval_id) as any).consumed,1);
  assert.equal((f.host.store.db.prepare('SELECT consumed FROM control_permits WHERE id=?').get(g.permit_id) as any).consumed,1);
  assert.equal((f.host.store.db.prepare('SELECT COUNT(*) n FROM m14_host_resources WHERE operation=?').get(g.operation_id) as any).n,5);
  const result=await f.broker.dispatch(f.connection.handle,f.frame(packet));assert.equal(result.status,'SIMULATED');assert.equal(result.proof.body.state,'EXIT_UNVERIFIED');assert.equal(result.proof.body.production_release_authority,false);assert.equal(f.state.starts,1);
  assert.equal(f.endpoint.stats().connections,0);assert.equal((f.host.store.db.prepare('SELECT COUNT(*) n FROM control_writers').get() as any).n,1);
});
test('M14-HOST SIMULATED: Agent facade traverses Permit/IPC/Broker/streamed Artifact/ExitProof and quarantines',async t=>{
  const f=await fixture(t),verifier=new ExitProofVerifier(f.host.store,f.brokerKeys.publicKey,ref=>f.store.artifacts.read(ref));
  const service=new ProductionHost(f.authority,{connection:()=>f.connection,send:async(_r,frame)=>f.broker.dispatch(f.connection.handle,frame.subarray(4)),qualificationEvidence:()=>f.qualification.evidence_hash},verifier);
  const agent=service.bindAgent(identity,f.bound.runtime_id);assert.deepEqual(Object.keys(agent).sort(),['close','preview','request']);
  const preview=agent.preview(f.req),approval_id=await f.host.administration.approve(preview.intent_hash,identity,'M14 full protocol model exact approval');
  const result=await agent.request({...f.req,approval_id});assert.equal(result.status,'INCONCLUSIVE');assert.equal(result.resources,'HELD');assert.equal(f.state.starts,1);
  assert.equal((f.host.store.db.prepare('SELECT state FROM m14_host_operations').get() as any).state,'UNKNOWN_QUARANTINED');
  assert.equal((f.host.store.db.prepare('SELECT COUNT(*) n FROM m14_verified_exit_proofs').get() as any).n,1);
  const preserved=f.host.store.db.prepare('SELECT body,signed_packet FROM m14_verified_exit_proofs').get() as any;assert.equal(canonical(authenticated(JSON.parse(preserved.signed_packet),f.brokerKeys.publicKey)),preserved.body);
  await assert.rejects(verifier.authorizeOwnerRelease(result.operation_id!),{code:'M14_PRODUCTION_EXIT_REQUIRED'});
});
test('M14-ARTIFACT SIMULATED: cancelled remote proof import settles locally and never authorizes release',async t=>{
  const f=await fixture(t),packet=await f.issue(),result=await f.broker.dispatch(f.connection.handle,f.frame(packet));
  const verifier=new ExitProofVerifier(f.host.store,f.brokerKeys.publicKey,()=>({[Symbol.asyncIterator](){return {next:()=>new Promise(()=>{})};}})),cancel=new AbortController();
  const pending=verifier.accept(result.proof,packet.body,f.qualification.evidence_hash,cancel.signal);setTimeout(()=>cancel.abort(new Error('synthetic remote producer stalled')),30);
  await assert.rejects(pending);assert.equal((f.host.store.db.prepare('SELECT COUNT(*) n FROM m14_verified_exit_proofs').get() as any).n,0);assert.ok(f.host.store.db.prepare('SELECT 1 FROM control_writers WHERE operation_id=?').get(packet.body.operation_id));
});
test('M14-HOST SIMULATED: post-consume identity failure returns original operation and unknown reservations',async t=>{
  const f=await fixture(t),verifier=new ExitProofVerifier(f.host.store,f.brokerKeys.publicKey),service=new ProductionHost(f.authority,{connection:()=>f.connection,send:async()=>{throw Error('must not send');},qualificationEvidence:()=>f.qualification.evidence_hash},verifier),agent=service.bindAgent(identity,f.bound.runtime_id);
  const p=agent.preview(f.req),approval_id=await f.host.administration.approve(p.intent_hash,identity,'M14 consumed error association fixture'),original=f.host.store.flush.bind(f.host.store);
  f.host.store.flush=async()=>{await original();f.state.alive=false;};const result=await agent.request({...f.req,approval_id});f.host.store.flush=original;
  assert.equal(result.status,'INCONCLUSIVE');assert.equal(result.resources,'UNKNOWN_QUARANTINED');assert.ok(result.operation_id);
  assert.equal((f.host.store.db.prepare('SELECT operation FROM m14_host_operations').get() as any).operation,result.operation_id);assert.equal(f.state.starts,0);
  assert.equal((f.host.store.db.prepare('SELECT COUNT(*) n FROM m14_host_resources WHERE operation=?').get(result.operation_id!) as any).n,5);
});
test('M14-IPC SIMULATED: service disconnect uses trusted channel ownership to terminate and quarantine',async t=>{
  const f=await fixture(t),packet=await f.issue();let signalStarted!:()=>void,release!:()=>void;const started=new Promise<void>(resolve=>{signalStarted=resolve;}),hold=new Promise<void>(resolve=>{release=resolve;});
  f.state.fence=async()=>{signalStarted();await hold;};const dispatch=f.broker.dispatch(f.connection.handle,f.frame(packet));await started;
  await f.broker.disconnect(f.connection.handle);release();await assert.rejects(dispatch);assert.equal(f.state.starts,0);
  assert.equal((f.store.db.prepare('SELECT state FROM m14_broker_operations').get() as any).state,'UNKNOWN_QUARANTINED');
});
test('M14-PERMIT SIMULATED: missing approval, other project, changed args or sandbox cannot bridge',async t=>{
  const f=await fixture(t);await assert.rejects(f.authority.issue(identity,f.req,f.bound.runtime_id),{code:'SIDE_EFFECT_APPROVAL_REQUIRED'});
  assert.throws(()=>f.authority.preview({...identity,project_id:'foreign'},f.req,f.bound.runtime_id),{code:'M14_LOGICAL_SCOPE'});
  assert.throws(()=>f.authority.preview(identity,{...f.req,resource_id:'foreign:output'},f.bound.runtime_id),{code:'EXACT_RESOURCE_REQUIRED'});
  const preview=f.authority.preview(identity,f.req,f.bound.runtime_id),approval_id=await f.host.administration.approve(preview.intent_hash,identity,'M14 exact args approval');
  await assert.rejects(f.authority.issue(identity,{...f.req,arguments:{mode:'changed'},approval_id},f.bound.runtime_id),{code:'SIDE_EFFECT_APPROVAL_REQUIRED'});
  f.state.profile='a'.repeat(64);await assert.rejects(f.authority.issue(identity,{...f.req,approval_id},f.bound.runtime_id),{code:'M14_OS_IDENTITY_CHANGED'});assert.equal(f.state.starts,0);
});
test('M14-PERMIT SIMULATED: signed grant tamper, Worker swap, tool/version/resource and epoch denied',async t=>{
  const f=await fixture(t),packet=await f.issue();
  const altered={...packet,body:{...packet.body,resource_id:logical.project_id+':foreign'}};
  await assert.rejects(f.broker.dispatch(f.connection.handle,f.frame(altered)),{code:'M14_SIGNATURE'});
  for(const change of [{worker_instance_id:'other'},{tool_version:'other'},{resource_id:logical.project_id+':foreign'},{policy_epoch:999},{profile_hash:'a'.repeat(64)}]){
    const p=signed({...packet.body,...change},f.hostKeys.privateKey);await assert.rejects(f.broker.dispatch(f.connection.handle,f.frame(p)));
  }
  await assert.rejects(f.broker.dispatch(f.connection.handle,f.frame(packet,{mode:'forged'})),{code:'M14_ARGUMENTS_CHANGED'});assert.equal(f.state.starts,0);
});
test('M14-PERMIT SIMULATED: concurrent Permit consumers commit once; disconnect never replays',async t=>{
  const f=await fixture(t),packet=await f.issue(),frame=f.frame(packet);
  const results=await Promise.allSettled(Array.from({length:8},()=>f.broker.dispatch(f.connection.handle,frame)));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.state.starts,1);
  assert.equal((f.store.db.prepare('SELECT COUNT(*) n FROM m14_broker_operations').get() as any).n,1);
  await assert.rejects(f.broker.dispatch(f.connection.handle,frame));assert.equal(f.state.starts,1);
});
test('M14-SANDBOX SIMULATED: default absent qualification rejects before Supervisor start',async t=>{
  const f=await fixture(t,{qualify:false}),packet=await f.issue();await assert.rejects(f.broker.dispatch(f.connection.handle,f.frame(packet)),{code:'M14_COMBINATION_NOT_QUALIFIED'});assert.equal(f.state.starts,0);
});
test('M14-IPC SIMULATED: same SID foreign PID, reused PID/start, session and payload identity rejected',async t=>{
  const f=await fixture(t),packet=await f.issue();
  for(const peer of [{...processId,pid:55},{...processId,start_id:'999'},{...processId,os_session:'9'},{...processId,principal:'S-1-5-18'}]){
    f.state.peer=peer;await assert.rejects(f.broker.dispatch(f.connection.handle,f.frame(packet)),{code:'M14_PEER_MISMATCH'});
  }
  f.state.peer=processId;await assert.rejects(f.broker.dispatch(f.connection.handle,f.frame(packet,undefined,{agent_id:'foreign'})),{code:'M14_IPC_LOGICAL'});assert.equal(f.state.starts,0);
});
test('M14-IPC SIMULATED: revoke is synchronous, pending connection slots and key cleanup bounded',async t=>{
  const f=await fixture(t),packet=await f.issue();const revoke=f.registry.revoke(f.bound.runtime_id,'SESSION_CLOSED');
  await assert.rejects(f.broker.dispatch(f.connection.handle,f.frame(packet)),{code:'M14_IDENTITY_REVOKED'});await revoke;
  f.endpoint.revoke(f.bound.runtime_id);assert.equal(f.endpoint.stats().connections,0);assert.equal(f.state.starts,0);
});
test('M14-AUDIT SIMULATED: durable authorization/start barrier failures never start execution',async t=>{
  const f=await fixture(t),packet=await f.issue();const original=f.store.flush.bind(f.store);let calls=0;
  f.store.flush=async()=>{calls++;if(calls===2)throw new Error('synthetic audit disk failure');return original();};
  await assert.rejects(f.broker.dispatch(f.connection.handle,f.frame(packet)));f.store.flush=original;assert.equal(f.state.starts,0);
  assert.equal((f.store.db.prepare('SELECT state FROM m14_broker_operations').get() as any).state,'UNKNOWN_QUARANTINED');
});
test('M14-RECOVERY SIMULATED: Broker reopen preserves spent Permit, unknown Job and no automatic replay',async t=>{
  const f=await fixture(t),packet=await f.issue();f.state.ready=async()=>{throw new Error('synthetic crash window');};await assert.rejects(f.broker.dispatch(f.connection.handle,f.frame(packet)));
  await f.broker.recover();assert.equal((f.store.db.prepare('SELECT state FROM m14_broker_operations').get() as any).state,'UNKNOWN_QUARANTINED');
  await assert.rejects(f.broker.dispatch(f.connection.handle,f.frame(packet)),{code:'M14_PERMIT_REPLAY'});assert.equal(f.state.starts,0);
});
test('M14-FEATURE SIMULATED: epoch change or module off at last fence rejects consumed work',async t=>{
  const f=await fixture(t),packet=await f.issue();f.state.fence=async()=>{f.host.store.db.exec('UPDATE control_meta SET policy_epoch=policy_epoch+1');};
  await assert.rejects(f.broker.dispatch(f.connection.handle,f.frame(packet)),{code:'M14_EPOCH_STALE'});assert.equal(f.state.starts,0);
  assert.equal((f.host.store.db.prepare('SELECT COUNT(*) n FROM control_writers').get() as any).n,1);
});
test('M14-EXIT SIMULATED: parent exit, child alive and output unknown stay independent and retain Writer',async t=>{
  const f=await fixture(t),packet=await f.issue();const child={...processId,pid:1203,start_id:'10003000'};
  f.state.extra={job_empty:false,members:[{process:processId,parent,exited:true,exit_code:0,handle_signaled:true},{process:child,parent:processId,exited:false,exit_code:null,handle_signaled:false}],outputs:{stdout:{eof:false,producer_closed:false,producer_id:'unknown-external'},stderr:{eof:true,producer_closed:true,producer_id:'known'}}};
  const result=await f.broker.dispatch(f.connection.handle,f.frame(packet)),p=result.proof.body;
  assert.ok(p.states.includes('PROCESS_EXITED'));assert.ok(!p.states.includes('PROCESS_TREE_EXITED'));assert.ok(!p.states.includes('OUTPUT_PRODUCERS_SETTLED'));assert.equal(p.state,'EXIT_UNVERIFIED');
  const writer=f.host.store.db.prepare('SELECT resource FROM control_writers WHERE operation_id=?').get(packet.body.operation_id);assert.ok(writer);
  assert.equal(f.broker.stats().active,1);assert.ok(f.state.terminations>0);
});

function fileTicket(f:Awaited<ReturnType<typeof fixture>>,changes:Partial<FileGrant>={}):FileGrant{
  const r=f.bound,m=metadata(f.host.store);return {schema:'agentnexus/file-permit/1',operation_id:uid(),runtime_id:r.runtime_id,worker_instance_id:r.worker_instance_id,host_boot_id:r.host_boot_id,project_id:r.logical.project_id,task_id:r.logical.task_id,resource_id:r.logical.project_id+':files',profile_hash:r.profile_hash,path:'test.txt',action:'READ',expected_hash:null,content_hash:null,max_bytes:128,nonce:nonce(),issued_at:Date.now(),expires_at:Date.now()+10000,policy_epoch:m.policy_epoch,feature_epoch:m.feature_epoch,...changes};
}
function files(f:Awaited<ReturnType<typeof fixture>>,owner:NativeFileOwner){return new FileBroker(f.host.store,f.hostKeys.publicKey,id=>f.registry.inspect(id),()=>metadata(f.host.store),owner,[{id:logical.project_id+':files',project_id:logical.project_id,task_id:logical.task_id,root:'SIMULATED_DIRECTORY_HANDLE',kind:'OUTPUT',quota_bytes:32768}],()=>true);}
test('M14-IR SIMULATED: immutable CREATE bytes survive audit wait; oversized/invalid inputs return slots',async t=>{
  const f=await fixture(t);let written='';const native:NativeFileOwner={read:async()=>{throw Error('unused');},create:async(_r,_p,bytes)=>{written=Buffer.from(bytes).toString();return {data:bytes,file_id:'sim:id',sha256:sha256(bytes),bytes:bytes.length,links:1,assurance:'SIMULATED'};}};
  const b=files(f,native),bytes=Buffer.from('GOOD'),g=fileTicket(f,{action:'CREATE',content_hash:sha256(bytes)}),original=f.host.store.flush.bind(f.host.store);
  f.host.store.flush=async()=>{bytes.write('EVIL');return original();};
  const result=await b.execute(signed(g,f.hostKeys.privateKey),bytes);f.host.store.flush=original;assert.equal(written,'GOOD');assert.equal(result.sha256,sha256('GOOD'));
  for(let i=0;i<9;i++)await assert.rejects(b.execute(signed({...g,nonce:nonce()},f.hostKeys.privateKey),Buffer.alloc(32769)),{code:'M14_FILE_RPC_LIMIT'});
  assert.equal(b.stats().pending,0);
});
test('M14-IR SIMULATED: an expired signed file grant cannot revive after a sub-100ms wall rollback',async t=>{
  const f=await fixture(t);let reads=0;const b=files(f,{create:async()=>{throw Error('unused');},read:async()=>{reads++;const data=Buffer.from('x');return {data,file_id:'sim:id',sha256:sha256(data),bytes:1,links:1,assurance:'SIMULATED'};}});
  const g=fileTicket(f,{expires_at:Date.now()+25}),packet=signed(g,f.hostKeys.privateKey);await delay(45);
  await assert.rejects(b.execute(packet),{code:'M14_GRANT_EXPIRED'});const realNow=Date.now;
  try{Date.now=()=>g.issued_at+1;await assert.rejects(b.execute(packet),{code:'M14_CLOCK_INVALID'});}finally{Date.now=realNow;}
  assert.equal(reads,0);
});
test('M14-IR SIMULATED: uncooperative file owners time out without unbounded replacement native work',async t=>{
  const f=await fixture(t),b=files(f,{read:()=>new Promise(()=>{}),create:()=>new Promise(()=>{})});
  const tickets=Array.from({length:8},()=>signed(fileTicket(f,{expires_at:Date.now()+200}),f.hostKeys.privateKey));
  const results=await Promise.allSettled(tickets.map(g=>b.execute(g)));assert.ok(results.every(r=>r.status==='rejected'));
  assert.equal(b.stats().pending,0);assert.equal(b.stats().unsettled_native,8);
  await assert.rejects(b.execute(signed(fileTicket(f),f.hostKeys.privateKey)),{code:'M14_FILE_NATIVE_UNSETTLED'});
});
test('M14-IR SIMULATED: complete-looking member list with disconnected parent cycle never verifies',async t=>{
  const f=await fixture(t),g=(await f.issue()).body,a={...processId,pid:1301,start_id:'13010'},b={...processId,pid:1302,start_id:'13020'};
  const e=evidence(g);e.source='REAL_WINDOWS';e.members.push({process:a,parent:b,exited:true,exit_code:0,handle_signaled:true},{process:b,parent:a,exited:true,exit_code:0,handle_signaled:true});
  assert.throws(()=>buildExitProof(g,e,null,null,f.qualification.evidence_hash),{code:'M14_EXIT_PARENT_CYCLE'});
});
test('M14-IR SIMULATED: short Envelope deadline is fenced after asynchronous Supervisor preparation',async t=>{
  const f=await fixture(t),packet=await f.issue();f.state.ready=async()=>{await delay(80);};
  await assert.rejects(f.broker.dispatch(f.connection.handle,f.frame(packet,undefined,{deadline:Date.now()+40})));assert.equal(f.state.starts,0);
});
test('M14-IR SIMULATED: closed registry synchronously rejects existing authorization and channel',async t=>{
  const f=await fixture(t),packet=await f.issue();f.registry.close();assert.throws(()=>f.authority.fence(packet.body),{code:'M14_IDENTITY_CLOSED'});
  await assert.rejects(f.broker.dispatch(f.connection.handle,f.frame(packet)),{code:'M14_IDENTITY_CLOSED'});assert.equal(f.state.starts,0);
});
test('M14-IR SIMULATED: OS identity observers retain at most 32 unresolved observations',async t=>{
  const f=await fixture(t),registry=new ProductionIdentityRegistry(f.host.store,{inspect:()=>new Promise(()=>{})});t.after(()=>registry.close());
  const pending=Array.from({length:32},()=>registry.bind(logical,{},profile,f.broker.boot_id));
  await assert.rejects(registry.bind(logical,{},profile,f.broker.boot_id),{code:'M14_IDENTITY_BACKPRESSURE'});
  const results=await Promise.allSettled(pending);assert.ok(results.every(r=>r.status==='rejected'));assert.equal(registry.stats().unsettled,32);assert.equal(registry.stats().pending_binds,0);
});
test('M14-RECOVERY SQLITE_REOPEN: remote START_INTENT absence cannot become NOT_INVOKED on Host restart',async t=>{
  const f=await fixture(t),packet=await f.issue();f.authority.retire(packet.body.operation_id);await f.host.close();f.state.hostClosed=true;
  const reopened=await openHost(join(f.base,'host'));t.after(()=>reopened.close());
  const registry=new ProductionIdentityRegistry(reopened.store,{inspect:async()=>{throw Error('old OS handle cannot be reopened');}});await registry.recover();
  const gateway=new ProductionGateway(reopened.store,reopened.features,reopened.policy,registry,f.hostKeys.privateKey,[tool]);await gateway.recover();
  assert.equal(reopened.administration.inspectOperation(packet.body.operation_id).executor_state,'UNKNOWN');
  assert.equal((reopened.store.db.prepare('SELECT state FROM m14_host_operations').get() as any).state,'UNKNOWN_QUARANTINED');
  assert.equal(registry.inspect(f.bound.runtime_id).state,'UNKNOWN_QUARANTINED');assert.ok(reopened.store.db.prepare('SELECT 1 FROM control_writers WHERE operation_id=?').get(packet.body.operation_id));
});
test('M14-OUTPUT SIMULATED: streaming output budget failure terminates Worker and keeps slot',async t=>{
  const f=await fixture(t),packet=await f.issue();f.state.stdout=[Buffer.alloc(65536),Buffer.from('overflow')];
  await assert.rejects(f.broker.dispatch(f.connection.handle,f.frame(packet)));assert.ok(f.state.terminations>0);assert.equal(f.broker.stats().active,1);
  assert.equal((f.store.db.prepare('SELECT state FROM m14_broker_operations').get() as any).state,'UNKNOWN_QUARANTINED');
});
test('M14-BROKER REAL_OS_PROCESS / SIMULATED_SECURITY: independent consume ledger and streamed fixed Worker',async t=>{
  const f=await fixture(t),options:ForkOptions & {windowsHide:boolean}={silent:true,windowsHide:true,env:{SystemRoot:process.env.SystemRoot??'C:\\Windows',NODE_OPTIONS:'',NODE_PATH:''}},child=fork(fileURLToPath(new URL('./m14-broker-child.mjs',import.meta.url)),[],options),exit=once(child,'exit');
  const pending=new Map<string,{resolve:(x:any)=>void;reject:(e:unknown)=>void;timer:ReturnType<typeof setTimeout>}>();
  child.stdout!.resume();child.stderr!.resume();child.on('message',(m:any)=>{const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);p.resolve(m);}});
  child.on('exit',()=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Broker fixture exited'));}pending.clear();});
  const call=(action:string,data:any={})=>new Promise<any>((resolve,reject)=>{const id=uid(),timer=setTimeout(()=>{pending.delete(id);reject(Error('Broker fixture deadline'));},15000);pending.set(id,{resolve,reject,timer});child.send({id,action,...data});});
  t.after(()=>{if(child.exitCode===null)child.kill();for(const p of pending.values())clearTimeout(p.timer);});
  const childRoot=join(f.base,'independent-broker');
  const boot=await call('INIT',{root:childRoot,host_key:f.hostKeys.publicKey.export({type:'spki',format:'pem'}),helper_hash:helperHash,tool,qualification:{key:f.qualKeys.publicKey.export({type:'spki',format:'pem'}),packet:signed(f.qualification,f.qualKeys.privateKey)}});
  assert.equal(boot.status,'BOOT');assert.notEqual(boot.pid,process.pid);
  f.state.peer={...processId,pid:1300,start_id:'130000'};const runtime=await f.registry.bind(logical,f.handle,profile,boot.boot_id);
  const request={...f.req,call_id:uid()},preview=f.authority.preview(identity,request,runtime.runtime_id),approval_id=await f.host.administration.approve(preview.intent_hash,identity,'Exact approval for independent Broker SIMULATED security fixture');
  const packet=await f.authority.issue(identity,{...request,approval_id},runtime.runtime_id),g=packet.body;
  const bound=await call('BIND',{runtime,epochs:{feature_epoch:g.feature_epoch,policy_epoch:g.policy_epoch}});assert.equal(bound.status,'BOUND');
  const payload={grant:packet,arguments:request.arguments};
  const e:Envelope={schema:'agentnexus/ipc/1',...identity,request_id:uid(),runtime_id:runtime.runtime_id,runtime_session_id:runtime.worker_instance_id,worker_instance_id:runtime.worker_instance_id,operation_id:g.operation_id,capability_id:g.permit_id,resource_id:g.resource_id,policy_epoch:g.policy_epoch,feature_epoch:g.feature_epoch,payload_hash:sha256(canonical(payload)),nonce:nonce(),deadline:g.expires_at,connection_id:bound.connection_id,profile_hash:g.profile_hash,payload};
  const frame=encodeFrame(e,Buffer.from(bound.secret,'hex')).subarray(4),response=await call('DISPATCH',{body:frame.toString('base64')});
  assert.equal(response.result.status,'SIMULATED');assert.equal(response.starts,1);assert.equal(response.consumed,1);assert.equal(response.result.proof.body.production_release_authority,false);
  const replay=await call('DISPATCH',{body:frame.toString('base64')});assert.equal(replay.result.status,'BLOCKED');assert.equal(replay.starts,1);assert.equal(replay.consumed,1);
  await call('CLOSE');await exit;
  const artifacts=new ArtifactStore(join(childRoot,'artifacts'));await artifacts.initialize();let output='';for await(const chunk of artifacts.read(response.result.proof.body.stdout_ref))output+=Buffer.from(chunk).toString();assert.match(output,/native-fixture-stdout/);
  assert.ok(f.host.store.db.prepare('SELECT 1 FROM control_writers WHERE operation_id=?').get(g.operation_id));
});
test('M14-EXIT SIMULATED: contradictory membership, forged signature and synthetic production proof rejected',async t=>{
  const f=await fixture(t),packet=await f.issue();const g=packet.body;
  assert.throws(()=>buildExitProof(g,evidence(g,{root_exited:false}),null,null,f.qualification.evidence_hash),{code:'M14_EXIT_CONTRADICTION'});
  const verifier=new ExitProofVerifier(f.host.store,f.brokerKeys.publicKey),p=buildExitProof(g,evidence(g),null,null,f.qualification.evidence_hash);
  await assert.rejects(verifier.accept(signed({...p,production_release_authority:true},f.hostKeys.privateKey),g,f.qualification.evidence_hash),{code:'M14_SIGNATURE'});
});
test('M14-EXIT SIMULATED: original M1.2 reconciliation cannot release remote Writer with manual SETTLED',async t=>{
  const f=await fixture(t),packet=await f.issue(),g=packet.body;await f.authority.quarantine(g.operation_id,'Synthetic uncertain remote execution');
  f.host.store.db.prepare("UPDATE control_operations SET executor_state='SETTLED' WHERE operation_id=?").run(g.operation_id);
  const ref=await f.host.administration.recordReconciliationEvidence({kind:'test',source:'SIMULATED',description:'Adjudication cannot substitute for native tree exit',observation:{}});
  await assert.rejects(f.host.administration.prepareReconciliation({request_id:uid(),operation_id:g.operation_id,intent_hash:g.intent_hash,expected_revision:0,action:'ADJUDICATE',outcome:'CONFIRMED_NOT_APPLIED',reason:'Synthetic owner adjudication with no OS proof',evidence_refs:[ref],release_writer:true}),{code:'M14_RESOURCE_RELEASE_AUTHORITY_REQUIRED'});
});
test('M14-RESOURCE SIMULATED: global concurrency quota counts unknown retained resources',async t=>{
  const f=await fixture(t,{maxWorkers:1});const packet=await f.issue();await f.authority.quarantine(packet.body.operation_id,'Unknown slot remains occupied');
  assert.equal((f.host.store.db.prepare("SELECT COUNT(*) n FROM m14_host_resources WHERE kind='PROCESS_SLOT' AND state<>'RELEASED'").get() as any).n,1);
  assert.equal(f.state.starts,0);
});
test('M14-QUALIFICATION SIMULATED: incomplete checks and same-account real deployment cannot qualify',async t=>{
  const f=await fixture(t);const missing={...f.qualification,checks:f.qualification.checks.filter(c=>c!=='file_and_disk_hard_limits')};
  assert.throws(()=>new QualificationGate(f.qualKeys.publicKey,[signed(missing,f.qualKeys.privateKey)]).admit(f.bound,tool,helperHash),{code:'M14_COMBINATION_NOT_QUALIFIED'});
});
test('M14-FILE SIMULATED: path validation rejects escape, ADS, UNC, devices, overwrite spelling',()=>{
  for(const p of ['../db','a/../../db','C:/db','//host/share','a\\..\\db','a:stream','NUL.txt','a.','a ','a//b','a/./b','\\??\\C:\\db'])assert.throws(()=>relativeFile(p));
  assert.doesNotThrow(()=>relativeFile('outputs/result.json'));
});
test('M14-FILE SIMULATED: signed file scope, immutable version read, audit and Artifact submission',async t=>{
  const f=await fixture(t),files=new Map<string,Uint8Array>([['input.txt',Buffer.from('version one')]]),r=f.bound;
  const native:NativeFileOwner={async read(_root,path){const data=files.get(path)!;invariant(data,'FILE_MISSING');return {data,file_id:'volume:file-id',sha256:sha256(data),bytes:data.length,links:1,assurance:'SIMULATED'};},async create(_root,path,data){invariant(!files.has(path),'EXISTS');files.set(path,data);return {data,file_id:'volume:new-file',sha256:sha256(data),bytes:data.length,links:1,assurance:'SIMULATED'};}};
  const broker=new FileBroker(f.host.store,f.hostKeys.publicKey,id=>f.registry.inspect(id),()=>metadata(f.host.store),native,[{id:logical.project_id+':files',project_id:logical.project_id,task_id:logical.task_id,root:'SIMULATED_DIRECTORY_HANDLE',kind:'OUTPUT',quota_bytes:32768}],()=>true);
  const ticket:FileGrant={schema:'agentnexus/file-permit/1',operation_id:uid(),runtime_id:r.runtime_id,worker_instance_id:r.worker_instance_id,host_boot_id:r.host_boot_id,project_id:logical.project_id,task_id:logical.task_id,resource_id:logical.project_id+':files',profile_hash:r.profile_hash,path:'input.txt',action:'READ',expected_hash:sha256('version one'),content_hash:null,max_bytes:1024,nonce:nonce(),issued_at:Date.now(),expires_at:Date.now()+10000,...metadata(f.host.store)};
  delete (ticket as any).singleton;delete (ticket as any).feature_revision;delete (ticket as any).policy_revision;
  const packet=signed(ticket,f.hostKeys.privateKey),read=await broker.execute(packet);assert.equal(read.sha256,sha256('version one'));assert.equal(read.assurance,'SIMULATED');
  await assert.rejects(broker.execute(packet),{code:'M14_FILE_REPLAY'});
  await assert.rejects(broker.execute(signed({...ticket,nonce:nonce(),resource_id:'foreign:files'},f.hostKeys.privateKey)),{code:'M14_FILE_RESOURCE'});
  files.set('input.txt',Buffer.from('version two'));await assert.rejects(broker.execute(signed({...ticket,nonce:nonce()},f.hostKeys.privateKey)),{code:'M14_FILE_VERSION_CHANGED'});
  const create={...ticket,nonce:nonce(),operation_id:uid(),path:'new.txt',action:'CREATE' as const,expected_hash:null,content_hash:sha256('output')};
  await broker.execute(signed(create,f.hostKeys.privateKey),Buffer.from('output'));
  await assert.rejects(broker.execute(signed({...create,nonce:nonce()},f.hostKeys.privateKey),Buffer.from('output')));
  assert.ok(f.host.store.query('audit',{project_id:logical.project_id,limit:100}).some((x:any)=>x.body.operation_type==='M14_FILE'&&x.body.phase==='RESULT'&&x.body.detail.observation.version_sha256===sha256('version one')));
});
