import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, open, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setImmediate as immediate } from 'node:timers/promises';
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { initializeControl } from '../../src/agentnexus/control.ts';
import { FeatureRegistry } from '../../src/agentnexus/features.ts';
import { NativeState } from '../../src/agentnexus/harness/state.ts';
import { assertContextView, CONTEXT_ASSEMBLY_VERSION, CONTEXT_LIMITS, ContextAssembly } from '../../src/agentnexus/harness/context.ts';
import type { ContextEntry, ContextSection, ContextSelection, ContextSource, ContextTaskBinding } from '../../src/agentnexus/harness/context.ts';
import { ModelGateway } from '../../src/agentnexus/harness/models.ts';
import type { MockStep, ModelBudget } from '../../src/agentnexus/harness/models.ts';
import type { Subject } from '../../src/agentnexus/harness/contracts.ts';
import { canonical, invariant, sha256, uid } from '../../src/agentnexus/types.ts';

const S:Subject={agent_id:'m161-context',project_id:'m161-project',task_id:'m161-task',session_id:'m161-session',runtime_instance_id:'m161-runtime',
  agent_type:'DEVELOPMENT',model_binding:'mock',resource_budget_id:'m161-budget',policy_scope:'m161-project'};
const output=resolve(process.env.AGENTNEXUS_RELIABILITY_OUTPUT_ROOT??'../evidence/reliability/adhoc');
const observations:{name:string;status:'PASS'|'FAIL';assurance:string;detail:unknown}[]=[];
function checked(name:string,fn:(t:test.TestContext)=>Promise<unknown>){test(name,async t=>{
  try{const detail=await fn(t);observations.push({name,status:'PASS',assurance:'REAL_SQLITE_ZSTD_LOCAL_FILES; PROVIDER_OR_SCHEDULING_FAULTS_WHERE_NAMED_ARE_SIMULATED',detail:detail??null});}
  catch(error){observations.push({name,status:'FAIL',assurance:'REAL_SQLITE_ZSTD_LOCAL_FILES',detail:{code:(error as {code?:string}).code??null,message:String(error)}});throw error;}
});}
after(async()=>{await mkdir(output,{recursive:true});await writeFile(join(output,'context-observations-'+process.pid+'.json'),JSON.stringify({schema:'agentnexus/m161/context-tests/1',node:process.version,platform:process.platform,observations},null,2)+'\n',{flag:'wx'});});
function setup(store:KernelStore){initializeControl(store);const token={},check=(value:unknown)=>invariant(value===token,'ADMIN_CAPABILITY_REQUIRED');
  const definitions=['native.context-assembly','model.gateway','model.mock-provider','model.key-round-robin','model.provider-failover'].map(id=>({id,kind:'OPTIONAL' as const,default:'ON' as const,scopes:['G','P','A','T'],depends_on:[],conflicts:[]}));
  const features=new FeatureRegistry(store,definitions,check,{busy:false});for(const definition of definitions)features.register(token,definition.id);
  const state=new NativeState(store,features,check,uid());return{state,token,context:new ContextAssembly(state),features};}
async function fixture(t:test.TestContext){const base=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT??join(output,'test-data'),'m161-context');await mkdir(base,{recursive:true});
  const root=await mkdtemp(join(base,'case-')),store=await KernelStore.open(root),rest=setup(store);t.after(()=>store.close());return{root,store,...rest};}
async function gateway(f:Awaited<ReturnType<typeof fixture>>,steps:MockStep[]){
  const metering={reserved:0,settled:0,retained:0};const budget:ModelBudget={reserve:async()=>{metering.reserved++;return uid();},settle:async()=>{metering.settled++;},retain:async()=>{metering.retained++;}};
  const models=new ModelGateway(f.state,{budget,routes:{mock:{DEVELOPMENT:['main']}},mocks:{main:steps}});
  await models.registerProvider(f.token,{provider_id:'mock-provider',kind:'MOCK'});
  await models.registerModel(f.token,{model_id:'main',provider_id:'mock-provider',max_input_tokens:65536,max_output_tokens:4096,input_cost_micros_per_token:1,output_cost_micros_per_token:1});
  await models.registerKey(f.token,{key_id:'mock-key',provider_id:'mock-provider',credential_handle:'vault:mock:mock-provider:opaque',maxConcurrency:2});return{models,metering};}
