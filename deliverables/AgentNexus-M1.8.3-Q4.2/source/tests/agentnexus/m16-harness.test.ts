import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp,writeFile,readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outsideSource } from '../../tools/agentnexus/output-root.ts';
import { openHarness } from '../../src/agentnexus/harness/index.ts';
import type { HarnessOptions } from '../../src/agentnexus/harness/index.ts';
import { canonical, sha256 } from '../../src/agentnexus/types.ts';
import type { AgentInput } from '../../src/agentnexus/harness/agents.ts';
import type { Budget } from '../../src/agentnexus/resources/index.ts';

const limits={workers:4,memory_bytes:268435456,processes:16,disk_bytes:67108864,model_tokens:100000,model_requests:100,model_cost_micros:1000000,wall_ms:1000000};
const worker={...limits,workers:1,memory_bytes:67108864};
async function fixture(options:HarnessOptions={}) {
  const base=process.env.AGENTNEXUS_TEST_DATA_ROOT??join(tmpdir(),'AgentNexus-M16');await mkdir(base,{recursive:true});
  const root=await mkdtemp(join(base,'harness-'));const harness=await openHarness(root,options);
  await harness.administration.createProject({id:'project',rules:['Project rules: preserve raw history; tools require trusted authorization.'],budget:limits});
  return {harness,root};
}
async function agent(h:Awaited<ReturnType<typeof openHarness>>,id='lead',task='task',extra:Partial<AgentInput>={}) {
  return h.administration.createAgent({id,project_id:'project',task_id:task,type:'DEVELOPMENT',budget:worker,...extra});
}
async function task(h:Awaited<ReturnType<typeof openHarness>>,id='task',agent_id='lead') {return h.administration.createTask({id,agent_id,goal:'Complete a restricted local task.'});}
function flushBarrier(h:Awaited<ReturnType<typeof openHarness>>,phase:string){
  let reached!:()=>void,release!:()=>void,used=false;const ready=new Promise<void>(resolve=>reached=resolve),gate=new Promise<void>(resolve=>release=resolve),original=h.store.flush.bind(h.store);
  h.store.flush=async()=>{const row=h.store.db.prepare("SELECT json_extract(body,'$.phase') AS phase FROM anx_records WHERE domain='audit' ORDER BY seq DESC LIMIT 1").get();
    if(!used&&row?.phase===phase){used=true;await original();reached();await gate;}else await original();};
  return {ready,release,restore:()=>{release();h.store.flush=original;}};
}
async function feature(h:Awaited<ReturnType<typeof openHarness>>,id:string,state:'ON'|'OFF'){
  const meta=h.administration.features.metadata(),preview=await h.administration.features.previewFeatures([{id,scope:{project_id:'project'},state}],meta.feature_revision);await h.administration.features.commitFeatures(preview.challenge_id,preview.preview_hash);
}

test('M16-HARNESS-LOOP: executable loop routes a mock tool call through original Policy/Permit/Archive/Audit',async()=>{
  const {harness:h}=await fixture({mocks:{'mock-main':[{reply:{kind:'TOOL_CALL',tool_name:'native.echo',arguments:{value:7}}},{reply:{kind:'FINAL',text:'done'}}]}});
  try {
    await agent(h);await task(h);const result=await h.administration.dispatch('task');assert.equal(result.state,'SUCCEEDED');assert.equal(result.turns,2);
    const phases=h.store.query('audit',{project_id:'project',task_id:'task',limit:100}).map(r=>(r.body as {phase?:string}).phase);
    assert(phases.includes('PERMIT_ISSUED'));assert(phases.includes('ACK_READY'));assert(phases.includes('CONTEXT_ASSEMBLED'));
    assert.equal(h.inspectAgent('lead').lifecycle,'STOPPED');assert.equal(h.qualification.strict_cpu,'BLOCKED');
    assert.equal(h.state.count('resource_reservation',{state:'ACTIVE'}),0);assert.equal(h.state.count('resource_reservation',{state:'UNKNOWN_QUARANTINED'}),0);
    await h.store.verify();
  }finally{await h.close();}
});

