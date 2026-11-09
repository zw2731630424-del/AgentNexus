import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { initializeControl } from '../../src/agentnexus/control.ts';
import { FeatureRegistry } from '../../src/agentnexus/features.ts';
import { NativeState } from '../../src/agentnexus/harness/state.ts';
import { ContextAssembly } from '../../src/agentnexus/harness/context.ts';
import type { AssembledContext, ContextSection } from '../../src/agentnexus/harness/context.ts';
import { ModelGateway } from '../../src/agentnexus/harness/models.ts';
import type { MockResponder, MockResponderInput, MockStep, ModelBudget, ModelGatewayOptions, ModelUsage } from '../../src/agentnexus/harness/models.ts';
import { canonical, invariant, sha256, uid } from '../../src/agentnexus/types.ts';
import type { Subject } from '../../src/agentnexus/harness/contracts.ts';

// Codex engineering fixtures exercise real context/SQLite/artifact bytes. All model computation is SIMULATED.
// These deterministic callbacks are authored fixtures, never evidence of a Pilot Agent or autonomous LLM run.
const SOURCE_HASH = sha256(await readFile(new URL(import.meta.url)));
const S: Subject = { agent_id:'m17-agent',project_id:'m17-project',task_id:'m17-task',session_id:'m17-session',
  runtime_instance_id:'m17-runtime',agent_type:'DEVELOPMENT',model_binding:'mock',resource_budget_id:'m17-budget',policy_scope:'m17-scope' };
const FEATURES = ['native.context-assembly','model.gateway','model.mock-provider','model.key-round-robin','model.provider-failover'];
function setup(store:KernelStore) {
  initializeControl(store); const token = {}, check = (candidate:unknown) => invariant(candidate === token,'ADMIN_CAPABILITY_REQUIRED');
  const definitions = FEATURES.map(id => ({id,kind:'OPTIONAL' as const,default:'ON' as const,scopes:['G','P','A','T'],depends_on:[],conflicts:[]}));
  const features = new FeatureRegistry(store,definitions,check,{busy:false}); for (const feature of definitions) features.register(token,feature.id);
  return {token,state:new NativeState(store,features,check,uid())};
}
function responder(respond:MockResponder['respond']):MockResponder {
  return {id:'codex-engineering-context-fixture',version:'1',source_sha256:SOURCE_HASH,respond};
}
async function fixture(t:test.TestContext, respond:MockResponder['respond'], budgetOverride:Partial<ModelBudget> = {}) {
  const base = resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT ?? '.workflow-kit/runtime/AgentNexus-M1.7/models-test-data');
  await mkdir(base,{recursive:true}); const root = await mkdtemp(join(base,'responder-')), store = await KernelStore.open(root);
  const {state,token} = setup(store), ledger = {reserved:[] as string[],settled:[] as ModelUsage[],retained:[] as string[]};
  const budget:ModelBudget = {reserve:async (_subject,demand) => {ledger.reserved.push(demand.request_id);return 'reservation-'+demand.request_id;},
    settle:async (_subject,_id,usage) => {ledger.settled.push(usage);},retain:async (_subject,id) => {ledger.retained.push(id);},...budgetOverride};
  const options:ModelGatewayOptions = {budget,routes:{mock:{DEVELOPMENT:['main','fallback']}},mocks:{
    main:[{reply:{kind:'FINAL',text:'static fixture must not shadow responder'}}],fallback:[{reply:{kind:'FINAL',text:'static fallback'}}]}};
  const registration = responder(respond), gateway = new ModelGateway(state,options,registration);
  for (const [model_id,provider_id] of [['main','provider-main'],['fallback','provider-fallback']]) {
    await gateway.registerProvider(token,{provider_id,kind:'MOCK'});
    await gateway.registerModel(token,{model_id,provider_id,max_input_tokens:65536,max_output_tokens:4096,input_cost_micros_per_token:1,output_cost_micros_per_token:2});
    await gateway.registerKey(token,{key_id:'key-'+model_id,provider_id,credential_handle:'vault:mock:'+provider_id+':opaque',maxConcurrency:1});
  }
  const context = new ContextAssembly(state);
  const assemble = async (parts:{text:string;section:ContextSection}[],subject:Subject=S) => {
    const selections = [];
    for (const part of parts) selections.push({source:await context.capture(subject,'RAW',Buffer.from(part.text)),section:part.section,required:true});
    return context.assemble(subject,selections,{maxBytes:256*1024});
  };
  const assembled = await assemble([{text:'Codex-authored SIMULATED fixture input.',section:'PROJECT_RULES'}]);
  t.after(() => store.close());
  return {root,store,state,token,ledger,options,registration,gateway,context,assemble,assembled,agent:gateway.bind(S)};
}
function sequence(state:NativeState,id='main'):number { return state.get<{sequence:number}>('MODEL_MODEL',id)!.sequence; }
function requests(state:NativeState,id='main'):string[] { return state.get<{requests:string[]}>('MODEL_KEY','key-'+id)!.requests; }

