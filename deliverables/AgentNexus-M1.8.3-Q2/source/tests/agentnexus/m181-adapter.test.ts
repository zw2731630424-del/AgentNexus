import test from 'node:test';
import assert from 'node:assert/strict';
import { NexusError } from '../../src/agentnexus/types.ts';
import { CapabilityRegistry } from '../../src/agentnexus/model-runtime/protocol.ts';
import type { DataGuard, ProviderRequest, ProviderUsage, TransportResponse } from '../../src/agentnexus/model-runtime/protocol.ts';
import { DeepSeekAdapter, ProviderFault, ProviderParseFault, DEEPSEEK_MODEL_IDS } from '../../src/agentnexus/model-runtime/adapters.ts';
import { createDeepSeekFlashSpec, deepSeekCost, DEEPSEEK_FLASH_EVIDENCE } from '../../src/agentnexus/model-runtime/deepseek.ts';
import { STREAM_LIMITS } from '../../src/agentnexus/model-runtime/streaming.ts';

// These are synthetic wire events in the documented format. No network or credentials are used.
const guard:DataGuard={assertSafe:()=>{}};
const reported={prompt_tokens:100,completion_tokens:20,total_tokens:120,prompt_cache_hit_tokens:25,prompt_cache_miss_tokens:75,
  prompt_tokens_details:{cached_tokens:25},completion_tokens_details:{reasoning_tokens:8}};
const normalized:ProviderUsage={input_tokens:100,output_tokens:20,reasoning_tokens:8,cache_hit_tokens:25,cache_miss_tokens:75};
function request(extra:Partial<ProviderRequest>={}):ProviderRequest {
  return {request_id:'offline-deepseek',model:createDeepSeekFlashSpec('2026-11-08T00:00:00Z','2026-12-08T00:00:00Z'),
    prompt:'离线协议样本',max_output_tokens:256,stream:true,json:true,reasoning:'disabled',tools:[],...extra};
}
function event(delta:Record<string,unknown>,finish_reason:string|null=null,extra:Record<string,unknown>={}) {
  return {id:'offline-response',object:'chat.completion.chunk',created:1794096000,model:'deepseek-flash',system_fingerprint:'fp_offline_fixture',
    choices:[{index:0,delta,finish_reason}],usage:null,...extra};
}
const frame=(value:unknown)=>'data: '+JSON.stringify(value)+'\r\n\r\n';
function body(text:string,size=7):AsyncIterable<Uint8Array> {
  const bytes=Buffer.from(text);return (async function*(){for(let offset=0;offset<bytes.length;offset+=size)yield bytes.subarray(offset,offset+size);})();
}
function wire(events:unknown[],options:{done?:boolean;size?:number;status?:number}={}):TransportResponse {
  return {status:options.status??200,headers:{'content-type':'text/event-stream; charset=utf-8','x-agentnexus-local-request-id':'offline-deepseek'},
    body:body(': keepalive\r\n\r\n'+events.map(frame).join('')+(options.done===false?'':'data: [DONE]\r\n\r\n'),options.size)};
}
function parse(events:unknown[],options:{done?:boolean;size?:number;guard?:DataGuard;request?:ProviderRequest}={}) {
  const adapter=new DeepSeekAdapter();adapter.build(options.request??request());
  return adapter.parse(wire(events,options),new AbortController().signal,options.guard??guard);
}
async function fault(pending:Promise<unknown>,code:string,meter:ProviderUsage|null=null):Promise<ProviderParseFault> {
  try{await pending;}catch(error){assert.ok(error instanceof ProviderParseFault);assert.equal(error.code,code);assert.equal(error.message,code);assert.deepEqual(error.observed_usage,meter);return error;}
  return assert.fail('Expected a bounded provider parse fault');
}
const final=(content='{"kind":"FINAL","text":"离线完成"}',usage:unknown=reported)=>event({content},'stop',{usage});