const taskBinding:ContextTaskBinding={project_rules_version:'rules.v1',rule_hash:sha256('rules.v1'),feature_epoch:3,policy_epoch:4,workflow_version:'workflow.v1'};

checked('M161-CONTEXT-EXACT: every source category and version survives immutable input/manifest reconstruction',async t=>{
  const f=await fixture(t),sections:ContextSection[]=['PROJECT_RULES','AGENT_CONTRACT','TASK_CONTRACT','HISTORY','FILE_CONTENT','DECISION','AGENT_MESSAGE','TOOL_RESULT','ARTIFACT','WORK_STATE'];
  const selections:ContextSelection[]=[];const original:string[]=[];
  for(const [i,section] of sections.entries()){
    const text=section+': 原文 😀\r\n\0\uFEFF '+i;original.push(text);const source=await f.context.capture(S,'RAW',Buffer.from(text));
    selections.push({source,section,required:true,binding:{reference:section.toLowerCase()+':original-'+i,version:'v'+i,sha256:source.payload_ref.sha256}});
  }
  const view=await f.context.assemble(S,selections,{maxBytes:16384,bindings:taskBinding}),restored=await f.context.reconstruct(S,view.view_id);
  assert.equal(view.assembly_version,CONTEXT_ASSEMBLY_VERSION);assert.deepEqual(view.bindings,taskBinding);assert.deepEqual(Buffer.from(restored.bytes),Buffer.from(original.join('\n\n')));
  assert.deepEqual(restored.context,view);assert.equal(view.input_ref!.sha256,sha256(restored.bytes));assert.equal(view.input_ref!.bytes,view.bytes);
  assert.equal(view.entries.every((entry,i)=>entry.binding!.version==='v'+i && entry.binding!.sha256===selections[i].source.payload_ref.sha256),true);
  const record=f.store.query('audit',{project_id:S.project_id,limit:100}).find(record=>(record.body as {phase?:string}).phase==='CONTEXT_INPUT_COMMITTED');assert.ok(record);
  assert.throws(()=>f.store.db.prepare('UPDATE anx_records SET body=body WHERE event_id=?').run(selections[0].source.event_id),/append only/);
  assert.throws(()=>assertContextView(f.state,S,{...view,provenance_sha256:'f'.repeat(64)}));
  assert.equal((await f.store.verify()).pending,0);return{view_id:view.view_id,input_sha256:view.sha256,input_ref:view.input_ref,manifest_ref:view.manifest_ref,provenance_sha256:view.provenance_sha256,sources:view.entries.map(entry=>({section:entry.section,source:entry.source,binding:entry.binding}))};
});

checked('M161-CONTEXT-VERSIONS: actual file/rule changes cannot silently replace a bound version',async t=>{
  const f=await fixture(t),path=join(f.root,'AGENTS.fixture.md'),v1=Buffer.from('version one rules\r\n😀');await writeFile(path,v1,{flag:'wx'});
  const old=await f.context.capture(S,'RAW',await readFile(path));const first=await f.context.assemble(S,[{source:old,section:'PROJECT_RULES',required:true,binding:{reference:path,version:'rules.v1',sha256:sha256(v1)}}],{maxBytes:1024,bindings:taskBinding});
  const v2=Buffer.from('version two rules');await writeFile(path,v2);const updated=await f.context.capture(S,'RAW',await readFile(path));
  await assert.rejects(f.context.assemble(S,[{source:updated,section:'PROJECT_RULES',required:true,binding:{reference:path,version:'rules.v1',sha256:sha256(v1)}}],{maxBytes:1024}),{code:'CONTEXT_VERSION_BINDING'});
  const second=await f.context.assemble(S,[{source:updated,section:'PROJECT_RULES',required:true,binding:{reference:path,version:'rules.v2',sha256:sha256(v2)}}],{maxBytes:1024,bindings:{...taskBinding,project_rules_version:'rules.v2',rule_hash:sha256(v2)}});
  assert.equal((await f.context.reconstruct(S,first.view_id)).context.text,v1.toString());assert.equal((await f.context.reconstruct(S,second.view_id)).context.text,v2.toString());
  assert.notEqual(first.sha256,second.sha256);return{file:path,old_sha256:sha256(v1),new_sha256:sha256(v2),views:[first.view_id,second.view_id]};
});

