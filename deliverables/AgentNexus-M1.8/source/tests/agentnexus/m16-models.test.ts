import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { initializeControl } from '../../src/agentnexus/control.ts';
import { FeatureRegistry } from '../../src/agentnexus/features.ts';
import { NativeState } from '../../src/agentnexus/harness/state.ts';
import { ContextAssembly } from '../../src/agentnexus/harness/context.ts';
import { ModelGateway } from '../../src/agentnexus/harness/models.ts';
import type { MockStep, ModelBudget, ModelUsage } from '../../src/agentnexus/harness/models.ts';
import { canonical, invariant, NexusError, sha256, uid } from '../../src/agentnexus/types.ts';
import type { AgentType, Subject } from '../../src/agentnexus/harness/contracts.ts';

const S:Subject={agent_id:'model-agent',project_id:'model-project',task_id:'model-task',session_id:'model-session',runtime_instance_id:'model-runtime',
  agent_type:'DEVELOPMENT',model_binding:'mock',resource_budget_id:'model-budget',policy_scope:'model-scope'};
function model(state:NativeState,id:string){const value=state.get<{sequence:number;key_cursor:number}>('MODEL_MODEL',id);assert.ok(value);return value;}
function key(state:NativeState,id:string){const value=state.get<{key_id:string;state:string;requests:string[];revision:number}>('MODEL_KEY',id);assert.ok(value);return value;}
function setup(store:KernelStore,off:string[]=[]){initializeControl(store);const token={},admin=(v:unknown)=>invariant(v===token,'ADMIN_CAPABILITY_REQUIRED');
  const definitions=['native.context-assembly','model.gateway','model.mock-provider','model.key-round-robin','model.provider-failover'].map(id=>({id,kind:'OPTIONAL' as const,default:(off.includes(id)?'OFF':'ON') as 'ON'|'OFF',scopes:['G','P','A','T'],depends_on:[],conflicts:[]}));
  const features=new FeatureRegistry(store,definitions,admin,{busy:false});for(const d of definitions)features.register(token,d.id);
  return{token,state:new NativeState(store,features,admin,uid()),features};}
async function fixture(t:test.TestContext,options:{steps?:MockStep[];fallback?:MockStep[];off?:string[];budget?:Partial<ModelBudget>}={}){
  const base=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT??'../../evidence/components/test-data','models');await mkdir(base,{recursive:true});
  const root=await mkdtemp(join(base,'case-')),store=await KernelStore.open(root),{state,token,features}=setup(store,options.off);
  const ledger={reserved:[] as string[],settled:[] as ModelUsage[],retained:[] as string[]};
  const budget:ModelBudget={reserve:async(_s,d)=>{ledger.reserved.push(d.request_id);return 'reservation-'+d.request_id;},
    settle:async(_s,_r,u)=>{ledger.settled.push(u);},retain:async(_s,r)=>{ledger.retained.push(r);},...options.budget};
  const routes:Record<string,Partial<Record<AgentType,string[]>>>={mock:{}};
  for(const type of ['DEVELOPMENT','SUBAGENT','RESIDENT','BACKGROUND_REVIEWER','COORDINATOR'] as const)routes.mock[type]=['main','fallback'];
  const config={budget,routes,mocks:{main:options.steps??[{reply:{kind:'FINAL' as const,text:'SIMULATED answer'}}],fallback:options.fallback??[{reply:{kind:'FINAL' as const,text:'SIMULATED fallback'}}]}};
  const gateway=new ModelGateway(state,config);
  for(const provider_id of ['p1','p2'])await gateway.registerProvider(token,{provider_id,kind:'MOCK'});
  for(const [model_id,provider_id]of [['main','p1'],['fallback','p2']])await gateway.registerModel(token,{model_id,provider_id,max_input_tokens:65536,max_output_tokens:4096,input_cost_micros_per_token:1,output_cost_micros_per_token:2});
  await gateway.registerKey(token,{key_id:'key-p1-a',provider_id:'p1',credential_handle:'vault:mock:p1:opaque-a',maxConcurrency:1});
  await gateway.registerKey(token,{key_id:'key-p2-a',provider_id:'p2',credential_handle:'vault:mock:p2:opaque-b',maxConcurrency:1});
  const context=new ContextAssembly(state),source=await context.capture(S,'RAW',Buffer.from('rule: fixture only'));
  const assembled=await context.assemble(S,[{source,section:'PROJECT_RULES',required:true}],{maxBytes:256});
  t.after(()=>store.close());return{root,store,state,token,features,gateway,context,assembled,ledger,budget,config,agent:gateway.bind(S)};
}