test('M16-HARNESS-TYPES: five type contracts, independent subagent context and read-only boundaries',async()=>{
  const {harness:h}=await fixture();
  try {
    const meta=h.administration.features.metadata();const preview=await h.administration.features.previewFeatures([{id:'runtime.role.coordinator',scope:{},state:'ON'}],meta.feature_revision);await h.administration.features.commitFeatures(preview.challenge_id,preview.preview_hash);
    await agent(h);const sub=await agent(h,'sub','subtask',{type:'SUBAGENT',parent_id:'lead'});
    await agent(h,'resident','resident-task',{type:'RESIDENT'});await agent(h,'reviewer','review-task',{type:'BACKGROUND_REVIEWER'});await agent(h,'coordinator','coord-task',{type:'COORDINATOR'});
    assert.notEqual(sub.context_ref!.event_id,h.inspectAgent('lead').context_ref!.event_id);assert.notEqual(sub.subject.resource_budget_id,h.inspectAgent('lead').subject.resource_budget_id);
    await assert.rejects(agent(h,'badsub','bad',{type:'SUBAGENT',parent_id:'sub'}),/SUBAGENT_PARENT_REQUIRED/);
    await assert.rejects(agent(h,'badreview','bad2',{type:'BACKGROUND_REVIEWER',tools:[{tool_id:'write',version:'1',capability:'LOCAL_WRITE',resources:['project:file']}]}),/AGENT_READ_ONLY_ROLE/);
    await assert.rejects(h.administration.decision('coordinator',{change:'scientific goal'},'ACCEPTED'),/WORKFLOW_PROJECT_DECISION_SCOPE/);
    await h.administration.setProjectState('project','PAUSED');assert.equal(h.inspectAgent('resident').lifecycle,'WAITING');assert.equal(h.state.count('MODEL_REQUEST'),0);
    await h.administration.setProjectState('project','ACTIVE');assert.equal(h.inspectAgent('resident').lifecycle,'READY');
    await h.administration.setProjectState('project','CLOSED');assert.equal(h.inspectAgent('resident').lifecycle,'STOPPED');
  }finally{await h.close();}
});

test('M16-HARNESS-MESSAGES: durable bidirectional messages, dedupe, wake and source-bound model context',async()=>{
  const {harness:h}=await fixture({mocks:{'mock-main':[{reply:{kind:'WAIT'}},{reply:{kind:'FINAL',text:'awake'}}]}});
  try {
    await agent(h,'lead','task',{read_tasks:['subtask']});await agent(h,'sub','subtask',{type:'SUBAGENT',parent_id:'lead',read_tasks:['task']});await task(h);
    const lead=h.bindAgent('lead'),sub=h.bindAgent('sub');
    const sent=await lead.sendText({receiver_agent_id:'sub',message_type:'QUESTION',text:'inspect this input',dedup_key:'q1'});
    const duplicate=await lead.sendText({receiver_agent_id:'sub',message_type:'QUESTION',text:'inspect this input',dedup_key:'q1'});assert.equal(sent.message_id,duplicate.message_id);
    await assert.rejects(lead.sendText({receiver_agent_id:'sub',message_type:'QUESTION',text:'different',dedup_key:'q1'}),/MESSAGE_DEDUP_CONFLICT/);
    const inbox=await sub.receive();assert.equal(inbox.length,1);assert.equal((await sub.readContext(inbox[0].payload)).text,'inspect this input');await sub.ack(sent.message_id,inbox[0].lease_token!);
    assert.equal((await h.administration.dispatch('task')).state,'WAITING');assert.equal(h.state.count('MODEL_REQUEST'),1);
    await sub.sendText({receiver_agent_id:'lead',message_type:'ANSWER',text:'verified source',dedup_key:'a1'});assert.equal(h.inspectTask('task').state,'QUEUED');
    const done=await h.administration.dispatch('task');assert.equal(done.state,'SUCCEEDED');assert.equal(done.received_message_ids.length,1);
    const views=h.state.list<{entries:{source:{event_id:string}}[]}>('CONTEXT_VIEW',{task_id:'task'});assert(views.some(v=>v.entries.length>=4));
  }finally{await h.close();}
});

