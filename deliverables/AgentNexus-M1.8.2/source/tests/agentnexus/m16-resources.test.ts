import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { FeatureRegistry } from '../../src/agentnexus/features.ts';
import { initializeControl } from '../../src/agentnexus/control.ts';
import { invariant, sha256, uid } from '../../src/agentnexus/types.ts';
import type { FeatureDefinition } from '../../src/agentnexus/types.ts';
import { NativeState } from '../../src/agentnexus/harness/state.ts';
import type { Subject } from '../../src/agentnexus/harness/contracts.ts';
import { BudgetManager, RESOURCE_CAPABILITIES, RESOURCE_LIMITS, assertStrictCpuQualified } from '../../src/agentnexus/resources/index.ts';
import type { ReserveInput, ResourceAmounts } from '../../src/agentnexus/resources/index.ts';
import { assertResourceExecutionQualified } from '../../src/agentnexus/production/resources.ts';

// Real SQLite, FeatureRegistry and audit bytes; all runtime/OS observations SIMULATED.
const SUBJECT:Subject={agent_id:'resource-agent',project_id:'resource-project',task_id:'resource-task',session_id:'resource-session',runtime_instance_id:'resource-instance',agent_type:'SUBAGENT',model_binding:'mock',resource_budget_id:'worker',policy_scope:'project'};
const IDS=['resource.registry','resource.worker.budget','resource.project.budget','resource.platform.budget','resource.cpu.accounting'];
async function fixture(t:test.TestContext,limits:ResourceAmounts={workers:1,processes:2,memory_bytes:100,model_tokens:100,model_requests:8,model_cost_micros:100,cpu_user_us:1000,wall_ms:10000}){
  const base=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT??'../evidence/resource-line/test-data');await mkdir(base,{recursive:true});const path=await mkdtemp(join(base,'case-'));
  const store=await KernelStore.open(path);initializeControl(store);const admin=Object.freeze({}),check=(value:unknown)=>invariant(value===admin,'ADMIN_CAPABILITY_REQUIRED');
  const definitions:FeatureDefinition[]=IDS.map(id=>({id,kind:'OPTIONAL',default:'ON',scopes:['G','P','A','T'],depends_on:[],conflicts:[]}));
  const features=new FeatureRegistry(store,definitions,check,{busy:false});for(const id of IDS)features.register(admin,id,{});
  const state=new NativeState(store,features,check,'boot-a'),manager=new BudgetManager(state);t.after(()=>store.close());
  await manager.configure(admin,SUBJECT,{id:'worker',scope:'WORKER',owner_id:SUBJECT.runtime_instance_id,limits});
  await manager.configure(admin,SUBJECT,{id:'project',scope:'PROJECT',owner_id:SUBJECT.project_id,limits});
  await manager.configure(admin,SUBJECT,{id:'platform',scope:'PLATFORM',owner_id:'platform',limits});
  const input=(changes:Partial<ReserveInput>={}):ReserveInput=>({id:uid(),worker_budget_id:'worker',project_budget_id:'project',platform_budget_id:'platform',amounts:{workers:1},mode:'SIMULATED',operation_id:uid(),wait:false,expires_at:Date.now()+60000,...changes});
  const reserve=(changes:Partial<ReserveInput>={})=>manager.reserve(admin,SUBJECT,input(changes));
  return {store,admin,state,manager,features,input,reserve};
}

test('M16 RESOURCES SIMULATED: strict CPU remains BLOCKED independent of a registry description',()=>{
  assert.throws(()=>assertStrictCpuQualified('windows-cpu-rate'),{code:'M16_STRICT_CPU_BLOCKED'});
  assert.throws(()=>assertResourceExecutionQualified('REAL_WINDOWS'),{code:'M151_CPU_HARD_LIMIT_NOT_QUALIFIED'});
  assert.equal(RESOURCE_CAPABILITIES.find(c=>c.id==='cpu.consumption.windows.strict')?.qualification,'BLOCKED');
  assert.equal(RESOURCE_CAPABILITIES.some(c=>(c.qualification as string)==='PASS'),false);
  assert.equal(Object.isFrozen(RESOURCE_CAPABILITIES),true);
});

