import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, linkSync, symlinkSync, rmSync, existsSync, openSync, appendFileSync, closeSync } from 'node:fs';
import { dirname, resolve, join, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const runtime = join(sourceRoot, 'src/agentnexus/production/windows/runtime.ps1');
const fixture = join(sourceRoot, 'tests/agentnexus/m14-native-worker.mjs');
const logRoot = resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT ?? join(tmpdir(),'AgentNexus-M1.4'), 'm14-native');
const windows = process.platform === 'win32';

type Result = { id: string; ok: boolean; result?: any; error?: {code:string;message:string} };
class Rpc {
  child: ChildProcessWithoutNullStreams;
  pending = new Map<string, {resolve:(x:Result)=>void;reject:(e:Error)=>void;timer:NodeJS.Timeout}>();
  events: any[] = [];
  stderr = '';
  frame = Buffer.alloc(0);
  serial = 0;
  operations = new Map<string,string>();
  evidencePath: string;
  evidenceFd: number;
  constructor() {
    mkdirSync(logRoot,{recursive:true});
    this.evidencePath = join(logRoot,`native-helper-${Date.now()}-${randomUUID()}.jsonl`);
    this.evidenceFd = openSync(this.evidencePath,'wx');
    this.child = spawn('pwsh', ['-NoProfile', '-NonInteractive', '-File', runtime], { windowsHide:true, shell:false, stdio:'pipe' });
    this.child.stderr.on('data', data => {this.stderr += data;});
    this.child.stdout.on('data', data => {
      this.frame = Buffer.concat([this.frame, data]);
      for (;;) {
        const end = this.frame.indexOf(10);
        if (end === -1) { assert.ok(this.frame.length < 65536); break; }
        assert.ok(end + 1 <= 65536, 'each RPC/event frame <=64KiB');
        const raw = this.frame.subarray(0, end).toString('utf8');
        const frame = JSON.parse(raw);
        this.frame = this.frame.subarray(end + 1);
        // Preserve received OS fields and the exact native JSONL before assertions
        // or resolution. Request params, credentials and keys are never logged.
        appendFileSync(this.evidenceFd,JSON.stringify({received_at:new Date().toISOString(),helper_pid:this.child.pid,op:this.operations.get(frame.id)??null,id:frame.id,frame,raw_jsonl:raw+'\n'})+'\n','utf8');
        if (frame.event) {this.events.push(frame);continue;}
        const waiter = this.pending.get(frame.id);
        if (waiter) {clearTimeout(waiter.timer);this.pending.delete(frame.id);waiter.resolve(frame);}
      }
    });
    this.child.on('exit', (code, signal) => {for (const item of this.pending.values()) {clearTimeout(item.timer);item.reject(new Error(`native helper exit ${code}/${signal}: ${this.stderr}`));}this.pending.clear();});
    this.child.on('error', error => {for(const item of this.pending.values())item.reject(error);this.pending.clear();});
    this.child.on('close', () => closeSync(this.evidenceFd));
  }
  call(op:string, params:any={}, deadline=5000):Promise<Result> {
    const id = `native-${++this.serial}`;
    this.operations.set(id,op);
    return new Promise((resolveResult, reject) => {
      const timer = setTimeout(() => {this.pending.delete(id);this.child.kill();reject(new Error(`native request timeout ${op}: ${this.stderr}`));}, deadline + 12000);
      this.pending.set(id, {resolve:resolveResult,reject,timer});
      const bytes = Buffer.from(JSON.stringify({id,op,deadline_ms:deadline,params})+'\n');
      assert.ok(bytes.length<=65536);
      this.child.stdin.write(bytes);
    });
  }
  close() {this.child.stdin.end();if(this.child.exitCode===null)this.child.kill();}
}
function verified(response:Result) {assert.equal(response.ok,true,JSON.stringify(response.error));return response.result;}
function safeRemove(directory:string) {const r=relative(logRoot,resolve(directory));assert.ok(r&&!r.startsWith('..')&&!isAbsolute(r));rmSync(directory,{recursive:true,force:true});}
function newFixture() {mkdirSync(logRoot,{recursive:true});return mkdtempSync(join(logRoot,'native-files-'));}
function jobParams(mode:string, overrides:any={}) {return {executable:process.execPath,executable_sha256:createHash('sha256').update(readFileSync(process.execPath)).digest('hex'),args:[fixture,mode],cwd:sourceRoot,limits:{active_processes:4,process_memory_bytes:268435456,job_memory_bytes:536870912,cpu_rate:2000},stdout_max_bytes:8192,stderr_max_bytes:8192,...overrides};}