test('M16-HARNESS-WRITE: exact LOCAL_WRITE approval executes once and retains unverified persistent storage ownership',async()=>{
  const {harness:h}=await fixture({mocks:{'mock-main':[{reply:{kind:'TOOL_CALL',tool_name:'test.write',arguments:{value:3},resource_id:'project:file'}},{reply:{kind:'FINAL',text:'complete'}}]}});let effects=0;
  try {
    h.administration.registerTool({id:'test.write',version:'1',feature_id:'tool.test',capability:'LOCAL_WRITE',policy_ids:['P.DATA_DELETE'],requires_sandbox:false,
      schema:args=>assert.equal(typeof args,'object'),writer_resource:()=> 'project:file',execute:()=>{effects++;return {data:{written:true}};}});
    await agent(h,'lead','task',{tools:[{tool_id:'test.write',version:'1',capability:'LOCAL_WRITE',resources:['project:file']}],file_scope:['project:file']});await task(h);
    assert.equal((await h.administration.dispatch('task')).reason,'APPROVAL_REQUIRED');assert.equal(effects,0);assert.equal(h.state.count('resource_reservation',{state:'ACTIVE'}),0);
    await h.administration.approveTaskTool('task','Approve this synthetic object mutation');await h.administration.resumeTask('task');
    assert.equal((await h.administration.dispatch('task')).state,'UNKNOWN_QUARANTINED');assert.equal(effects,1);
    assert.equal(h.state.get<Budget>('resource_budget','platform')!.held.workers,1);
    await assert.rejects(h.administration.dispatch('task'),/TASK_DISPATCH_STATE|AGENT_UNAVAILABLE|MESSAGE_STALE_BINDING/);assert.equal(effects,1);
  }finally{await h.close();}
});

test('M16-HARNESS-CANCEL-ACTIVE: cancellation while handler runs retains claims until outcome/outputs are reconciled',async()=>{
  const {harness:h}=await fixture({mocks:{'mock-main':[{reply:{kind:'TOOL_CALL',tool_name:'test.slow',arguments:null}}]}});
  let release!:()=>void,observed!:()=>void;const started=new Promise<void>(resolve=>observed=resolve),gate=new Promise<void>(resolve=>release=resolve);
  try {
    h.administration.registerTool({id:'test.slow',version:'1',feature_id:'tool.test',capability:'PURE',policy_ids:[],requires_sandbox:false,schema:()=>{},execute:async()=>{observed();await gate;return {data:'settled'};}});
    await agent(h,'lead','task',{tools:[{tool_id:'test.slow',version:'1',capability:'PURE',resources:[]}]});await task(h);
    const running=h.administration.dispatch('task');await started;
    await assert.rejects(h.administration.dispatch('task'),/TASK_ALREADY_DISPATCHED/);
    assert.equal((await h.administration.cancelTask('task')).state,'STOPPING');
    assert.equal(h.state.get<Budget>('resource_budget','platform')!.held.workers,1);
    release();assert.equal((await running).state,'UNKNOWN_QUARANTINED');assert.equal(h.state.get<Budget>('resource_budget','platform')!.held.workers,1);
  }finally{release?.();await h.close();}
});

test('M16-HARNESS-BUDGET: concurrent budget shortage creates one persisted waiter and resumes after release',async()=>{
  const {harness:h}=await fixture({platform_limits:{...limits,workers:1},mocks:{'mock-main':[{reply:{kind:'TOOL_CALL',tool_name:'test.slow',arguments:null}},{reply:{kind:'FINAL',text:'first done'}}]}});
  let release!:()=>void,observed!:()=>void;const started=new Promise<void>(resolve=>observed=resolve),gate=new Promise<void>(resolve=>release=resolve);
  try {
    h.administration.registerTool({id:'test.slow',version:'1',feature_id:'tool.test',capability:'PURE',policy_ids:[],requires_sandbox:false,schema:()=>{},execute:async()=>{observed();await gate;return {data:'settled'};}});
    await agent(h,'lead','task',{tools:[{tool_id:'test.slow',version:'1',capability:'PURE',resources:[]}]});await agent(h,'other','other-task');await task(h);await task(h,'other-task','other');
    const running=h.administration.dispatch('task');await started;const wait=await h.administration.dispatch('other-task');assert.equal(wait.state,'WAITING_RESOURCES');
    assert.equal(h.state.count('resource_reservation',{state:'WAITING'}),1);release();assert.equal((await running).state,'SUCCEEDED');
    assert.equal((await h.administration.dispatch('other-task')).state,'SUCCEEDED');assert.equal(h.state.count('resource_reservation',{state:'WAITING'}),0);
  }finally{release?.();await h.close();}
});

