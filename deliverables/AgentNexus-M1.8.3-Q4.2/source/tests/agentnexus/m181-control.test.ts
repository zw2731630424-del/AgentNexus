import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir,mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { initializeControl } from '../../src/agentnexus/control.ts';
import { FeatureRegistry } from '../../src/agentnexus/features.ts';
import { NativeState } from '../../src/agentnexus/harness/state.ts';
import type { Subject } from '../../src/agentnexus/harness/contracts.ts';
import { CampaignTokenLedger,M181_TOKEN_LIMIT } from '../../src/agentnexus/model-runtime/campaign.ts';
import { DataEgressPolicy,egressBinding,assertEgressAdmission } from '../../src/agentnexus/model-runtime/egress.ts';
import type { EgressGrant,EgressInput,DataClassification } from '../../src/agentnexus/model-runtime/egress.ts';
import { CapabilityRegistry,ModelRouter } from '../../src/agentnexus/model-runtime/protocol.ts';
import { DeepSeekAdapter } from '../../src/agentnexus/model-runtime/adapters.ts';
import { UnifiedModelGateway } from '../../src/agentnexus/model-runtime/gateway.ts';
import { FixtureTransport,wireFixture,ProviderAuthorizationBook,AuthorizedHttpsTransport } from '../../src/agentnexus/model-runtime/transport.ts';
import { responseEvidence } from '../../src/agentnexus/model-runtime/response-evidence.ts';
import { canonical,invariant,sha256,uid } from '../../src/agentnexus/types.ts';
import { fixture,model } from './m18-fixture.ts';
import type { AssembledContext } from '../../src/agentnexus/harness/context.ts';

const S:Subject={agent_id:'lead',project_id:'pilot',task_id:'work',session_id:'session',runtime_instance_id:'runtime',agent_type:'DEVELOPMENT',model_binding:'deepseek',resource_budget_id:'budget',policy_scope:'pilot'};
const demand=(request_id:string,input_tokens=30,output_tokens=30)=>({request_id,provider_id:'deepseek',input_tokens,output_tokens,body_hash:sha256('synthetic request')});
const usage={input_tokens:10,output_tokens:20,reasoning_tokens:5,cache_hit_tokens:2,cache_miss_tokens:8};
async function accounting(t:test.TestContext){
  const base=process.env.AGENTNEXUS_TEST_DATA_ROOT??fileURLToPath(new URL('../../../../../.workflow-kit/runtime/AgentNexus-M1.8.1/unit',import.meta.url));
  await mkdir(base,{recursive:true});const root=await mkdtemp(join(base,'campaign-')),admin=Object.freeze({});let store=await KernelStore.open(root);
  const bind=()=>{initializeControl(store);const check=(a:unknown)=>invariant(a===admin,'ADMIN_REQUIRED');const state=new NativeState(store,new FeatureRegistry(store,[],check,{busy:false}),check,uid());return {state,ledger:new CampaignTokenLedger(state,admin,'SIMULATED')};};
  const f={admin,root,...bind(),async reopen(){await store.close();store=await KernelStore.open(root);Object.assign(f,bind());}};
  t.after(()=>store.close());return f;
}