checked('M161-CONTEXT-LARGE: 8MiB raw history remains chunked and exact ranges retain complete hash verification',async t=>{
  const f=await fixture(t),total=8*1024*1024,hash=createHash('sha256');let produced=0;
  async function* chunks(){for(let i=0;i<total;i+=65536){const chunk=Buffer.alloc(65536,65+(i/65536)%20);hash.update(chunk);produced+=chunk.length;yield chunk;}}
  const source=await f.context.capture(S,'RAW',chunks(),{maxBytes:total});assert.equal(source.payload_ref.sha256,hash.digest('hex'));assert.equal(produced,total);
  const selected=f.context.source(S,source.event_id,{offset:65530,length:20}),view=await f.context.assemble(S,[{source:selected,section:'FILE_CONTENT',required:true}],{maxBytes:20,maxScanBytes:total});
  assert.equal(view.text,'A'.repeat(6)+'B'.repeat(14));assert.equal((await f.context.reconstruct(S,view.view_id)).context.text,view.text);
  assert.equal(f.store.artifacts.stats.maxInputChunk,65536);assert.ok(Buffer.byteLength(canonical(f.state.get('CONTEXT_VIEW',view.view_id)))<49152);
  return{raw_bytes:total,range_bytes:view.bytes,max_input_chunk:f.store.artifacts.stats.maxInputChunk,read_stats:f.context.readStats};
});

checked('M161-CONTEXT-BACKPRESSURE SIMULATED_SCHEDULING_BARRIER: shared read pool bounds concurrent readers and aborts queued reads',async t=>{
  const f=await fixture(t),source=await f.context.capture(S,'RAW',Buffer.alloc(3*65536,97)),range=f.context.source(S,source.event_id,{length:8});
  const original=f.store.artifacts.read.bind(f.store.artifacts);let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);let entered=0;
  f.store.artifacts.read=async function*(ref){if(ref.artifact_id===source.payload_ref.artifact_id){entered++;await gate;}yield*original(ref);};
  const peer=new ContextAssembly(f.state),first=[f.context.readRange(S,range),peer.readRange(S,range)];await immediate();assert.equal(entered,2);
  const controller=new AbortController(),cancelled=peer.readRange(S,range,{signal:controller.signal});const expectedCancel=assert.rejects(cancelled,{code:'CONTEXT_CANCELLED'});
  const queued=Array.from({length:7},()=>peer.readRange(S,range));assert.equal(f.context.readStats.queued,8);
  await assert.rejects(peer.readRange(S,range),{code:'CONTEXT_READ_BACKPRESSURE'});controller.abort();await expectedCancel;assert.equal(peer.readStats.queued,7);
  try{release();for(const result of await Promise.all([...first,...queued]))assert.equal(result.text,'a'.repeat(8));}
  finally{release();f.store.artifacts.read=original;}
  assert.deepEqual(f.context.readStats,{active:0,queued:0,peak:2,peakQueued:8});return{read_stats:f.context.readStats,actual_complete_scans:entered};
});