test('M181 DEEPSEEK documented request uses the exact endpoint, Flash ID and provider token fields',()=>{
  const adapter=new DeepSeekAdapter(),input=request(),built=adapter.build(input),payload=JSON.parse(built.body);
  assert.equal(built.method,'POST');assert.equal(built.url,'https://api.deepseek.com/chat/completions');
  assert.equal(payload.model,'deepseek-flash');assert.equal(payload.max_tokens,256);assert.equal(payload.max_completion_tokens,undefined);
  assert.deepEqual(payload.thinking,{type:'disabled'});assert.deepEqual(payload.stream_options,{include_usage:true});
  assert.deepEqual(payload.response_format,{type:'json_object'});assert.equal(payload.stream,true);
  assert.equal(payload.messages[1].content,input.prompt);assert.equal(Object.hasOwn(built.headers,'authorization'),false);
  assert.equal(adapter.retry_policy,'PROVEN_NOT_SENT_ONLY');adapter.abandon(input.request_id);
  const enabled=new DeepSeekAdapter();assert.deepEqual(JSON.parse(enabled.build(request({reasoning:'enabled'})).body).thinking,{type:'enabled'});
});

test('M181 DEEPSEEK REAL models accept current exact IDs and reject aliases, snapshots and case changes',()=>{
  assert.deepEqual(DEEPSEEK_MODEL_IDS,['deepseek-flash','deepseek-v4-pro']);
  for(const model_id of DEEPSEEK_MODEL_IDS){const adapter=new DeepSeekAdapter();assert.equal(JSON.parse(adapter.build(request({model:{...request().model,model_id}})).body).model,model_id);}
  for(const model_id of ['deepseek-chat','deepseek-reasoner','DeepSeek-Flash','DeepSeek-V4.1-Flash-1017','deepseek-flash-extra']){
    assert.throws(()=>new DeepSeekAdapter().build(request({model:{...request().model,model_id}})),/MODEL18_DEEPSEEK_MODEL_ID/);
  }
});

test('M181 DEEPSEEK official terminal choice carries usage and fragmented Chinese retains response identity',async()=>{
  const result=await parse([event({role:'assistant',content:''}),event({reasoning_content:'离线私有推理样本'}),
    event({content:'{"kind":"FINAL","text":"你'}),event({content:'好，世界"}'}),event({},'stop',{usage:reported})],{size:1});
  assert.deepEqual(result.reply,{kind:'FINAL',text:'你好，世界'});assert.deepEqual(result.usage,normalized);
  assert.equal(result.response_model,'deepseek-flash');assert.equal(result.system_fingerprint,'fp_offline_fixture');
  assert.equal(result.provider_request_id,'offline-response');assert.equal(result.finish_reason,'stop');
  assert.equal(JSON.stringify(result).includes('私有推理'),false);
  assert.notEqual(result.response_model,DEEPSEEK_FLASH_EVIDENCE.served_model_label);
});

test('M181 DEEPSEEK cache aliases and a single known cache count determine a conserved prompt split',async()=>{
  for(const usage of [
    {prompt_tokens:100,completion_tokens:20,prompt_tokens_details:{cached_tokens:25}},
    {prompt_tokens:100,completion_tokens:20,prompt_cache_hit_tokens:25},
    {prompt_tokens:100,completion_tokens:20,prompt_cache_miss_tokens:75},
  ]){
    assert.deepEqual((await parse([final(undefined,usage)])).usage,{input_tokens:100,output_tokens:20,reasoning_tokens:null,cache_hit_tokens:25,cache_miss_tokens:75});
  }
  assert.deepEqual((await parse([final(undefined,{prompt_tokens:0,completion_tokens:0,total_tokens:0,prompt_cache_hit_tokens:0,prompt_cache_miss_tokens:0})])).usage,
    {input_tokens:0,output_tokens:0,reasoning_tokens:null,cache_hit_tokens:0,cache_miss_tokens:0});
});

test('M181 DEEPSEEK invalid cache, total and reasoning usage never become observed billing evidence',async()=>{
  const cases:[unknown,string][]=[
    [{...reported,prompt_cache_miss_tokens:74},'MODEL18_USAGE_CACHE'],
    [{...reported,prompt_tokens_details:{cached_tokens:24}},'MODEL18_USAGE_CACHE_ALIAS'],
    [{...reported,prompt_cache_hit_tokens:101},'MODEL18_USAGE_CACHE'],
    [{...reported,prompt_cache_hit_tokens:-1},'MODEL18_INTEGER'],
    [{...reported,prompt_cache_miss_tokens:75.5},'MODEL18_INTEGER'],
    [{...reported,prompt_cache_hit_tokens:null},'MODEL18_INTEGER'],
    [{...reported,total_tokens:121},'MODEL18_USAGE_TOTAL'],
    [{prompt_tokens:Number.MAX_SAFE_INTEGER,completion_tokens:1,total_tokens:Number.MAX_SAFE_INTEGER+1},'MODEL18_INTEGER'],
    [{...reported,completion_tokens_details:{reasoning_tokens:21}},'MODEL18_USAGE_REASONING'],
    [[], 'MODEL18_USAGE_SCHEMA'],
  ];
  for(const [usage,code] of cases)await fault(parse([final(undefined,usage)]),code);
});