test('M181 campaign atomic reservations share one ceiling across concurrent agents and sessions',async t=>{
  const f=await accounting(t);await f.ledger.initialize(f.admin,'synthetic-authorization',100);
  const result=await Promise.allSettled([f.ledger.reserve(f.admin,S,demand('one')),f.ledger.reserve(f.admin,{...S,agent_id:'child',session_id:'another'},demand('two'))]);
  assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.ledger.inspect(f.admin).held,60);assert.equal(f.ledger.inspect(f.admin).remaining_tokens,40);
});
test('M181 campaign paid usage survives reopen and cannot be reset or reauthorized as extra quota',async t=>{
  const f=await accounting(t);await f.ledger.initialize(f.admin,'synthetic-authorization',100);
  await f.ledger.reserve(f.admin,S,demand('paid'));await f.ledger.markSent(f.admin,S,'paid');await f.ledger.observe(f.admin,S,'paid',usage,42,true);
  await f.reopen();await f.ledger.initialize(f.admin,'synthetic-authorization',100);const c=f.ledger.inspect(f.admin);
  assert.equal(c.used,30);assert.equal(c.input_tokens,10);assert.equal(c.output_tokens,20);assert.equal(c.held,0);assert.equal(c.cache_hit_tokens,2);assert.equal(c.reasoning_tokens,5);assert.equal(c.cost_estimate_micros,42);
  await assert.rejects(f.ledger.initialize(f.admin,'new-session-authorization',100),/IMMUTABLE/);await assert.rejects(f.ledger.initialize(f.admin,'synthetic-authorization',101),/IMMUTABLE/);
  await assert.rejects(f.ledger.reserve(f.admin,{...S,session_id:'new'},demand('exhausted',50,30)),/EXHAUSTED/);
});
test('M181 real campaign ceiling is fixed at 100 million and all other providers are denied',async t=>{
  const f=await accounting(t),live=new CampaignTokenLedger(f.state,f.admin,'REAL');
  await assert.rejects(live.initialize(f.admin,'user-m181-authorization',200),/CAMPAIGN_LIMIT/);await live.initialize(f.admin,'user-m181-authorization');assert.equal(live.inspect(f.admin).limit,M181_TOKEN_LIMIT);
  await assert.rejects(live.reserve(f.admin,S,{...demand('other'),provider_id:'openai'}),/CAMPAIGN_PROVIDER/);assert.equal(live.inspect(f.admin).requests,0);
});
test('M181 sent failures keep full holds, record provider usage once and stop all new requests',async t=>{
  const f=await accounting(t);await f.ledger.initialize(f.admin,'synthetic-authorization',100);await f.ledger.reserve(f.admin,S,demand('broken'));await f.ledger.markSent(f.admin,S,'broken');
  await f.ledger.observe(f.admin,S,'broken',usage,42,false);await f.ledger.observe(f.admin,S,'broken',usage,42,false);
  const c=f.ledger.inspect(f.admin);assert.equal(c.used,30);assert.equal(c.held,60);assert.equal(c.state,'BLOCKED');assert.equal(c.unknown,1);
  await assert.rejects(f.ledger.notSent(f.admin,S,'broken'),/ALREADY_SENT/);await assert.rejects(f.ledger.reserve(f.admin,{...S,session_id:'new'},demand('new',1,1)),/RECONCILIATION/);
  await assert.rejects(f.ledger.observe(f.admin,S,'broken',{...usage,output_tokens:21},42,false),/USAGE_CONFLICT/);
});
test('M181 missing usage is explicitly estimated and never refunds a timed-out reservation',async t=>{
  const f=await accounting(t);await f.ledger.initialize(f.admin,'synthetic-authorization',100);await f.ledger.reserve(f.admin,S,demand('unknown'));await f.ledger.markSent(f.admin,S,'unknown');await f.ledger.observe(f.admin,S,'unknown',null,0,false);
  const c=f.ledger.inspect(f.admin);assert.equal(c.used,0);assert.equal(c.estimated_tokens,60);assert.equal(c.held,60);assert.equal(c.state,'BLOCKED');
});
test('M181 campaign rejects non-boolean completion metadata without releasing a sent hold',async t=>{
  const f=await accounting(t);await f.ledger.initialize(f.admin,'synthetic-authorization',100);await f.ledger.reserve(f.admin,S,demand('incomplete'));await f.ledger.markSent(f.admin,S,'incomplete');
  for(const invalid of [undefined,null,0,1,'false',{}])await assert.rejects(f.ledger.observe(f.admin,S,'incomplete',usage,42,invalid as boolean),/CAMPAIGN_COMPLETE/);
  assert.equal(f.ledger.inspect(f.admin).held,60);assert.equal(f.ledger.inspect(f.admin).used,0);await f.ledger.observe(f.admin,S,'incomplete',usage,42,false);assert.equal(f.ledger.inspect(f.admin).state,'BLOCKED');
});
test('M181 known-not-sent releases only its own unused reservation; replay cannot consume again',async t=>{
  const f=await accounting(t);await f.ledger.initialize(f.admin,'synthetic-authorization',100);await f.ledger.reserve(f.admin,S,demand('no-send'));await f.ledger.notSent(f.admin,S,'no-send');await f.ledger.notSent(f.admin,S,'no-send');
  assert.equal(f.ledger.inspect(f.admin).held,0);await assert.rejects(f.ledger.reserve(f.admin,S,demand('no-send')),/REPLAY/);await f.ledger.reserve(f.admin,S,demand('valid',45,45));assert.equal(f.ledger.inspect(f.admin).near_limit,true);
});
test('M181 restart quarantines reservations and later pages without resetting budget',async t=>{
  const f=await accounting(t);await f.ledger.initialize(f.admin,'synthetic-authorization',1000);
  for(let i=0;i<102;i++)await f.ledger.reserve(f.admin,S,demand('pending-'+i,1,1));
  await f.reopen();await f.ledger.recover(f.admin);const c=f.ledger.inspect(f.admin);assert.equal(c.unknown,102);assert.equal(c.held,204);assert.equal(c.estimated_tokens,204);assert.equal(c.state,'BLOCKED');
  await f.ledger.recover(f.admin);assert.equal(f.ledger.inspect(f.admin).unknown,102);
});
test('M181 provider usage overruns remain charged and stop admission',async t=>{
  const f=await accounting(t);await f.ledger.initialize(f.admin,'synthetic-authorization',100);await f.ledger.reserve(f.admin,S,demand('over',10,10));await f.ledger.markSent(f.admin,S,'over');
  await f.ledger.observe(f.admin,S,'over',{input_tokens:11,output_tokens:10,reasoning_tokens:null},1,true);assert.equal(f.ledger.inspect(f.admin).used,21);assert.equal(f.ledger.inspect(f.admin).state,'BLOCKED');
});