test('M17 MODEL context responder computes different tool proposals from exact reconstructed sources and observed tool results',async t => {
  const seen:MockResponderInput[] = [];
  const f = await fixture(t,function (this:void,input) {
    assert.equal(this,undefined); seen.push(input);
    assert.equal(input.assurance,'SIMULATED'); assert.equal(input.subject.task_id,S.task_id);
    const result = input.context.entries.filter(entry => entry.section === 'TOOL_RESULT').at(-1);
    if (result && JSON.parse(result.text).state === 'SUCCEEDED') return {reply:{kind:'FINAL',text:'SIMULATED fixture observed the archived tool success.'}};
    const task = JSON.parse(input.context.entries.find(entry => entry.section === 'TASK_CONTRACT')!.text) as {path:string;resource:string};
    const source = input.context.entries.find(entry => entry.section === 'ARTIFACT')!.source;
    return {reply:{kind:'TOOL_CALL',tool_name:'native.storage.write',tool_version:'1',resource_id:task.resource,
      arguments:{resource_id:task.resource,path:task.path,mode:'CREATE',expected_version:null,expected_sha256:null,source}}};
  });
  for (const name of ['alpha','beta']) {
    const context = await f.assemble([{text:JSON.stringify({path:name+'.txt',resource:'m17-project:files'}),section:'TASK_CONTRACT'},
      {text:'fixture bytes for '+name,section:'ARTIFACT'}]);
    const result = await f.agent.complete({request_id:'proposal-'+name,context,max_output_tokens:2048});
    assert.equal(result.status,'SIMULATED'); assert.equal(result.outcome,'SUCCEEDED'); assert.equal(result.reply?.kind,'TOOL_CALL');
    assert.equal((result.reply!.arguments as {path:string}).path,name+'.txt');
    assert.deepEqual((result.reply!.arguments as {source:unknown}).source,context.entries[1].source);
    assert.notStrictEqual(seen.at(-1)!.context,context); assert.equal(seen.at(-1)!.context.text,context.text);
    assert.equal(seen.at(-1)!.context.input_ref?.sha256,context.sha256);
    assert.equal(seen.at(-1)!.context.provenance_sha256,context.provenance_sha256);
  }
  const observed = await f.assemble([{text:JSON.stringify({state:'SUCCEEDED',tool_id:'native.storage.write'}),section:'TOOL_RESULT'}]);
  const result = await f.agent.complete({request_id:'after-tool',context:observed,max_output_tokens:256});
  assert.equal(result.reply?.kind,'FINAL'); assert.equal(seen.length,3);
  assert.deepEqual(seen.map(input => input.request.sequence),[0,1,2]);
  assert.equal(f.ledger.reserved.length,3); assert.equal(f.ledger.settled.length,3);
  assert.equal(f.store.db.prepare('SELECT 1 FROM control_operations LIMIT 1').get(),undefined,'a proposal never becomes tool authority');
});

test('M17 MODEL responder input is deeply frozen, excludes privileged handles, and returns are copied before asynchronous work',async t => {
  const returned:MockStep = {reply:{kind:'TOOL_CALL',arguments:{value:'original'}}};
  const f = await fixture(t,input => {
    assert.ok(Object.isFrozen(input)); assert.ok(Object.isFrozen(input.subject)); assert.ok(Object.isFrozen(input.model));
    assert.ok(Object.isFrozen(input.context)); assert.ok(Object.isFrozen(input.context.entries));
    assert.ok(Object.isFrozen(input.context.entries[0].source.payload_ref));
    assert.throws(() => Object.defineProperty(input.context,'text',{value:'forged'}),TypeError);
    assert.equal('state' in input,false); assert.equal('store' in input,false); assert.equal('admin' in input,false);
    assert.equal('key_id' in input.model,false); assert.equal('credential_handle' in input.model,false);
    assert.equal(canonical(input).includes('vault:mock:'),false);
    queueMicrotask(() => { (returned.reply!.arguments as {value:string}).value = 'late mutation'; });
    return returned;
  });
  const result = await f.agent.complete({request_id:'frozen',context:f.assembled,max_output_tokens:256});
  assert.equal(result.outcome,'SUCCEEDED'); assert.deepEqual(result.reply?.arguments,{value:'original'});
  assert.equal(returned.reply?.arguments && (returned.reply.arguments as {value:string}).value,'late mutation');
});