test('M181 DEEPSEEK SIMULATED compatibility keeps legacy usage-only chunks and absent cache fields',async()=>{
  const base=request().model,input=request({model:{...base,model_id:'synthetic-old',price:{...base.price,source:'SYNTHETIC_FIXTURE',assurance:'SIMULATED'}}});
  const result=await parse([{id:'fixture',choices:[{index:0,delta:{content:'{"kind":"FINAL","text":"fixture"}'},finish_reason:'stop'}]},
    {id:'fixture',choices:[],usage:{prompt_tokens:5,completion_tokens:9,completion_tokens_details:{reasoning_tokens:7}}}],{request:input});
  assert.deepEqual(result.usage,{input_tokens:5,output_tokens:9,reasoning_tokens:7});
  assert.equal(Object.hasOwn(result,'response_model'),false);assert.equal(Object.hasOwn(result,'system_fingerprint'),false);
});

test('M181 DEEPSEEK REAL usage-only and early-usage chunks fail the documented terminal format',async()=>{
  await fault(parse([event({content:'{"kind":"FINAL"}'},'stop'),event({},null,{choices:[],usage:reported})]),'MODEL18_STREAM_SCHEMA',normalized);
  await fault(parse([event({content:''},null,{usage:reported})]),'MODEL18_USAGE_POSITION',normalized);
  await fault(parse([event({},'stop',{choices:[]})]),'MODEL18_STREAM_SCHEMA');
  await fault(parse([event({},'stop',{choices:[{index:0,delta:{},finish_reason:'stop'},{index:1,delta:{},finish_reason:'stop'}]})]),'MODEL18_MULTIPLE_CHOICES');
});

test('M181 DEEPSEEK response model and fingerprint are bounded and stable, including explicit null',async()=>{
  assert.equal((await parse([{...final(),system_fingerprint:null}])).system_fingerprint,null);
  const absent={...final()};delete (absent as {system_fingerprint?:unknown}).system_fingerprint;
  assert.equal(Object.hasOwn(await parse([absent]),'system_fingerprint'),false);
  await fault(parse([event({content:''}),event({},null,{model:'deepseek-v4-pro'})]),'MODEL18_RESPONSE_MODEL');
  await fault(parse([event({},null,{model:undefined})]),'MODEL18_RESPONSE_MODEL');
  await fault(parse([event({},null,{system_fingerprint:'x'.repeat(257)})]),'MODEL18_RESPONSE_FINGERPRINT');
  await fault(parse([event({},null,{system_fingerprint:7})]),'MODEL18_RESPONSE_FINGERPRINT');
  await fault(parse([event({content:''}),event({},null,{system_fingerprint:'fp_changed'})]),'MODEL18_STREAM_FINGERPRINT_CHANGED');
});

test('M181 DEEPSEEK native tools join fragmented JSON and Chinese without executing a tool',async()=>{
  const input=request({tools:[{name:'native.echo',description:'offline proposal',parameters:{type:'object'}}]});
  const result=await parse([
    event({tool_calls:[{index:0,id:'offline-call',type:'function',function:{name:'native.',arguments:'{"城市":"北'}}]}),
    event({tool_calls:[{index:0,function:{name:'echo',arguments:'京","value":'}}]}),
    event({tool_calls:[{index:0,function:{arguments:'7}'}}]},'tool_calls',{usage:reported}),
  ],{request:input,size:1});
  assert.deepEqual(result.reply,{kind:'TOOL_CALL',tool_name:'native.echo',tool_version:'1',arguments:{城市:'北京',value:7}});
  assert.deepEqual(result.usage,normalized);
  await fault(parse([event({tool_calls:[{index:0,id:'offline-call',type:'function',function:{name:'native.forbidden',arguments:'{}'}}]},'tool_calls',{usage:reported})],{request:input}),
    'MODEL18_TOOL_CALL_SCHEMA',normalized);
});