test('M16-HARNESS-UNKNOWN: model unknown outcome retains all reservations and cannot resume or retry',async()=>{
  const {harness:h}=await fixture({mocks:{'mock-main':[{failure:'UNKNOWN'}]}});
  try {await agent(h);await task(h);const result=await h.administration.dispatch('task');assert.equal(result.state,'UNKNOWN_QUARANTINED');
    assert.equal(h.state.count('MODEL_REQUEST'),1);assert(h.state.count('resource_reservation',{state:'UNKNOWN_QUARANTINED'})>=2);
    await assert.rejects(h.administration.resumeTask('task'),/TASK_RESUME_STATE/);await assert.rejects(h.administration.cancelTask('task'),/TASK_TERMINAL/);
  }finally{await h.close();}
});

test('M16-HARNESS-RECOVERY: safe WAITING checkpoint survives reopen, old facade fails and no automatic model call occurs',async()=>{
  const options:HarnessOptions={mocks:{'mock-main':[{reply:{kind:'WAIT'}},{reply:{kind:'FINAL',text:'restored'}}]}};
  const {harness:first,root}=await fixture(options);await agent(first);await task(first);const stale=first.bindAgent('lead');const old=stale.identity.runtime_instance_id;
  assert.equal((await first.administration.dispatch('task')).state,'WAITING');assert(first.state.get('CHECKPOINT','task'));await first.close();
  const h=await openHarness(root,options);
  try {assert.equal(h.state.count('MODEL_REQUEST'),1);assert.notEqual(h.inspectAgent('lead').subject.runtime_instance_id,old);assert.throws(()=>stale.status(),/HARNESS_CLOSED/);
    await h.administration.resumeTask('task');assert.equal((await h.administration.dispatch('task')).state,'SUCCEEDED');assert.equal(h.state.count('MODEL_REQUEST'),2);
  }finally{await h.close();}
});

test('M16-HARNESS-SCOPE: cross-project context/messages, capability escalation and malformed parameters fail before effect',async()=>{
  const {harness:h}=await fixture({mocks:{'mock-main':[{reply:{kind:'TOOL_CALL',tool_name:'test.write',arguments:null,resource_id:'other:file'}}]}});
  try {await h.administration.createProject({id:'other',rules:['Other project rules'],budget:limits});await agent(h);await agent(h,'foreign','foreign-task',{project_id:'other'});
    const foreign=h.inspectAgent('foreign').context_ref!;await assert.rejects(h.bindAgent('lead').readContext(foreign),/CONTEXT_PROJECT_DENIED/);
    await assert.rejects(h.bindAgent('lead').sendText({receiver_agent_id:'foreign',message_type:'QUESTION',text:'cross project',dedup_key:'x'}),/MESSAGE_PROJECT_DENIED/);
    await task(h);assert.equal((await h.administration.dispatch('task')).state,'FAILED');assert.equal(h.store.db.prepare('SELECT COUNT(*) AS n FROM control_permits').get()!.n,0);
  }finally{await h.close();}
});

test('M16-HARNESS-WORKFLOW: disabled gate is BYPASSED, self review is rejected, versions/evidence bind review',async()=>{
  const {harness:h}=await fixture();
  try {await agent(h);const value={gate_id:'g3' as const,status:'PASS' as const,candidate_hash:sha256('tree'),baseline:'112d915c97ee6e6214f7ce05eab8bd492bbb9bc6',test_profile_hash:sha256('profile'),evidence_refs:[h.inspectAgent('lead').context_ref!.payload_ref],reason:'review fixture',author_id:'lead',reviewer_id:'lead'};
    await assert.rejects(h.administration.gate('lead',value),/WORKFLOW_INDEPENDENT_REVIEW/);
    const meta=h.administration.features.metadata(),preview=await h.administration.features.previewFeatures([{id:'wf.gate.g3',scope:{},state:'OFF'}],meta.feature_revision);await h.administration.features.commitFeatures(preview.challenge_id,preview.preview_hash);
    assert.equal((await h.administration.gate('lead',value)).status,'BYPASSED');
    assert.throws(()=>h.state.checkAdmin({}),/NATIVE_ADMIN_CAPABILITY_REQUIRED/);
  }finally{await h.close();}
});

