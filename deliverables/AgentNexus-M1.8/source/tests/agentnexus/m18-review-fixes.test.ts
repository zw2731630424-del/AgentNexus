import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture,model,root } from './m18-fixture.ts';
import { OpenAIAdapter } from '../../src/agentnexus/model-runtime/adapters.ts';
import { AuthorizedHttpsTransport,ProviderAuthorizationBook,FixtureTransport,wireFixture } from '../../src/agentnexus/model-runtime/transport.ts';
import { CredentialVault,SyntheticMemoryProtector,createVaultAdminCapability } from '../../src/agentnexus/model-runtime/vault.ts';
import { join } from 'node:path';
import { sha256 } from '../../src/agentnexus/types.ts';

test('M18 REVIEW sent UNKNOWN transport closure keeps the global slot after cancellation',async t=>{
  const f=await fixture(t,{gatewayConcurrency:1,adapters:[new OpenAIAdapter({timeout_ms:20})],respond:()=>new Promise(()=>{})}),a=await f.agent(),context=await f.view(a.subject);
  assert.equal((await f.unified.bind(a.subject).complete({request_id:'unknown-one',context,max_output_tokens:256})).outcome,'INDETERMINATE');
  await assert.rejects(f.unified.bind(a.subject).complete({request_id:'unknown-two',context,max_output_tokens:256}),/BACKPRESSURE/);assert.equal((f.transport as FixtureTransport).calls,1);assert.equal(f.vault.list(f.vaultAdmin)[0].in_flight,1);
});
test('M18 REVIEW a response archive ACK failure preserves settled usage and never repeats the paid request',async t=>{
  const f=await fixture(t),a=await f.agent(),context=await f.view(a.subject),flush=f.h.store.flush.bind(f.h.store);let failed=false;
  f.h.store.flush=async()=>{await flush();if(!failed&&f.h.state.get<{state:string}>('MODEL18_USAGE','archive-fail')?.state==='SETTLED'){failed=true;throw Error('synthetic post-settlement archive failure');}};
  await assert.rejects(f.unified.bind(a.subject).complete({request_id:'archive-fail',context,max_output_tokens:256}));f.h.store.flush=flush;
  assert.equal(failed,true);assert.equal(f.ledger.inspect(f.admin,'archive-fail').state,'SETTLED');assert.equal(f.ledger.inspect(f.admin,'archive-fail').usage?.cost_micros,50);
  await assert.rejects(f.unified.bind(a.subject).complete({request_id:'archive-fail',context,max_output_tokens:256}));assert.equal((f.transport as FixtureTransport).calls,1);
});
test('M18 REVIEW reasoning leaks split across events cannot hide behind a long discarded suffix',async t=>{
  const secret='synthetic-test-openai-private-value-abc123';const f=await fixture(t,{respond:()=>{const body=[secret.slice(0,20),secret.slice(20)+'x'.repeat(32768)].map(reasoning_content=>'data: '+JSON.stringify({id:'r',choices:[{index:0,delta:{reasoning_content},finish_reason:null}]})+'\n\n').join('');return {status:200,headers:{'content-type':'text/event-stream'},body:(async function*(){yield Buffer.from(body);})()};}}),a=await f.agent();
  const result=await f.unified.bind(a.subject).complete({request_id:'reasoning-leak',context:await f.view(a.subject),max_output_tokens:256});assert.equal(result.outcome,'INDETERMINATE');assert.equal(f.vault.list(f.vaultAdmin)[0].state,'QUARANTINED');
});
test('M18 REVIEW reported model mismatch cannot settle at the requested model price',async t=>{
  const f=await fixture(t,{respond:()=>{const body='data: '+JSON.stringify({id:'r',model:'another-model',choices:[{index:0,delta:{content:'{"kind":"FINAL"}'},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n';return {status:200,headers:{'content-type':'text/event-stream'},body:(async function*(){yield Buffer.from(body);})()};}}),a=await f.agent();
  assert.equal((await f.unified.bind(a.subject).complete({request_id:'model-mismatch',context:await f.view(a.subject),max_output_tokens:256})).outcome,'INDETERMINATE');assert.equal(f.ledger.inspect(f.admin,'model-mismatch').state,'UNKNOWN');
});
test('M18 REVIEW grant preflight atomically reserves its sixteen pending slots before await',async t=>{
  const f=await fixture(t),a=await f.agent();const book=new ProviderAuthorizationBook(f.h.state,f.admin,async()=>true),m=model();m.price={...m.price,assurance:'REAL',source:'https://official.invalid/synthetic-test-price'};
  const id=await book.approve(f.admin,{provider_id:'openai',model_id:m.model_id,endpoint:'https://api.openai.com/v1/chat/completions',max_requests:20,max_input_tokens:2000,max_output_tokens:2000,max_cost_micros:2000,key_use:'HOST_VAULT_ONLY',data_scope:['SYNTHETIC TEST NO NETWORK'],uploads_project_source:true,stop_method:'ABORT_AND_REVOKE',project_id:'project',context_hashes:[sha256('input')],expires_at:'2027-01-01T00:00:00Z'},'synthetic-verifier-fixture');
  const transport=new AuthorizedHttpsTransport(book,f.admin,id,()=>({worker_isolation:'QUALIFIED',credential_service:'QUALIFIED',evidence_sha256:sha256('SYNTHETIC qualification fixture; no send performed')}));
  const make=(n:number)=>({subject:a.subject,request:{method:'POST' as const,url:'https://api.openai.com/v1/chat/completions',body:'{}',headers:{'x-agentnexus-request-id':'slot-'+n}},input_tokens:1,output_tokens:1,estimated_cost_micros:1,context_hash:sha256('input'),model:m});
  const requests=Array.from({length:17},(_,n)=>transport.preflight(make(n))),result=await Promise.allSettled(requests);assert.equal(result.filter(r=>r.status==='fulfilled').length,16);assert.equal(result.filter(r=>r.status==='rejected').length,1);
  transport.abandon('slot-0');await transport.preflight(make(18)); // no HTTPS send is invoked anywhere in this test
});
test('M18 REVIEW an already-sent Key cannot be released as NOT_SENT and a closed guard rejects all attached channels',async t=>{
  const f=await fixture(t),a=await f.agent(),lease=f.vault.acquire(f.vaultAdmin,{provider_id:'openai',model_id:'synthetic-small',request_id:'used',estimated_cost_micros:100,subject_key:'subject'});
  await f.vault.withCredential(f.vaultAdmin,lease.lease_id,async()=>({safe:true}),'subject');assert.throws(()=>f.vault.settle(f.vaultAdmin,lease.lease_id,{outcome:'NOT_SENT',cost_micros:0,usage_source:'SIMULATED'},'subject'),/SENT_RELEASE_BLOCKED/);assert.equal(f.vault.list(f.vaultAdmin)[0].in_flight,1);
  await f.ledger.reserve(f.admin,a.subject,{request_id:'attempts',input_tokens:100,output_tokens:100,cost_micros:100,assurance:'SIMULATED',context_hash:sha256('input'),provider_id:'openai',model_id:'synthetic-small'});await f.ledger.markSent(f.admin,a.subject,'attempts',{key_handle_id:lease.key_handle_id});
  for(const patch of [{requests:0,retries:0},{requests:1,retries:1}])await assert.rejects(f.ledger.settle(f.admin,a.subject,'attempts',{input_tokens:1,output_tokens:1,reasoning_tokens:null,cost_micros:1,usage_source:'SIMULATED',elapsed_ms:1,provider_request_id:'fixture',...patch}),/LEDGER_ATTEMPTS/);
});
test('M18 REVIEW rotate fences the original credential generation across asynchronous encryption',async t=>{
  const admin=createVaultAdminCapability(),inner=new SyntheticMemoryProtector();let release!:()=>void,reached!:()=>void,delay=false;
  const gate=new Promise<void>(r=>release=r),entered=new Promise<void>(r=>reached=r),protector={id:inner.id,protection:inner.protection,unprotect:(b:Uint8Array)=>inner.unprotect(b),protect:async(b:Uint8Array)=>{const owned=Buffer.from(b);if(delay){delay=false;reached();await gate;}return inner.protect(owned);}};
  const vault=await CredentialVault.open({root:join(await root('rotate-race'),'vault'),admin,protector,mode:'SYNTHETIC'});t.after(()=>vault.close());
  const spec=(key_id:string,provider_id='openai')=>({key_id,provider_id,models:['synthetic'],secret:Buffer.from('synthetic-test-'+key_id+'-private-abc123'),max_concurrency:1,requests_per_minute:10});
  await vault.add(admin,spec('old'));delay=true;const rotating=vault.rotate(admin,'old',spec('replacement'));await entered;vault.remove(admin,'old');await vault.add(admin,spec('old','glm'));release();await assert.rejects(rotating,/ROTATION_STALE/);assert.equal(vault.list(admin).find(k=>k.key_id==='old')!.state,'ACTIVE');assert.equal(vault.list(admin).some(k=>k.key_id==='replacement'),false);
});
