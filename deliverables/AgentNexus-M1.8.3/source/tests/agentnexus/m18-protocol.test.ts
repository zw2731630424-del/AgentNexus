import test from 'node:test';
import assert from 'node:assert/strict';
import { CapabilityRegistry,ModelRouter,priceCost } from '../../src/agentnexus/model-runtime/protocol.ts';
import type { ProviderRequest } from '../../src/agentnexus/model-runtime/protocol.ts';
import { OpenAIAdapter,DeepSeekAdapter,GLMAdapter } from '../../src/agentnexus/model-runtime/adapters.ts';
import { wireFixture } from '../../src/agentnexus/model-runtime/transport.ts';
import { sseEvents,STREAM_LIMITS } from '../../src/agentnexus/model-runtime/streaming.ts';
import { model } from './m18-fixture.ts';
const guard={assertSafe:()=>{}};
const signal=()=>new AbortController().signal;
function request(provider_id:string,extra:Partial<ProviderRequest>={}):ProviderRequest{return {request_id:'req',model:model('synthetic',provider_id),prompt:'untrusted original task',max_output_tokens:100,stream:true,json:true,reasoning:'enabled',tools:[],...extra};}
function responseBody(text:string,chunk=7){const bytes=Buffer.from(text);return (async function*(){for(let i=0;i<bytes.length;i+=chunk)yield bytes.subarray(i,i+chunk);})();}
function bound(response:ReturnType<typeof wireFixture>){return {...response,headers:{...response.headers,'x-agentnexus-local-request-id':'req'}};}