test('M16-HARNESS-CANCEL-FENCE: acknowledged cancellation prevents an approved pending write from starting',async()=>{
  const {harness:h}=await fixture({mocks:{'mock-main':[{reply:{kind:'TOOL_CALL',tool_name:'test.write',arguments:null,resource_id:'project:file'}}]}});let effects=0,b:ReturnType<typeof flushBarrier>|undefined;
  try {
    h.administration.registerTool({id:'test.write',version:'1',feature_id:'tool.test',capability:'LOCAL_WRITE',policy_ids:['P.DATA_DELETE'],requires_sandbox:false,schema:()=>{},writer_resource:()=> 'project:file',execute:()=>{effects++;return{data:'written'};}});
    await agent(h,'lead','task',{tools:[{tool_id:'test.write',version:'1',capability:'LOCAL_WRITE',resources:['project:file']}],file_scope:['project:file']});await task(h);
    await h.administration.dispatch('task');await h.administration.approveTaskTool('task','Synthetic approval');await h.administration.resumeTask('task');
    b=flushBarrier(h,'TASK_DISPATCHED');const running=h.administration.dispatch('task');await b.ready;
    assert.equal((await h.administration.cancelTask('task')).state,'STOPPING');b.release();assert.equal((await running).state,'CANCELLED');assert.equal(effects,0);
    assert.equal(h.state.get<Budget>('resource_budget','platform')!.held.workers,0);
  }finally{b?.restore();await h.close();}
});

test('M16-HARNESS-MODEL-CANCEL: cancellation at a model reservation ACK consumes zero sequence/tokens',async()=>{
  const {harness:h}=await fixture();let b:ReturnType<typeof flushBarrier>|undefined;
  try {await agent(h);await task(h);b=flushBarrier(h,'MODEL_BUDGET_RESERVED');const running=h.administration.dispatch('task');await b.ready;
    await h.administration.cancelTask('task');b.release();assert.equal((await running).state,'CANCELLED');
    assert.equal(h.state.get<{sequence:number}>('MODEL_MODEL','mock-main')!.sequence,0);assert.equal(h.state.get<Budget>('resource_budget','platform')!.spent.model_tokens,0);
    assert.equal(h.state.get<Budget>('resource_budget','platform')!.held.workers,0);
  }finally{b?.restore();await h.close();}
});

test('M16-HARNESS-PROJECT-FENCE: project pause closes admission before draining an existing turn',async()=>{
  const {harness:h}=await fixture();let b:ReturnType<typeof flushBarrier>|undefined;
  try {await agent(h);await agent(h,'other','other-task');await task(h);await task(h,'other-task','other');
    b=flushBarrier(h,'TASK_DISPATCHED');const running=h.administration.dispatch('task');await b.ready;const pausing=h.administration.setProjectState('project','PAUSED');
    assert.equal(h.state.get<{state:string}>('PROJECT','project')!.state,'PAUSING');const second=await h.administration.dispatch('other-task');assert.equal(second.state,'QUEUED');
    b.release();await running;await pausing;assert.equal(h.state.count('MODEL_REQUEST'),0);assert.equal(h.state.get<Budget>('resource_budget','platform')!.held.workers,0);
  }finally{b?.restore();await h.close();}
});

test('M16-HARNESS-FEATURE: role/type-registry OFF blocks existing dispatch and new registration at project scope',async()=>{
  const {harness:h}=await fixture();
  try {await agent(h);await task(h);await feature(h,'runtime.role.lead','OFF');assert.equal((await h.administration.dispatch('task')).state,'FAILED');assert.equal(h.state.count('MODEL_REQUEST'),0);
    await feature(h,'runtime.role.lead','ON');await feature(h,'native.agent-type-registry','OFF');await assert.rejects(agent(h,'new','new-task'),/NATIVE_FEATURE_BLOCKED:native.agent-type-registry/);
    await assert.rejects(agent(h,'badchild','task',{type:'SUBAGENT',parent_id:'lead'}),/AGENT_TASK_MUST_BE_INDEPENDENT/);
  }finally{await h.close();}
});

test('M16-HARNESS-HANDOFF: explicit handoff preserves independent task/context and delivers a structured completion',async()=>{
  const {harness:h}=await fixture();
  try {await agent(h,'lead','task',{read_tasks:['child-task']});await agent(h,'child','child-task',{type:'SUBAGENT',parent_id:'lead',read_tasks:['task'],work_role:'WORKER'});await task(h);
    const child=await h.administration.handoffTask('task','child');assert.equal(child.id,'child-task');assert.equal(h.inspectTask('task').state,'WAITING');assert.equal((await h.administration.dispatch(child.id)).state,'SUCCEEDED');
    assert.equal(h.inspectTask('task').state,'QUEUED');assert.equal(h.state.count('MESSAGE'),1);assert.equal((await h.administration.dispatch('task')).state,'SUCCEEDED');assert.equal(h.inspectTask('task').received_message_ids.length,1);
  }finally{await h.close();}
});

