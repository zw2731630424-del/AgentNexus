import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { initializeControl } from '../../src/agentnexus/control.ts';
import { FeatureRegistry } from '../../src/agentnexus/features.ts';
import { NativeState } from '../../src/agentnexus/harness/state.ts';
import { ContextAssembly } from '../../src/agentnexus/harness/context.ts';
import { MessageBus } from '../../src/agentnexus/harness/messages.ts';
import type { AgentMessage, MessageBusOptions } from '../../src/agentnexus/harness/messages.ts';
import { invariant, uid } from '../../src/agentnexus/types.ts';
import type { Subject } from '../../src/agentnexus/harness/contracts.ts';

const S:Subject={agent_id:'parent',project_id:'message-project',task_id:'message-task',session_id:'parent-session',runtime_instance_id:'parent-runtime',
  agent_type:'DEVELOPMENT',model_binding:'mock',resource_budget_id:'parent-budget',policy_scope:'message-scope'};
const R:Subject={...S,agent_id:'child',session_id:'child-session',runtime_instance_id:'child-runtime',agent_type:'SUBAGENT',resource_budget_id:'child-budget'};
function setup(store:KernelStore){initializeControl(store);const token={},admin=(v:unknown)=>invariant(v===token,'ADMIN_CAPABILITY_REQUIRED');
  const definitions=['native.message-bus','native.context-assembly'].map(id=>({id,kind:'OPTIONAL' as const,default:'ON' as const,scopes:['G','P','A','T'],depends_on:[],conflicts:[]}));
  const features=new FeatureRegistry(store,definitions,admin,{busy:false});for(const d of definitions)features.register(token,d.id);
  return new NativeState(store,features,admin,uid());}
async function fixture(t:test.TestContext,extra:Partial<MessageBusOptions>={}){
  const base=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT??'../../evidence/components/test-data','messages');await mkdir(base,{recursive:true});
  const root=await mkdtemp(join(base,'case-')),store=await KernelStore.open(root),state=setup(store),identities=new Map([[S.agent_id,S],[R.agent_id,R]]);
  const options:MessageBusOptions={resolve:(id,p)=>{const s=identities.get(id);return s?.project_id===p?s:null;},authorize:(sender,receiver)=>sender.project_id===receiver.project_id,...extra};
  const bus=new MessageBus(state,options),context=new ContextAssembly(state),payload=await context.capture(S,'RAW',Buffer.from('message original'));
  t.after(()=>store.close());return{root,store,state,options,bus,context,payload,identities,sender:bus.bind(S),receiver:bus.bind(R)};
}

test('M16-MESSAGE-DURABLE: host-bound sender, exactly matching dedup and bidirectional ACK survive durable storage',async t=>{
  let wakes=0;const f=await fixture(t,{onDeliverable:(receiver,id)=>{wakes++;assert.ok([S.agent_id,R.agent_id].includes(receiver.agent_id));
    assert.ok(f.store.db.prepare("SELECT 1 FROM anx_records r JOIN anx_exports e USING(seq) WHERE r.operation_id=? AND json_extract(r.body,'$.phase')='MESSAGE_ENQUEUED'").get(id));}});
  const input={receiver_agent_id:R.agent_id,message_type:'TASK_ASSIGNED',payload:f.payload,dedup_key:'work-one'};
  const [a,b]=await Promise.all([f.sender.send(input),f.sender.send(input)]);assert.equal(a.message_id,b.message_id);assert.equal(f.state.count('MESSAGE'),1);assert.ok(wakes>=1);
  await assert.rejects(f.sender.send({...input,message_type:'OTHER'}),{code:'MESSAGE_DEDUP_CONFLICT'});
  const [leased]=await f.receiver.receive();assert.equal(leased.sender.agent_id,S.agent_id);assert.equal(leased.delivery_state,'LEASED');
  const ack=await f.receiver.ack(leased.message_id,leased.lease_token!);assert.equal(ack.delivery_state,'ACKNOWLEDGED');
  await assert.rejects(f.receiver.ack(leased.message_id,leased.lease_token!),{code:'MESSAGE_LEASE_STALE'});assert.deepEqual(await f.receiver.receive(),[]);
  const back=await f.context.capture(R,'RAW',Buffer.from('child result'));
  await f.receiver.send({receiver_agent_id:S.agent_id,message_type:'RESULT',payload:back,dedup_key:'result-one'});
  const [response]=await f.sender.receive();assert.equal(response.sender.agent_id,R.agent_id);await f.sender.ack(response.message_id,response.lease_token!);
  assert.equal((await f.store.verify()).pending,0);
});