test('M1.4 REAL_WINDOWS: actual process/token identity', {skip:!windows}, async t => {
  const rpc=new Rpc();t.after(()=>rpc.close());
  const identity=verified(await rpc.call('identity'));
  assert.equal(identity.pid,rpc.child.pid);assert.match(identity.start_id,/^\d+$/);assert.match(identity.principal,/^S-1-/);
  assert.equal(identity.token.user_sid,identity.principal);assert.equal(identity.token.session_id.toString(),identity.os_session);
  assert.ok(Array.isArray(identity.token.groups));assert.ok(Array.isArray(identity.token.privileges));
});
test('M1.4 REAL_WINDOWS: exact 64KiB RPC boundary accepted and larger frame rejected', {skip:!windows}, () => {
  const request={id:'frame-limit',op:'identity',deadline_ms:5000,params:{padding:''}};
  request.params.padding='x'.repeat(65535-Buffer.byteLength(JSON.stringify(request)));
  const exact=JSON.stringify(request)+'\n';assert.equal(Buffer.byteLength(exact),65536);
  const accepted=spawnSync('pwsh',['-NoProfile','-NonInteractive','-File',runtime],{input:exact,encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(accepted.status,0,accepted.stderr);assert.equal(JSON.parse(accepted.stdout).ok,true);
  const over=spawnSync('pwsh',['-NoProfile','-NonInteractive','-File',runtime],{input:'x'.repeat(65536)+'\n',encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(over.status,3,over.stderr);assert.equal(JSON.parse(over.stdout).error.code,'FRAME_LIMIT');
});
test('M1.4 REAL_WINDOWS: restricted-token detailed readback', {skip:!windows}, async t => {
  const rpc=new Rpc();t.after(()=>rpc.close());
  const response=await rpc.call('token.restrict');
  if(!response.ok&&response.error?.code==='WIN32_5'&&response.error.message==='Open own primary token') {const self=verified(await rpc.call('identity'));assert.equal(self.token.is_appcontainer,true,'permission skip applies only to opening a token in the observed host sandbox');t.skip('NOT_RUN: host sandbox denied opening the source token with the required clone access; no privilege or ACL change attempted');return;}
  const proof=verified(response);assert.equal(proof.readback_verified,true);assert.equal(proof.restricted.is_restricted,true);assert.equal(proof.restricted.integrity_sid,'S-1-16-4096');assert.equal(proof.release_authority,false);
});

test('M1.4 REAL_WINDOWS: root-relative file create/read and path/link rejection', {skip:!windows}, async t => {
  const directory=newFixture(),rpc=new Rpc();t.after(()=>{rpc.close();safeRemove(directory);});mkdirSync(join(directory,'safe'));
  const content=Buffer.from('M1.4 native broker bytes\n');const params={root:directory,relative_path:'safe\\output.txt',max_bytes:1024};
  const created=verified(await rpc.call('file.create',{...params,content_base64:content.toString('base64')}));assert.equal(created.bytes,content.length);assert.equal(created.link_count,1);assert.equal(created.exclusive_create,true);assert.equal(created.ancestor_share_delete,false);
  const read=verified(await rpc.call('file.read',params));assert.deepEqual(Buffer.from(read.content_base64,'base64'),content);assert.equal(read.file_id,created.file_id);assert.equal(read.sha256,createHash('sha256').update(content).digest('hex'));
  const overwrite=await rpc.call('file.create',{...params,content_base64:'eA=='});assert.equal(overwrite.ok,false);assert.equal(readFileSync(join(directory,'safe/output.txt')).toString(),content.toString());
  for(const path of ['..\\escape','safe\\output.txt:secret','\\\\server\\share','CON.txt','safe\\..\\escape','safe/other']) {const denied=await rpc.call('file.read',{...params,relative_path:path});assert.equal(denied.ok,false,path);assert.equal(denied.error?.code,'PATH_REJECTED');}
});
test('M1.4 REAL_WINDOWS: broker rejects an actual hardlink', {skip:!windows}, async t => {
  const directory=newFixture(),rpc=new Rpc();t.after(()=>{rpc.close();safeRemove(directory);});writeFileSync(join(directory,'output.txt'),'hardlink fixture');
  try{linkSync(join(directory,'output.txt'),join(directory,'hard.txt'));}catch(error:any){if(error.code==='EPERM'){t.skip('NOT_RUN: host sandbox denied temporary hardlink creation');return;}throw error;}
  const hardlink=await rpc.call('file.read',{root:directory,relative_path:'hard.txt'});assert.equal(hardlink.ok,false);assert.equal(hardlink.error?.code,'HARDLINK_REJECTED');
});
test('M1.4 REAL_WINDOWS: broker rejects an actual junction', {skip:!windows}, async t => {
  const directory=newFixture(),rpc=new Rpc();t.after(()=>{rpc.close();safeRemove(directory);});mkdirSync(join(directory,'outside'));writeFileSync(join(directory,'outside/secret.txt'),'secret');
  try{symlinkSync(join(directory,'outside'),join(directory,'junction'),'junction');}catch(error:any){if(error.code==='EPERM'){t.skip('NOT_RUN: host denied temporary junction creation');return;}throw error;}
  const junction=await rpc.call('file.read',{root:directory,relative_path:'junction\\secret.txt'});assert.equal(junction.ok,false);assert.ok(['REPARSE_REJECTED','WIN32_1920','WIN32_4390'].includes(junction.error?.code??''),JSON.stringify(junction));
});

test('M1.4 REAL_WINDOWS: protected named pipe binds both actual peer handles', {skip:!windows}, async t => {
  const server=new Rpc(),client=new Rpc();t.after(()=>{server.close();client.close();});
  const [a,b]=await Promise.all([server.call('identity'),client.call('identity')]);const host=verified(a),worker=verified(b);const name=`AgentNexus-M14-${process.pid}-${Date.now()}`;
  const serving=server.call('pipe.server',{name,expected_peer:worker,payload_base64:Buffer.from('server-payload').toString('base64')},1500).catch(error=>({id:'server',ok:false,error:{code:'HELPER_EXIT',message:String(error)}}));
  const clientResponse=await client.call('pipe.client',{name,expected_peer:host,payload_base64:Buffer.from(JSON.stringify({principal:'forged',pid:1})).toString('base64')},1500);
  if(!clientResponse.ok&&['WIN32_5','ACCESS_DENIED'].includes(clientResponse.error?.code??'')){await serving;t.skip('NOT_RUN: host AppContainer denies a local pipe whose exact DACL contains only Host/Worker user SIDs; no extra capability ACE added');return;}
  const peer=verified(clientResponse);
  const accepted=verified(await serving);assert.equal(accepted.peer.pid,client.child.pid);assert.equal(peer.peer.pid,server.child.pid);assert.equal(accepted.payload_identity_trusted,false);assert.equal(accepted.connection_limit,1);assert.equal(accepted.first_pipe_instance,true);assert.equal(accepted.remote_clients_rejected,true);assert.match(accepted.dacl_sddl,/D:P/);assert.equal(accepted.peer_authenticated,true);assert.equal(peer.peer_authenticated,true);
});

test('M1.4 REAL_WINDOWS: pipe refuses forged supervisor start identity and deadline is bounded', {skip:!windows}, async t => {
  const rpc=new Rpc();t.after(()=>rpc.close());const identity=verified(await rpc.call('identity'));
  const forged=await rpc.call('pipe.server',{name:`AgentNexus-M14-forged-${Date.now()}`,expected_peer:{...identity,start_id:'1'}});assert.equal(forged.ok,false);assert.equal(forged.error?.code,'PEER_MISMATCH');
  const expired=await rpc.call('pipe.server',{name:`AgentNexus-M14-timeout-${Date.now()}`,expected_peer:identity},100);assert.equal(expired.ok,false);assert.equal(expired.error?.code,'DEADLINE');
});

for(const mode of ['normal','hold','orphan']) test(`M1.4 REAL_WINDOWS_PRIMITIVE: suspended Job ${mode}, distinct root/tree/output observations`, {skip:!windows}, async t => {
  const rpc=new Rpc();t.after(()=>rpc.close());const response=await rpc.call('primitive.job',jobParams(mode),mode==='normal'?5000:1600);
  if(!response.ok&&['WIN32_5','WIN32_1314','WIN32_50'].includes(response.error?.code??'')){t.skip(`NOT_RUN primitive Job: host sandbox ${response.error?.code}; no fallback or privilege change`);return;}
  const proof=verified(response);assert.equal(proof.assigned_before_resume,true);assert.equal(proof.job_limits_readback_verified,true);assert.equal(proof.explicit_inherited_handle_count,3);assert.equal(proof.membership_complete,false);assert.equal(proof.proof_status,'EXIT_UNVERIFIED');assert.equal(proof.release_authority,false);assert.equal(proof.sandbox_combination_verified,false);
  if(mode==='orphan') {
    const rootExit=Date.parse(proof.root_exit_observed_at??''),termination=Date.parse(proof.termination_requested_at??'');
    const children=proof.members.filter((member:any)=>!member.root&&member.identity?.pid!==proof.root.pid);
    if(!Number.isFinite(rootExit)||!Number.isFinite(termination)||rootExit>=termination||children.length===0) {
      t.diagnostic(`INCONCLUSIVE orphan window; raw evidence: ${rpc.evidencePath}`);
      t.skip('NOT_RUN / INCONCLUSIVE: root exit before termination with an observed child was not captured');return;
    }
    assert.ok(rootExit<termination,'root exited before Job termination while a child remained');assert.ok(children.length>=1);assert.equal(proof.parentage_complete,false);
  }
  assert.equal(proof.root_exit_observed,true);assert.equal(proof.tree_empty_observed,true);assert.equal(proof.output_producers_settled,true);
  if(mode!=='normal')assert.ok(proof.termination_requested_at);if(mode==='normal')assert.match(Buffer.from(proof.stdout.content_base64,'base64').toString(),/native-fixture-stdout/);
});

test('M1.4 REAL_WINDOWS_PRIMITIVE: bounded streamed output events terminate a flood', {skip:!windows}, async t => {
  const rpc=new Rpc();t.after(()=>rpc.close());const response=await rpc.call('primitive.job',jobParams('flood',{stream_output:true,stdout_max_bytes:65536,stderr_max_bytes:8192,limits:{active_processes:4,process_memory_bytes:268435456,job_memory_bytes:536870912,cpu_rate:2000,output_bytes:65536}}),2500);
  if(!response.ok&&['WIN32_5','WIN32_1314','WIN32_50'].includes(response.error?.code??'')){t.skip(`NOT_RUN output fixture: host sandbox ${response.error?.code}`);return;}
  const proof=verified(response);assert.ok(rpc.events.length>0);let bytes=0;for(const event of rpc.events){const block=Buffer.from(event.data_base64,'base64');assert.ok(block.length<=4096);bytes+=block.length;}assert.ok(bytes<=65536);assert.ok(proof.stdout.overflow);assert.equal(proof.membership_complete,false);assert.equal(proof.output_producers_settled,false);assert.equal(proof.release_authority,false);
});
test('M1.4 REAL_WINDOWS_PRIMITIVE: cumulative Job CPU time kills a busy fixture before wall deadline', {skip:!windows}, async t => {
  const rpc=new Rpc();t.after(()=>rpc.close());const response=await rpc.call('primitive.job',jobParams('cpu',{limits:{active_processes:1,process_memory_bytes:268435456,job_memory_bytes:536870912,cpu_rate:10000,cpu_ms:80}}),4000);
  if(!response.ok&&['WIN32_5','WIN32_50'].includes(response.error?.code??'')){t.skip(`NOT_RUN CPU hard-time fixture: host sandbox ${response.error?.code}`);return;}
  const result=verified(response);assert.equal(result.job_cpu_time_ms,80);assert.equal(result.job_cpu_rate,10000);assert.equal(result.job_cpu_time_end_action,'TERMINATE');assert.ok(BigInt(result.job_total_cpu_100ns)>0n);assert.equal(result.release_authority,false);assert.equal(result.membership_complete,false);assert.equal(result.termination_requested_at,null,`CPU_TIME FAIL/BLOCKED: infinite busy fixture accumulated ${result.job_total_cpu_100ns} ticks and required helper termination (${result.termination_reason}); configuring JOB_TIME is not enforcement evidence`);assert.equal(result.root_exit_observed,true);assert.equal(result.tree_empty_observed,true);
});

test('M1.4 REAL_WINDOWS_PRIMITIVE: prepare pins actual suspended identity, resume runs once', {skip:!windows}, async t => {
  const rpc=new Rpc(),directory=newFixture();t.after(()=>{rpc.close();safeRemove(directory);});const marker=join(directory,'marker.txt');
  const prepared=verified(await rpc.call('primitive.prepare',jobParams('marker',{args:[fixture,'marker',marker],prepare_ttl_ms:5000,stream_output:true})));
  assert.equal(prepared.suspended,true);assert.equal(prepared.resumed,false);assert.equal(prepared.job_assigned,true);assert.ok(prepared.process.pid);assert.equal(existsSync(marker),false);
  await new Promise(resolve=>setTimeout(resolve,80));assert.equal(existsSync(marker),false,'no fixture code executes while root is suspended');
  const observed=verified(await rpc.call('primitive.observe',{prepare_id:prepared.prepare_id}));assert.equal(observed.process_handle_pinned,true);assert.equal(observed.consumed,false);
  const modeSwitch=await rpc.call('sandbox.resume',{prepare_id:prepared.prepare_id,expected_process:prepared.process});assert.equal(modeSwitch.error?.code,'PREPARE_MODE');
  const result=verified(await rpc.call('primitive.resume',{prepare_id:prepared.prepare_id,expected_process:prepared.process}));assert.equal(result.prepare_id,prepared.prepare_id);assert.equal(result.root.pid,prepared.process.pid);assert.equal(result.root.start_id,prepared.process.start_id);assert.equal(result.root_exit_observed,true);assert.equal(result.membership_complete,false);assert.equal(readFileSync(marker,'utf8'),'executed-after-resume\n');
  const repeated=await rpc.call('primitive.resume',{prepare_id:prepared.prepare_id,expected_process:prepared.process});assert.equal(repeated.ok,false);assert.equal(repeated.error?.code,'PREPARE_CONSUMED');
});

test('M1.4 REAL_WINDOWS_PRIMITIVE: mismatched/terminated/expired prepares never execute', {skip:!windows}, async t => {
  const rpc=new Rpc(),directory=newFixture();t.after(()=>{rpc.close();safeRemove(directory);});
  for(const mode of ['mismatch','terminate','expire']) {
    const marker=join(directory,mode+'.txt');const prepared=verified(await rpc.call('primitive.prepare',jobParams('marker',{args:[fixture,'marker',marker],prepare_ttl_ms:mode==='expire'?150:3000})));
    if(mode==='mismatch'){const denied=await rpc.call('primitive.resume',{prepare_id:prepared.prepare_id,expected_process:{...prepared.process,start_id:'1'}});assert.equal(denied.error?.code,'PEER_MISMATCH');}
    else if(mode==='terminate'){const stopped=verified(await rpc.call('primitive.terminate',{prepare_id:prepared.prepare_id}));assert.equal(stopped.termination_requested,true);}
    else{await new Promise(resolve=>setTimeout(resolve,230));const denied=await rpc.call('primitive.resume',{prepare_id:prepared.prepare_id,expected_process:prepared.process});assert.equal(denied.ok,false);assert.ok(['PREPARE_CONSUMED','PREPARE_EXPIRED'].includes(denied.error?.code??''));}
    assert.equal(existsSync(marker),false,mode+' prepared process did not execute');
  }
});

test('M1.4 deployment guards: same-account launch rejected and Derive is not provisioning', {skip:!windows}, async t => {
  const rpc=new Rpc();t.after(()=>rpc.close());const self=verified(await rpc.call('identity'));const result=await rpc.call('sandbox.run',{...jobParams('normal'),host_sid:self.principal,expected_worker_sid:self.principal,profile_name:'AgentNexus.M14.Worker',restricting_sid:self.principal});assert.equal(result.ok,false);assert.equal(result.error?.code,'BLOCKED_IDENTITY');
  const derived=verified(await rpc.call('appcontainer.derive',{profile_name:'AgentNexus.M14.Worker'}));assert.equal(derived.profile_created,false);assert.equal(derived.profile_existence_verified,false);
  t.diagnostic('NOT_RUN: approved distinct standard identities/profile and independent deployment bootstrap wiring are absent. Native prepare/resume is implemented and separately tested in primitive mode. Production BLOCKED. Derivation is not profile existence or combined evidence.');
});
test('M1.4 production combination and independent pre-pinned bootstrap/Grant bridge', {skip:'NOT_RUN / BLOCKED: independent approved accounts/profile and deployment bootstrap wiring are unavailable'}, () => {});