test('M16-HARNESS-DEADLINE: queued deadlines and dependencies do not create workers or model requests',async()=>{
  const {harness:h}=await fixture();
  try {await agent(h);await agent(h,'other','other-task');await task(h);
    await h.administration.createTask({id:'other-task',agent_id:'other',goal:'Wait for original task',dependencies:['task'],wall_ms:20});assert.equal((await h.administration.dispatch('other-task')).state,'QUEUED');
    await new Promise(resolve=>setTimeout(resolve,25));assert.equal(await h.administration.tick(),1);assert.equal(h.inspectTask('other-task').state,'TIMED_OUT');assert.equal(h.state.count('MODEL_REQUEST'),0);
  }finally{await h.close();}
});

test('M16-HARNESS-WORKFLOW-FENCE: a gate disabled during evidence verification commits BYPASSED',async()=>{
  const {harness:h}=await fixture();let release!:()=>void,reached!:()=>void;const ready=new Promise<void>(resolve=>reached=resolve),gate=new Promise<void>(resolve=>release=resolve);
  const original=h.store.artifacts.read.bind(h.store.artifacts);let first=true;
  try {await agent(h);h.store.artifacts.read=async function*(...args:Parameters<typeof original>){if(first){first=false;reached();await gate;}yield*original(...args);};
    const pending=h.administration.gate('lead',{gate_id:'g2',status:'SIMULATED',candidate_hash:sha256('candidate'),baseline:'baseline',test_profile_hash:sha256('profile'),evidence_refs:[h.inspectAgent('lead').context_ref!.payload_ref],author_id:'lead',reviewer_id:null,reason:'fixture'});
    await ready;await feature(h,'wf.gate.g2','OFF');release();const result=await pending;assert.equal(result.status,'BYPASSED');assert.equal(result.feature_enabled,false);
  }finally{release?.();h.store.artifacts.read=original;await h.close();}
});

test('M16-HARNESS-DIAGNOSTICS: read-only tool uses the original bound Host session and native parser',async()=>{
  const {harness:h}=await fixture({mocks:{'mock-main':[{reply:{kind:'TOOL_CALL',tool_name:'native.diagnostics',arguments:{language:'json',source:'{"valid":true}',document_uri:'memory:file.json',version:1}}},{reply:{kind:'FINAL',text:'verified'}}]}});
  try {await agent(h,'lead','task',{tools:[{tool_id:'native.diagnostics',version:'1',capability:'READ_ONLY',resources:[]}]});await task(h);assert.equal((await h.administration.dispatch('task')).state,'SUCCEEDED');
    const events=h.store.query('audit',{project_id:'project',task_id:'task',limit:100});assert(events.some(event=>(event.body as {phase?:string}).phase==='VALIDATED'));
  }finally{await h.close();}
});

test('M16-HARNESS-RECOVER-OFF: disabled resource module permits control-plane recovery and later explicit preflight',async()=>{
  const {harness:first,root}=await fixture();await agent(first);await task(first);
  const metadata=first.administration.features.metadata(),change=await first.administration.features.previewFeatures([{id:'resource.worker.budget',scope:{project_id:'project'},state:'OFF'},{id:'native.task-scheduler',scope:{project_id:'project'},state:'OFF'}],metadata.feature_revision);
  await first.administration.features.commitFeatures(change.challenge_id,change.preview_hash);await first.close();const h=await openHarness(root);
  try {assert.equal(h.state.count('MODEL_REQUEST'),0);const meta=h.administration.features.metadata(),on=await h.administration.features.previewFeatures([{id:'resource.worker.budget',scope:{project_id:'project'},state:'ON'},{id:'native.task-scheduler',scope:{project_id:'project'},state:'ON'}],meta.feature_revision);await h.administration.features.commitFeatures(on.challenge_id,on.preview_hash);
    assert.equal((await h.administration.dispatch('task')).state,'SUCCEEDED');
  }finally{await h.close();}
});