test('M17 MODEL responder accepts the existing escaped context envelope without narrowing context limits',async t => {
  const text = '\u0001'.repeat(128*1024); let observed = 0;
  const f = await fixture(t,input => {observed++;assert.equal(input.context.text,text);assert.equal(input.context.entries[0].text,text);
    assert.equal(input.context.bytes,128*1024);return {reply:{kind:'FINAL',text:'SIMULATED large exact context verified'}};});
  const context = await f.assemble([{text,section:'TASK_CONTRACT'}]);
  assert.ok(Buffer.byteLength(canonical(context)) > 512*1024);
  const result = await f.agent.complete({request_id:'large-escaped-context',context,max_output_tokens:256});
  assert.equal(result.outcome,'SUCCEEDED'); assert.equal(observed,1); assert.equal(result.usage?.input_tokens,32768);
});

test('M17 MODEL responder provenance is durable data and terminal request dedup never reruns programmable code',async t => {
  let calls = 0;
  const f = await fixture(t,() => {calls++;return {reply:{kind:'FINAL',text:'SIMULATED answer with durable provenance'}};});
  const identity = {id:f.registration.id,version:f.registration.version,source_sha256:SOURCE_HASH};
  f.registration.id = 'late-mutation'; f.registration.source_sha256 = sha256('late mutation');
  f.registration.respond = () => {throw Error('late callback replacement must not run');};
  const request = {request_id:'dedup',context:f.assembled,max_output_tokens:256}, result = await f.agent.complete(request);
  assert.deepEqual(await f.agent.complete(request),result); assert.equal(calls,1);
  const records = f.store.query('audit',{limit:100}).filter(record => record.operation_id === request.request_id);
  for (const phase of ['MODEL_REQUEST_PREPARED','MODEL_DISPATCH_INTENT','MODEL_SENT','MODEL_RESULT']) {
    const record = records.find(record => (record.body as {phase?:string}).phase === phase)!;
    assert.deepEqual((record.body as {detail:{responder:unknown}}).detail.responder,identity);
  }
  assert.equal(canonical(records).includes('vault:mock:'),false); assert.equal(canonical(records).includes('respond('),false);
  await f.store.close(); const store = await KernelStore.open(f.root);
  try {
    const restored = setup(store), gateway = new ModelGateway(restored.state,f.options,responder(() => {throw new Error('dedup must not invoke');}));
    assert.deepEqual(await gateway.bind(S).complete(request),result); assert.equal(calls,1); assert.equal(f.ledger.reserved.length,1);
    assert.deepEqual(restored.state.get<{responder:unknown}>('MODEL_REQUEST',request.request_id)!.responder,identity);
  } finally { await store.close(); }
});

test('M17 MODEL invalid registration/accessors and legacy adapter options reject before callback execution',async t => {
  let calls = 0; const f = await fixture(t,() => {calls++;return {reply:{kind:'FINAL',text:'SIMULATED'}};});
  assert.throws(() => new ModelGateway(f.state,{...f.options,adapter:() => {calls++;}} as never),{code:'MODEL_BUDGET_REQUIRED'});
  for (const registration of [{...f.registration,transport:'HTTP'},{...f.registration,source_sha256:'not-a-hash'},
    {...f.registration,respond:undefined}]) assert.throws(() => new ModelGateway(f.state,f.options,registration as never));
  const accessor = {id:'accessor',version:'1',source_sha256:SOURCE_HASH,get respond() {calls++;return () => ({reply:{kind:'FINAL'}});}};
  assert.throws(() => new ModelGateway(f.state,f.options,accessor as never),{code:'MODEL_RESPONDER_SCHEMA'});
  assert.equal(calls,0); assert.equal(f.ledger.reserved.length,0); assert.equal(f.state.count('MODEL_REQUEST'),0);
  const forged:AssembledContext = {...f.assembled,text:'forged',bytes:6,sha256:sha256('forged')};
  await assert.rejects(f.agent.complete({request_id:'forged',context:forged,max_output_tokens:256}),{code:'CONTEXT_VIEW_HASH'});
  assert.equal(calls,0); assert.equal(f.ledger.reserved.length,0);
});

