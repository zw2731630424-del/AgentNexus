import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { openHost } from '../../src/agentnexus/host.ts';
import { intentHash } from '../../src/agentnexus/gateway.ts';
import type { ToolDefinition, ToolRequest } from '../../src/agentnexus/gateway.ts';
import { invariant } from '../../src/agentnexus/types.ts';
import type { Identity, Json } from '../../src/agentnexus/types.ts';

const ID:Identity={agent_id:'worker-a',project_id:'project-a',task_id:'task-a',session_id:'session-a'};
async function fixture(t:test.TestContext, options:Parameters<typeof openHost>[1]={}) {
  const base=resolve('.workflow-kit/runtime/AgentNexus-v0.4-M1/gateway');await mkdir(base,{recursive:true});
  const root=await mkdtemp(join(base,'case-'));const host=await openHost(root,options);
  const agent=host.bindAgent(ID);
  t.after(async()=>{await agent.close();await host.close();});return{host,agent,root};
}
async function setMode(host:Awaited<ReturnType<typeof openHost>>, mode:'ENFORCE'|'AUDIT_ONLY'|'DISABLED',policy_ids=['P.COMMAND_RISK']) {
  const p=await host.administration.prepareMode({scope:{},mode,policy_ids,reason:'Explicit synthetic local kernel verification',expires_at:mode==='ENFORCE'?null:new Date(Date.now()+60000).toISOString()},host.administration.metadata().policy_revision);
  await host.administration.confirmMode(p.challenge_id,'PREVIEW_ACK',p.preview_hash);
  await host.administration.confirmMode(p.challenge_id,'RISK_ACK',p.preview_hash);
  await host.administration.commitMode(p.challenge_id,p.preview_hash);
}
function counter(host:Awaited<ReturnType<typeof openHost>>, overrides:Partial<ToolDefinition>={}) {
  host.store.db.exec('CREATE TABLE IF NOT EXISTS synthetic_effects(n INTEGER NOT NULL);INSERT INTO synthetic_effects SELECT 0 WHERE NOT EXISTS(SELECT 1 FROM synthetic_effects)');
  host.administration.registerTool({id:'fixture.counter',version:'1',feature_id:'tool.test',policy_ids:[],requires_sandbox:false,
    schema:args=>{invariant(args!==null&&typeof args==='object'&&!Array.isArray(args),'COUNTER_SCHEMA');},
    writer_resource:(_args,id)=>id.project_id+':counter',
    execute:()=>{host.store.db.exec('UPDATE synthetic_effects SET n=n+1');return{data:{n:count(host)}};},...overrides});
}
function count(host:Awaited<ReturnType<typeof openHost>>):number{return(host.store.db.prepare('SELECT n FROM synthetic_effects').get() as {n:number}).n;}
const request=(call='call-1'):ToolRequest=>({call_id:call,tool_id:'fixture.counter',tool_version:'1',arguments:{value:1}});
async function toggle(host:Awaited<ReturnType<typeof openHost>>,changes:any[]) {
  const p=await host.administration.previewFeatures(changes,host.administration.metadata().feature_revision);
  await host.administration.commitFeatures(p.challenge_id,p.preview_hash);
}

