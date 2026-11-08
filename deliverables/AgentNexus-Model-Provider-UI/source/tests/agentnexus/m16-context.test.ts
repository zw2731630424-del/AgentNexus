import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, open } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { initializeControl } from '../../src/agentnexus/control.ts';
import { FeatureRegistry } from '../../src/agentnexus/features.ts';
import { NativeState } from '../../src/agentnexus/harness/state.ts';
import { assertContextView, ContextAssembly, CONTEXT_LIMITS } from '../../src/agentnexus/harness/context.ts';
import type { AssembledContext, ContextEntry } from '../../src/agentnexus/harness/context.ts';
import { canonical, invariant, sha256, uid } from '../../src/agentnexus/types.ts';
import type { Subject } from '../../src/agentnexus/harness/contracts.ts';

const S: Subject = { agent_id:'component-context',project_id:'context-project',task_id:'context-task',session_id:'context-session',
  runtime_instance_id:'context-runtime',agent_type:'SUBAGENT',model_binding:'mock',resource_budget_id:'context-budget',policy_scope:'context-scope' };
async function fixture(t: test.TestContext) {
  const base=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT??'../../evidence/components/test-data','context');await mkdir(base,{recursive:true});
  const root=await mkdtemp(join(base,'case-')),store=await KernelStore.open(root,{segmentBytes:4096});initializeControl(store);
  const token={},admin=(v:unknown)=>invariant(v===token,'ADMIN_CAPABILITY_REQUIRED');
  const feature={id:'native.context-assembly',kind:'OPTIONAL' as const,default:'ON' as const,scopes:['G','P','A','T'],depends_on:[],conflicts:[]};
  const features=new FeatureRegistry(store,[feature],admin,{busy:false});features.register(token,feature.id);
  const state=new NativeState(store,features,admin,uid()),context=new ContextAssembly(state);
  t.after(()=>store.close());return{root,store,state,context,features,token};
}

test('M16-CONTEXT-RAW: separate summary/index views preserve original bytes and source hashes',async t=>{
  const {store,state,context}=await fixture(t),raw='原始 😀\r\nline two\0byte';
  const source=await context.capture(S,'RAW',Buffer.from(raw));
  const summary=await context.capture(S,'SUMMARY',Buffer.from('summary'),{source_refs:[source]});
  const index=await context.capture(S,'DERIVED_INDEX',Buffer.from('index'),{source_refs:[source]});
  await assert.rejects(context.capture(S,'SUMMARY',Buffer.from('untraceable')),{code:'CONTEXT_DERIVATION_SOURCES_REQUIRED'});
  const result=await context.assemble(S,[{source,section:'HISTORY',required:true},{source:summary,section:'WORK_STATE',required:false}],{maxBytes:1024});
  assert.equal(result.entries[0].text,raw);assert.equal(result.entries[0].range_sha256,sha256(raw));
  assert.equal(result.entries[1].source.kind,'SUMMARY');assert.equal(index.kind,'DERIVED_INDEX');
  assert.equal(context.source(S,source.event_id).record_hash,source.record_hash);
  assert.equal((await context.readRange(S,source)).text,raw);assert.equal(store.query('context').length,3);
  assert.deepEqual(assertContextView(state,S,result),result);assert.equal(Object.isFrozen(result.entries[0].source.payload_ref),true);
  assert.equal((await store.verify()).pending,0);
});

test('M16-CONTEXT-STREAM: bounded range scans a multi-chunk lossless object and restores after reopen',async t=>{
  const {store,state,context,root,features}=await fixture(t),total=3*1024*1024;
  async function* input(){for(let i=0;i<total;i+=65536)yield Buffer.alloc(65536,65+(i/65536)%20);}
  const source=await context.capture(S,'RAW',input(),{maxBytes:total});
  const range=context.source(S,source.event_id,{offset:65530,length:20});
  const result=await context.assemble(S,[{source:range,section:'FILE_CONTENT',required:true}],{maxBytes:20,maxScanBytes:total});
  assert.equal(result.text,'A'.repeat(6)+'B'.repeat(14));assert.equal(result.bytes,20);
  assert.equal(result.entries[0].source.payload_ref.bytes,total);assert.equal(store.artifacts.stats.maxInputChunk,65536);
  assert.ok(Buffer.byteLength(canonical(state.get('CONTEXT_VIEW',result.view_id)))<49152);
  await store.close();const again=await KernelStore.open(root);try{
    initializeControl(again);const restored=new ContextAssembly(new NativeState(again,features,()=>{},uid()));
    assert.deepEqual(restored.source(S,source.event_id),source);assert.equal((await restored.readRange(S,range)).text,result.text);
    assert.ok((await again.verify()).segments>=1);
  }finally{await again.close();}
});

test('M16-CONTEXT-BOUNDS: required rules never truncate and optional omissions are explicit',async t=>{
  const {context,state}=await fixture(t),rule=await context.capture(S,'RAW',Buffer.from('required rules'));
  const optional=await context.capture(S,'RAW',Buffer.from('optional history'));
  await assert.rejects(context.assemble(S,[{source:rule,section:'PROJECT_RULES',required:false}],{maxBytes:2}),{code:'CONTEXT_REQUIRED_OVERFLOW'});
  await assert.rejects(context.assemble(S,[{source:rule,section:'PROJECT_RULES',required:true}],{maxBytes:32,maxScanBytes:1}),{code:'CONTEXT_REQUIRED_OVERFLOW'});
  const result=await context.assemble(S,[{source:rule,section:'PROJECT_RULES',required:false},{source:optional,section:'HISTORY',required:false}],{maxBytes:rule.length});
  assert.equal(result.entries[0].required,true);assert.deepEqual(result.omitted,[optional]);assert.equal(result.text,'required rules');
  const entries=Array.from({length:32},()=>({source:context.source(S,rule.event_id,{length:0}),section:'HISTORY' as const,required:true}));
  const many=await context.assemble(S,entries,{maxBytes:128});assert.equal(many.entries.length,32);
  assert.ok(Buffer.byteLength(canonical(state.get('CONTEXT_VIEW',many.view_id)))<49152);
  await assert.rejects(context.assemble(S,entries.concat(entries[0]),{maxBytes:128}),{code:'CONTEXT_SOURCE_LIMIT'});
  await assert.rejects(context.assemble(S,[],{maxBytes:CONTEXT_LIMITS.maxBytes+1}),{code:'CONTEXT_ASSEMBLY_LIMIT'});
});