test('M16 RESOURCES SQLITE: competing reservations atomically obey all three budgets',async t=>{
  const f=await fixture(t),results=await Promise.all([f.reserve(),f.reserve()]);
  assert.equal(results.filter(r=>r.state==='RESERVED').length,1);assert.equal(results.filter(r=>r.state==='REJECTED').length,1);
  for(const id of ['worker','project','platform'])assert.equal(f.manager.budget(f.admin,id).held.workers,1);
  const other={...SUBJECT,agent_id:'other',runtime_instance_id:'other-instance',resource_budget_id:'other-worker'};
  await f.manager.configure(f.admin,other,{id:'other-worker',scope:'WORKER',owner_id:other.runtime_instance_id,limits:{workers:1}});
  const denied=await f.manager.reserve(f.admin,other,f.input({worker_budget_id:'other-worker'}));assert.equal(denied.state,'REJECTED');
  assert.equal(f.manager.budget(f.admin,'other-worker').held.workers,0,'failure at project/platform never leaves a partial worker hold');
});

test('M16 RESOURCES SIMULATED: admin and exact subject/project/worker scope cannot be forged',async t=>{
  const f=await fixture(t),r=await f.reserve();
  await assert.rejects(f.manager.reserve({},SUBJECT,f.input()),{code:'ADMIN_CAPABILITY_REQUIRED'});
  assert.throws(()=>f.manager.inspect(f.admin,{...SUBJECT,project_id:'foreign'},r.id),{code:'RESOURCE_SUBJECT_MISMATCH'});
  await assert.rejects(f.manager.reserve(f.admin,{...SUBJECT,project_id:'foreign'},f.input()),{code:'RESOURCE_BUDGET_SCOPE'});
  await assert.rejects(f.manager.configure(f.admin,SUBJECT,{id:'worker',scope:'WORKER',owner_id:SUBJECT.runtime_instance_id,limits:{workers:999}}),{code:'RESOURCE_BUDGET_IMMUTABLE'});
  await assert.rejects(f.manager.configure(f.admin,SUBJECT,{id:'project-alias',scope:'PROJECT',owner_id:SUBJECT.project_id,limits:{workers:99}}),{code:'RESOURCE_BUDGET_OWNER_EXISTS'});
  await assert.rejects(f.reserve({worker_budget_id:'worker-alias'}),{code:'RESOURCE_BUDGET_BINDING'});
});

test('M16 RESOURCES SQLITE: cumulative consumption settles once while capacity stays held until owner closure',async t=>{
  const f=await fixture(t),r=await f.reserve({amounts:{workers:1,memory_bytes:40,model_tokens:60,model_requests:1}});await f.manager.start(f.admin,SUBJECT,r.id);
  await f.manager.account(f.admin,SUBJECT,r.id,{sequence:1,source:'SIMULATED',evidence_hash:sha256('first'),values:{memory_bytes:20,model_tokens:25,model_requests:1},complete:true});
  for(const id of ['worker','project','platform']){const b=f.manager.budget(f.admin,id);assert.equal(b.spent.model_tokens,25);assert.equal(b.held.model_tokens,35);assert.equal(b.held.memory_bytes,40);}
  await assert.rejects(f.manager.account(f.admin,SUBJECT,r.id,{sequence:1,source:'SIMULATED',evidence_hash:sha256('duplicate'),values:{model_tokens:25},complete:true}),{code:'RESOURCE_ACCOUNTING_SEQUENCE'});
  const token=await f.manager.issueClosure(f.admin,SUBJECT,r.id,'SIMULATED_SETTLED');await f.manager.release(f.admin,SUBJECT,r.id,token);
  for(const id of ['worker','project','platform']){const b=f.manager.budget(f.admin,id);assert.equal(b.spent.model_tokens,25);assert.equal(b.held.model_tokens,0);assert.equal(b.held.workers,0);assert.equal(b.held.memory_bytes,0);}
  await assert.rejects(f.manager.release(f.admin,SUBJECT,r.id,token),{code:'RESOURCE_CLOSURE_REQUIRED'});
  const events=f.store.query('audit',{project_id:SUBJECT.project_id,limit:100}).filter(event=>(event.body as {detail?:{reservation_id?:string}}).detail?.reservation_id===r.id);
  assert.ok(events.length>=5);assert.ok(events.every(event=>event.operation_id===r.operation_id),'all resource events retain the original operation correlation');
  const next=await f.reserve({amounts:{model_tokens:76}});assert.equal(next.state,'REJECTED','released reservations do not erase lifetime consumed tokens');
});

