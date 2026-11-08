import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture,model } from './m18-fixture.ts';
import { OpenAIAdapter } from '../../src/agentnexus/model-runtime/adapters.ts';
import { FixtureTransport,wireFixture } from '../../src/agentnexus/model-runtime/transport.ts';
import { canonical } from '../../src/agentnexus/types.ts';
import { modelTaskBudgetId } from '../../src/agentnexus/model-runtime/ledger.ts';

test('M18 GATEWAY native Loop uses encrypted synthetic credentials, Tool Gateway and exact source archive',async t=>{
  const f=await fixture(t,{respond:(_r,n)=>wireFixture(JSON.stringify(n===0?{kind:'TOOL_CALL',tool_name:'native.echo',arguments:{value:7}}:{kind:'FINAL',text:'SIMULATED completion'}))});const a=await f.agent();
  const facade=f.h.bindAgent(a.id);await f.h.administration.createTask({id:'work',agent_id:'lead',goal:'Verify a native echo result',max_turns:3});const task=await f.h.administration.dispatch('work');
  assert.equal(task.state,'SUCCEEDED');assert.equal(task.turns,2);assert.equal(f.h.state.count('MODEL18_REQUEST'),2);assert.equal((f.transport as FixtureTransport).calls,2);
  const audits=f.h.store.query('audit',{project_id:'project',task_id:'work',limit:100});assert.ok(audits.some(r=>(r.body as any).phase==='PERMIT_ISSUED'));
  const total=f.ledger.totals(f.admin,'AGENT',a.id,'SIMULATED');assert.equal(total.used.tokens,60);assert.equal(total.used.cost_micros,100);assert.equal(total.held.tokens,0);
  assert.equal(canonical(audits).includes('synthetic-test-'),false);assert.equal(f.h.qualification.strict_cpu,'BLOCKED');assert.equal('vault' in facade,false);await f.h.store.verify();
});
test('M18 GATEWAY durable terminal dedup and conflicting input never make a second request',async t=>{
  const f=await fixture(t),a=await f.agent(),view=await f.view(a.subject),input={request_id:'dedup',context:view,max_output_tokens:256};
  const first=await f.unified.bind(a.subject).complete(input);assert.equal(first.outcome,'SUCCEEDED');assert.deepEqual(await f.unified.bind(a.subject).complete(input),first);
  await assert.rejects(f.unified.bind(a.subject).complete({...input,max_output_tokens:255}),/REQUEST_CONFLICT/);assert.equal((f.transport as FixtureTransport).calls,1);
});
test('M18 GATEWAY caller mutation while reconstructing cannot alter validated output bound or fingerprint',async t=>{
  const f=await fixture(t,{respond:r=>{assert.equal(JSON.parse(r.body).max_completion_tokens,256);return wireFixture(JSON.stringify({kind:'FINAL'}));}}),a=await f.agent(),context=await f.view(a.subject),input={request_id:'mutable',context,max_output_tokens:256};
  const pending=f.unified.bind(a.subject).complete(input);input.max_output_tokens=5000;input.request_id='mutated';assert.equal((await pending).outcome,'SUCCEEDED');assert.equal(f.h.state.get('MODEL18_REQUEST','mutated'),null);
});
test('M18 GATEWAY incomplete/disconnected/overbudget streams keep key and four-level holds without retry',async t=>{
  for(const kind of ['partial','no-usage','overrun','invalid-json'] as const)await t.test(kind,async sub=>{
    const f=await fixture(sub,{respond:()=>wireFixture(kind==='invalid-json'?'broken':JSON.stringify({kind:'FINAL'}),kind==='partial'?{done:false}:kind==='no-usage'?{usage:null}:kind==='overrun'?{usage:{prompt_tokens:100000,completion_tokens:1}}:{})}),a=await f.agent(),context=await f.view(a.subject),input={request_id:'unknown',context,max_output_tokens:256};
    const result=await f.unified.bind(a.subject).complete(input);assert.equal(result.outcome,'INDETERMINATE');assert.equal(result.reply,null);assert.deepEqual(await f.unified.bind(a.subject).complete(input),result);
    assert.equal((f.transport as FixtureTransport).calls,1);assert.equal(f.ledger.inspect(f.admin,'unknown').state,'UNKNOWN');assert.ok(f.ledger.totals(f.admin,'PLATFORM','platform','SIMULATED').held.tokens>0);assert.equal(f.vault.list(f.vaultAdmin)[0].in_flight,1);if(kind==='overrun')assert.ok(f.vault.list(f.vaultAdmin)[0].reserved_micros>=100002);
  });
});
test('M18 GATEWAY sent timeout returns bounded UNKNOWN and aborts the original stream',async t=>{
  let aborted=false;const f=await fixture(t,{adapters:[new OpenAIAdapter({timeout_ms:30})],respond:(_r,_n,s)=>{s.addEventListener('abort',()=>aborted=true,{once:true});return new Promise(()=>{});}}),a=await f.agent(),context=await f.view(a.subject);
  const result=await f.unified.bind(a.subject).complete({request_id:'timeout',context,max_output_tokens:256});assert.equal(result.outcome,'INDETERMINATE');assert.equal(aborted,true);assert.equal((f.transport as FixtureTransport).calls,1);
});
test('M18 GATEWAY pre-send cancellation and atomic budget denial never touch Provider transport',async t=>{
  const f=await fixture(t),a=await f.agent(),context=await f.view(a.subject),controller=new AbortController();controller.abort();
  await assert.rejects(f.unified.bind(a.subject).complete({request_id:'cancelled',context,max_output_tokens:256},controller.signal));
  await f.ledger.configure(f.admin,{scope:'TASK',id:modelTaskBudgetId(a.subject),assurance:'SIMULATED',tokens:1,requests:1,cost_micros:1});const result=await f.unified.bind(a.subject).complete({request_id:'denied',context,max_output_tokens:256});assert.equal(result.outcome,'FAILED');assert.equal((f.transport as FixtureTransport).calls,0);
});
test('M18 GATEWAY independently scoped concurrent Agent requests cannot overconsume one Key',async t=>{
  let release!:()=>void,reached!:()=>void;const gate=new Promise<void>(r=>release=r),entered=new Promise<void>(r=>reached=r);
  const f=await fixture(t,{maxConcurrency:1,respond:async()=>{reached();await gate;return wireFixture(JSON.stringify({kind:'FINAL'}));}}),a=await f.agent(),view=await f.view(a.subject);
  const first=f.unified.bind(a.subject).complete({request_id:'one',context:view,max_output_tokens:256});await entered;
  const second=await f.unified.bind(a.subject).complete({request_id:'two',context:view,max_output_tokens:256});assert.equal(second.outcome,'FAILED');assert.equal((f.transport as FixtureTransport).calls,1);release();assert.equal((await first).outcome,'SUCCEEDED');
});
test('M18 GATEWAY model RPM, role routing and reasoned upgrade limits remain independent of permissions',async t=>{
  const f=await fixture(t,{models:[model('low'),model('strong')]}),a=await f.agent(),before=canonical(a.subject);
  await f.unified.requestEscalation(f.admin,a.subject,{reason:'QUALITY_INSUFFICIENT',from:'openai:low',to:'openai:strong',max_extra_cost_micros:10000});
  const result=await f.unified.bind(a.subject).complete({request_id:'upgrade',context:await f.view(a.subject),max_output_tokens:256});assert.equal(result.model_id,'strong');assert.equal(canonical(f.h.inspectAgent(a.id).subject),before);
  await f.unified.requestEscalation(f.admin,a.subject,{reason:'CAPABILITY_REQUIRED',from:'openai:low',to:'openai:strong',max_extra_cost_micros:10000});await assert.rejects(f.unified.requestEscalation(f.admin,a.subject,{reason:'QUALITY_INSUFFICIENT',from:'openai:low',to:'openai:strong',max_extra_cost_micros:10000}),/ESCALATION_LIMIT/);
  const g=await fixture(t,{models:[model('limited','openai',{requests_per_minute:1})]}),b=await g.agent(),context=await g.view(b.subject);await g.unified.bind(b.subject).complete({request_id:'rate-one',context,max_output_tokens:256});await assert.rejects(g.unified.bind(b.subject).complete({request_id:'rate-two',context,max_output_tokens:256}),/PROVIDER_RATE_LIMIT/);assert.equal((g.transport as FixtureTransport).calls,1);
});
test('M18 GATEWAY echoed secret and hostile error text never reach Archive/Audit/results',async t=>{
  for(const kind of ['echo','error'] as const)await t.test(kind,async sub=>{
    const secret='synthetic-test-openai-private-value-abc123',f=await fixture(sub,{respond:()=>{if(kind==='error')throw Error(secret);return wireFixture(JSON.stringify({kind:'FINAL',text:secret}),{chunk_bytes:1});}}),a=await f.agent();
    const result=await f.unified.bind(a.subject).complete({request_id:'secret',context:await f.view(a.subject),max_output_tokens:256});assert.equal(result.outcome,'INDETERMINATE');assert.equal(canonical(result).includes(secret),false);
    assert.equal(canonical(f.h.store.query('audit',{limit:100})).includes(secret),false);
    for(const name of await readdir(f.h.store.artifacts.objects)){if(!name.endsWith('.json'))continue;const ref=JSON.parse(await readFile(join(f.h.store.artifacts.objects,name),'utf8'));const chunks:Buffer[]=[];for await(const chunk of f.h.store.artifacts.read(ref))chunks.push(Buffer.from(chunk));assert.equal(Buffer.concat(chunks).includes(Buffer.from(secret)),false);}
    if(kind==='echo'){assert.equal(f.vault.list(f.vaultAdmin)[0].state,'QUARANTINED');assert.ok(f.vault.securityEvents(f.vaultAdmin).length>0);}
  });
});