async function runtime(t:test.TestContext,options:{respond?:Parameters<typeof fixture>[1] extends infer X?X extends {respond?:infer R}?R:never:never;approved?:boolean}={}){
  const spec=model('deepseek-flash','deepseek'),f=await fixture(t,{models:[spec],respond:options.respond}),a=await f.agent(),context=await f.view(a.subject,'Synthetic UTF-8 requirement: 测试中文 ✓');
  const egress=new DataEgressPolicy(f.h.state,f.admin,f.vault.guard,async g=>g.authorization_ref==='m181-synthetic-review');
  const campaign=new CampaignTokenLedger(f.h.state,f.admin,'SIMULATED');await campaign.initialize(f.admin,'m181-synthetic-review',100000);
  const registry=new CapabilityRegistry();registry.register(spec);const adapter=new DeepSeekAdapter();
  const gateway=new UnifiedModelGateway(f.h.state,f.admin,{vault:f.vault,vaultAdmin:f.vaultAdmin,ledger:f.ledger,guard:f.vault.guard,router:new ModelRouter(registry,{wire:{DEVELOPMENT:['deepseek:deepseek-flash']}}),adapters:[adapter],transport:f.transport,egress,campaign,authorizeSubject:s=>invariant(canonical(f.h.inspectAgent(s.agent_id).subject)===canonical(s),'SUBJECT')});
  const input=(view:AssembledContext=context):EgressInput=>{const temp=new DeepSeekAdapter(),request=temp.build({request_id:'preview',model:spec,prompt:view.text,max_output_tokens:256,stream:true,json:true,reasoning:'disabled',tools:[]});temp.abandon('preview');return {subject:a.subject,context:view,request,model:spec};};
  const grant=(classification:DataClassification='SYNTHETIC',expires_at='2027-01-01T00:00:00Z'):EgressGrant=>({...egressBinding(input()),provider_id:'deepseek',classification,authorization_ref:'m181-synthetic-review',expires_at});
  if(options.approved)await egress.approve(f.admin,grant());
  return {...f,a,context,egress,campaign,gateway,input,grant};
}
test('M181 gateway denies unreviewed context before Key lease or any transport call',async t=>{
  const f=await runtime(t);const r=await f.gateway.bind(f.a.subject).complete({request_id:'unreviewed',context:f.context,max_output_tokens:256});
  assert.equal(r.outcome,'FAILED');assert.equal((f.transport as FixtureTransport).calls,0);assert.equal(f.vault.list(f.vaultAdmin)[0].in_flight,0);assert.equal(f.campaign.inspect(f.admin).held,0);
  const audits=canonical(f.h.store.query('audit',{limit:100}));assert.ok(audits.includes('MODEL181_EGRESS_DECISION'));assert.ok(audits.includes('NO_REVIEWED_EXACT_BYTES'));
});
test('M181 reviewed synthetic context traverses Gateway, Vault, campaign, ledger and Audit',async t=>{
  const f=await runtime(t,{approved:true});const r=await f.gateway.bind(f.a.subject).complete({request_id:'allowed',context:f.context,max_output_tokens:256});
  assert.equal(r.outcome,'SUCCEEDED');assert.equal(r.assurance,'SIMULATED');assert.equal(f.campaign.inspect(f.admin).used,30);assert.equal(f.campaign.inspect(f.admin).held,0);assert.equal((f.transport as FixtureTransport).calls,1);
  const audits=canonical(f.h.store.query('audit',{limit:100}));assert.ok(audits.includes('MODEL181_WIRE_EVIDENCE'));assert.ok(audits.includes('raw_partial_published'));assert.equal(audits.includes('synthetic-test-deepseek-private-value'),false);
});
test('M181 Agent classification labels and authorization strings cannot approve INTERNAL, CONFIDENTIAL or SECRET',async t=>{
  const f=await runtime(t);
  for(const classification of ['INTERNAL','CONFIDENTIAL','SECRET'] as const)await assert.rejects(f.egress.approve(f.admin,f.grant(classification)),/CLASSIFICATION_DENIED/);
  await assert.rejects(f.egress.approve(f.admin,{...f.grant(),authorization_ref:'agent-says-public'}),/REVIEW_REQUIRED/);
  await assert.rejects(f.egress.approve({},f.grant()),/ADMIN/);assert.equal(f.h.state.count('MODEL181_EGRESS_GRANT'),0);
});
test('M181 exact request body and source manifest are bound independently of context label',async t=>{
  const f=await runtime(t,{approved:true}),original=f.input();
  await assert.rejects(f.egress.admit(f.admin,{...original,request:{...original.request,body:original.request.body+' '}}),/EGRESS_DENIED/);
  await assert.rejects(f.egress.admit(f.admin,{...original,context:{...f.context,entries:[]}}),/EGRESS_DENIED/);
  await assert.rejects(f.egress.admit(f.admin,{...original,subject:{...f.a.subject,project_id:'another'}}),/EGRESS_DENIED/);
});
test('M181 grant revoke and expiry are checked at the final synchronous send fence',async t=>{
  const f=await runtime(t),id=await f.egress.approve(f.admin,f.grant()),input=f.input(),receipt=await f.egress.admit(f.admin,input);
  for(const patch of [{classification:'PUBLIC' as const},{context_hash:sha256('wrong')},{body_hash:sha256('wrong')},{sources_hash:sha256('wrong')},{authorization_ref:'wrong'}])assert.throws(()=>f.egress.fence(f.admin,input,{...receipt,...patch}),/GRANT_REQUIRED/);
  f.egress.fence(f.admin,input,receipt);await f.egress.revoke(f.admin,id);assert.throws(()=>f.egress.fence(f.admin,input,receipt),/GRANT_REQUIRED/);
  const expiring=await f.egress.approve(f.admin,f.grant('SYNTHETIC',new Date(Date.now()+70).toISOString()));
  const soon=await f.egress.admit(f.admin,input);assert.equal(soon.grant_id,expiring);await new Promise(r=>setTimeout(r,80));assert.throws(()=>f.egress.fence(f.admin,input,soon),/GRANT_REQUIRED/);
});
test('M181 forged egress receipts cannot enter transport without durable host-reviewed grant',async t=>{
  const f=await runtime(t),i=f.input();
  assert.throws(()=>assertEgressAdmission(f.h.state,{subject:i.subject,request:i.request,input_tokens:1,output_tokens:1,estimated_cost_micros:1,context_hash:i.context.sha256,model:i.model,egress:{grant_id:sha256('forged'),classification:'SYNTHETIC',body_hash:sha256(i.request.body),context_hash:i.context.sha256,sources_hash:sha256('forged'),authorization_ref:'agent'}}),/EGRESS_REQUIRED/);
});
test('M181 known credential material is rejected from otherwise approved request bytes',async t=>{
  const f=await runtime(t);const context=await f.view(f.a.subject,'Safe context');const input=f.input(context);
  const policy=new DataEgressPolicy(f.h.state,f.admin,f.vault.guard,async()=>true);const secretBody={...input,request:{...input.request,body:'synthetic-test-deepseek-private-value-abc123'}};
  await policy.approve(f.admin,{...f.grant(),...egressBinding(secretBody),provider_id:'deepseek'});
  await assert.rejects(policy.admit(f.admin,secretBody),/EGRESS_DENIED/);assert.equal(canonical(f.h.store.query('audit',{limit:100})).includes('synthetic-test-deepseek-private-value-abc123'),false);
});
test('M181 malformed paid reply preserves provider usage and partial hash, stops campaign and never replays tools',async t=>{
  const f=await runtime(t,{approved:true,respond:()=>wireFixture('malformed json',{usage:{prompt_tokens:11,completion_tokens:12}})});
  const input={request_id:'bad-json',context:f.context,max_output_tokens:256};const r=await f.gateway.bind(f.a.subject).complete(input);
  assert.equal(r.outcome,'INDETERMINATE');assert.equal(r.reply,null);assert.equal(f.ledger.inspect(f.admin,input.request_id).usage?.input_tokens,11);assert.equal(f.ledger.inspect(f.admin,input.request_id).state,'UNKNOWN');assert.equal(f.campaign.inspect(f.admin).used,23);assert.equal(f.campaign.inspect(f.admin).state,'BLOCKED');
  assert.deepEqual(await f.gateway.bind(f.a.subject).complete(input),r);assert.equal((f.transport as FixtureTransport).calls,1);
  const later=await f.gateway.bind(f.a.subject).complete({...input,request_id:'after-unknown'});assert.equal(later.outcome,'FAILED');assert.equal((f.transport as FixtureTransport).calls,1);
});
test('M181 cancelled or missing-usage streams cannot refund campaign budget',async t=>{
  const f=await runtime(t,{approved:true,respond:()=>wireFixture('{"kind":"FINAL"}',{usage:null})});
  const r=await f.gateway.bind(f.a.subject).complete({request_id:'missing-usage',context:f.context,max_output_tokens:256});assert.equal(r.outcome,'INDETERMINATE');assert.equal(f.campaign.inspect(f.admin).state,'BLOCKED');assert.ok(f.campaign.inspect(f.admin).estimated_tokens>0);
});
test('M181 a declared qualified callback still cannot promote a synthetic Vault to live Gateway',async t=>{
  const f=await runtime(t),registry=new CapabilityRegistry();registry.register(f.specs[0]);
  const transport=new AuthorizedHttpsTransport(new ProviderAuthorizationBook(f.h.state,f.admin,async()=>true),f.admin,'absent',()=>({worker_isolation:'QUALIFIED',credential_service:'QUALIFIED',evidence_sha256:sha256('SYNTHETIC NOT OS EVIDENCE')}));
  assert.throws(()=>new UnifiedModelGateway(f.h.state,f.admin,{vault:f.vault,vaultAdmin:f.vaultAdmin,ledger:f.ledger,guard:f.vault.guard,router:new ModelRouter(registry,{wire:{DEVELOPMENT:['deepseek:deepseek-flash']}}),adapters:[new DeepSeekAdapter()],transport,egress:f.egress,campaign:f.campaign,authorizeSubject:()=>{}}),/LIVE_GATES_REQUIRED|CREDENTIAL_ASSURANCE/);
});
test('M181 response evidence is pull based, hashes exact bytes and retains incomplete state without publishing data',async()=>{
  let pulls=0;const source=(async function*(){pulls++;yield Buffer.from('中');pulls++;yield Buffer.from('文');})();const tap=responseEvidence(source);
  assert.equal(pulls,0);assert.equal(tap.inspect().bytes,0);const it=tap.body[Symbol.asyncIterator]();assert.equal(Buffer.from((await it.next()).value!).toString(),'中');assert.equal(pulls,1);await it.return!(undefined);
  const e=tap.inspect();assert.equal(e.sha256,sha256('中'));assert.equal(e.eof,false);assert.equal(e.raw_partial_published,false);assert.equal(e.closed,true);
});
