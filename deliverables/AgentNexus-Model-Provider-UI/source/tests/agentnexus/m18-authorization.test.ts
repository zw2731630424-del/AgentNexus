import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture,model } from './m18-fixture.ts';
import { ProviderAuthorizationBook,AuthorizedHttpsTransport } from '../../src/agentnexus/model-runtime/transport.ts';
import type { ProviderAuthorizationPlan } from '../../src/agentnexus/model-runtime/transport.ts';
import { OpenAIAdapter } from '../../src/agentnexus/model-runtime/adapters.ts';
import { sha256 } from '../../src/agentnexus/types.ts';
import type { TransportAdmission } from '../../src/agentnexus/model-runtime/protocol.ts';
async function setup(t:test.TestContext){const f=await fixture(t),a=await f.agent(),book=new ProviderAuthorizationBook(f.h.state,f.admin,async(ref,_hash)=>ref==='synthetic-user-approval');
  const plan:ProviderAuthorizationPlan={provider_id:'openai',model_id:'synthetic-small',endpoint:'https://api.openai.com/v1/chat/completions',max_requests:2,max_input_tokens:1000,max_output_tokens:100,max_cost_micros:100,key_use:'HOST_VAULT_ONLY',data_scope:['synthetic public fixture'],uploads_project_source:true,stop_method:'ABORT_AND_REVOKE',project_id:'project',context_hashes:[sha256('input')],expires_at:'2027-01-01T00:00:00Z'};
  const m=model(),adapter=new OpenAIAdapter(),request=adapter.build({request_id:'admit',model:m,prompt:'input',max_output_tokens:50,stream:true,json:true,reasoning:'disabled',tools:[]});
  const input:TransportAdmission={subject:a.subject,request,input_tokens:500,output_tokens:50,estimated_cost_micros:50,context_hash:sha256('input'),model:m};return {...f,book,plan,input};}
test('M18 AUTH no explicit verified user grant or missing qualification can call an HTTPS Provider',async t=>{
  const f=await setup(t);await assert.rejects(f.book.approve(f.admin,f.plan,'not-a-user-approval'),/USER_AUTHORIZATION/);assert.equal(f.h.state.count('MODEL18_APPROVAL'),0);
  const transport=new AuthorizedHttpsTransport(f.book,f.admin,'absent',()=>({worker_isolation:'BLOCKED',credential_service:'BLOCKED',evidence_sha256:null}));await assert.rejects(transport.preflight(f.input),/QUALIFICATION_BLOCKED/);await assert.rejects(transport.send(f.input.request,'Bearer synthetic-test-never-sent',new AbortController().signal),/QUALIFICATION_BLOCKED/);assert.equal(f.h.state.count('MODEL18_NETWORK'),0);
});
test('M18 AUTH grant binds Provider, Model, endpoint, project, exact context and upload scope',async t=>{
  const f=await setup(t),id=await f.book.approve(f.admin,f.plan,'synthetic-user-approval');
  for(const patch of [{context_hash:sha256('other')},{model:model('other')},{request:{...f.input.request,url:'https://other.invalid/v1'}},{subject:{...f.input.subject,project_id:'other'}}])await assert.rejects(f.book.admit(f.admin,id,{...f.input,...patch}),/AUTHORIZATION_SCOPE/);
  for(const amount of [-1,0.1,Number.MAX_SAFE_INTEGER+1])await assert.rejects(f.book.admit(f.admin,id,{...f.input,input_tokens:amount}));
  assert.equal(f.h.state.count('MODEL18_NETWORK'),0);
});
test('M18 AUTH grant budgets are reserved atomically and cannot be replenished with negative costs',async t=>{
  const f=await setup(t),id=await f.book.approve(f.admin,{...f.plan,max_requests:1},'synthetic-user-approval');
  const results=await Promise.allSettled([f.book.admit(f.admin,id,f.input),f.book.admit(f.admin,id,{...f.input,request:{...f.input.request,headers:{...f.input.request.headers,'x-agentnexus-request-id':'other'}}})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  await assert.rejects(f.book.admit(f.admin,id,{...f.input,estimated_cost_micros:-100}));
});
test('M18 AUTH synchronous final fence rejects revoked, expired and mismatched dispatch after durable intent',async t=>{
  const f=await setup(t),id=await f.book.approve(f.admin,f.plan,'synthetic-user-approval');await f.book.admit(f.admin,id,f.input);await f.book.dispatch(f.admin,id,f.input);f.book.fence(f.admin,id,f.input);
  await f.book.revoke(f.admin,id);assert.throws(()=>f.book.fence(f.admin,id,f.input),/AUTHORIZATION_REQUIRED/);await assert.rejects(f.book.dispatch(f.admin,id,f.input),/NETWORK_REPLAY/);
  const other=await f.book.approve(f.admin,{...f.plan,data_scope:['another independently approved fixture']},'synthetic-user-approval');assert.throws(()=>f.book.fence(f.admin,other,f.input),/AUTHORIZATION_REQUIRED/);
});