checked('M161-CONTEXT-DERIVED: missing/corrupt derived references never replace original raw history and indexes can be regenerated',async t=>{
  const f=await fixture(t),text='original history preserved',raw=await f.context.capture(S,'RAW',Buffer.from(text));
  const summary=await f.context.capture(S,'SUMMARY',Buffer.from('summary v1'),{source_refs:[raw]});
  const index=await f.context.capture(S,'DERIVED_INDEX',Buffer.from('index v1'),{source_refs:[raw]});
  const replacement=await f.context.capture(S,'DERIVED_INDEX',Buffer.from('index regenerated from raw: '+(await f.context.readRange(S,raw)).text),{source_refs:[raw]});
  const view=await f.context.assemble(S,[{source:raw,section:'HISTORY',required:true}],{maxBytes:1024});
  assert.equal(view.text,text);assert.notEqual(replacement.event_id,index.event_id);assert.equal((await f.context.readRange(S,raw)).text,text);
  await assert.rejects(f.context.assemble(S,[{source:{...summary,event_id:uid()},section:'WORK_STATE',required:false}],{maxBytes:1024}),{code:'CONTEXT_SOURCE_MISSING'});
  await assert.rejects(f.context.assemble(S,[{source:{...index,record_hash:'f'.repeat(64)},section:'WORK_STATE',required:false}],{maxBytes:1024}),{code:'CONTEXT_REFERENCE_HASH'});
  assert.equal((await f.context.reconstruct(S,view.view_id)).context.text,text);return{raw,summary,index,replacement,raw_context_records:f.store.query('context').length};
});

checked('M161-CONTEXT-CORRUPTION: damaged original history outside selected range rejects assembly and leaves prior exact input intact',async t=>{
  const f=await fixture(t),source=await f.context.capture(S,'RAW',Buffer.alloc(4*65536,97)),range=f.context.source(S,source.event_id,{length:8});
  const view=await f.context.assemble(S,[{source:range,section:'HISTORY',required:true}],{maxBytes:8}),path=join(f.store.root,'artifacts','objects',source.payload_ref.artifact_id+'.zst');
  const handle=await open(path,'r+');try{const byte=Buffer.alloc(1);await handle.read(byte,0,1,source.payload_ref.stored_bytes-1);byte[0]^=1;await handle.write(byte,0,1,source.payload_ref.stored_bytes-1);await handle.sync();}finally{await handle.close();}
  await assert.rejects(f.context.readRange(S,range),{code:'ARTIFACT_CORRUPT'});assert.equal(f.store.faulted,true);
  // Reconstruct verifies the independent original model-input object, not a fresh read of the now-damaged source bytes.
  const reconstructed=await f.context.reconstruct(S,view.view_id);assert.equal(reconstructed.context.text,'a'.repeat(8));
  return{damaged_source:source.event_id,source_sha256:source.payload_ref.sha256,retained_input_sha256:sha256(reconstructed.bytes),store_faulted:f.store.faulted};
});

checked('M161-CONTEXT-LEGACY SIMULATED_LEGACY_PROJECTION: old M1.6 views reconstruct without rewriting or upgrading raw records',async t=>{
  const f=await fixture(t),source=await f.context.capture(S,'RAW',Buffer.from('legacy context\r\n😀')),range=await f.context.readRange(S,source),viewId=uid();
  const entries:Omit<ContextEntry,'text'>[]=[{source,section:'HISTORY',required:true,range_sha256:range.range_sha256}];
  await f.state.change(S,'CONTEXT_ASSEMBLED',()=>f.state.insert('CONTEXT_VIEW',viewId,S,'ACKNOWLEDGED',{view_id:viewId,revision:0,project_id:S.project_id,task_id:S.task_id,agent_id:S.agent_id,
    runtime_instance_id:S.runtime_instance_id,bytes:source.length,sha256:source.payload_ref.sha256,entries,omitted:[]}),{},viewId);
  const before=f.store.query('context').map(record=>record.hash),restored=await f.context.reconstruct(S,viewId);assert.equal(restored.context.text,'legacy context\r\n😀');assert.equal(restored.context.assembly_version,undefined);
  assert.deepEqual(f.store.query('context').map(record=>record.hash),before);return{legacy_view:viewId,raw_hashes_unchanged:before};
});