test('M16 RESOURCES SIMULATED: fabricated, serialized, wrong-reservation and stale closure objects fail',async t=>{
  const f=await fixture(t),r=await f.reserve();await assert.rejects(f.manager.release(f.admin,SUBJECT,r.id,{complete:true}),{code:'RESOURCE_CLOSURE_REQUIRED'});
  const token=await f.manager.issueClosure(f.admin,SUBJECT,r.id,'NEVER_STARTED');
  await assert.rejects(f.manager.release(f.admin,SUBJECT,r.id,JSON.parse(JSON.stringify(token)) as object),{code:'RESOURCE_CLOSURE_REQUIRED'});
  await assert.rejects(f.manager.release(f.admin,SUBJECT,'other-reservation',token),{code:'RESOURCE_CLOSURE_REQUIRED'});
  await f.manager.start(f.admin,SUBJECT,r.id);await assert.rejects(f.manager.release(f.admin,SUBJECT,r.id,token),{code:'RESOURCE_CLOSURE_STALE'});
  assert.equal(f.manager.budget(f.admin,'platform').held.workers,1);
});

test('M16 RESOURCES SIMULATED: UNKNOWN, expiration and production-looking JSON never free capacity',async t=>{
  const f=await fixture(t),r=await f.reserve();await f.manager.start(f.admin,SUBJECT,r.id);await f.manager.unknown(f.admin,SUBJECT,r.id,'worker-exit-unknown');
  await assert.rejects(f.manager.issueClosure(f.admin,SUBJECT,r.id,'SIMULATED_SETTLED'),{code:'RESOURCE_CLOSURE_UNVERIFIED'});
  await assert.rejects(f.manager.releaseProduction(f.admin,SUBJECT,r.id,{state:'EXIT_VERIFIED',signature:'fake'}),{code:'M16_PRODUCTION_RESOURCE_RELEASE_BLOCKED'});
  const waiting=await f.reserve({wait:true});assert.equal(waiting.state,'WAITING');assert.equal((await f.manager.drainWaiters(f.admin,SUBJECT)).length,0);
  assert.equal(f.manager.budget(f.admin,'platform').held.workers,1);
});

test('M16 RESOURCES SQLITE: bounded persistent wait resumes only after a verified unused reservation closes',async t=>{
  const f=await fixture(t),r=await f.reserve(),wait=await f.reserve({wait:true});
  const token=await f.manager.issueClosure(f.admin,SUBJECT,r.id,'NEVER_STARTED');await f.manager.release(f.admin,SUBJECT,r.id,token);
  const ready=await f.manager.drainWaiters(f.admin,SUBJECT);assert.equal(ready.length,1);assert.equal(ready[0].id,wait.id);assert.equal(ready[0].state,'RESERVED');
  await f.manager.start(f.admin,SUBJECT,wait.id);assert.equal(f.manager.budget(f.admin,'platform').held.workers,1);
});

test('M16 RESOURCES SIMULATED: waiting state has a hard count bound; no unbounded in-memory queue',async t=>{
  const f=await fixture(t);await f.reserve();for(let i=0;i<RESOURCE_LIMITS.waiting;i++)assert.equal((await f.reserve({wait:true})).state,'WAITING');
  await assert.rejects(f.reserve({wait:true}),{code:'RESOURCE_WAIT_LIMIT'});assert.equal(f.state.count('resource_reservation',{state:'WAITING'}),RESOURCE_LIMITS.waiting);
  assert.equal(f.manager.budget(f.admin,'platform').held.workers,1);
});