test('M16-HARNESS-APPROVAL-RECOVER: old approval is revoked, reapproval is possible and real disk claim stays held',async()=>{
  const options:HarnessOptions={mocks:{'mock-main':[{reply:{kind:'TOOL_CALL',tool_name:'test.write',arguments:null,resource_id:'project:file'}}]}};
  const {harness:first,root}=await fixture(options);let effects=0;
  const register=(h:Awaited<ReturnType<typeof openHarness>>)=>h.administration.registerTool({id:'test.write',version:'1',feature_id:'tool.test',capability:'LOCAL_WRITE',policy_ids:['P.DATA_DELETE'],requires_sandbox:false,schema:()=>{},writer_resource:()=> 'project:file',execute:()=>{effects++;return{data:'written'};}});
  register(first);await agent(first,'lead','task',{tools:[{tool_id:'test.write',version:'1',capability:'LOCAL_WRITE',resources:['project:file']}],file_scope:['project:file']});await first.administration.createTask({id:'task',agent_id:'lead',goal:'Synthetic write',requirements:{disk_bytes:100}});
  await first.administration.dispatch('task');await first.administration.approveTaskTool('task','Before restart');await first.close();const h=await openHarness(root,options);
  try {register(h);assert.equal(h.inspectTask('task').pending_tool!.approval_id,undefined);await h.administration.approveTaskTool('task','After restart');await h.administration.resumeTask('task');assert.equal((await h.administration.dispatch('task')).state,'UNKNOWN_QUARANTINED');assert.equal(effects,1);assert.equal(h.state.get<Budget>('resource_budget','platform')!.held.disk_bytes,100);
  }finally{await h.close();}
});

test('M16-HARNESS-MESSAGE-RECOVER: logical text dedup survives replacement sender and receiver runtimes',async()=>{
  const {harness:first,root}=await fixture();await agent(first,'lead','task',{read_tasks:['subtask']});await agent(first,'sub','subtask',{type:'SUBAGENT',parent_id:'lead',read_tasks:['task']});
  const input={receiver_agent_id:'sub',message_type:'QUESTION',text:'unchanged',dedup_key:'once'};const sent=await first.bindAgent('lead').sendText(input);await first.close();const h=await openHarness(root);
  try {const again=await h.bindAgent('lead').sendText(input);assert.equal(again.message_id,sent.message_id);assert.equal(h.state.count('MESSAGE_TEXT'),1);assert.equal(h.state.count('MESSAGE'),1);const [leased]=await h.bindAgent('sub').receive();await h.bindAgent('sub').ack(leased.message_id,leased.lease_token!);
  }finally{await h.close();}
});

test('M16-HARNESS-AUDIT: a failed native intent barrier freezes admission and causes zero model/tool effects',async()=>{
  const {harness:h}=await fixture();const flush=h.store.flush.bind(h.store);
  try {await agent(h);await task(h);h.store.flush=async()=>{const row=h.store.db.prepare("SELECT json_extract(body,'$.phase') AS phase FROM anx_records WHERE domain='audit' ORDER BY seq DESC LIMIT 1").get();if(row?.phase==='TASK_MODEL_INTENT')throw Error('synthetic native audit failure');await flush();};
    await assert.rejects(h.administration.dispatch('task'));assert.equal(h.state.faulted,true);assert.equal(h.state.count('MODEL_REQUEST'),0);assert.equal(h.store.db.prepare('SELECT COUNT(*) AS n FROM control_permits').get()!.n,0);
    assert.equal(h.state.get<Budget>('resource_budget','platform')!.held.workers,1);
  }finally{h.store.flush=flush;await h.close();}
});

test('M16-HARNESS-POLICY-OWNER: every new L0 owner rejects application DISABLED mode',async()=>{
  const {harness:h}=await fixture();
  try {const ids=['P.NATIVE_IDENTITY','P.AGENT_SCOPE','P.MESSAGE_DELIVERY','P.RESOURCE_ADMISSION','P.MODEL_CREDENTIAL','P.CONTEXT_PROVENANCE','P.NATIVE_LIFECYCLE','P.WORKFLOW_BINDING'];
    for(const id of ids)await assert.rejects(h.administration.features.prepareMode({scope:{project_id:'project'},mode:'DISABLED',policy_ids:[id],reason:'Bypass probe',expires_at:new Date(Date.now()+10000).toISOString()},h.administration.features.metadata().policy_revision),/NON_DEGRADABLE_POLICY/);
  }finally{await h.close();}
});