test('M16-MODEL-TRACE: simulated results preserve original context provenance, integer usage and durable dedup',async t=>{
  const f=await fixture(t),input={request_id:'trace',context:f.assembled,max_output_tokens:256};
  const result=await f.agent.complete(input);assert.equal(result.status,'SIMULATED');assert.equal(result.outcome,'SUCCEEDED');assert.equal(result.assurance,'SIMULATED');
  assert.equal(result.reply?.text,'SIMULATED answer');assert.equal(result.usage?.concurrency,0);assert.equal(f.ledger.reserved.length,1);assert.equal(f.ledger.settled.length,1);
  assert.equal(result.response_source?.kind,'RAW');assert.deepEqual(await f.agent.complete(input),result);assert.equal(f.ledger.reserved.length,1);
  await assert.rejects(f.agent.complete({...input,max_output_tokens:255}),{code:'MODEL_REQUEST_CONFLICT'});
  const records=f.store.query('context',{project_id:S.project_id,task_id:S.task_id});assert.equal(records.length,3);
  const bodies=[];for(const record of records){const ref=(record.body as unknown as {payload_ref:import('../../src/agentnexus/types.ts').ArtifactRef}).payload_ref,chunks=[];for await(const chunk of f.store.artifacts.read(ref))chunks.push(chunk);bodies.push(Buffer.concat(chunks).toString());}
  assert.ok(bodies.some(text=>text.includes(f.assembled.sha256)&&text.includes(f.assembled.entries[0].source.record_hash)));
  assert.ok(bodies.every(text=>!text.includes('vault:mock:')));assert.ok(f.store.query('audit',{limit:100}).every(record=>!canonical(record).includes('vault:mock:')));
});

test('M16-MODEL-REAL-BLOCKED: no real adapter/provider or plaintext credential entry exists',async t=>{
  const f=await fixture(t);
  assert.throws(()=>new ModelGateway(f.state,{...f.config,adapter:()=>{throw new Error('must never run');}} as never),{code:'MODEL_BUDGET_REQUIRED'});
  assert.throws(()=>new ModelGateway(f.state,{...f.config,mocks:{main:[{reply:{kind:'FINAL',text:'x'},failure:'UNKNOWN'}]}} as never),{code:'MODEL_MOCK_SCHEMA'});
  await assert.rejects(f.gateway.registerProvider(f.token,{provider_id:'real',kind:'HTTP'} as never),{code:'MODEL_REAL_PROVIDER_BLOCKED'});
  await assert.rejects(f.gateway.registerKey(f.token,{key_id:'plaintext',provider_id:'p1',credential_handle:'not-an-opaque-handle',maxConcurrency:1}),{code:'MODEL_CREDENTIAL_HANDLE'});
  await assert.rejects(f.gateway.registerKey(f.token,{key_id:'wrong-provider',provider_id:'p2',credential_handle:'vault:mock:p1:opaque',maxConcurrency:1}),{code:'MODEL_CREDENTIAL_HANDLE'});
  await assert.rejects(f.gateway.registerProvider({}, {provider_id:'forged',kind:'MOCK'}),{code:'ADMIN_CAPABILITY_REQUIRED'});
  const foreign={...f.assembled,text:'forged',bytes:6,sha256:sha256('forged')};
  await assert.rejects(f.agent.complete({request_id:'forged-context',context:foreign,max_output_tokens:256}),{code:'CONTEXT_VIEW_HASH'});
  assert.equal(f.ledger.reserved.length,0);assert.equal(f.state.count('MODEL_REQUEST'),0);
});