test('M16 RESOURCES SQLITE: cancelled waiting requests cannot later acquire capacity or cancel active claims',async t=>{
  const f=await fixture(t),r=await f.reserve(),waiting=await f.reserve({wait:true});
  assert.equal((await f.manager.cancelWait(f.admin,SUBJECT,waiting.id)).state,'REJECTED');assert.equal(f.manager.budget(f.admin,'platform').held.workers,1);
  await assert.rejects(f.manager.cancelWait(f.admin,SUBJECT,r.id),{code:'RESOURCE_WAIT_CANCEL_STATE'});
  const token=await f.manager.issueClosure(f.admin,SUBJECT,r.id,'NEVER_STARTED');await f.manager.release(f.admin,SUBJECT,r.id,token);
  assert.deepEqual(await f.manager.drainWaiters(f.admin,SUBJECT),[]);assert.equal(f.manager.budget(f.admin,'platform').held.workers,0);
});

test('M16 RESOURCES SQLITE: old boot recovery preserves holds and consumed counters, rejects old wait and closure',async t=>{
  const f=await fixture(t),r=await f.reserve({amounts:{workers:1,model_tokens:20}});await f.manager.start(f.admin,SUBJECT,r.id);
  await f.manager.account(f.admin,SUBJECT,r.id,{sequence:1,source:'SIMULATED',evidence_hash:sha256('old-result'),values:{model_tokens:7},complete:true});
  const token=await f.manager.issueClosure(f.admin,SUBJECT,r.id,'SIMULATED_SETTLED'),waiting=await f.reserve({wait:true});
  // Actually close and reopen this synthetic SQLite store; this is not an OS restart test.
  const path=f.store.root;await f.store.close();const reopened=await KernelStore.open(path);initializeControl(reopened);t.after(()=>reopened.close());
  const check=(value:unknown)=>invariant(value===f.admin,'ADMIN_CAPABILITY_REQUIRED');const definitions:FeatureDefinition[]=IDS.map(id=>({id,kind:'OPTIONAL',default:'ON',scopes:['G','P','A','T'],depends_on:[],conflicts:[]}));
  const features=new FeatureRegistry(reopened,definitions,check,{busy:false});for(const id of IDS)features.register(f.admin,id,{});
  const manager=new BudgetManager(new NativeState(reopened,features,check,'boot-b'));
  assert.equal(await manager.recover(f.admin,SUBJECT),2);assert.equal(manager.inspect(f.admin,SUBJECT,r.id).state,'UNKNOWN_QUARANTINED');assert.equal(manager.inspect(f.admin,SUBJECT,waiting.id).state,'REJECTED');
  await assert.rejects(manager.release(f.admin,SUBJECT,r.id,token),{code:'RESOURCE_CLOSURE_REQUIRED'});
  assert.equal(manager.budget(f.admin,'platform').held.workers,1);assert.equal(manager.budget(f.admin,'platform').spent.model_tokens,7);assert.equal(manager.budget(f.admin,'platform').held.model_tokens,13);
});

test('M16 RESOURCES FEATURE: OFF blocks reserve/start and permits evidence-based cleanup without reopening execution',async t=>{
  const f=await fixture(t),r=await f.reserve();const preview=await f.features.preview(f.admin,[{id:'resource.project.budget',scope:{},state:'OFF'}],0);await f.features.commit(f.admin,preview.challenge_id,preview.preview_hash);
  await assert.rejects(f.reserve(),{code:'NATIVE_FEATURE_BLOCKED:resource.project.budget'});await assert.rejects(f.manager.start(f.admin,SUBJECT,r.id),{code:'NATIVE_FEATURE_BLOCKED:resource.project.budget'});
  const token=await f.manager.issueClosure(f.admin,SUBJECT,r.id,'NEVER_STARTED');await f.manager.release(f.admin,SUBJECT,r.id,token);assert.equal(f.manager.budget(f.admin,'platform').held.workers,0);
});