test('M16-MESSAGE-AUTH: spoofed fields, foreign project, stale runtime and changed permissions fail closed',async t=>{
  let allowed=true;const f=await fixture(t,{authorize:()=>allowed});const input={receiver_agent_id:R.agent_id,message_type:'PROGRESS',payload:f.payload,dedup_key:'auth'};
  await assert.rejects(f.sender.send({...input,sender_agent_id:'host-admin'} as never),{code:'MESSAGE_FIELDS'});
  f.identities.set('foreign',{...R,agent_id:'foreign',project_id:'foreign-project'});
  await assert.rejects(f.sender.send({...input,receiver_agent_id:'foreign'}),{code:'MESSAGE_PROJECT_DENIED'});
  allowed=false;await assert.rejects(f.sender.send(input),{code:'MESSAGE_PERMISSION_DENIED'});allowed=true;
  await assert.rejects(f.sender.send({...input,payload:{...f.payload,record_hash:'f'.repeat(64)}}),{code:'CONTEXT_REFERENCE_HASH'});
  const m=await f.sender.send(input);allowed=false;assert.deepEqual(await f.receiver.receive(),[]);allowed=true;
  const [lease]=await f.receiver.receive();await assert.rejects(f.sender.ack(m.message_id,lease.lease_token!),{code:'MESSAGE_RECEIVER_DENIED'});
  f.identities.set(S.agent_id,{...S,runtime_instance_id:'replacement'});await assert.rejects(f.sender.send({...input,dedup_key:'stale'}),{code:'MESSAGE_STALE_BINDING'});
});

test('M16-MESSAGE-RETRY: bounded retries, expired leases, expiry/revocation and unknown effects never auto-replay',async t=>{
  const f=await fixture(t,{leaseMs:20,maxAttempts:2});
  const send=(key:string,effect:'INTERNAL'|'EXTERNAL'='INTERNAL')=>f.sender.send({receiver_agent_id:R.agent_id,message_type:'PROGRESS',payload:f.payload,dedup_key:key,effect});
  const internal=await send('internal');let [first]=await f.receiver.receive();
  await delay(25);await assert.rejects(f.receiver.ack(first.message_id,first.lease_token!),{code:'MESSAGE_LEASE_STALE'});
  assert.deepEqual(await f.receiver.receive(),[]);await delay(25);const [second]=await f.receiver.receive();assert.equal(second.attempts,2);
  const dead=await f.receiver.retry(second.message_id,second.lease_token!,'KNOWN_NOT_SENT');assert.equal(dead.delivery_state,'DEAD_LETTER');
  assert.equal(dead.message_id,internal.message_id);
  await send('unknown','EXTERNAL');[first]=await f.receiver.receive();assert.equal((await f.receiver.retry(first.message_id,first.lease_token!,'UNKNOWN')).delivery_state,'INDETERMINATE');
  assert.deepEqual(await f.receiver.receive(),[]);
  await send('self-reported-not-sent','EXTERNAL');[first]=await f.receiver.receive();
  assert.equal((await f.receiver.retry(first.message_id,first.lease_token!,'KNOWN_NOT_SENT')).delivery_state,'INDETERMINATE');
  assert.deepEqual(await f.receiver.receive(),[]);
  const expired=await f.sender.send({receiver_agent_id:R.agent_id,message_type:'RESULT',payload:f.payload,dedup_key:'expiry',expires_at:Date.now()+15});
  await delay(20);assert.deepEqual(await f.receiver.receive(),[]);assert.equal(f.state.get<AgentMessage>('MESSAGE',expired.message_id)!.delivery_state,'EXPIRED');
  const revoked=await send('revoke');assert.equal((await f.sender.revoke(revoked.message_id)).delivery_state,'REVOKED');assert.deepEqual(await f.receiver.receive(),[]);
  const effect=await send('leased-external','EXTERNAL');[first]=await f.receiver.receive();await delay(25);await f.receiver.receive();
  assert.equal(f.state.get<AgentMessage>('MESSAGE',effect.message_id)!.delivery_state,'INDETERMINATE');
});

test('M16-MESSAGE-CAPACITY: byte/record backpressure remains bounded and priority does not discard low priority',async t=>{
  const f=await fixture(t,{maxPending:2,maxBytes:32});
  const a=await f.sender.send({receiver_agent_id:R.agent_id,message_type:'PROGRESS',payload:f.payload,dedup_key:'low',priority:0});
  const b=await f.sender.send({receiver_agent_id:R.agent_id,message_type:'RESULT',payload:f.payload,dedup_key:'high',priority:9});
  await assert.rejects(f.sender.send({receiver_agent_id:R.agent_id,message_type:'PROGRESS',payload:f.payload,dedup_key:'overflow'}),{code:'MESSAGE_BACKPRESSURE'});
  const [one,two]=await f.receiver.receive({limit:2});assert.equal(one.message_id,b.message_id);assert.equal(two.message_id,a.message_id);
  await f.receiver.ack(one.message_id,one.lease_token!);await f.receiver.ack(two.message_id,two.lease_token!);
  assert.equal((await f.sender.send({receiver_agent_id:R.agent_id,message_type:'PROGRESS',payload:f.payload,dedup_key:'new'})).delivery_state,'QUEUED');
  await assert.rejects(f.receiver.receive({limit:17}),{code:'MESSAGE_RECEIVE_LIMIT'});
});