checked('M161-CONTEXT-CEILING: full 256KiB control-byte input is exact and does not overflow metadata serialization',async t=>{
  const f=await fixture(t),bytes=Buffer.alloc(CONTEXT_LIMITS.maxBytes,0),source=await f.context.capture(S,'RAW',bytes);
  const view=await f.context.assemble(S,[{source,section:'HISTORY',required:true}],{maxBytes:CONTEXT_LIMITS.maxBytes});assert.equal(view.bytes,bytes.length);assert.deepEqual(assertContextView(f.state,S,view),view);
  const {models}=await gateway(f,[{reply:{kind:'FINAL',text:'SIMULATED exact input'}}]);const result=await models.bind(S).complete({request_id:'control-bytes',context:view,max_output_tokens:1024});
  assert.equal(result.outcome,'SUCCEEDED');assert.deepEqual(Buffer.from((await f.context.reconstruct(S,view.view_id)).bytes),bytes);
  return{input_bytes:bytes.length,input_sha256:sha256(bytes),model_outcome:result.outcome,provider:'SIMULATED'};
});

checked('M161-CONTEXT-REQUEST-FAILURE SIMULATED_PROVIDER: known-not-sent and unknown requests preserve exact acknowledged input across reopen',async t=>{
  const f=await fixture(t),source=await f.context.capture(S,'RAW',Buffer.from('bound rules and request\0😀')),
    view=await f.context.assemble(S,[{source,section:'PROJECT_RULES',required:true}],{maxBytes:1024,bindings:taskBinding});
  const {models,metering}=await gateway(f,[{failure:'KNOWN_NOT_SENT'},{failure:'UNKNOWN'}]);
  const known=await models.bind(S).complete({request_id:'known-not-sent',context:view,max_output_tokens:128}),unknown=await models.bind(S).complete({request_id:'sent-unknown',context:view,max_output_tokens:128});
  assert.equal(known.outcome,'FAILED');assert.equal(unknown.outcome,'INDETERMINATE');assert.equal(metering.retained,1);
  for(const id of ['known-not-sent','sent-unknown']){const request=f.state.get<{context_input_ref:{sha256:string};context_assembly_version:string;context_provenance_sha256:string}>('MODEL_REQUEST',id)!;
    assert.equal(request.context_input_ref.sha256,view.sha256);assert.equal(request.context_assembly_version,CONTEXT_ASSEMBLY_VERSION);assert.equal(request.context_provenance_sha256,view.provenance_sha256);}
  await f.store.close();const reopened=await KernelStore.open(f.root);try{const again=setup(reopened),restored=await again.context.reconstruct(S,view.view_id);assert.equal(restored.context.text,view.text);assert.deepEqual(restored.context.bindings,taskBinding);
    assert.equal(again.state.get<{state:string}>('MODEL_REQUEST','sent-unknown')!.state,'INDETERMINATE');assert.equal(again.state.get<{sequence:number}>('MODEL_MODEL','main')!.sequence,2);
  }finally{await reopened.close();}return{known:known.outcome,unknown:unknown.outcome,view_id:view.view_id,input_ref:view.input_ref,metering,provider:'SIMULATED',restart:'REAL_SQLITE_CLOSE_REOPEN; NO_OS_RESTART_CLAIM'};
});

checked('M161-CONTEXT-REQUIRED: important rules never silently truncate and stale/missing references fail closed',async t=>{
  const f=await fixture(t),source=await f.context.capture(S,'RAW',Buffer.from('required rules'));
  await assert.rejects(f.context.assemble(S,[{source,section:'PROJECT_RULES',required:false}],{maxBytes:1}),{code:'CONTEXT_REQUIRED_OVERFLOW'});
  const optional=await f.context.capture(S,'RAW',Buffer.from('long optional history'));const view=await f.context.assemble(S,[{source,section:'PROJECT_RULES',required:true},{source:optional,section:'HISTORY',required:false}],{maxBytes:source.length});
  assert.deepEqual(view.omitted,[optional]);assert.equal(view.entries[0].required,true);assert.equal((await f.context.reconstruct(S,view.view_id)).context.text,'required rules');
  await assert.rejects(f.context.reconstruct({...S,task_id:'foreign'},view.view_id),{code:'CONTEXT_VIEW_SCOPE'});
  return{truncated:true,omitted:view.omitted.length,required_rule_sha256:source.payload_ref.sha256};
});