test('M181 DEEPSEEK malformed tool JSON retains validated usage and never yields a tool proposal',async()=>{
  const input=request({tools:[{name:'native.echo',description:'offline proposal',parameters:{type:'object'}}]});
  await fault(parse([event({tool_calls:[{index:0,id:'offline-call',type:'function',function:{name:'native.echo',arguments:'{"value":'}}]},'tool_calls',{usage:reported})],{request:input}),
    'MODEL18_TOOL_CALL_INCOMPLETE',normalized);
});

test('M181 DEEPSEEK all documented unsuccessful finishes remain failures with observed usage',async()=>{
  for(const finish of ['length','aborted','insufficient_system_resource','content_filter']){
    await fault(parse([event({content:'{"kind":"FINAL","text":"partial"}'},finish,{usage:reported})]),'MODEL18_RESPONSE_INCOMPLETE',normalized);
  }
});

test('M181 DEEPSEEK invalid reply JSON, invalid contract and truncated completion preserve validated usage',async()=>{
  await fault(parse([final('{"kind":')]),'MODEL18_RESPONSE_JSON',normalized);
  await fault(parse([final('{"kind":"FINAL","approval_id":"self-approved"}')]),'MODEL18_REPLY_SCHEMA',normalized);
  await fault(parse([final()],{done:false}),'MODEL18_STREAM_INCOMPLETE',normalized);
});

test('M181 DEEPSEEK duplicate usage and data after finish never settle twice',async()=>{
  await fault(parse([final(),event({},'stop',{usage:reported})]),'MODEL18_USAGE_DUPLICATE',normalized);
  await fault(parse([final(),event({})]),'MODEL18_STREAM_AFTER_FINISH',normalized);
});

test('M181 DEEPSEEK guard failures keep static codes and counts without reflecting private error text',async()=>{
  const privateText='synthetic-private-error-only';
  for(const raised of [new Error(privateText),new NexusError('MODEL18_CREDENTIAL_LEAK',privateText),new NexusError(privateText,privateText)]){
    const guarded:DataGuard={assertSafe:(_value,channel)=>{if(channel==='MODEL_RESPONSE')throw raised;}};
    const code=raised instanceof NexusError&&raised.code==='MODEL18_CREDENTIAL_LEAK'?'MODEL18_CREDENTIAL_LEAK':'MODEL18_PARSE_FAILURE';
    const error=await fault(parse([final()],{guard:guarded}),code,normalized);
    assert.equal(JSON.stringify(error).includes(privateText),false);assert.equal(error.stack?.includes(privateText),false);
    assert.ok(Object.isFrozen(error.observed_usage));
  }
});

test('M181 DEEPSEEK bounded SSE errors preserve only prior validated usage and release the parser binding',async()=>{
  const adapter=new DeepSeekAdapter();adapter.build(request());
  const response=wire([]);response.body=(async function*(){yield Buffer.from(frame(final()));yield Buffer.alloc(STREAM_LIMITS.chunk_bytes+1);})();
  await fault(adapter.parse(response,new AbortController().signal,guard),'MODEL18_STREAM_CHUNK_LIMIT',normalized);
  assert.doesNotThrow(()=>adapter.build(request()));
});

test('M181 DEEPSEEK missing provider usage remains explicitly unknown',async()=>{
  const result=await parse([final(undefined,null)]);assert.equal(result.usage,null);
  await fault(parse([final('{broken',null)]),'MODEL18_RESPONSE_JSON');
});

test('M181 DEEPSEEK 402 is REQUEST, other HTTP faults keep their category and never read a response body',async()=>{
  for(const [status,category] of [[402,'REQUEST'],[401,'AUTH'],[403,'AUTH'],[429,'RATE_LIMIT'],[400,'CAPABILITY'],[503,'PROVIDER']] as const){
    const adapter=new DeepSeekAdapter();adapter.build(request());let reads=0;const response=wire([],{status});
    response.body=(async function*(){reads++;yield Buffer.from('untrusted failure body');})();
    await assert.rejects(adapter.parse(response,new AbortController().signal,guard),error=>error instanceof ProviderFault&&error.category===category);
    assert.equal(reads,0);assert.equal(adapter.retry_policy,'PROVEN_NOT_SENT_ONLY');assert.doesNotThrow(()=>adapter.build(request()));
  }
});