test('M16-MODEL-FAILOVER: only proven not-sent failures may advance to an independent provider pool',async t=>{
  const f=await fixture(t,{steps:[{failure:'KNOWN_NOT_SENT'}]});
  const result=await f.agent.complete({request_id:'fallback',context:f.assembled,max_output_tokens:256});
  assert.equal(result.outcome,'SUCCEEDED');assert.equal(result.provider_id,'p2');assert.equal(result.reply?.text,'SIMULATED fallback');
  assert.equal(model(f.state,'main').sequence,1);assert.equal(model(f.state,'fallback').sequence,1);
  assert.equal(f.ledger.reserved.length,1);assert.equal(f.ledger.settled.length,1);assert.equal(f.ledger.retained.length,0);
  assert.deepEqual(key(f.state,'key-p1-a').requests,[]);assert.deepEqual(key(f.state,'key-p2-a').requests,[]);
});

test('M16-MODEL-UNKNOWN: sent unknown results retain budget/key quota, persist and never fail over or replay',async t=>{
  const f=await fixture(t,{steps:[{failure:'UNKNOWN'}]}),input={request_id:'unknown',context:f.assembled,max_output_tokens:256};
  const result=await f.agent.complete(input);assert.equal(result.outcome,'INDETERMINATE');assert.equal(result.reply,null);
  assert.equal(f.ledger.retained.length,1);assert.equal(f.ledger.settled.length,0);assert.equal(model(f.state,'fallback').sequence,0);
  assert.deepEqual(key(f.state,'key-p1-a').requests,['unknown']);assert.deepEqual(await f.agent.complete(input),result);assert.equal(f.ledger.reserved.length,1);
  await f.store.close();const store=await KernelStore.open(f.root);try{
    const restored=setup(store),gateway=new ModelGateway(restored.state,f.config);
    assert.deepEqual(await gateway.bind(S).complete(input),result);assert.equal(f.ledger.reserved.length,1);
  }finally{await store.close();}
});

test('M16-MODEL-POOL: independent key state, rotation and round robin keep provider/account limits',async t=>{
  const f=await fixture(t);
  await f.gateway.registerKey(f.token,{key_id:'key-p1-b',provider_id:'p1',credential_handle:'vault:mock:p1:opaque-c',maxConcurrency:1});
  for(const request_id of ['pool-a','pool-b'])assert.equal((await f.agent.complete({request_id,context:f.assembled,max_output_tokens:256})).outcome,'SUCCEEDED');
  const sent=f.store.query('audit',{limit:100}).filter((r)=> (r.body as unknown as {phase:string}).phase==='MODEL_DISPATCH_INTENT');assert.equal(sent.length,2);
  assert.equal(model(f.state,'main').key_cursor,2);
  await f.gateway.setKeyState(f.token,'key-p1-a','INVALID');assert.equal(key(f.state,'key-p1-b').state,'ACTIVE');
  await f.gateway.rotateKey(f.token,'key-p1-b',{key_id:'key-p1-c',provider_id:'p1',credential_handle:'vault:mock:p1:opaque-d',maxConcurrency:1});
  assert.equal(key(f.state,'key-p1-b').state,'RETIRED');assert.equal(key(f.state,'key-p1-c').state,'ACTIVE');
  await assert.rejects(f.gateway.rotateKey(f.token,'key-p1-c',{key_id:'bad',provider_id:'p2',credential_handle:'vault:mock:p2:opaque-d',maxConcurrency:1}),{code:'MODEL_KEY_PROVIDER_MISMATCH'});
});