test('M16 RESOURCES AUDIT: failed durable reservation barrier produces zero starts and retains the committed hold',async t=>{
  const f=await fixture(t),flush=f.store.flush.bind(f.store),id=uid();let starts=0;f.store.flush=async()=>{throw Error('SIMULATED_AUDIT_FLUSH_FAILURE');};
  await assert.rejects((async()=>{await f.reserve({id});starts++;})());f.store.flush=flush;assert.equal(starts,0);assert.equal(f.manager.budget(f.admin,'platform').held.workers,1);
  assert.equal(f.manager.inspect(f.admin,SUBJECT,id).state,'RESERVED');await f.store.flush();assert.equal(f.state.faulted,true);
  await assert.rejects(f.reserve(),{code:'NATIVE_FEATURE_BLOCKED:resource.registry'});assert.equal(f.manager.budget(f.admin,'platform').held.workers,1);
});

test('M16 RESOURCES ACCOUNTING: observed overspend is recorded in all scopes and quarantines further admission',async t=>{
  const f=await fixture(t),r=await f.reserve({amounts:{cpu_user_us:80,memory_bytes:20}});await f.manager.start(f.admin,SUBJECT,r.id);
  const result=await f.manager.account(f.admin,SUBJECT,r.id,{sequence:1,source:'SIMULATED',evidence_hash:sha256('observed-overrun'),values:{cpu_user_us:150,memory_bytes:30},complete:false});assert.equal(result.state,'UNKNOWN_QUARANTINED');
  for(const id of ['worker','project','platform']){const b=f.manager.budget(f.admin,id);assert.equal(b.spent.cpu_user_us,150);assert.equal(b.state,'OVERDRAWN');assert.equal(b.held.memory_bytes,20);}
  assert.equal((await f.reserve({amounts:{}})).state,'REJECTED');await assert.rejects(f.manager.account(f.admin,SUBJECT,r.id,{sequence:2,source:'SIMULATED',evidence_hash:sha256('rollback'),values:{cpu_user_us:149,memory_bytes:30},complete:true}),{code:'RESOURCE_ACCOUNTING_ROLLBACK'});
});

test('M16 RESOURCES VALIDATION: invalid amounts, expired requests and strict mode cannot mutate holds',async t=>{
  const f=await fixture(t);for(const amounts of [{workers:-1},{workers:1.5},{workers:Number.MAX_SAFE_INTEGER+1},{invented:1}])await assert.rejects(f.reserve({amounts}));
  await assert.rejects(f.reserve({expires_at:Date.now()-1}),{code:'RESOURCE_EXPIRED'});await assert.rejects(f.reserve({mode:'STRICT_OS'}),{code:'M16_STRICT_CPU_BLOCKED'});assert.equal(f.manager.budget(f.admin,'platform').held.workers,0);
});

test('M16 RESOURCES SIMULATED: application bookkeeping never accepts a simulated completion as real OS proof',async t=>{
  const f=await fixture(t),r=await f.reserve({mode:'APPLICATION_BOUND'});await f.manager.start(f.admin,SUBJECT,r.id);
  await assert.rejects(f.manager.account(f.admin,SUBJECT,r.id,{sequence:1,source:'SIMULATED',evidence_hash:sha256('fake-simulation'),values:{},complete:true}),{code:'RESOURCE_ACCOUNTING_SOURCE'});
  await f.manager.account(f.admin,SUBJECT,r.id,{sequence:1,source:'TRUSTED_APPLICATION',evidence_hash:sha256('application-observation'),values:{},complete:true});
  await assert.rejects(f.manager.issueClosure(f.admin,SUBJECT,r.id,'SIMULATED_SETTLED'),{code:'RESOURCE_CLOSURE_UNVERIFIED'});assert.equal(f.manager.budget(f.admin,'platform').held.workers,1);
});