checked('M161-CONTEXT-INDEX-CORRUPTION: damaged derived index is detected while original raw/input objects remain recoverable',async t=>{
  const f=await fixture(t),raw=await f.context.capture(S,'RAW',Buffer.from('original history independent of index')),
    index=await f.context.capture(S,'DERIVED_INDEX',Buffer.from('derived index fixture'),{source_refs:[raw]}),
    view=await f.context.assemble(S,[{source:raw,section:'HISTORY',required:true}],{maxBytes:1024});
  const path=join(f.store.root,'artifacts','objects',index.payload_ref.artifact_id+'.zst'),handle=await open(path,'r+');
  try{const byte=Buffer.alloc(1);await handle.read(byte,0,1,index.payload_ref.stored_bytes-1);byte[0]^=1;await handle.write(byte,0,1,index.payload_ref.stored_bytes-1);await handle.sync();}finally{await handle.close();}
  assert.equal((await f.context.reconstruct(S,view.view_id)).context.text,view.text);
  await assert.rejects(f.context.readRange(S,index),{code:'ARTIFACT_CORRUPT'});assert.equal(f.store.faulted,true);
  assert.equal((await f.context.readRange(S,raw)).text,view.text);assert.equal((await f.context.reconstruct(S,view.view_id)).context.text,view.text);
  return{damaged_index:index.event_id,raw_event:raw.event_id,raw_sha256:raw.payload_ref.sha256,input_sha256:view.sha256,storage_fault_requires_explicit_owner_reconciliation:true};
});

checked('M161-CONTEXT-CONCURRENT-WRITES SIMULATED_PRODUCER_BARRIER: four capture/assembly callers wait on two real Artifact writers',async t=>{
  const f=await fixture(t),contexts=Array.from({length:4},()=>new ContextAssembly(f.state));let release!:()=>void,reached!:()=>void,entered=0;
  const gate=new Promise<void>(resolve=>release=resolve),ready=new Promise<void>(resolve=>reached=resolve);
  async function* chunks(index:number){entered++;if(entered===2)reached();await gate;for(let n=0;n<4;n++)yield Buffer.alloc(65536,65+index);}
  const pending=Promise.all(contexts.map((context,index)=>context.capture(S,'RAW',chunks(index),{maxBytes:4*65536})));void pending.catch(()=>{});
  let sources:ContextSource[]=[];
  try{await ready;assert.equal(entered,2);assert.equal(f.store.artifacts.stats.activePuts,2);release();sources=await pending;}
  finally{release();}
  const views=await Promise.all(contexts.map((context,index)=>context.assemble(S,[{source:context.source(S,sources[index].event_id,{length:32}),section:'HISTORY',required:true}],{maxBytes:32})));
  for(const [index,view] of views.entries())assert.equal(view.text,String.fromCharCode(65+index).repeat(32));
  assert.equal(f.store.artifacts.stats.maxActivePuts,2);assert.equal(f.store.artifacts.stats.activePuts,0);assert.equal(f.state.count('CONTEXT_VIEW'),4);
  return{callers:4,captures:sources.length,views:views.length,max_active_writers:f.store.artifacts.stats.maxActivePuts,read_stats:f.context.readStats,producer_barrier:'SIMULATED',sqlite_zstd_writes:'REAL_LOCAL'};
});