test('M16-MODEL-CONCURRENCY: active key limit rejects a concurrent request and releases known unused reservation',async t=>{
  let settleStarted!:()=>void,release!:()=>void;const entered=new Promise<void>(r=>settleStarted=r),gate=new Promise<void>(r=>release=r);
  const f=await fixture(t,{budget:{settle:async(_s,_id,usage)=>{if(usage.request_id==='held'){settleStarted();await gate;}}}});
  const first=f.agent.complete({request_id:'held',context:f.assembled,max_output_tokens:256});await entered;
  try{
    await assert.rejects(f.agent.complete({request_id:'held',context:f.assembled,max_output_tokens:256}),{code:'MODEL_REQUEST_INFLIGHT'});
    const second=await f.agent.complete({request_id:'blocked',context:f.assembled,max_output_tokens:256});assert.equal(second.outcome,'FAILED');assert.equal(second.reason,'MODEL_KEY_CONCURRENCY');
    assert.equal(model(f.state,'main').sequence,1);assert.equal(f.ledger.retained.length,0);
  }finally{release();}assert.equal((await first).outcome,'SUCCEEDED');assert.deepEqual(key(f.state,'key-p1-a').requests,[]);
});

test('M16-MODEL-BUDGET: reservation failure and unknown settlement fail closed without unmetered dispatch',async t=>{
  const rejected=await fixture(t,{budget:{reserve:async()=>{throw new NexusError('private budget implementation detail');}}});
  const result=await rejected.agent.complete({request_id:'no-budget',context:rejected.assembled,max_output_tokens:256});assert.equal(result.outcome,'FAILED');assert.equal(result.reason,'MODEL_RESERVATION_FAILED');
  assert.equal(model(rejected.state,'main').sequence,0);assert.ok(!canonical(result).includes('private'));
  const uncertain=await fixture(t,{budget:{settle:async()=>{throw new Error('unknown billing state');}}});
  const pending=await uncertain.agent.complete({request_id:'settle-unknown',context:uncertain.assembled,max_output_tokens:256});
  assert.equal(pending.outcome,'INDETERMINATE');assert.equal(uncertain.ledger.retained.length,1);assert.equal(model(uncertain.state,'fallback').sequence,0);
});

test('M16-MODEL-FEATURE: disabled failover, authentication failure and usage excess have separate outcomes',async t=>{
  const off=await fixture(t,{off:['model.mock-provider']});
  await assert.rejects(off.agent.complete({request_id:'mock-off',context:off.assembled,max_output_tokens:64}),{code:'NATIVE_FEATURE_BLOCKED:model.mock-provider'});
  assert.equal(off.ledger.reserved.length,0);assert.equal(off.state.count('MODEL_REQUEST'),0);
  const disabled=await fixture(t,{steps:[{failure:'AUTH'}],off:['model.provider-failover']});
  const result=await disabled.agent.complete({request_id:'no-failover',context:disabled.assembled,max_output_tokens:256});
  assert.equal(result.outcome,'FAILED');assert.equal(result.reason,'MODEL_KNOWN_NOT_SENT');assert.equal(key(disabled.state,'key-p1-a').state,'INVALID');
  assert.equal(model(disabled.state,'fallback').sequence,0);assert.equal(disabled.ledger.settled[0].cost_micros,0);
  const over=await fixture(t,{steps:[{reply:{kind:'FINAL',text:'SIMULATED'},output_tokens:4096}]});
  assert.equal((await over.agent.complete({request_id:'over',context:over.assembled,max_output_tokens:64})).outcome,'INDETERMINATE');assert.equal(over.ledger.retained.length,1);
});

test('M16-MODEL-TOOL: full JSON arguments/resource remain data and model cannot supply approval authority',async t=>{
  const f=await fixture(t,{steps:[{reply:{kind:'TOOL_CALL',tool_name:'native.echo',tool_version:'1',resource_id:'model-project:exact',arguments:{value:'complete'}}}]});
  const result=await f.agent.complete({request_id:'tool',context:f.assembled,max_output_tokens:256});assert.equal(result.reply?.kind,'TOOL_CALL');
  assert.equal(result.reply?.resource_id,'model-project:exact');assert.deepEqual(result.reply?.arguments,{value:'complete'});
  assert.throws(()=>new ModelGateway(f.state,{...f.config,mocks:{main:[{reply:{kind:'TOOL_CALL',arguments:{},approval_id:'self-approved'}}]}} as never),{code:'MODEL_REPLY_SCHEMA'});
  assert.equal(f.store.db.prepare('SELECT 1 FROM control_operations LIMIT 1').get(),undefined);
});

