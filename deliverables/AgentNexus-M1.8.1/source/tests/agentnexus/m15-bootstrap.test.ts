import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { readFile,mkdir,mkdtemp } from 'node:fs/promises';
import { join,resolve,dirname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { canonical,sha256,uid,NexusError } from '../../src/agentnexus/types.ts';
import type { Json } from '../../src/agentnexus/types.ts';
import type { ProcessIdentity,SandboxProfile } from '../../src/agentnexus/runtime/contracts.ts';
import { profileHash } from '../../src/agentnexus/runtime/contracts.ts';
import { signed,REQUIRED_FEATURES } from '../../src/agentnexus/production/contracts.ts';
import type { Grant } from '../../src/agentnexus/production/contracts.ts';
import { AuthenticatedSession,LauncherLink,NativePipeChannel } from '../../src/agentnexus/bootstrap/session.ts';
import type { PrivateChannel } from '../../src/agentnexus/bootstrap/session.ts';
import { digestArguments,executeFiniteWorker } from '../../src/agentnexus/bootstrap/worker.ts';
import { attestationPins,validateConfig,verifyCodeInventory } from '../../src/agentnexus/bootstrap/config.ts';
import type { BootstrapConfig,Pin } from '../../src/agentnexus/bootstrap/config.ts';
import { bootstrapMain } from '../../src/agentnexus/bootstrap/entry.ts';
import { ubuntuPreparation,verifyUnixPeer } from '../../src/agentnexus/bootstrap/ubuntu.ts';
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { ExitClosureOwner } from '../../src/agentnexus/bootstrap/exit-closure.ts';
import type { ClosureObservation } from '../../src/agentnexus/bootstrap/exit-closure.ts';
import { buildExitProof } from '../../src/agentnexus/production/exit.ts';
import type { ExitEvidence } from '../../src/agentnexus/production/exit.ts';
import type { NativeClient } from '../../src/agentnexus/production/native-client.ts';
import { proveLauncher,requireLauncherProof } from '../../src/agentnexus/bootstrap/launcher-proof.ts';
import { validatePermissionPin } from '../../src/agentnexus/bootstrap/permissions.ts';
import type { FileGrant } from '../../src/agentnexus/production/file-broker.ts';
import { BootstrapReservations } from '../../src/agentnexus/bootstrap/reservations.ts';
import { initializeControl,clockFor } from '../../src/agentnexus/control.ts';
import { WorkerLauncherService } from '../../src/agentnexus/bootstrap/supervisor.ts';
import type { WindowsSupervisor } from '../../src/agentnexus/production/windows-supervisor.ts';

// Every security observation in this file is SIMULATED. Crypto/SQLite/file bytes are real.
const processId:ProcessIdentity={os:'windows',principal:'S-1-5-21-10-20-30-1002',pid:1010,start_id:'100000',os_session:'2'};
const parent:ProcessIdentity={...processId,pid:1009,start_id:'99999'};
const logical={agent_id:'m15-agent',project_id:'m15-project',task_id:'task',session_id:'session',role:'worker'};
const profile:SandboxProfile={id:'AgentNexus.M14.Worker',version:1,os:'windows',os_version:'SIMULATED',principal:processId.principal,accessible:['runtime'],read_only:['runtime'],writable:[],network:'DENY',limits:{memory_bytes:67108864,cpu_ms:1000,wall_ms:5000,file_bytes:24576,processes:1,output_bytes:65536},lifetime:'ONE_OPERATION',exit_requirement:'COMPLETE_PROCESS_TREE'};
const arg={data_base64:Buffer.from('M1.5 exact bytes').toString('base64')};
function grant(change:Partial<Grant>={}):Grant{return {schema:'agentnexus/remote-permit/1',permit_id:uid(),approval_id:uid(),operation_id:uid(),intent_hash:sha256('intent'),logical,runtime_id:uid(),worker_instance_id:uid(),host_boot_id:uid(),broker_boot_id:uid(),generation:1,process:processId,parent,tool_id:'nexus.digest',tool_version:'1',resource_id:'m15-project:input',profile_hash:profileHash(profile),policy_epoch:0,feature_epoch:0,issued_at:Date.now()-10,expires_at:Date.now()+10000,nonce:sha256(uid()),arguments_hash:sha256(canonical(arg)),...change};}
class MemoryChannel implements PrivateChannel {
  peer=processId;other!:MemoryChannel;writes:Buffer[]=[];queue:Buffer[]=[];closed=false;observerReject=false;
  waiter:{resolve:(b:Buffer)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}|null=null;
  async recheck(){if(this.closed||this.observerReject)throw new NexusError('SIMULATED_PEER_REJECTED');return this.peer;}
  async local(){return this.other.peer;}
  inject(bytes:Uint8Array){const b=Buffer.from(bytes);if(this.waiter){const w=this.waiter;this.waiter=null;clearTimeout(w.timer);w.resolve(b);}else this.queue.push(b);}
  async read(deadline:number){if(this.closed)throw Error('closed');const q=this.queue.shift();if(q)return q;return new Promise<Buffer>((resolve,reject)=>{const timer=setTimeout(()=>{this.waiter=null;reject(new Error('deadline'));},Math.max(1,deadline-Date.now()));this.waiter={resolve,reject,timer};});}
  async write(bytes:Uint8Array){if(this.closed)throw Error('closed');this.writes.push(Buffer.from(bytes));this.other.inject(bytes);}
  close(){this.closed=true;if(this.waiter){clearTimeout(this.waiter.timer);this.waiter.reject(new Error('closed'));this.waiter=null;}}
}
async function sessions(){const a=new MemoryChannel(),b=new MemoryChannel();a.other=b;b.other=a;const host=AuthenticatedSession.host(a),launcher=AuthenticatedSession.launcher(b);const [h,l]=await Promise.all([host,launcher]);return {a,b,h,l};}

test('M15-IPC SIMULATED: OS peer check precedes private key bootstrap',async()=>{const a=new MemoryChannel(),b=new MemoryChannel();a.other=b;b.other=a;a.observerReject=true;await assert.rejects(AuthenticatedSession.host(a),{code:'SIMULATED_PEER_REJECTED'});assert.equal(a.writes.length,0);});
test('M15-IPC SIMULATED: persistent two-way MAC sequence and exact RPC correlation',async t=>{
  const f=await sessions();t.after(()=>{f.h.close();f.l.close();});
  for(let i=0;i<4;i++){const deadline=Date.now()+1000;await f.l.send('PING',{i},'request-'+i,'operation-'+i,deadline);const r=await f.h.receive(deadline);assert.deepEqual(r.payload,{i});await f.h.send('RESULT',{i},r.request_id,r.operation_id,deadline);assert.deepEqual((await f.l.receive(deadline)).payload,{i});}
  assert.equal(f.h.stats().received,5);assert.equal(f.h.stats().closed,false);
});
test('M15-IPC SIMULATED: replay, MAC mutation, expiry and extra fields close the connection',async()=>{
  for(const attack of ['replay','mac','expired','extra']){const f=await sessions();const deadline=Date.now()+1000;await f.l.send('PING',{},uid(),'op',attack==='expired'?Date.now()+5:deadline);const raw=f.b.writes.at(-1)!;
    if(attack==='replay'){await f.h.receive(deadline);f.a.inject(raw);}else if(attack==='expired')await delay(15);else{const packet=JSON.parse(raw.toString());if(attack==='mac')packet.body.payload={attack:true};else packet.extra=true;f.a.queue[0]=Buffer.from(canonical(packet));}
    await assert.rejects(f.h.receive(deadline));assert.equal(f.h.stats().closed,true);f.l.close();}
});
test('M15-IPC SIMULATED: wrong response correlation and disconnect never retransmit an operation',async t=>{
  const f=await sessions();t.after(()=>{f.h.close();f.l.close();});const link=new LauncherLink(f.h),deadline=Date.now()+1000;
  const call=link.call('START',{},'operation',deadline);const r=await f.l.receive(deadline);await f.l.send('RESULT',{},uid(),r.operation_id,deadline);await assert.rejects(call,{code:'M15_RPC_CORRELATION'});const sent=f.a.writes.length;await assert.rejects(link.call('START',{},'operation',deadline));assert.equal(f.a.writes.length,sent);
});
test('M15-IPC SIMULATED: peer monitoring and output serialize onto a single bounded native RPC owner',async()=>{
  let active=0,max=0,closed=false;const calls:string[]=[];
  const fake={get busy(){return active>0;},async request(op:string){active++;max=Math.max(max,active);calls.push(op);await delay(15);active--;return {peer:processId,written:true};},close(){closed=true;}} as unknown as NativeClient;
  const channel=new NativePipeChannel(fake,'pinned-channel',processId);await Promise.all([channel.recheck(),channel.write(Buffer.from('bounded'),Date.now()+1000)]);assert.equal(max,1);assert.equal(closed,false);assert.deepEqual(calls,['bootstrap.pipe.peer','bootstrap.pipe.write']);channel.close();
});
test('M15-WORKER SIMULATED: signed one-operation bootstrap validates PID/tool/args/key/expiry',()=>{
  const key=generateKeyPairSync('ed25519'),other=generateKeyPairSync('ed25519'),publicKey=key.publicKey.export({type:'spki',format:'pem'}).toString(),g=grant();
  const packet={schema:'agentnexus/worker-bootstrap/1',permit:signed(g,key.privateKey),arguments:arg};const result=executeFiniteWorker(packet,publicKey,processId.pid);assert.equal(result.sha256,sha256(Buffer.from(arg.data_base64,'base64')));assert.equal(result.operation_id,g.operation_id);
  assert.throws(()=>executeFiniteWorker(packet,publicKey,processId.pid+1),{code:'M15_WORKER_BINDING'});
  assert.throws(()=>executeFiniteWorker({...packet,arguments:{data_base64:Buffer.from('other').toString('base64')}},publicKey,processId.pid),{code:'M15_WORKER_BINDING'});
  assert.throws(()=>executeFiniteWorker({...packet,permit:signed(g,other.privateKey)},publicKey,processId.pid),{code:'M14_SIGNATURE'});
  assert.throws(()=>executeFiniteWorker({...packet,permit:signed(grant({issued_at:Date.now()-100,expires_at:Date.now()-1}),key.privateKey)},publicKey,processId.pid),{code:'M14_GRANT_EXPIRED'});
  assert.throws(()=>digestArguments({data_base64:'../path',shell:'powershell'}),{code:'RUNTIME_INVALID_FIELDS'});
});
test('M15-FILE SIMULATED: Worker consumes only exact brokered, version-pinned file bytes',()=>{
  const keys=generateKeyPairSync('ed25519'),pub=keys.publicKey.export({type:'spki',format:'pem'}).toString(),data=Buffer.from('authorized project input'),args={file:{resource_id:'m15-project:input',path:'input.txt',expected_hash:sha256(data),max_bytes:4096}},g=grant({arguments_hash:sha256(canonical(args))});
  const file:FileGrant={schema:'agentnexus/file-permit/1',operation_id:g.operation_id,runtime_id:g.runtime_id,worker_instance_id:g.worker_instance_id,host_boot_id:g.host_boot_id,project_id:g.logical.project_id,task_id:g.logical.task_id,resource_id:g.resource_id,profile_hash:g.profile_hash,path:args.file.path,action:'READ',expected_hash:sha256(data),content_hash:null,max_bytes:4096,nonce:sha256(uid()),issued_at:Date.now()-1,expires_at:Date.now()+5000,policy_epoch:g.policy_epoch,feature_epoch:g.feature_epoch};
  const packet={schema:'agentnexus/worker-bootstrap/1',permit:signed(g,keys.privateKey),arguments:args,input:{permit:signed(file,keys.privateKey),data_base64:data.toString('base64')}};assert.equal(executeFiniteWorker(packet,pub,processId.pid).sha256,sha256(data));
  assert.throws(()=>executeFiniteWorker({...packet,input:{...packet.input,data_base64:Buffer.from('other').toString('base64')}},pub,processId.pid),{code:'M15_FILE_BOOTSTRAP_CONTENT'});
  assert.throws(()=>executeFiniteWorker({...packet,input:{...packet.input,permit:signed({...file,resource_id:'other:input'},keys.privateKey)}},pub,processId.pid),{code:'M15_FILE_BOOTSTRAP_BINDING'});
  assert.throws(()=>executeFiniteWorker({...packet,input:{...packet.input,permit:signed({...file,runtime_id:uid()},keys.privateKey)}},pub,processId.pid),{code:'M15_FILE_BOOTSTRAP_BINDING'});
});
function configuration():BootstrapConfig{
  const base=resolve('synthetic-deployment'),code=join(base,'code'),host=join(base,'host'),broker=join(base,'broker'),launcher=join(base,'launcher'),node=join(base,'runtime','node.exe'),ps=join(base,'ps','pwsh.exe'),worker=join(code,'worker.ts'),script=join(code,'native','runtime.ps1'),publicKey=join(code,'host-public.pem'),qual=join(code,'qual-public.pem'),input=join(base,'inputs'),configPath=join(base,'configuration','host.json'),launcherPublic=join(code,'launcher-public.pem');
  const pins:Pin[]=[];const pin=(path:string,directory:boolean,external=false)=>pins.push({path,directory,sha256:directory||external?null:sha256(path),sddl:'O:SYG:SYD:P(A;;FA;;;SY)',owner_sid:'S-1-5-18'});
  for(const p of [code,host,broker,launcher,input,dirname(node),dirname(ps)])pin(p,true);for(const p of [node,ps,script,join(code,'native','NativeRuntime.cs'),join(code,'native','BootstrapNative.cs'),worker,publicKey,qual,launcherPublic,join(host,'host.pem'),join(host,'broker.pem')])pin(p,false);pin(configPath,false,true);
  return {schema:'agentnexus/bootstrap-config/1',version:1,role:'HOST',host_sid:'S-1-5-21-10-20-30-1001',worker_sid:processId.principal,operator_sid:'S-1-5-21-10-20-30-1003',code_root:code,host_root:host,broker_root:broker,launcher_root:launcher,node:{path:node,sha256:sha256(node),version:'v24.15.0'},powershell:{path:ps,sha256:sha256(ps)},native:{script,script_hash:sha256(script),native_hash:sha256(join(code,'native','NativeRuntime.cs')),bootstrap_hash:sha256(join(code,'native','BootstrapNative.cs'))},worker_script:worker,worker_script_hash:sha256(worker),host_key:join(host,'host.pem'),host_public_key:publicKey,host_public_key_hash:sha256(publicKey),broker_key:join(host,'broker.pem'),qualification_public_key:qual,launcher_key:join(launcher,'signing.pem'),launcher_public_key:launcherPublic,launcher_public_key_hash:sha256(launcherPublic),launcher_config_hash:sha256('externally pinned launcher config'),qualification_certificates:[],profile:{...profile,accessible:[code,dirname(node)],read_only:[code,dirname(node)]},pipe_name:'AgentNexus-M15-worker-test',admin_pipe_name:'AgentNexus-M15-admin-test',pins,source_files:[{path:'worker.ts',sha256:sha256(worker)}],enable_features:false,resource:{id:'m15-project:input',project_id:'m15-project',task_id:'task',root:input,quota_bytes:24576}};
}
test('M15-BOOTSTRAP SIMULATED: configuration is exact, separate identities and private directories are required',()=>{
  const c=configuration();assert.equal(validateConfig(c).enable_features,false);
  for(const altered of [{...c,version:2},{...c,host_sid:c.worker_sid},{...c,operator_sid:c.worker_sid},{...c,operator_sid:c.host_sid},{...c,host_root:c.resource.root},{...c,profile:{...c.profile,writable:['host-database']}},{...c,source_files:[{path:'../host.db',sha256:sha256('x')}]},{...c,admin:true}])assert.throws(()=>validateConfig(altered));
  const hash=sha256('externally pinned config'),path=c.pins.find(p=>!p.directory&&p.sha256===null)!.path;
  assert.equal(attestationPins(c,path.toLowerCase(),hash).find(p=>p.path===path)!.sha256,hash);assert.throws(()=>attestationPins(c,join(c.host_root,'other.json'),hash),{code:'M15_CONFIG_PIN_REQUIRED'});assert.throws(()=>attestationPins(c,join(c.code_root,'host.json'),hash),{code:'M15_CONFIG_OUTSIDE_CODE_REQUIRED'});
  assert.throws(()=>validateConfig({...c,broker_root:join(c.resource.root,'broker')}),{code:'M15_ROOT_BOUNDARY'});
  for(const rights of ['FA','0x40','0x40000'])assert.throws(()=>validatePermissionPin(c,{...c.pins[0]!,sddl:'O:SYG:SYD:P(A;;'+rights+';;;WD)'}),{code:'M15_UNTRUSTED_WRITE_ACE'});
  assert.throws(()=>validatePermissionPin(c,{...c.pins.find(p=>p.path===c.host_root)!,sddl:'O:SYG:SYD:P(A;;FR;;;WD)'}),{code:'M15_PRIVATE_READ_ACE'});
});
test('M15-BOOTSTRAP SIMULATED: Launcher enrollment signature binds actual peers, config, code and fresh challenge',async()=>{
  for(const forged of [false,true]){const a=new MemoryChannel(),b=new MemoryChannel();a.other=b;b.other=a;a.peer=processId;b.peer={...processId,principal:'S-1-5-21-10-20-30-1001',pid:555};const key=generateKeyPairSync('ed25519'),other=generateKeyPairSync('ed25519'),binding={configuration_hash:sha256('config'),source_manifest_hash:sha256('manifest'),helper_hash:sha256('helper')};
    const host=requireLauncherProof(a,key.publicKey,{...binding,worker_sid:processId.principal});const launcher=proveLauncher(b,forged?other.privateKey:key.privateKey,processId,binding);if(forged){await assert.rejects(host,{code:'M14_SIGNATURE'});await launcher;}else{const [nonce]=await Promise.all([host,launcher]);assert.match(nonce,/^[a-f0-9]{64}$/);}a.close();b.close();}
});
test('M15-BOOTSTRAP REAL_LOCAL: exact source inventory rejects missing, extra and changed Worker dependencies',async()=>{
  const root=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT??'.workflow-kit/runtime/AgentNexus-M1.5/tests','m15-inventory');await mkdir(root,{recursive:true});const code=await mkdtemp(join(root,'code-')),{writeFile,unlink}=await import('node:fs/promises');await writeFile(join(code,'worker.ts'),'one');const c={...configuration(),code_root:code,source_files:[{path:'worker.ts',sha256:sha256('one')}]};const config=join(root,'external-config.json');await verifyCodeInventory(c,config);
  await writeFile(join(code,'dependency.ts'),'extra');await assert.rejects(verifyCodeInventory(c,config),{code:'M15_SOURCE_MANIFEST_INCOMPLETE'});await unlink(join(code,'dependency.ts'));await writeFile(join(code,'worker.ts'),'changed');await assert.rejects(verifyCodeInventory(c,config),{code:'M15_SOURCE_MANIFEST_INCOMPLETE'});
});
test('M15-BOOTSTRAP REAL_LOCAL: changed config hash is rejected before admin/database construction',async()=>{
  if(process.platform!=='win32')return;const root=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT??'.workflow-kit/runtime/AgentNexus-M1.5/tests','m15-bootstrap');await mkdir(root,{recursive:true});const dir=await mkdtemp(join(root,'config-'));const {writeFile}=await import('node:fs/promises');const path=join(dir,'config.json');await writeFile(path,'{}');await assert.rejects(bootstrapMain(['host','--config',path,'--sha256',sha256('changed')]),{code:'M15_CONFIG_HASH'});
});
test('M15-CATALOG REAL_LOCAL: new protection defaults OFF and original policies/features are retained',async()=>{
  const features=JSON.parse(await readFile(new URL('../../config/agentnexus/features.json',import.meta.url),'utf8')).features as {id:string;default:string;depends_on:string[];risk?:string;off_behavior?:string;tests?:string[]}[];
  for(const id of ['runtime.bootstrap.host','runtime.bootstrap.worker','runtime.ipc.persistent','runtime.exit_closure','runtime.ubuntu.adapter']){const f=features.find(f=>f.id===id)!;assert.equal(f.default,'OFF');assert.ok(f.depends_on.length&&f.risk&&f.off_behavior&&f.tests?.length);}
  for(const id of REQUIRED_FEATURES)assert.ok(features.some(f=>f.id===id));
});
test('M15-UBUNTU SIMULATED: adapter preparation requires distinct unprivileged UID/GID and pinned SO_PEERCRED/pidfd',()=>{
  const c={schema:'agentnexus/ubuntu-preparation/1' as const,host_uid:21001,host_gid:21001,worker_uid:21002,worker_gid:21002,socket_path:'/run/agentnexus/worker.sock',worker_root:'/srv/agentnexus/worker',read_only_runtime:'/opt/agentnexus/runtime',supervisor_path:'/opt/agentnexus/supervisor',supervisor_sha256:sha256('supervisor'),cgroup_root:'/sys/fs/cgroup/agentnexus',apparmor_profile:'agentnexus.worker',seccomp_sha256:sha256('seccomp'),max_pids:4,memory_bytes:67108864,cpu_max:{quota:20000,period:100000}};
  assert.match(ubuntuPreparation(c).deployment,/BLOCKED/);assert.throws(()=>ubuntuPreparation({...c,worker_uid:c.host_uid}));
  const peer={pid:123,uid:21002,gid:21002,start_ticks:'123456',pidfd_pinned:true,executable_sha256:sha256('supervisor')};verifyUnixPeer(peer,peer);assert.throws(()=>verifyUnixPeer({...peer,start_ticks:'123457'},peer));assert.throws(()=>verifyUnixPeer({...peer,pidfd_pinned:false},peer));
});
test('M15-CLOSURE SIMULATED: partial/unknown IPC or owner evidence never releases five claims',async t=>{
  const base=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT??'.workflow-kit/runtime/AgentNexus-M1.5/tests','m15-closure');await mkdir(base,{recursive:true});const store=await KernelStore.open(await mkdtemp(join(base,'case-')));t.after(()=>store.close());
  store.db.exec('CREATE TABLE m14_host_resources(resource TEXT,kind TEXT,state TEXT,revision INTEGER,operation TEXT); CREATE TABLE m14_verified_exit_proofs(operation TEXT,hash TEXT,body TEXT);');
  const g=grant(),e:ExitEvidence={source:'SIMULATED',observation_id:uid(),process:g.process,parent:g.parent,job_id:'sim-job',job_membership_verified:true,job_empty:true,membership_complete:true,unknown_members:false,members:[{process:g.process,parent:g.parent,exited:true,exit_code:0,handle_signaled:true}],root_exited:true,handles_closed:true,termination_requested_at:null,observed_at:new Date().toISOString(),sandbox:{profile_hash:g.profile_hash,token_verified:true,network_verified:true,filesystem_verified:true,limits_verified:true,settled:true},outputs:{stdout:{eof:true,producer_closed:true,producer_id:'out'},stderr:{eof:true,producer_closed:true,producer_id:'err'}}};
  const proof=buildExitProof(g,e,null,null,sha256('SIMULATED'));store.db.prepare('INSERT INTO m14_verified_exit_proofs VALUES(?,?,?)').run(g.operation_id,proof.evidence_hash,canonical(proof));
  const kinds=['WRITER','WORKSPACE_LOCK','PROCESS_SLOT','WORKER_QUOTA','SANDBOX_RESERVATION'] as const;for(const kind of kinds)store.db.prepare('INSERT INTO m14_host_resources VALUES(?,?,?,?,?)').run('resource',kind,'HELD',0,g.operation_id);
  const observation:ClosureObservation={source:'SIMULATED',ipc:{connection_revoked:true,pending:0,unknown:1},sandbox_closed:true,owners:kinds.map(kind=>({kind,resource:'resource',revision:0,release_condition_verified:true}))};
  const owner=new ExitClosureOwner(store),closed=await owner.close(proof,observation);assert.equal(closed.state,'EXIT_UNVERIFIED');assert.throws(()=>owner.assertRelease(g.operation_id,proof.evidence_hash),{code:'M15_COMPLETE_EXIT_CLOSURE_REQUIRED'});assert.equal((store.db.prepare("SELECT count(*) n FROM m14_host_resources WHERE state='HELD'").get() as {n:number}).n,5);
  assert.throws(()=>store.db.prepare('UPDATE m15_exit_closures SET state=?').run('EXIT_VERIFIED'),/append only/);
});
test('M15-CPU REAL_LOCAL: historical non-DEADLINE PASS cannot satisfy the hard-budget criterion',async()=>{
  const {adjudicateCpu}=await import('../../tools/agentnexus/cpu-qualify-m15.mjs');const r={job_user_cpu_100ns:'28593750',job_kernel_cpu_100ns:'0',job_cpu_rate:10000,root_exit_observed:true,tree_empty_observed:true,termination_requested_at:null,termination_reason:null,job_cpu_time_scope:'USER_MODE',job_cpu_time_end_action:'TERMINATE'};
  assert.equal(adjudicateCpu(r,80).status,'FAIL');assert.equal(adjudicateCpu({...r,job_user_cpu_100ns:'800000'},80).status,'PASS');assert.equal(adjudicateCpu({...r,job_user_cpu_100ns:'800000',termination_requested_at:'wall'},80).status,'FAIL');
});
test('M15-BOOTSTRAP SIMULATED: disabled Launcher refuses PREPARE before creating any OS process',async()=>{
  const f=await sessions(),key=generateKeyPairSync('ed25519');let prepared=0;const fake={async prepare(){prepared++;return {};},close(){}} as unknown as WindowsSupervisor,cancel=new AbortController();
  const serving=new WorkerLauncherService(f.l,fake,profile,parent.principal,key.publicKey,()=>false).serve(cancel.signal);const rejected=assert.rejects(serving,{code:'M15_LAUNCHER_FEATURE_DISABLED'}),deadline=Date.now()+1000;await f.h.send('PREPARE',{logical,arguments:arg},uid(),'bootstrap',deadline);assert.equal((await f.h.receive(deadline)).kind,'ERROR');await rejected;assert.equal(prepared,0);f.h.close();
});
test('M15-BOOTSTRAP SIMULATED: provisional slot transfers atomically with Grant ownership and never overwrites uncertainty',async t=>{
  const base=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT??'.workflow-kit/runtime/AgentNexus-M1.5/tests','m15-reservations');await mkdir(base,{recursive:true});const store=await KernelStore.open(await mkdtemp(join(base,'case-')));initializeControl(store);store.db.exec('CREATE TABLE m14_host_resources(kind TEXT,state TEXT);');t.after(()=>store.close());let on=true;
  const owner=new BootstrapReservations(store,()=>on,parent,'m15-project:input',profileHash(profile));on=false;await assert.rejects(owner.claim(logical,arg),{code:'M15_BOOTSTRAP_FEATURE_OR_AUDIT_BLOCKED'});on=true;const id=await owner.claim(logical,arg);assert.equal((store.db.prepare('SELECT state FROM m15_bootstrap_prepares WHERE id=?').get(id) as {state:string}).state,'PREPARING');
  const g=grant({host_boot_id:clockFor(store).boot_id}),r={runtime_id:g.runtime_id,logical,process:processId,parent,worker_instance_id:g.worker_instance_id,host_boot_id:g.host_boot_id,broker_boot_id:g.broker_boot_id,generation:1,profile,profile_hash:g.profile_hash,state:'ACTIVE' as const,assurance:'SIMULATED' as const};await owner.bind(id,r);
  assert.throws(()=>store.transaction(()=>{owner.transfer(g);throw new Error('simulate original Permit transaction rollback');}));assert.equal((store.db.prepare('SELECT state FROM m15_bootstrap_prepares WHERE id=?').get(id) as {state:string}).state,'PREPARED');
  store.transaction(()=>owner.transfer(g));assert.equal((store.db.prepare('SELECT state FROM m15_bootstrap_prepares WHERE id=?').get(id) as {state:string}).state,'TRANSFERRED');store.db.prepare('INSERT INTO m14_host_resources VALUES(?,?)').run('PROCESS_SLOT','UNKNOWN_QUARANTINED');await assert.rejects(owner.claim(logical,arg),{code:'M14_WORKER_QUOTA'});
});
test('M15-BOOTSTRAP SIMULATED: audit barrier failure prevents creation and restart preserves a provisional unknown slot',async()=>{
  const base=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT??'.workflow-kit/runtime/AgentNexus-M1.5/tests','m15-reservations');await mkdir(base,{recursive:true});const path=await mkdtemp(join(base,'fault-'));let store=await KernelStore.open(path);initializeControl(store);store.db.exec('CREATE TABLE m14_host_resources(kind TEXT,state TEXT);');let owner=new BootstrapReservations(store,()=>true,parent,'m15-project:input',profileHash(profile)),created=0;
  const flush=store.flush.bind(store);store.flush=async()=>{throw new Error('SIMULATED_AUDIT_BARRIER_FAILURE');};await assert.rejects((async()=>{await owner.claim(logical,arg);created++;})());assert.equal(created,0);store.flush=flush;await store.close();
  store=await KernelStore.open(path);initializeControl(store);owner=new BootstrapReservations(store,()=>true,parent,'m15-project:input',profileHash(profile));try{await owner.recover();assert.equal((store.db.prepare('SELECT state FROM m15_bootstrap_prepares').get() as {state:string}).state,'UNKNOWN_QUARANTINED');await assert.rejects(owner.claim(logical,arg),{code:'M15_PREPARED_SLOT_HELD'});}finally{await store.close();}
});