test('M17 MODEL synchronous failures, promise results and invalid replies retain SENT quota without fallback or replay',async t => {
  const bad: {name:string;respond:MockResponder['respond']}[] = [
    {name:'throw',respond:() => {throw new Error('private fixture failure must stay private');}},
    {name:'promise',respond:(() => Promise.reject(Error('private rejected promise'))) as never},
    {name:'reply-authority',respond:() => ({reply:{kind:'TOOL_CALL',arguments:{},approval_id:'self-approved'}} as never)},
    {name:'reply-accessor',respond:() => ({get reply() {throw new Error('accessor must never run');}} as never)},
    {name:'oversized',respond:() => ({reply:{kind:'FINAL',text:'x'.repeat(16385)}})},
    {name:'usage-over-budget',respond:() => ({reply:{kind:'FINAL',text:'SIMULATED'},output_tokens:4096})},
    {name:'explicit-unknown',respond:() => ({failure:'UNKNOWN'})},
  ];
  for (const entry of bad) await t.test(entry.name,async sub => {
    let calls = 0; const f = await fixture(sub,input => {calls++;return entry.respond(input);});
    const request = {request_id:'invalid-'+entry.name,context:f.assembled,max_output_tokens:256}, result = await f.agent.complete(request);
    assert.equal(result.outcome,'INDETERMINATE'); assert.equal(result.assurance,'SIMULATED'); assert.equal(result.reply,null);
    assert.equal(result.usage,null); assert.equal(f.ledger.retained.length,1); assert.equal(f.ledger.settled.length,0);
    assert.equal(sequence(f.state),1); assert.equal(sequence(f.state,'fallback'),0); assert.deepEqual(requests(f.state),[request.request_id]);
    assert.equal(canonical(result).includes('private'),false);
    const sent = f.store.db.prepare("SELECT 1 FROM anx_records r JOIN anx_exports e USING(seq) WHERE operation_id=? AND json_extract(body,'$.phase')='MODEL_SENT'").get(request.request_id);
    assert.ok(sent,'the invalid programmable result cannot roll the SENT/sequence transaction back');
    assert.deepEqual(await f.agent.complete(request),result); assert.equal(calls,1); assert.equal(f.ledger.reserved.length,1);
  });
});

test('M17 MODEL only explicit proven-not-sent simulation may call responder on the fallback model',async t => {
  const attempts:MockResponderInput[] = [];
  const f = await fixture(t,input => {attempts.push(input);return input.model.model_id === 'main' ? {failure:'KNOWN_NOT_SENT'} :
    {reply:{kind:'FINAL',text:'SIMULATED fallback based on '+input.context.sha256},input_tokens:1,output_tokens:1,cost_micros:1};});
  const result = await f.agent.complete({request_id:'known-not-sent',context:f.assembled,max_output_tokens:256});
  assert.equal(result.outcome,'SUCCEEDED'); assert.equal(result.model_id,'fallback');
  assert.deepEqual(attempts.map(input => [input.model.model_id,input.request.attempt]),[['main',1],['fallback',2]]);
  assert.equal(f.ledger.reserved.length,1); assert.equal(f.ledger.settled.length,1); assert.equal(f.ledger.retained.length,0);
  assert.deepEqual(requests(f.state),[]); assert.deepEqual(requests(f.state,'fallback'),[]);
});

test('M17 MODEL budget rejection and pre-send cancellation invoke no responder and consume no fixture sequence',async t => {
  let calls = 0;
  const rejected = await fixture(t,() => {calls++;return {reply:{kind:'FINAL',text:'SIMULATED'}};},
    {reserve:async () => {throw Error('budget admission denied');}});
  assert.equal((await rejected.agent.complete({request_id:'budget-rejected',context:rejected.assembled,max_output_tokens:256})).outcome,'FAILED');
  assert.equal(calls,0); assert.equal(sequence(rejected.state),0);
  const f = await fixture(t,() => {calls++;return {reply:{kind:'FINAL',text:'SIMULATED'}};}), controller = new AbortController();
  const flush = f.store.flush.bind(f.store), request_id = 'cancel-before-dispatch';
  f.store.flush = async () => {await flush();if (f.store.db.prepare("SELECT 1 FROM anx_records r JOIN anx_exports e USING(seq) WHERE operation_id=? AND json_extract(body,'$.phase')='MODEL_DISPATCH_INTENT'").get(request_id)) controller.abort();};
  let result;
  try { result = await f.agent.complete({request_id,context:f.assembled,max_output_tokens:256},controller.signal); }
  finally { f.store.flush = flush; }
  assert.equal(result.reason,'MODEL_CANCELLED_NOT_SENT'); assert.equal(calls,0); assert.equal(sequence(f.state),0);
  assert.equal(f.ledger.settled.length,1); assert.equal(f.ledger.settled[0].input_tokens,0); assert.equal(f.ledger.retained.length,0);
  assert.deepEqual(requests(f.state),[]);
});

test('M17 MODEL cancellation during synchronous simulation retains unknown budget and key occupancy',async t => {
  const controller = new AbortController(); let calls = 0;
  const f = await fixture(t,() => {calls++;controller.abort();return {reply:{kind:'FINAL',text:'SIMULATED discarded after cancellation'}};});
  const request_id = 'cancel-sent', result = await f.agent.complete({request_id,context:f.assembled,max_output_tokens:256},controller.signal);
  assert.equal(result.outcome,'INDETERMINATE'); assert.equal(result.reply,null); assert.equal(calls,1);
  assert.equal(f.ledger.retained.length,1); assert.equal(f.ledger.settled.length,0); assert.equal(sequence(f.state,'fallback'),0);
  assert.deepEqual(requests(f.state),[request_id]);
});