test('M16-MODEL-RECOVERY: persisted reserve/send crash windows become unknown without dispatch or quota release',async t=>{
  const f=await fixture(t),hash=sha256(canonical({subject:S,context_view_id:f.assembled.view_id,context_sha256:f.assembled.sha256,max_output_tokens:256}));
  await f.state.change(S,'MODEL_CRASH_FIXTURE',()=>{
    for(const state of ['RESERVING','RESERVED','SENT']){
      const request_id='crash-'+state;
      f.state.insert('MODEL_REQUEST',request_id,S,state,{revision:0,request_id,owner:S,input_hash:hash,state,reservation_id:state==='RESERVING'?null:'reservation-'+request_id,
        model_id:state==='SENT'?'main':null,provider_id:state==='SENT'?'p1':null,key_id:state==='SENT'?'key-p1-a':null,attempts:state==='SENT'?1:0,result:null,
        context_view_id:f.assembled.view_id,demand:{request_id,input_tokens:5,output_tokens:256,estimated_cost_micros:517,concurrency:1,assurance:'SIMULATED'}});
    }
    const heldKey=key(f.state,'key-p1-a');f.state.update('MODEL_KEY',heldKey.key_id,heldKey.revision,heldKey.state,{...heldKey,requests:['crash-SENT'],revision:heldKey.revision+1});
  });
  await f.store.close();const store=await KernelStore.open(f.root);try{
    const restored=setup(store),gateway=new ModelGateway(restored.state,f.config);await gateway.recover(restored.token);
    assert.equal(restored.state.list<{state:string}>('MODEL_REQUEST').every(request=>request.state==='INDETERMINATE'),true);
    assert.equal(f.ledger.retained.length,2);assert.equal(f.ledger.settled.length,0);assert.equal(f.ledger.reserved.length,0);
    assert.deepEqual(key(restored.state,'key-p1-a').requests,['crash-SENT']);assert.equal(model(restored.state,'main').sequence,0);
    const result=await gateway.bind(S).complete({request_id:'crash-SENT',context:f.assembled,max_output_tokens:256});assert.equal(result.outcome,'INDETERMINATE');
    await gateway.recover(restored.token);assert.equal(f.ledger.retained.length,2);
  }finally{await store.close();}
});

test('M16-MODEL-CANCEL-NOT-SENT: real durable barriers fence cancellation before fixture sequence or token consumption',async t=>{
  for(const phase of ['MODEL_REQUEST_PREPARED','MODEL_BUDGET_RESERVED','CONTEXT_CAPTURED','MODEL_DISPATCH_INTENT'])await t.test(phase,async sub=>{
    const f=await fixture(sub),controller=new AbortController(),request_id='cancel-'+phase,flush=f.store.flush.bind(f.store);let interrupted=false;
    f.store.flush=async()=>{
      await flush();
      if(!interrupted && f.store.db.prepare("SELECT 1 FROM anx_records r JOIN anx_exports e USING(seq) WHERE r.operation_id=? AND json_extract(r.body,'$.phase')=?").get(request_id,phase)){
        interrupted=true;controller.abort(new Error('trusted task cancellation'));
      }
    };
    let result;
    try{result=await f.agent.complete({request_id,context:f.assembled,max_output_tokens:256},controller.signal);}finally{f.store.flush=flush;}
    assert.equal(interrupted,true,'the actual product archive ACK barrier must be reached');
    assert.equal(result.outcome,'FAILED');assert.equal(result.reason,'MODEL_CANCELLED_NOT_SENT');assert.equal(result.reply,null);
    assert.deepEqual(result.usage,{request_id,input_tokens:0,output_tokens:0,cost_micros:0,concurrency:0,assurance:'SIMULATED'});
    assert.equal(model(f.state,'main').sequence,0);assert.equal(model(f.state,'main').key_cursor,0);assert.equal(model(f.state,'fallback').sequence,0);
    assert.equal(f.ledger.reserved.length,phase==='MODEL_REQUEST_PREPARED'?0:1);assert.equal(f.ledger.retained.length,0);
    if(phase!=='MODEL_REQUEST_PREPARED')assert.deepEqual(f.ledger.settled,[result.usage]);else assert.deepEqual(f.ledger.settled,[]);
    assert.equal(result.usage!.input_tokens||result.usage!.output_tokens?1:0,0,'the shared budget model_requests amount is zero');
    assert.deepEqual(key(f.state,'key-p1-a').requests,[]);
    assert.equal(f.store.db.prepare("SELECT 1 FROM anx_records WHERE operation_id=? AND json_extract(body,'$.phase')='MODEL_SENT'").get(request_id),undefined);
  });
});