test('AT/Context/Artifact: real invocation produces separate hash-linked facts and byte-exact output',async t=>{
  const{host,agent}=await fixture(t);const original='中文\r\nraw\u0000text';
  const result=await agent.request({call_id:'echo-raw',tool_id:'native.echo',tool_version:'1',arguments:{text:original}});
  assert.equal(result.status,'PASS');assert.deepEqual(result.data,{text:original});
  const facts=agent.reconstructTask().records.filter(x=>x.operation_id===result.operation_id);
  const phases=facts.map(x=>(x.body as any).phase);
  for(const phase of ['RECEIVED','POLICY_DECISION','PERMIT_ISSUED','CLAIMED','START_INTENT','STARTED','RESULT','ACK_READY'])assert.ok(phases.includes(phase),phase);
  const context=agent.context().filter(x=>x.operation_id===result.operation_id);assert.equal(context.length,2);
  assert.ok(context.every(x=>x.domain==='context'));assert.ok(facts.every(x=>x.domain==='audit'));
  const parts:Buffer[]=[];for await(const chunk of host.store.artifacts.read(result.stdout_ref!))parts.push(chunk);
  assert.equal(Buffer.concat(parts).toString(),JSON.stringify({text:original}));
  const v=await host.store.verify();assert.equal(v.pending,0);
});
test('P.MODE+Gateway: same safe synthetic operation blocked/enforced, would-deny, and unevaluated',async t=>{
  let calls=0;const{host,agent}=await fixture(t,{ruleEvaluator:()=>{calls++;return'REQUIRE_APPROVAL';}});
  counter(host,{policy_ids:['P.COMMAND_RISK']});
  assert.equal((await agent.request(request('enforce'))).status,'BLOCKED');assert.equal(count(host),0);
  await setMode(host,'AUDIT_ONLY');assert.equal((await agent.request(request('audit'))).status,'PASS');assert.equal(count(host),1);assert.equal(calls,2);
  await setMode(host,'DISABLED');assert.equal((await agent.request(request('disabled'))).status,'PASS');assert.equal(count(host),2);assert.equal(calls,2);
  const facts=host.store.query('audit',{project_id:ID.project_id,task_id:ID.task_id,limit:100}).map(x=>x.body as any).filter(x=>x.phase==='POLICY_DECISION');
  assert.ok(facts.some(x=>x.detail.facts[0]?.result==='WOULD_DENY'));
  assert.ok(facts.some(x=>x.detail.facts[0]?.result==='BYPASSED'&&x.detail.facts[0].original_verdict==='NOT_EVALUATED'));
});
test('P.SANDBOX: DISABLED does not admit arbitrary execution or close independent protection',async t=>{
  const{host,agent}=await fixture(t);let executed=0;
  counter(host,{requires_sandbox:true,policy_ids:['P.COMMAND_RISK'],execute:()=>{executed++;return{data:null};}});
  await setMode(host,'DISABLED');const r=await agent.request(request());
  assert.equal(r.status,'BLOCKED');assert.equal(r.reason,'SANDBOX_NOT_VERIFIED');assert.equal(executed,0);
  assert.equal(host.deployment.status,'BLOCKED');
});
test('P.IDENTITY: facade has no administration and JSON admin/mode flags cannot elevate',async t=>{
  const{host,agent}=await fixture(t);counter(host,{policy_ids:['P.COMMAND_RISK']});
  assert.ok(!Object.hasOwn(agent,'administration'));assert.ok(!Object.hasOwn(agent,'store'));
  const bad=await agent.request({...request(),admin:true,mode:'DISABLED'} as any);
  assert.equal(bad.status,'BLOCKED');assert.equal(bad.reason,'INVALID_TOOL_REQUEST');assert.equal(count(host),0);
  assert.equal(host.policy.modeFor('P.COMMAND_RISK',{}),'ENFORCE');
});
test('P.APPROVAL_REPLAY: exact approval executes once; altered intent and replay denied',async t=>{
  const{host,agent}=await fixture(t);counter(host,{policy_ids:['P.COMMAND_RISK']});const req=request();
  const approval=await host.administration.approve(intentHash(ID,req),ID,'Explicit single operation verification');
  const altered=await agent.request({...req,arguments:{value:2},approval_id:approval});
  assert.equal(altered.status,'BLOCKED');assert.equal(count(host),0);
  // The rejected call_id has durable history; the approval is intentionally not transferred to a new call.
  const fresh=request('approved-fresh');const grant=await host.administration.approve(intentHash(ID,fresh),ID,'New exact intent after rejected attempt');
  const ok=await agent.request({...fresh,approval_id:grant});assert.equal(ok.status,'PASS');assert.equal(count(host),1);
  assert.equal((await agent.request({...fresh,approval_id:grant})).reason,'DUPLICATE_OPERATION');
  assert.equal((await agent.request({...request('wrong-hash'),approval_id:grant})).status,'BLOCKED');assert.equal(count(host),1);
  assert.equal((host.store.db.prepare('SELECT consumed FROM control_permits WHERE id=?').get(ok.permit_id!) as any).consumed,1);
});
test('P.DB_ATOMIC: 16 concurrent duplicate requests invoke a real handler at most once',async t=>{
  const{host,agent}=await fixture(t);counter(host);
  const results=await Promise.all(Array.from({length:16},()=>agent.request(request('duplicate'))));
  assert.equal(results.filter(x=>x.status==='PASS').length,1);assert.equal(count(host),1);
  assert.equal((host.store.db.prepare('SELECT count(*) n FROM control_operations').get() as any).n,1);
});
test('P.WORKSPACE_WRITER: concurrent distinct calls cannot overwrite active resource; modes cannot change mid-action',async t=>{
  const{host,agent}=await fixture(t);let finish!:()=>void,entered!:()=>void;
  const started=new Promise<void>(r=>entered=r),hold=new Promise<void>(r=>finish=r);
  counter(host,{execute:async()=>{entered();await hold;host.store.db.exec('UPDATE synthetic_effects SET n=n+1');return{data:{n:count(host)}};}});
  const first=agent.request(request('writer-a'));await started;
  try{
    const blocked=await agent.request(request('writer-b'));assert.equal(blocked.reason,'WORKSPACE_BUSY');assert.equal(count(host),0);
    await assert.rejects(setMode(host,'DISABLED'),{code:'ACTIVE_OPERATIONS'});
    assert.equal((host.store.db.prepare('SELECT count(*) n FROM control_writers').get() as any).n,1);
  }finally{finish();}
  assert.equal((await first).status,'PASS');assert.equal(count(host),1);
  assert.equal((host.store.db.prepare('SELECT count(*) n FROM control_writers').get() as any).n,0);
});
test('AT-IOFAIL-before: actual SQLite readonly persistence failure prevents handler execution',async t=>{
  const{host,agent}=await fixture(t);counter(host);host.store.db.exec('PRAGMA query_only=ON');
  try{const r=await agent.request(request('before-fault'));assert.equal(r.status,'BLOCKED');assert.equal(count(host),0);assert.equal(host.store.faulted,true);assert.equal(host.features.resolve('core.state').health,'FAILED');assert.equal(host.features.resolve('tool.test').effective,'BLOCKED');}
  finally{host.store.db.exec('PRAGMA query_only=OFF');await host.store.recover();}
  assert.equal((await agent.request(request('after-recover'))).status,'PASS');assert.equal(count(host),1);
});
test('AT-IOFAIL-after: actual effect with unrecordable result keeps claim and never replays',async t=>{
  const{host,agent}=await fixture(t);counter(host,{execute:()=>{host.store.db.exec('UPDATE synthetic_effects SET n=n+1;PRAGMA query_only=ON');return{data:{n:1}};}});
  const r=await agent.request(request('post-fault'));
  assert.equal(r.status,'INCONCLUSIVE');assert.equal(count(host),1);assert.equal(host.store.faulted,true);
  host.store.db.exec('PRAGMA query_only=OFF');await host.store.recover();
  assert.equal((await agent.request(request('post-fault'))).reason,'DUPLICATE_OPERATION');assert.equal(count(host),1);
  assert.equal((host.store.db.prepare('SELECT count(*) n FROM control_writers').get() as any).n,1);
  assert.equal((await agent.request(request('new-while-uncertain'))).reason,'WORKSPACE_BUSY');assert.equal(count(host),1);
});
test('P.TIMEOUT: timeout retains owned lease until actual handler settlement and never resets claim',async t=>{
  const{host,agent}=await fixture(t);let finish!:()=>void;
  const hold=new Promise<void>(r=>finish=r);
  counter(host,{timeout_ms:25,execute:async()=>{await hold;return{data:{done:true}};}});
  const result=await agent.request(request('timeout'));
  try{assert.equal(result.status,'INCONCLUSIVE');assert.equal(result.reason,'TOOL_TIMEOUT');assert.equal(host.features.activeCount(),1);assert.equal((host.store.db.prepare('SELECT count(*) n FROM control_writers').get() as any).n,1);}
  finally{finish();await delay(1);}
  assert.equal(host.features.activeCount(),0);
  assert.equal((await agent.request(request('timeout'))).reason,'DUPLICATE_OPERATION');
});
test('AT-REPLAY: reconstruction is readonly and session scope does not grant peer context',async t=>{
  const{host,agent}=await fixture(t);counter(host);assert.equal((await agent.request(request('original'))).status,'PASS');
  const other=host.bindAgent({...ID,agent_id:'reviewer',session_id:'review-session'});t.after(()=>other.close());
  assert.equal(other.context().length,0);assert.ok(other.reconstructTask().records.every(r=>(r.body as any).agent_id==='reviewer'));
  const foreign=host.bindAgent({...ID,project_id:'project-b',session_id:'foreign-session'});t.after(()=>foreign.close());
  assert.equal(foreign.context().length,0);
  const n=count(host);for(let i=0;i<3;i++)assert.equal(agent.reconstructTask().replay,'READ_ONLY_NO_EXECUTOR');
  assert.equal(count(host),n);
});
test('P.IDENTITY-revocation: old facade cannot read or close a replacement session',async t=>{
  const{host,agent}=await fixture(t);await agent.request({call_id:'one',tool_id:'native.echo',tool_version:'1',arguments:null});
  await agent.close();assert.throws(()=>agent.context(),{code:'SESSION_CLOSED'});assert.throws(()=>agent.reconstructTask(),{code:'SESSION_CLOSED'});
  const replacement=host.bindAgent(ID);t.after(()=>replacement.close());await agent.close();
  assert.equal((await replacement.request({call_id:'two',tool_id:'native.echo',tool_version:'1',arguments:null})).status,'PASS');
});
test('P.IDENTITY-close-race: close revokes facade before its first asynchronous cleanup',async t=>{
  const{host,agent}=await fixture(t);const closing=agent.close();
  await assert.rejects(agent.request({call_id:'late',tool_id:'native.echo',tool_version:'1',arguments:null}),{code:'SESSION_CLOSED'});
  assert.throws(()=>agent.context(),{code:'SESSION_CLOSED'});await closing;
  const replacement=host.bindAgent(ID);await agent.close();
  assert.equal((await replacement.request({call_id:'new',tool_id:'native.echo',tool_version:'1',arguments:null})).status,'PASS');
  await replacement.close();
});
test('P.TIMEOUT-clock: handler deadline uses elapsed time under a wall-clock rollback',async t=>{
  const{host,agent}=await fixture(t);let finish!:()=>void;
  const hold=new Promise<void>(r=>finish=r);const realNow=Date.now();
  const mocked=t.mock.method(Date,'now',Date.now);
  counter(host,{timeout_ms:20,execute:async()=>{mocked.mock.mockImplementation(()=>realNow-10000);await hold;return{data:null};}});
  const result=await agent.request(request('clock-timeout'));
  try{assert.equal(result.reason,'TOOL_TIMEOUT');assert.equal(result.status,'INCONCLUSIVE');}
  finally{mocked.mock.restore();finish();await delay(1);}
});
test('P.MODE-START: a bypass expiring during a real delayed durability barrier cannot execute',async t=>{
  const{host,agent}=await fixture(t);counter(host,{policy_ids:['P.COMMAND_RISK']});
  const p=await host.administration.prepareMode({scope:{},mode:'AUDIT_ONLY',policy_ids:['P.COMMAND_RISK'],reason:'Delayed actual barrier expiry verification',expires_at:new Date(Date.now()+350).toISOString()},host.administration.metadata().policy_revision);
  await host.administration.confirmMode(p.challenge_id,'PREVIEW_ACK',p.preview_hash);await host.administration.confirmMode(p.challenge_id,'RISK_ACK',p.preview_hash);await host.administration.commitMode(p.challenge_id,p.preview_hash);
  const original=host.store.flush.bind(host.store);let delayed=false;
  host.store.flush=async()=>{await original();if(!delayed&&host.store.db.prepare('SELECT 1 FROM control_permits LIMIT 1').get()){delayed=true;await delay(400);}};
  try{const result=await agent.request(request('expired-during-flush'));assert.equal(result.status,'BLOCKED');assert.equal(result.reason,'ENFORCE_PENDING_PREFLIGHT');assert.equal(count(host),0);}
  finally{host.store.flush=original;await original();}
});
test('DI integration: malformed code remains FAIL, checks OFF are BYPASSED, raw/audit continue',async t=>{
  const{host,agent}=await fixture(t);
  const args:Json={language:'json',source:'{"x":}',document_uri:'memory:bad.json',version:1};
  const bad=await agent.request({call_id:'syntax',tool_id:'native.diagnostics',tool_version:'1',arguments:args});
  assert.equal(bad.status,'PASS');assert.equal((bad.data as any).dimensions.syntax.status,'FAIL');assert.equal((bad.data as any).dimensions.authorization.status,'NOT_RUN');
  await toggle(host,[{id:'devint.code.json',scope:{},state:'OFF'}]);
  const off=await agent.request({call_id:'off',tool_id:'native.diagnostics',tool_version:'1',arguments:{...args as object,version:2} as Json});
  assert.equal((off.data as any).status,'BYPASSED');assert.equal((off.data as any).reason,'VALIDATION_BYPASSED');
  assert.ok(agent.context().filter(x=>x.operation_id===off.operation_id).length===2);
  assert.ok(agent.reconstructTask().records.some(x=>x.operation_id===off.operation_id&&(x.body as any).phase==='RESULT'));
});
test('Tool OFF rejects invocation, diagnostics log OFF does not silence core audit, oversized request is bounded',async t=>{
  const{host,agent}=await fixture(t);counter(host);assert.equal(host.features.resolve('audit.diagnostic-logs').desired,'OFF');
  await toggle(host,[{id:'tool.test',scope:{},state:'OFF'}]);
  const r=await agent.request(request());assert.equal(r.reason,'FEATURE_OFF');assert.equal(count(host),0);
  assert.ok(agent.reconstructTask().records.some(x=>x.operation_id===r.operation_id&&(x.body as any).phase==='FAILED'));
  const large=await agent.request({...request('large'),arguments:{source:'x'.repeat(70000)}});
  assert.equal(large.status,'BLOCKED');assert.equal(large.reason,'FRAME_TOO_LARGE');assert.equal(count(host),0);
});
test('P.ARG_BINDING: mutation by schema or caller cannot replace the authorized snapshot',async t=>{
  const{host,agent}=await fixture(t);let changed=false;
  counter(host,{schema:args=>{try{(args as any).value=99;}catch{changed=true;}},execute:args=>({data:args})});
  const req=request('snapshot');const pending=agent.request(req);(req.arguments as any).value=77;
  const result=await pending;assert.equal(changed,true);assert.deepEqual(result.data,{value:1});
});
test('DI command checking keeps argv preview as data and cannot execute Git/Python',async t=>{
  const{agent}=await fixture(t);const r=await agent.request({call_id:'argv-check',tool_id:'native.command-check',tool_version:'1',arguments:{family:'git',argv:['status','--short'],document_uri:'memory:argv',version:1}});
  assert.equal(r.status,'PASS');assert.equal((r.data as any).preview.will_execute,false);
  assert.deepEqual((r.data as any).preview.argv,['status','--short']);
  assert.equal((r.data as any).validation.dimensions.authorization.status,'NOT_RUN');
});