test('M16-CONTEXT-SCOPE: project/task authority and exact immutable reference are checked independently',async t=>{
  const {context,state}=await fixture(t),source=await context.capture(S,'RAW',Buffer.from('😀text'));
  assert.throws(()=>context.source({...S,project_id:'foreign'},source.event_id),{code:'CONTEXT_PROJECT_DENIED'});
  assert.throws(()=>context.source({...S,task_id:'other-task'},source.event_id),{code:'CONTEXT_TASK_DENIED'});
  const granted=new ContextAssembly(state,{readTask:(actor,task)=>actor.task_id==='other-task'&&task===S.task_id});
  assert.deepEqual(granted.source({...S,task_id:'other-task'},source.event_id),source);
  assert.throws(()=>context.validate(S,{...source,record_hash:'f'.repeat(64)}),{code:'CONTEXT_REFERENCE_HASH'});
  assert.throws(()=>context.validate(S,{...source,payload_ref:{...source.payload_ref,sha256:'e'.repeat(64)}}),{code:'CONTEXT_REFERENCE_MISMATCH'});
  assert.throws(()=>context.source(S,source.event_id,{offset:source.length+1}),{code:'CONTEXT_RANGE'});
  await assert.rejects(context.readRange(S,context.source(S,source.event_id,{offset:1,length:2})),{code:'CONTEXT_UTF8_BOUNDARY'});
  const good=await context.assemble(S,[{source,section:'HISTORY',required:true}],{maxBytes:64});
  assert.throws(()=>assertContextView(state,S,{...good,text:'forged',bytes:6,sha256:sha256('forged')}),{code:'CONTEXT_VIEW_HASH'});
});

test('M16-CONTEXT-HASH: corruption outside the selected range fails the complete verification barrier',async t=>{
  const {store,context}=await fixture(t),source=await context.capture(S,'RAW',Buffer.alloc(3*65536,97));
  const path=join(store.root,'artifacts','objects',source.payload_ref.artifact_id+'.zst'),file=await open(path,'r+');
  try{const last=Buffer.alloc(1);await file.read(last,0,1,source.payload_ref.stored_bytes-1);last[0]^=1;await file.write(last,0,1,source.payload_ref.stored_bytes-1);await file.sync();}finally{await file.close();}
  await assert.rejects(context.readRange(S,context.source(S,source.event_id,{length:1})),{code:'ARTIFACT_CORRUPT'});
  assert.equal(store.faulted,true);assert.equal(store.query('context').length,1);
});

test('M16-CONTEXT-ACK: failed archive ACK cannot become an acknowledged model context',async t=>{
  const {store,state,context}=await fixture(t),source=await context.capture(S,'RAW',Buffer.from('rules'));
  const flush=store.flush.bind(store);store.flush=async()=>{throw new Error('synthetic barrier failure');};
  try{await assert.rejects(context.assemble(S,[{source,section:'PROJECT_RULES',required:true}],{maxBytes:64}));}finally{store.flush=flush;}
  const metadata=state.list<{view_id:string;entries:Omit<ContextEntry,'text'>[]}>('CONTEXT_VIEW')[0],candidate:AssembledContext={view_id:metadata.view_id,agent_id:S.agent_id,project_id:S.project_id,task_id:S.task_id,
    text:'rules',bytes:5,sha256:sha256('rules'),entries:[{...metadata.entries[0],text:'rules'}],omitted:[]};
  assert.throws(()=>assertContextView(state,S,candidate),{code:'CONTEXT_VIEW_UNACKNOWLEDGED'});
  await flush();assert.deepEqual(assertContextView(state,S,candidate),candidate);
});

test('M16-CONTEXT-EGRESS: asynchronous scans recheck task authorization and support the exact model byte ceiling',async t=>{
  const {store,state,context}=await fixture(t),foreign={...S,task_id:'foreign-task'},source=await context.capture(foreign,'RAW',Buffer.from('authorized before scan'));
  let allowed=true;const granted=new ContextAssembly(state,{readTask:()=>allowed}),read=store.artifacts.read.bind(store.artifacts);
  store.artifacts.read=async function*(ref){for await(const chunk of read(ref)){yield chunk;allowed=false;}};
  try{await assert.rejects(granted.assemble(S,[{source,section:'HISTORY',required:true}],{maxBytes:256}),{code:'CONTEXT_TASK_DENIED'});}
  finally{store.artifacts.read=read;}
  assert.equal(state.count('CONTEXT_VIEW'),0);
  const large=await context.capture(S,'RAW',Buffer.alloc(CONTEXT_LIMITS.maxBytes,97));
  const view=await context.assemble(S,[{source:large,section:'HISTORY',required:true}],{maxBytes:CONTEXT_LIMITS.maxBytes});
  assert.equal(view.bytes,CONTEXT_LIMITS.maxBytes);assert.equal(assertContextView(state,S,view).sha256,large.payload_ref.sha256);
  assert.ok(Buffer.byteLength(canonical(state.get('CONTEXT_VIEW',view.view_id)))<49152);
});