test('M18 PROTOCOL three provider builders explicitly distinguish token, storage, reasoning and usage fields',()=>{
  const open=new OpenAIAdapter(),deep=new DeepSeekAdapter(),glm=new GLMAdapter();
  const a=JSON.parse(open.build(request('openai')).body),b=JSON.parse(deep.build(request('deepseek')).body),c=JSON.parse(glm.build(request('glm')).body);
  assert.equal(a.max_completion_tokens,100);assert.equal(a.max_tokens,undefined);assert.equal(a.store,false);assert.equal(a.reasoning_effort,'medium');assert.deepEqual(a.stream_options,{include_usage:true});
  assert.equal(b.max_tokens,100);assert.deepEqual(b.thinking,{type:'enabled'});assert.deepEqual(b.stream_options,{include_usage:true});
  assert.equal(c.max_tokens,100);assert.deepEqual(c.thinking,{type:'enabled'});assert.equal(c.stream_options,undefined);
  assert.notEqual(open.endpoint,deep.endpoint);assert.notEqual(glm.endpoint,deep.endpoint);
});
test('M18 STREAM fragmented UTF-8, CRLF, comments and multiline SSE retain pull backpressure',async()=>{
  let pulled=0;const bytes=Buffer.from(': comment\r\ndata: 你好\r\ndata: 世界\r\n\r\ndata: two\n\n');
  const source=(async function*(){for(const byte of bytes){pulled++;yield Buffer.from([byte]);}})();const reader=sseEvents(source,signal());
  assert.equal(pulled,0);assert.equal((await reader.next()).value,'你好\n世界');assert.ok(pulled<bytes.length);assert.equal((await reader.next()).value,'two');assert.equal((await reader.next()).done,true);
});
test('M18 STREAM overlong event/chunk, malformed UTF-8 and trailing partial fail without a completed response',async()=>{
  for(const source of [responseBody('data: '+ 'x'.repeat(STREAM_LIMITS.event_bytes+1)+'\n\n'),responseBody('data: incomplete'),(async function*(){yield Buffer.from([0xff]);})(),(async function*(){yield Buffer.alloc(STREAM_LIMITS.chunk_bytes+1);})()]){
    await assert.rejects(async()=>{for await(const _ of sseEvents(source,signal()))void _;});
  }
});
test('M18 STREAM cancellation interrupts a pending next without waiting for an uncontrolled iterator',async()=>{
  const controller=new AbortController();let returned=false;const source={ [Symbol.asyncIterator](){return {next:()=>new Promise<IteratorResult<Uint8Array>>(()=>{}),return:async()=>{returned=true;return {done:true as const,value:undefined};}};}};
  const next=sseEvents(source,controller.signal).next();controller.abort();await assert.rejects(next,/MODEL18_STREAM_CANCELLED/);await Promise.resolve();assert.equal(returned,true);
});
test('M18 ADAPTER every provider decodes bounded fragmented replies and reported reasoning usage',async()=>{
  for(const adapter of [new OpenAIAdapter(),new DeepSeekAdapter(),new GLMAdapter()]){
    adapter.build(request(adapter.provider_id));const result=await adapter.parse(bound(wireFixture(JSON.stringify({kind:'FINAL',text:'你好'}),{chunk_bytes:1,usage:{prompt_tokens:5,completion_tokens:9,completion_tokens_details:{reasoning_tokens:7}}})),signal(),guard);
    assert.deepEqual(result.reply,{kind:'FINAL',text:'你好'});assert.deepEqual(result.usage,{input_tokens:5,output_tokens:9,reasoning_tokens:7});
  }
});
test('M18 ADAPTER partial streams, length finish and missing tool termination never become usable tool calls',async()=>{
  for(const options of [{done:false},{finish:'length'},{finish:'tool_calls'}]){
    const adapter=new OpenAIAdapter();adapter.build(request('openai'));await assert.rejects(adapter.parse(bound(wireFixture(JSON.stringify({kind:'TOOL_CALL',tool_name:'native.echo',arguments:{}}),options)),signal(),guard));
  }
});
test('M18 ADAPTER complete native tool fragments are joined but never executed or given approval authority',async()=>{
  const adapter=new OpenAIAdapter();adapter.build(request('openai',{tools:[{name:'native.echo',description:'echo',parameters:{type:'object'}}]}));
  const events=[{id:'r',choices:[{index:0,delta:{tool_calls:[{index:0,id:'tool1',type:'function',function:{name:'native.echo',arguments:'{"val'}}]},finish_reason:null}]},
    {id:'r',choices:[{index:0,delta:{tool_calls:[{index:0,function:{arguments:'ue":7}'}}]},finish_reason:'tool_calls'}]},
    {id:'r',choices:[],usage:{prompt_tokens:3,completion_tokens:4}}];
  const response={status:200,headers:{'content-type':'text/event-stream','x-agentnexus-local-request-id':'req'},body:responseBody(events.map(e=>'data: '+JSON.stringify(e)+'\n\n').join('')+'data: [DONE]\n\n')};
  const result=await adapter.parse(response,signal(),guard);assert.deepEqual(result.reply,{kind:'TOOL_CALL',tool_name:'native.echo',tool_version:'1',arguments:{value:7}});
  const unsafe=new OpenAIAdapter();unsafe.build(request('openai'));await assert.rejects(unsafe.parse(bound(wireFixture(JSON.stringify({kind:'FINAL',approval_id:'self-approved'}))),signal(),guard));
});
test('M18 REGISTRY prices use integer ceiling without double charging reasoning or losing precision',()=>{
  const p=model().price;assert.equal(priceCost(p,1,1),3);assert.equal(priceCost({...p,input_micros_per_million:1,output_micros_per_million:1},1,1),1);
  assert.throws(()=>priceCost(p,Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER),/COST_OVERFLOW/);
  assert.throws(()=>new CapabilityRegistry().register(model('bad','openai',{price:{...p,assurance:'REAL'}})),/PRICE_SOURCE/);
});
test('M18 ROUTER explicit capabilities, stale price, role routes and bounded escalation do not infer model powers',()=>{
  const r=new CapabilityRegistry();r.register(model('cheap','openai',{capabilities:{reasoning:false,tools:false,json:true,streaming:true,multimodal:false}}));r.register(model('strong','openai'));
  const router=new ModelRouter(r,{wire:{DEVELOPMENT:['openai:cheap','openai:strong'],BACKGROUND_REVIEWER:['openai:strong']}});
  const s={agent_id:'a',project_id:'p',task_id:'t',session_id:'s',runtime_instance_id:'r',agent_type:'DEVELOPMENT' as const,model_binding:'wire',resource_budget_id:'b',policy_scope:'p'};
  assert.equal(router.select(s,{input_tokens:100,output_tokens:100,required:['tools'],assurance:'SIMULATED'})[0].model_id,'strong');
  assert.throws(()=>router.select(s,{input_tokens:100,output_tokens:100,required:['multimodal'],assurance:'SIMULATED'}),/NO_CAPABLE_MODEL/);
  assert.throws(()=>router.select(s,{input_tokens:100,output_tokens:100,required:[],assurance:'SIMULATED',escalation:{reason:'QUALITY_INSUFFICIENT',from:'openai:strong',to:'openai:cheap',max_extra_cost_micros:100}}),/ESCALATION_ROUTE/);
  const stale=new CapabilityRegistry();stale.register(model('stale','openai',{price:{...model().price,valid_until:'2026-11-08T00:00:01Z'}}));assert.throws(()=>new ModelRouter(stale,{wire:{DEVELOPMENT:['openai:stale']}}).select(s,{input_tokens:1,output_tokens:1,required:[],assurance:'SIMULATED'}),/NO_CAPABLE_MODEL/);
});