test('M16-MESSAGE-ACK-FAILURE: audit failure suppresses wake; callback failure retains acknowledged queue',async t=>{
  let wakes=0;const f=await fixture(t,{onDeliverable:()=>{wakes++;throw new Error('wake failed');}}),flush=f.store.flush.bind(f.store);
  f.store.flush=async()=>{throw new Error('synthetic ACK failure');};
  try{await assert.rejects(f.sender.send({receiver_agent_id:R.agent_id,message_type:'RESULT',payload:f.payload,dedup_key:'failed-barrier'}));}finally{f.store.flush=flush;}
  assert.equal(wakes,0);assert.equal(f.state.count('MESSAGE'),1);await flush();
  assert.equal(f.state.faulted,true);await assert.rejects(f.sender.send({receiver_agent_id:R.agent_id,message_type:'RESULT',payload:f.payload,dedup_key:'failed-barrier'}));
  await f.store.close();const restored=await KernelStore.open(f.root);t.after(()=>restored.close());const state=setup(restored),bus=new MessageBus(state,f.options);
  const same=await bus.bind(S).send({receiver_agent_id:R.agent_id,message_type:'RESULT',payload:f.payload,dedup_key:'failed-barrier'});
  assert.equal(same.delivery_state,'QUEUED');assert.equal(wakes,1);assert.equal(state.count('MESSAGE'),1);
  assert.equal((await bus.bind(R).receive()).length,1);
});

test('M16-MESSAGE-RECOVERY: real close/reopen fences old leases and quarantines external uncertainty',async t=>{
  const f=await fixture(t,{leaseMs:10});
  for(const effect of ['INTERNAL','EXTERNAL'] as const)await f.sender.send({receiver_agent_id:R.agent_id,message_type:'PROGRESS',payload:f.payload,dedup_key:effect,effect});
  const leases=await f.receiver.receive({limit:2});assert.equal(leases.length,2);await f.store.close();
  const restored=await KernelStore.open(f.root);try{
    const replacement={...R,session_id:'recovered-session',runtime_instance_id:'recovered-runtime'};f.identities.set(R.agent_id,replacement);
    f.identities.set(S.agent_id,{...S,session_id:'recovered-parent-session',runtime_instance_id:'recovered-parent-runtime'});
    const state=setup(restored),bus=new MessageBus(state,f.options),receiver=bus.bind(replacement);await receiver.receive();await delay(30);
    const queued=await receiver.receive();assert.equal(queued.length,1);assert.equal(queued[0].effect,'INTERNAL');
    assert.equal(state.list<AgentMessage>('MESSAGE').filter(x=>x.delivery_state==='INDETERMINATE').length,1);
    await assert.rejects(receiver.ack(queued[0].message_id,leases.find(x=>x.effect==='INTERNAL')!.lease_token!),{code:'MESSAGE_LEASE_STALE'});
    assert.equal((await receiver.ack(queued[0].message_id,queued[0].lease_token!)).delivery_state,'ACKNOWLEDGED');
    assert.ok(restored.query('audit',{project_id:S.project_id,limit:100}).some((record)=> (record.body as unknown as {phase:string}).phase==='MESSAGE_RECEIVER_REBOUND'));
  }finally{await restored.close();}
});

test('M16-MESSAGE-CLOCK: rollback cannot revive expired or leased deliveries',async t=>{
  const f=await fixture(t),real=Date.now();const mocked=t.mock.method(Date,'now',()=>real-10000);
  try{await assert.rejects(f.sender.send({receiver_agent_id:R.agent_id,message_type:'RESULT',payload:f.payload,dedup_key:'rollback'}),{code:'MESSAGE_CLOCK_INVALID'});}
  finally{mocked.mock.restore();}
  await assert.rejects(f.receiver.receive(),{code:'MESSAGE_CLOCK_INVALID'});
});

test('M16-MESSAGE-LOGICAL-DEDUPE: sender runtime replacement does not reset a task business dedup key',async t=>{
  const f=await fixture(t),input={receiver_agent_id:R.agent_id,message_type:'TASK_ASSIGNED',payload:f.payload,dedup_key:'stable-logical-request'};
  const first=await f.sender.send(input),replacement={...S,runtime_instance_id:'new-parent-runtime',session_id:'new-parent-session'};
  f.identities.set(S.agent_id,replacement);const next=f.bus.bind(replacement),duplicate=await next.send(input);
  assert.equal(first.message_id,duplicate.message_id);assert.equal(f.state.count('MESSAGE'),1);
  assert.equal((await next.revoke(first.message_id)).delivery_state,'REVOKED');
});