test('M181 DEEPSEEK registry distinguishes documented provider limits from local support and price reservations',()=>{
  const spec=createDeepSeekFlashSpec('2026-11-08T00:00:00Z','2026-12-08T00:00:00Z'),registry=new CapabilityRegistry();registry.register(spec);
  assert.equal(registry.get('deepseek:deepseek-flash').model_id,'deepseek-flash');
  assert.equal(spec.context_tokens,1048576);assert.equal(spec.output_tokens,65536);
  assert.equal(DEEPSEEK_FLASH_EVIDENCE.output_tokens,393216);assert.equal(DEEPSEEK_FLASH_EVIDENCE.model_identity_assurance,'DOCUMENTED_ALIAS_ONLY');
  assert.equal(spec.price.input_micros_per_million,300000);assert.equal(spec.price.output_micros_per_million,1200000);
  assert.equal(spec.price.source,'https://api-docs.deepseek.com/quick_start/pricing/');assert.equal(spec.price.assurance,'REAL');
  assert.throws(()=>createDeepSeekFlashSpec('invalid','2026-12-08T00:00:00Z'),/MODEL181_DEEPSEEK_PRICE_DATE/);
  assert.throws(()=>createDeepSeekFlashSpec('2026-12-08T00:00:00Z','2026-11-08T00:00:00Z'),/MODEL181_DEEPSEEK_PRICE_DATE/);
});

test('M181 DEEPSEEK cache-aware peak and off-peak cost use one integer ceiling and count reasoning once',()=>{
  assert.deepEqual(deepSeekCost(normalized,'PEAK'),{cost_micros:47,source:'PROVIDER_USAGE_RATE_ESTIMATE',cache_estimated:false});
  assert.deepEqual(deepSeekCost(normalized,'OFF_PEAK'),{cost_micros:24,source:'PROVIDER_USAGE_RATE_ESTIMATE',cache_estimated:false});
  assert.deepEqual(deepSeekCost({...normalized,reasoning_tokens:0},'PEAK'),deepSeekCost(normalized,'PEAK'));
  assert.equal(deepSeekCost({input_tokens:1,output_tokens:0,reasoning_tokens:null,cache_hit_tokens:1,cache_miss_tokens:0},'PEAK').cost_micros,1);
  assert.equal(deepSeekCost({input_tokens:0,output_tokens:0,reasoning_tokens:null,cache_hit_tokens:0,cache_miss_tokens:0},'PEAK').cost_micros,0);
});

test('M181 DEEPSEEK unavailable cache counts conservatively estimate all prompt tokens as misses',()=>{
  for(const extra of [{},{cache_hit_tokens:null,cache_miss_tokens:null},{cache_hit_tokens:25},{cache_hit_tokens:25,cache_miss_tokens:null}]){
    assert.deepEqual(deepSeekCost({input_tokens:100,output_tokens:20,reasoning_tokens:8,...extra},'PEAK'),
      {cost_micros:54,source:'PROVIDER_USAGE_RATE_ESTIMATE',cache_estimated:true});
  }
});

test('M181 DEEPSEEK cost rejects invalid evidence and overflow while retaining BigInt precision',()=>{
  const large=Number.MAX_SAFE_INTEGER,expected=Number((BigInt(large)*300000n+999999n)/1000000n);
  assert.equal(deepSeekCost({input_tokens:large,output_tokens:0,reasoning_tokens:null},'PEAK').cost_micros,expected);
  assert.throws(()=>deepSeekCost({...normalized,cache_miss_tokens:74},'PEAK'),/MODEL18_USAGE_CACHE/);
  assert.throws(()=>deepSeekCost({...normalized,cache_hit_tokens:-1},'PEAK'),/MODEL18_INTEGER/);
  assert.throws(()=>deepSeekCost({...normalized,reasoning_tokens:21},'PEAK'),/MODEL18_USAGE_REASONING/);
  assert.throws(()=>deepSeekCost({input_tokens:large,output_tokens:large,reasoning_tokens:null},'PEAK'),/MODEL18_COST_OVERFLOW/);
  assert.throws(()=>deepSeekCost(normalized,'INVALID' as 'PEAK'),/MODEL181_DEEPSEEK_PERIOD/);
});