test('M16-MODEL-CANCEL-SENT: cancellation after actual fixture dispatch retains unknown quota and never fails over',async t=>{
  const f=await fixture(t,{steps:[{failure:'UNKNOWN'}]}),controller=new AbortController(),request_id='cancel-sent',flush=f.store.flush.bind(f.store);let interrupted=false;
  f.store.flush=async()=>{await flush();if(!interrupted&&f.store.db.prepare("SELECT 1 FROM anx_records r JOIN anx_exports e USING(seq) WHERE r.operation_id=? AND json_extract(r.body,'$.phase')='MODEL_SENT'").get(request_id)){interrupted=true;controller.abort();}};
  let result;try{result=await f.agent.complete({request_id,context:f.assembled,max_output_tokens:256},controller.signal);}finally{f.store.flush=flush;}
  assert.equal(interrupted,true);assert.equal(result.outcome,'INDETERMINATE');assert.equal(result.usage,null);assert.equal(result.reply,null);
  assert.equal(model(f.state,'main').sequence,1);assert.equal(model(f.state,'fallback').sequence,0);assert.equal(f.ledger.settled.length,0);assert.equal(f.ledger.retained.length,1);
  assert.deepEqual(key(f.state,'key-p1-a').requests,[request_id]);
});

test('M16-MODEL-CANCEL-FAILOVER: cancellation at known-not-sent ACK cannot advance to another provider',async t=>{
  const f=await fixture(t,{steps:[{failure:'KNOWN_NOT_SENT'}]}),controller=new AbortController(),request_id='cancel-failover',flush=f.store.flush.bind(f.store);
  f.store.flush=async()=>{await flush();if(f.store.db.prepare("SELECT 1 FROM anx_records r JOIN anx_exports e USING(seq) WHERE r.operation_id=? AND json_extract(r.body,'$.phase')='MODEL_NOT_SENT'").get(request_id))controller.abort();};
  let result;try{result=await f.agent.complete({request_id,context:f.assembled,max_output_tokens:256},controller.signal);}finally{f.store.flush=flush;}
  assert.equal(result.outcome,'FAILED');assert.equal(result.reason,'MODEL_CANCELLED_NOT_SENT');assert.equal(result.usage!.cost_micros,0);
  assert.equal(model(f.state,'main').sequence,1);assert.equal(model(f.state,'fallback').sequence,0);assert.equal(f.ledger.settled.length,1);assert.equal(f.ledger.retained.length,0);
});

test('M16-MODEL-CANCEL-SETTLED: cancellation after a known usage settlement preserves actual metering',async t=>{
  const controller=new AbortController(),observed:ModelUsage[]=[],f=await fixture(t,{budget:{settle:async(_s,_r,usage)=>{observed.push(usage);controller.abort();}}});
  const result=await f.agent.complete({request_id:'cancel-settled',context:f.assembled,max_output_tokens:256},controller.signal);
  assert.equal(result.outcome,'FAILED');assert.equal(result.reason,'MODEL_CANCELLED_AFTER_RESULT');assert.equal(result.reply,null);
  assert.ok(result.usage!.input_tokens>0);assert.ok(result.usage!.cost_micros>0);assert.deepEqual(result.usage,observed[0]);assert.equal(f.ledger.retained.length,0);
  assert.deepEqual(key(f.state,'key-p1-a').requests,[]);
  await assert.rejects(f.agent.complete({request_id:'already-cancelled',context:f.assembled,max_output_tokens:256},controller.signal),{code:'MODEL_CANCELLED_NOT_SENT'});
});