checked('M161-CONTEXT-COMPOSED-POOLS SIMULATED_SCAN_BARRIER: two assemblies release read slots before waiting on producers that read context',async t=>{
  const f=await fixture(t),source=await f.context.capture(S,'RAW',Buffer.from('composed read/write dependency')),
    contexts=Array.from({length:4},()=>new ContextAssembly(f.state)),controller=new AbortController(),original=f.store.artifacts.read.bind(f.store.artifacts);
  let releaseScans!:()=>void,scansReached!:()=>void,producersReached!:()=>void,scanCount=0,producerCount=0,timedOut=false;
  const scanGate=new Promise<void>(resolve=>releaseScans=resolve),scanReady=new Promise<void>(resolve=>scansReached=resolve),producerReady=new Promise<void>(resolve=>producersReached=resolve);
  const pending:Promise<unknown>[]=[];let timeout:ReturnType<typeof setTimeout>|undefined,atDeadline:unknown=null;
  async function bounded<T>(promise:Promise<T>,label:string):Promise<T>{let timer:ReturnType<typeof setTimeout>|undefined;
    try{return await Promise.race([promise,new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>reject(new Error('TEST_BOUNDED_'+label)),8000);})]);}
    finally{if(timer)clearTimeout(timer);}}
  f.store.artifacts.read=async function*(ref){
    if(ref.artifact_id===source.payload_ref.artifact_id&&scanCount<2){scanCount++;if(scanCount===2)scansReached();await scanGate;}
    yield*original(ref);
  };
  async function* producer(index:number){
    const reading=contexts[index+2].readRange(S,source,{signal:controller.signal});producerCount++;if(producerCount===2)producersReached();
    const result=await reading;yield Buffer.from(result.text+':producer-'+index);
  }
  try{
    for(let index=0;index<2;index++){
      const assembling=contexts[index].assemble(S,[{source,section:'HISTORY',required:true}],{maxBytes:256,signal:controller.signal});
      void assembling.catch(()=>{});pending.push(assembling);
    }
    await bounded(scanReady,'SCANS_READY');assert.equal(f.context.readStats.active,2);
    for(let index=0;index<2;index++){const capturing=contexts[index+2].capture(S,'RAW',producer(index),{maxBytes:256});void capturing.catch(()=>{});pending.push(capturing);}
    await bounded(producerReady,'PRODUCERS_READY');assert.equal(f.store.artifacts.stats.activePuts,2);assert.equal(f.context.readStats.queued,2);
    timeout=setTimeout(()=>{
      timedOut=true;atDeadline={read:f.context.readStats,active_writers:f.store.artifacts.stats.activePuts,queued_writers:f.store.artifacts.stats.queuedPuts};
      controller.abort(new Error('SIMULATED_COMPOSITION_DEADLINE'));
    },3000);
    releaseScans();const settled=await bounded(Promise.allSettled(pending),'COMPOSITION_SETTLED');
    assert.equal(timedOut,false,'combined pool cycle required cancellation: '+canonical(atDeadline));
    assert.equal(settled.every(result=>result.status==='fulfilled'),true);
    for(const result of settled.slice(0,2)){assert.equal(result.status,'fulfilled');if(result.status==='fulfilled')assert.equal((result.value as {text:string}).text,'composed read/write dependency');}
    assert.equal(f.context.readStats.active,0);assert.equal(f.context.readStats.queued,0);assert.equal(f.context.readStats.peak,2);
    assert.equal(f.store.artifacts.stats.activePuts,0);assert.equal(f.store.artifacts.stats.maxActivePuts,2);assert.equal(f.store.artifacts.stats.queuedPuts,0);
    assert.equal(f.state.count('CONTEXT_VIEW'),2);assert.equal((await f.store.verify()).pending,0);
    return{assemblies:2,dependent_capture_producers:2,completion:'ALL_FULFILLED_WITHOUT_CANCELLATION',read_stats:f.context.readStats,
      max_active_writers:f.store.artifacts.stats.maxActivePuts,at_deadline:atDeadline,scan_barrier:'SIMULATED',sqlite_zstd_streams:'REAL_LOCAL'};
  }finally{
    if(timeout)clearTimeout(timeout);releaseScans();controller.abort();f.store.artifacts.read=original;
    await bounded(Promise.allSettled(pending),'COMPOSITION_CLEANUP');
  }
});