test('M16-HARNESS-DISK-RESULT: a large successful gateway result cannot free a real persistent disk claim',async()=>{
  const {harness:h,root}=await fixture({mocks:{'mock-main':[{reply:{kind:'TOOL_CALL',tool_name:'test.large-write',arguments:null,resource_id:'project:file'}}]}});const output=join(root,'persistent-fixture.bin');
  try {h.administration.registerTool({id:'test.large-write',version:'1',feature_id:'tool.test',capability:'LOCAL_WRITE',policy_ids:['P.DATA_DELETE'],requires_sandbox:false,schema:()=>{},writer_resource:()=> 'project:file',execute:async()=>{await writeFile(output,Buffer.alloc(100,1),{flag:'wx'});return{data:'x'.repeat(64791)};}});
    await agent(h,'lead','task',{tools:[{tool_id:'test.large-write',version:'1',capability:'LOCAL_WRITE',resources:['project:file']}],file_scope:['project:file']});await h.administration.createTask({id:'task',agent_id:'lead',goal:'Bounded large output fixture',requirements:{disk_bytes:100}});
    await h.administration.dispatch('task');await h.administration.approveTaskTool('task','Write this test-owned 100B fixture');await h.administration.resumeTask('task');
    const result=await h.administration.dispatch('task');assert.equal(result.state,'UNKNOWN_QUARANTINED');assert.equal((await readFile(output)).length,100);assert.equal(h.state.get<Budget>('resource_budget','platform')!.held.disk_bytes,100);
    assert.equal(result.persistent_write,true);assert(result.history.some(source=>source.payload_ref.bytes>64000));
  }finally{await h.close();}
});

test('M16-HARNESS-WORKFLOW-CONTRACT: typed task inputs, role restrictions and evidence checklists use native state',async()=>{
  const {harness:h}=await fixture();
  try {await agent(h);await assert.rejects(agent(h,'ro','ro-task',{work_role:'REVIEWER',tools:[{tool_id:'test.write',version:'1',capability:'LOCAL_WRITE',resources:['project:file']}]}),/WORK_ROLE_READ_ONLY/);
    const source=await h.administration.captureContext('lead','Version-bound file content');
    await assert.rejects(h.administration.createTask({id:'task',agent_id:'lead',goal:'Contract',contract:{acceptance:['check'],allowed_scope:['foreign:file']}}),/WORKFLOW_TASK_CONTRACT/);
    await h.administration.createTask({id:'task',agent_id:'lead',goal:'Use the exact captured input',contract:{acceptance:['Complete a simulated turn'],allowed_scope:[]},inputs:[{source,section:'FILE_CONTENT',required:true}]});
    const checklist=await h.administration.checklist('lead',{candidate_hash:source.payload_ref.sha256,items:[{id:'source-integrity',status:'SIMULATED',reason:'Local evidence only',evidence_refs:[source.payload_ref]}]});assert(h.state.get('CHECKLIST',checklist));
    await feature(h,'wf.checklists','OFF');await assert.rejects(h.administration.checklist('lead',{candidate_hash:source.payload_ref.sha256,items:[]}),/NATIVE_FEATURE_BLOCKED:wf.checklists/);
    assert.equal((await h.administration.dispatch('task')).state,'SUCCEEDED');
  }finally{await h.close();}
});

test('M16-HARNESS-OUTPUT-ROOT: existing Windows case aliases cannot write verification/demo output inside source',async()=>{
  const source=fileURLToPath(new URL('../../',import.meta.url));await assert.rejects(outsideSource(source,source),/outside candidate source/);
  if(process.platform==='win32')await assert.rejects(outsideSource(source,source.toLowerCase()),/outside candidate source/);
});

test('M16-HARNESS-REQUEST-ACCOUNTING: actual zero-token fixture dispatch still consumes a request and cannot request zero workers',async()=>{
  const {harness:h}=await fixture({mocks:{'mock-main':[{reply:{kind:'FINAL',text:''},input_tokens:0,output_tokens:0,cost_micros:0}]}});
  try {await agent(h);await assert.rejects(h.administration.createTask({id:'task',agent_id:'lead',goal:'Invalid zero-worker task',requirements:{workers:0}}),/TASK_REQUIRES_ONE_WORKER/);
    await task(h);assert.equal((await h.administration.dispatch('task')).state,'SUCCEEDED');const platform=h.state.get<Budget>('resource_budget','platform')!;assert.equal(platform.spent.model_tokens,0);assert.equal(platform.spent.model_requests,1);
  }finally{await h.close();}
});
