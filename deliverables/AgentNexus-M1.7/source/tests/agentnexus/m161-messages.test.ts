import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { initializeControl } from '../../src/agentnexus/control.ts';
import { FeatureRegistry } from '../../src/agentnexus/features.ts';
import { NativeState } from '../../src/agentnexus/harness/state.ts';
import { ContextAssembly } from '../../src/agentnexus/harness/context.ts';
import type { ContextSource } from '../../src/agentnexus/harness/context.ts';
import { MessageBus } from '../../src/agentnexus/harness/messages.ts';
import type { AgentMessage, MessageBusOptions, MessageHandoff } from '../../src/agentnexus/harness/messages.ts';
import type { Subject } from '../../src/agentnexus/harness/contracts.ts';
import { canonical, invariant, uid } from '../../src/agentnexus/types.ts';

const S:Subject={agent_id:'m161-sender',project_id:'m161-messages',task_id:'sender-task',session_id:'sender-session',runtime_instance_id:'sender-runtime',
  agent_type:'DEVELOPMENT',model_binding:'mock',resource_budget_id:'sender-budget',policy_scope:'message-project'};
const R:Subject={...S,agent_id:'m161-receiver',task_id:'receiver-task',session_id:'receiver-session',runtime_instance_id:'receiver-runtime',agent_type:'SUBAGENT',resource_budget_id:'receiver-budget'};
const output=resolve(process.env.AGENTNEXUS_RELIABILITY_OUTPUT_ROOT??'../evidence/reliability/adhoc');
type TaskFixture={id:string;revision:number;subject:Subject;state:string;turns:number;received_message_ids:string[];history:ContextSource[];result_ref:ContextSource|null;reservation_id:string|null;adoptions:number};
function setup(store:KernelStore){initializeControl(store);const token={},check=(value:unknown)=>invariant(value===token,'ADMIN_CAPABILITY_REQUIRED');
  const definitions=['native.message-bus','native.context-assembly'].map(id=>({id,kind:'OPTIONAL' as const,default:'ON' as const,scopes:['G','P','A','T'],depends_on:[],conflicts:[]}));
  const features=new FeatureRegistry(store,definitions,check,{busy:false});for(const definition of definitions)features.register(token,definition.id);
  const state=new NativeState(store,features,check,uid()),identities=new Map([[S.agent_id,S],[R.agent_id,R]]);
  const options:MessageBusOptions={resolve:(id,project)=>{const subject=identities.get(id);return subject?.project_id===project?subject:null;},
    authorize:(sender,receiver)=>sender.project_id===receiver.project_id,readTask:()=>true};
  return{token,state,identities,options,context:new ContextAssembly(state,{readTask:()=>true})};}
async function newRoot(){const base=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT??join(output,'test-data'),'m161-messages');await mkdir(base,{recursive:true});return mkdtemp(join(base,'case-'));}
async function fixture(t:test.TestContext,extra:Partial<MessageBusOptions>={}){const root=await newRoot(),store=await KernelStore.open(root),rest=setup(store);
  const options={...rest.options,...extra},bus=new MessageBus(rest.state,options),payload=await rest.context.capture(S,'RAW',Buffer.from('immutable message payload'));
  t.after(()=>store.close());return{root,store,...rest,options,bus,payload,sender:bus.bind(S),receiver:bus.bind(R)};}
async function createTask(state:NativeState,actor=R){const task:TaskFixture={id:actor.task_id,revision:0,subject:actor,state:'QUEUED',turns:0,received_message_ids:[],history:[],result_ref:null,reservation_id:null,adoptions:0};
  await state.change(actor,'TASK_TEST_FIXTURE_CREATED',()=>state.insert('TASK',task.id,actor,task.state,task));return task;}
function adopt(state:NativeState,actor:Subject,message:AgentMessage){const old=state.get<TaskFixture>('TASK',actor.task_id)!;
  const task={...old,revision:old.revision+1,received_message_ids:[...old.received_message_ids,message.message_id],history:[...old.history,message.payload],adoptions:old.adoptions+1};
  state.update('TASK',task.id,old.revision,task.state,task);}
async function updateTask(state:NativeState,changes:Partial<TaskFixture>,actor=R){return state.change(actor,'TASK_TEST_FIXTURE_UPDATED',()=>{
  const old=state.get<TaskFixture>('TASK',actor.task_id)!,next={...old,...changes,revision:old.revision+1};state.update('TASK',old.id,old.revision,next.state,next);return next;});}
function send(f:Awaited<ReturnType<typeof fixture>>,dedup_key:string,changes:Partial<Parameters<typeof f.sender.send>[0]>={}){
  return f.sender.send({receiver_agent_id:R.agent_id,message_type:'TASK_ASSIGNED',payload:f.payload,dedup_key,task_id:R.task_id,operation_id:'operation-'+dedup_key,correlation_id:'correlation-'+dedup_key,...changes});}
const childMode=process.argv.indexOf('--m161-message-crash-child');
if(childMode>=0){
  const root=process.argv[childMode+1],mode=process.argv[childMode+2],store=await KernelStore.open(root),f=setup(store),bus=new MessageBus(f.state,f.options);
  await createTask(f.state);const payload=await f.context.capture(S,'RAW',Buffer.from('child process durable payload'));
  const first=await bus.bind(S).send({receiver_agent_id:R.agent_id,message_type:'TASK_ASSIGNED',payload,dedup_key:'child-internal',operation_id:'child-operation',correlation_id:'child-correlation'});
  if(mode==='leases'){
    await bus.bind(S).send({receiver_agent_id:R.agent_id,message_type:'EXTERNAL_REQUEST',payload,dedup_key:'child-external',effect:'EXTERNAL'});
    const leases=await bus.bind(R).receive({limit:2});process.stdout.write(JSON.stringify({phase:'LEASES_DURABLE',first:first.message_id,leases})+'\n');
    setInterval(()=>{},1000);await new Promise(()=>{});
  }else{
    const [lease]=await bus.bind(R).receive(),flush=store.flush.bind(store);store.flush=async()=>{
      await flush();const acknowledged=store.db.prepare("SELECT 1 FROM anx_records r JOIN anx_exports e USING(seq) WHERE r.operation_id=? AND json_extract(r.body,'$.phase')='MESSAGE_TASK_HANDOFF'").get(lease.message_id);
      if(acknowledged){process.stdout.write(JSON.stringify({phase:'HANDOFF_DURABLE_BEFORE_CALLER_ACK',message_id:lease.message_id,lease_token:lease.lease_token})+'\n');setInterval(()=>{},1000);await new Promise(()=>{});}
    };
    await bus.handoff(f.token,R,lease.message_id,lease.lease_token!,message=>adopt(f.state,R,message));
  }
}else{
const observations:{name:string;status:'PASS'|'FAIL';detail:unknown}[]=[];
function checked(name:string,fn:(t:test.TestContext)=>Promise<unknown>){test(name,async t=>{
  try{observations.push({name,status:'PASS',detail:(await fn(t))??null});}catch(error){observations.push({name,status:'FAIL',detail:{code:(error as {code?:string}).code??null,message:String(error)}});throw error;}
});}
after(async()=>{await mkdir(output,{recursive:true});await writeFile(join(output,'message-observations-'+process.pid+'.json'),JSON.stringify({schema:'agentnexus/m161/message-tests/1',node:process.version,platform:process.platform,
  assurance:'REAL_SQLITE_ZSTD_LOCAL_FILES; Task owner fixtures and crash barriers explicitly simulated; two child processes really killed; no OS reboot or external side effect qualification',observations},null,2)+'\n',{flag:'wx'});});
async function crash(t:test.TestContext,mode:string){const root=await newRoot(),child=spawn(process.execPath,[fileURLToPath(import.meta.url),'--m161-message-crash-child',root,mode],{stdio:['ignore','pipe','pipe'],windowsHide:true});
  const exited=once(child,'exit');let stderr='',stdout='';child.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-65536);});
  const ready=new Promise<Record<string,unknown>>((resolveReady,reject)=>{const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('child readiness timeout: '+stderr));},15000);
    child.once('error',error=>{clearTimeout(timer);reject(error);});child.once('exit',()=>{clearTimeout(timer);if(!stdout.includes('\n'))reject(new Error('child exited before barrier: '+stderr));});
    child.stdout.on('data',chunk=>{stdout+=chunk;invariant(stdout.length<=1024*1024,'TEST_CHILD_OUTPUT_LIMIT');const end=stdout.indexOf('\n');if(end>=0){clearTimeout(timer);try{resolveReady(JSON.parse(stdout.slice(0,end)) as Record<string,unknown>);}catch(error){reject(error);}}});});
  t.after(async()=>{if(child.exitCode===null&&child.signalCode===null){child.kill('SIGKILL');await exited;}});
  const marker=await ready;child.kill('SIGKILL');const exit=await exited;const recovered=await KernelStore.recoverAbandonedLock(root);assert.equal(recovered.recovered,true);
  return{root,marker,exit,lock_recovery:recovered,stderr};}

checked('M161-MESSAGE-ACK: delivery and receiver ACK cannot claim task processed/completed',async t=>{
  const f=await fixture(t);await createTask(f.state);const message=await send(f,'ack'),[lease]=await f.receiver.receive();assert.equal(lease.delivery_state,'LEASED');
  const ack=await f.receiver.ack(message.message_id,lease.lease_token!);assert.equal(ack.delivery_state,'ACKNOWLEDGED');assert.equal(f.state.count('MESSAGE_HANDOFF'),0);
  assert.equal(f.state.get<TaskFixture>('TASK',R.task_id)!.state,'QUEUED');assert.equal(f.state.get<TaskFixture>('TASK',R.task_id)!.adoptions,0);
  assert.equal(ack.task_id,R.task_id);assert.equal(ack.operation_id,'operation-ack');assert.equal(ack.correlation_id,'correlation-ack');
  await assert.rejects(f.receiver.ack(message.message_id,lease.lease_token!),{code:'MESSAGE_LEASE_STALE'});return{delivery:ack.delivery_state,task_state:'QUEUED',task_adoptions:0,operation_id:ack.operation_id};
});

checked('M161-MESSAGE-HANDOFF SIMULATED_TASK_OWNER: atomic adoption, ACK and actual result evidence are separate from completion',async t=>{
  const f=await fixture(t);await createTask(f.state);const message=await send(f,'handoff'),[lease]=await f.receiver.receive();
  await assert.rejects(f.bus.handoff({},R,message.message_id,lease.lease_token!,()=>{}),{code:'ADMIN_CAPABILITY_REQUIRED'});
  const receipt=await f.bus.handoff(f.token,R,message.message_id,lease.lease_token!,m=>adopt(f.state,R,m));assert.equal(receipt.state,'ACCEPTED');
  assert.equal(f.state.get<AgentMessage>('MESSAGE',message.message_id)!.delivery_state,'ACKNOWLEDGED');assert.equal((await f.bus.reconcileTask(f.token,R,R.task_id))[0].state,'ACCEPTED');
  await updateTask(f.state,{state:'RUNNING',turns:1});assert.equal((await f.bus.reconcileTask(f.token,R,R.task_id))[0].state,'PROCESSED');
  const result=await f.context.capture(R,'RAW',Buffer.from('verified task result'));await updateTask(f.state,{state:'SUCCEEDED',result_ref:result});
  const completed=(await f.bus.reconcileTask(f.token,R,R.task_id))[0];assert.equal(completed.state,'COMPLETED');assert.deepEqual(completed.result_ref,result);
  let repeated=0;const again=await f.bus.handoff(f.token,R,message.message_id,'obsolete-token',()=>{repeated++;});assert.equal(repeated,0);assert.equal(again.state,'COMPLETED');assert.equal(f.state.get<TaskFixture>('TASK',R.task_id)!.adoptions,1);
  assert.equal((await f.store.verify()).pending,0);return{receipt,completed,adoptions:1};
});

checked('M161-MESSAGE-ROLLBACK SIMULATED_TASK_OWNER: incomplete or throwing adoption rolls back task, receipt and ACK together',async t=>{
  const f=await fixture(t);await createTask(f.state);const message=await send(f,'rollback'),[lease]=await f.receiver.receive();
  await assert.rejects(f.bus.handoff(f.token,R,message.message_id,lease.lease_token!,()=>{}),{code:'MESSAGE_TASK_HANDOFF_INCOMPLETE'});
  await assert.rejects(f.bus.handoff(f.token,R,message.message_id,lease.lease_token!,m=>{adopt(f.state,R,m);throw new Error('SIMULATED_OWNER_FAILURE');}),/SIMULATED_OWNER_FAILURE/);
  assert.equal(f.state.get<TaskFixture>('TASK',R.task_id)!.adoptions,0);assert.equal(f.state.count('MESSAGE_HANDOFF'),0);assert.equal(f.state.get<AgentMessage>('MESSAGE',message.message_id)!.delivery_state,'LEASED');
  await f.bus.handoff(f.token,R,message.message_id,lease.lease_token!,m=>adopt(f.state,R,m));assert.equal(f.state.get<TaskFixture>('TASK',R.task_id)!.adoptions,1);return{transaction_rollback:true,subsequent_single_adoption:true};
});

checked('M161-MESSAGE-OPERATION-DEDUPE SIMULATED_TASK_OWNER: copied envelopes with one stable operation do not adopt twice',async t=>{
  const f=await fixture(t);await createTask(f.state);const first=await send(f,'copy-one',{operation_id:'stable-operation',correlation_id:'stable-correlation'}),second=await send(f,'copy-two',{operation_id:'stable-operation',correlation_id:'stable-correlation'});
  const leases=await f.receiver.receive({limit:2});let calls=0;for(const lease of leases)await f.bus.handoff(f.token,R,lease.message_id,lease.lease_token!,m=>{calls++;adopt(f.state,R,m);});
  assert.equal(calls,1);assert.equal(f.state.get<TaskFixture>('TASK',R.task_id)!.adoptions,1);assert.equal(f.state.count('MESSAGE_OPERATION'),1);
  const duplicate=f.state.get<MessageHandoff>('MESSAGE_HANDOFF',second.message_id)!;assert.equal(duplicate.duplicate_of,first.message_id);
  const result=await f.context.capture(R,'RAW',Buffer.from('result once'));await updateTask(f.state,{state:'SUCCEEDED',turns:1,result_ref:result});
  assert.equal((await f.bus.reconcileTask(f.token,R,R.task_id)).every(receipt=>receipt.state==='COMPLETED'),true);return{messages:2,operation_receipts:1,task_adoptions:calls,duplicate};
});

checked('M161-MESSAGE-OPERATION-CONFLICT SIMULATED_TASK_OWNER: changed payload/task/correlation cannot reuse adoption authority',async t=>{
  const f=await fixture(t);await createTask(f.state);await send(f,'original',{operation_id:'one-operation',correlation_id:'one-correlation'});let [lease]=await f.receiver.receive();await f.bus.handoff(f.token,R,lease.message_id,lease.lease_token!,m=>adopt(f.state,R,m));
  const changed=await f.context.capture(S,'RAW',Buffer.from('different bytes'));const second=await send(f,'changed',{payload:changed,operation_id:'one-operation',correlation_id:'one-correlation'});[lease]=await f.receiver.receive();
  await assert.rejects(f.bus.handoff(f.token,R,second.message_id,lease.lease_token!,m=>adopt(f.state,R,m)),{code:'MESSAGE_OPERATION_CONFLICT'});
  assert.equal(f.state.get<TaskFixture>('TASK',R.task_id)!.adoptions,1);assert.equal(f.state.get<AgentMessage>('MESSAGE',second.message_id)!.delivery_state,'LEASED');
  await assert.rejects(send(f,'wrong-task',{task_id:S.task_id}),{code:'MESSAGE_TASK_SCOPE'});return{conflicting_message:second.message_id,adoptions:1,conflict_retained:true};
});

checked('M161-MESSAGE-CONCURRENT: parallel consumers obtain disjoint leases and equal-priority delivery preserves durable enqueue order',async t=>{
  const f=await fixture(t);const shared={receiver_agent_id:R.agent_id,message_type:'UPDATE',payload:f.payload,dedup_key:'shared'};
  const duplicates=await Promise.all(Array.from({length:8},()=>f.sender.send(shared)));assert.equal(new Set(duplicates.map(message=>message.message_id)).size,1);
  const original=await f.receiver.receive();await f.receiver.ack(original[0].message_id,original[0].lease_token!);
  const sent=[];for(let i=0;i<8;i++)sent.push(await send(f,'ordered-'+i));
  const deliveries=(await Promise.all(Array.from({length:8},()=>f.receiver.receive({limit:2})))).flat();assert.equal(deliveries.length,8);assert.equal(new Set(deliveries.map(message=>message.message_id)).size,8);
  assert.deepEqual(deliveries.map(message=>message.message_id),sent.map(message=>message.message_id));
  for(const message of deliveries)await f.receiver.ack(message.message_id,message.lease_token!);assert.deepEqual(await f.receiver.receive(),[]);
  return{concurrent_sends:8,stable_message_ids:1,disjoint_leases:deliveries.length,sequences:deliveries.map(message=>message.sequence)};
});

checked('M161-MESSAGE-PERMISSIONS: permission revocation and replacement receiver runtime fence ACK and trusted handoff',async t=>{
  let allowed=true;const f=await fixture(t,{authorize:()=>allowed});await createTask(f.state);const sent=await send(f,'permissions'),[lease]=await f.receiver.receive();allowed=false;
  await assert.rejects(f.receiver.ack(sent.message_id,lease.lease_token!),{code:'MESSAGE_PERMISSION_DENIED'});
  await assert.rejects(f.bus.handoff(f.token,R,sent.message_id,lease.lease_token!,m=>adopt(f.state,R,m)),{code:'MESSAGE_PERMISSION_DENIED'});assert.equal(f.state.get<TaskFixture>('TASK',R.task_id)!.adoptions,0);
  allowed=true;const replacement={...R,session_id:'replacement-session',runtime_instance_id:'replacement-runtime'};f.identities.set(R.agent_id,replacement);
  await assert.rejects(f.receiver.ack(sent.message_id,lease.lease_token!),{code:'MESSAGE_STALE_BINDING'});
  await assert.rejects(f.bus.handoff(f.token,replacement,sent.message_id,lease.lease_token!,()=>{}),{code:'MESSAGE_RECEIVER_DENIED'});
  return{permission_revocation_blocks_ack:true,old_runtime_fenced:true,task_adoptions:0};
});

checked('M161-MESSAGE-WAKE-OUTBOX SIMULATED_CALLBACK_FAILURE: durable message survives sender exit and pending notification is recovered',async t=>{
  let fail=true,wakes=0;const f=await fixture(t,{onDeliverable:()=>{wakes++;if(fail)throw new Error('SIMULATED_WAKE_FAILURE');}});const sent=await send(f,'wake');assert.equal(f.state.get<{state:string}>('MESSAGE_WAKE',sent.message_id)!.state,'PENDING');
  f.identities.delete(S.agent_id);fail=false;const recovered=await f.bus.recover(f.token);assert.equal(recovered.wakes,1);assert.equal(wakes,2);
  const [lease]=await f.receiver.receive();assert.equal(lease.message_id,sent.message_id);await f.receiver.ack(sent.message_id,lease.lease_token!);
  await assert.rejects(send(f,'sender-exited'),{code:'MESSAGE_STALE_BINDING'});assert.equal(f.state.get<{state:string}>('MESSAGE_WAKE',sent.message_id)!.state,'NOTIFIED');
  return{sender_exit:true,message_lost:false,wake_attempts:wakes,recovered};
});

checked('M161-MESSAGE-EXPIRY-REVOKE: queued expiry/revocation terminate delivery and in-flight external uncertainty never retries',async t=>{
  const f=await fixture(t,{leaseMs:30}),expired=await send(f,'expires',{expires_at:Date.now()+30});await delay(40);assert.deepEqual(await f.receiver.receive(),[]);assert.equal(f.state.get<AgentMessage>('MESSAGE',expired.message_id)!.delivery_state,'EXPIRED');
  const revoked=await send(f,'revoked');await f.sender.revoke(revoked.message_id);assert.deepEqual(await f.receiver.receive(),[]);
  const external=await send(f,'external',{effect:'EXTERNAL'}),[lease]=await f.receiver.receive();assert.equal((await f.receiver.retry(external.message_id,lease.lease_token!,'KNOWN_NOT_SENT')).delivery_state,'INDETERMINATE');
  const revokedExternal=await send(f,'external-revoke',{effect:'EXTERNAL'});await f.receiver.receive();assert.equal((await f.sender.revoke(revokedExternal.message_id)).delivery_state,'INDETERMINATE');
  const expiredExternal=await send(f,'external-expiry',{effect:'EXTERNAL',expires_at:Date.now()+30});await f.receiver.receive();await delay(40);await f.bus.recover(f.token);assert.equal(f.state.get<AgentMessage>('MESSAGE',expiredExternal.message_id)!.delivery_state,'INDETERMINATE');
  assert.deepEqual(await f.receiver.receive(),[]);return{expired:expired.message_id,revoked:revoked.message_id,external_unknown:[external.message_id,revokedExternal.message_id,expiredExternal.message_id],automatic_replay:false};
});

checked('M161-MESSAGE-REAL-PROCESS-RESTART: killed host recovers internal delivery but quarantines leased external effects',async t=>{
  const child=await crash(t,'leases'),store=await KernelStore.open(child.root);t.after(()=>store.close());const f=setup(store),replacement={...R,session_id:'new-receiver-session',runtime_instance_id:'new-receiver-runtime'};f.identities.set(R.agent_id,replacement);f.identities.delete(S.agent_id);
  const bus=new MessageBus(f.state,f.options);await bus.recover(f.token);await delay(50);const [internal]=await bus.bind(replacement).receive();assert.ok(internal);assert.equal(internal.effect,'INTERNAL');assert.equal(internal.message_id,child.marker.first);
  const old=(child.marker.leases as AgentMessage[]).find(message=>message.effect==='INTERNAL')!;await assert.rejects(bus.bind(replacement).ack(internal.message_id,old.lease_token!),{code:'MESSAGE_LEASE_STALE'});
  await bus.bind(replacement).ack(internal.message_id,internal.lease_token!);await bus.recover(f.token);assert.deepEqual(await bus.bind(replacement).receive(),[]);
  assert.equal(f.state.list<AgentMessage>('MESSAGE').filter(message=>message.delivery_state==='INDETERMINATE').length,1);
  return{phase:child.marker.phase,process_exit:child.exit,lock_recovery:child.lock_recovery,redelivered_internal:internal.message_id,external_state:'INDETERMINATE',real_process_kill:true,os_reboot:false};
});

checked('M161-MESSAGE-REAL-ACK-LOSS SIMULATED_CRASH_BARRIER: process death after durable handoff before caller ACK never repeats task adoption',async t=>{
  const child=await crash(t,'handoff'),store=await KernelStore.open(child.root);t.after(()=>store.close());const f=setup(store),replacement={...R,session_id:'restarted-receiver-session',runtime_instance_id:'restarted-receiver-runtime'};f.identities.set(R.agent_id,replacement);
  const bus=new MessageBus(f.state,f.options);let repeats=0;const receipt=await bus.handoff(f.token,replacement,String(child.marker.message_id),String(child.marker.lease_token),()=>{repeats++;});
  assert.equal(receipt.state,'ACCEPTED');assert.equal(repeats,0);assert.equal(f.state.get<TaskFixture>('TASK',R.task_id)!.adoptions,1);assert.equal(f.state.get<AgentMessage>('MESSAGE',String(child.marker.message_id))!.delivery_state,'ACKNOWLEDGED');
  await bus.recover(f.token);assert.deepEqual(await bus.bind(replacement).receive(),[]);assert.equal((await store.verify()).pending,0);
  const impostor={...replacement,task_id:'different-task'};f.identities.set(R.agent_id,impostor);
  await assert.rejects(bus.handoff(f.token,impostor,String(child.marker.message_id),String(child.marker.lease_token),()=>{}),{code:'MESSAGE_RECEIVER_DENIED'});
  return{phase:child.marker.phase,process_exit:child.exit,lock_recovery:child.lock_recovery,task_adoptions:1,repeated_adoptions:repeats,receipt,real_process_kill:true,barrier:'SIMULATED_WAIT_AFTER_REAL_FSYNC'};
});

checked('M161-MESSAGE-COMPLETION-EVIDENCE SIMULATED_TASK_OWNER: self-reported success or held/unknown task claims cannot become completed',async t=>{
  const f=await fixture(t);await createTask(f.state);await send(f,'evidence');const [lease]=await f.receiver.receive();await f.bus.handoff(f.token,R,lease.message_id,lease.lease_token!,m=>adopt(f.state,R,m));
  await updateTask(f.state,{state:'SUCCEEDED'});await assert.rejects(f.bus.reconcileTask(f.token,R,R.task_id),{code:'MESSAGE_TASK_COMPLETION_EVIDENCE'});
  const result=await f.context.capture(R,'RAW',Buffer.from('actual result'));await updateTask(f.state,{result_ref:result,reservation_id:'held-reservation'});
  await assert.rejects(f.bus.reconcileTask(f.token,R,R.task_id),{code:'MESSAGE_TASK_COMPLETION_EVIDENCE'});
  await updateTask(f.state,{state:'UNKNOWN_QUARANTINED'});assert.equal((await f.bus.reconcileTask(f.token,R,R.task_id))[0].state,'INDETERMINATE');
  await updateTask(f.state,{state:'SUCCEEDED',reservation_id:null});assert.equal((await f.bus.reconcileTask(f.token,R,R.task_id))[0].state,'INDETERMINATE','unknown receipt requires explicit reconciliation authority, not an automatic retry or status downgrade');
  return{forged_completion_rejected:true,held_claim_rejected:true,unknown_retained:true};
});

checked('M161-MESSAGE-RECOVERY-BOUND SIMULATED_BOOT_REPLACEMENT: mass lease recovery commits at most 32 audited transitions per call',async t=>{
  const f=await fixture(t,{leaseMs:60000});for(let i=0;i<80;i++)await send(f,'mass-'+i);
  for(let batch=0;batch<5;batch++)assert.equal((await f.receiver.receive({limit:16})).length,16);
  const replacement=setup(f.store),bus=new MessageBus(replacement.state,f.options),counts:number[]=[];
  for(let i=0;i<3;i++){
    await bus.recover(replacement.token);counts.push(replacement.state.count('MESSAGE',{state:'QUEUED'}));
    assert.equal(Number(f.store.db.prepare("SELECT COUNT(*) AS n FROM anx_records WHERE json_extract(body,'$.phase')='MESSAGE_RECOVERY_TRANSITION'").get()!.n),counts[i]);
    assert.equal(Number(f.store.db.prepare('SELECT COUNT(*) AS n FROM anx_outbox').get()!.n),0);
  }
  assert.deepEqual(counts,[32,64,80]);assert.equal(replacement.state.count('MESSAGE',{state:'LEASED'}),0);return{messages:80,queued_after_each_recovery:counts,max_transitions_per_call:32,synthetic_boot_change:true};
});

checked('M161-MESSAGE-EXPIRED-BATCH SIMULATED_WALL_ADVANCE: unswept expired queue records never leak into delivery',async t=>{
  const f=await fixture(t);let wall=Date.now();const clock=t.mock.method(Date,'now',()=>wall);
  try{
    for(let i=0;i<80;i++)await send(f,'expired-mass-'+i,{expires_at:wall+1000});wall+=2000;
    const counts:number[]=[];for(let i=0;i<3;i++){assert.deepEqual(await f.receiver.receive({limit:16}),[]);counts.push(f.state.count('MESSAGE',{state:'EXPIRED'}));}
    assert.deepEqual(counts,[32,64,80]);assert.equal(f.state.count('MESSAGE',{state:'LEASED'}),0);return{expired_after_each_receive:counts,delivered_expired_messages:0,wall_advance:'SIMULATED'};
  }finally{clock.mock.restore();}
});

checked('M161-MESSAGE-COORDINATOR: fixed trusted notices reach two project tasks without cross-project raw access or generic send authority',async t=>{
  const f=await fixture(t),coordinator:Subject={...S,agent_id:'coordinator',agent_type:'COORDINATOR',project_id:'coordination-project',task_id:'coordinator-task'},
    second:Subject={...R,agent_id:'second-project-agent',project_id:'second-project',task_id:'second-project-task',session_id:'second-session',runtime_instance_id:'second-runtime'};
  f.identities.set(coordinator.agent_id,coordinator);f.identities.set(second.agent_id,second);
  const options:MessageBusOptions={...f.options,authorize:(sender,receiver,type)=>sender.project_id===receiver.project_id ||
    sender.agent_id===coordinator.agent_id&&sender.agent_type==='COORDINATOR'&&type==='COORDINATOR_NOTICE'&&[R.project_id,second.project_id].includes(receiver.project_id)};
  const bus=new MessageBus(f.state,options);await createTask(f.state);await createTask(f.state,second);
  const origin=await f.context.capture(coordinator,'RAW',Buffer.from('private coordinator context'));
  const notices=[];for(const receiver of [R,second]){
    const payload=await f.context.capture(receiver,'RAW',Buffer.from(canonical({origin:coordinator,text:'Read-only coordination notice',advisory:true})));
    const notice=await bus.enqueueCoordinatorNotice(f.token,coordinator,receiver,payload,'same-notice-for-two-projects');notices.push(notice);
    assert.equal(notice.project_id,receiver.project_id);assert.equal(notice.task_id,receiver.task_id);assert.deepEqual(notice.sender,coordinator);assert.equal(notice.effect,'INTERNAL');assert.equal(notice.message_type,'COORDINATOR_NOTICE');
    const [lease]=await bus.bind(receiver).receive();assert.equal(lease.message_id,notice.message_id);
    const receipt=await bus.handoff(f.token,receiver,lease.message_id,lease.lease_token!,m=>adopt(f.state,receiver,m));assert.equal(receipt.state,'ACCEPTED');
    assert.equal(JSON.parse((await f.context.readRange(receiver,payload)).text).text,'Read-only coordination notice');
    await assert.rejects(f.context.readRange(receiver,origin),{code:'CONTEXT_PROJECT_DENIED'});
    assert.throws(()=>f.context.validate(coordinator,payload),{code:'CONTEXT_PROJECT_DENIED'});
  }
  assert.notEqual(notices[0].message_id,notices[1].message_id);
  await assert.rejects(bus.bind(coordinator).send({receiver_agent_id:R.agent_id,message_type:'COORDINATOR_NOTICE',payload:origin,dedup_key:'generic-cross-project'}),{code:'MESSAGE_PROJECT_DENIED'});
  assert.equal(f.state.count('MESSAGE_HANDOFF'),2);return{target_projects:notices.map(notice=>notice.project_id),messages:notices.map(notice=>notice.message_id),generic_send_cross_project:false,raw_read_cross_project:false};
});

checked('M161-MESSAGE-COORDINATOR-DENIAL: admin/type/runtime/target payload/permission fences and content dedup survive the advisory lane',async t=>{
  const f=await fixture(t),coordinator:Subject={...S,agent_id:'coordinator',agent_type:'COORDINATOR',project_id:'coordination-project',task_id:'coordinator-task'};f.identities.set(coordinator.agent_id,coordinator);
  let allowed=true;const bus=new MessageBus(f.state,{...f.options,authorize:(_sender,_receiver,type)=>allowed&&type==='COORDINATOR_NOTICE'});
  const text=canonical({origin:coordinator,text:'same advisory bytes'}),payload=await f.context.capture(R,'RAW',Buffer.from(text));
  await assert.rejects(bus.enqueueCoordinatorNotice({},coordinator,R,payload,'no-admin'),{code:'ADMIN_CAPABILITY_REQUIRED'});
  await assert.rejects(bus.enqueueCoordinatorNotice(f.token,S,R,payload,'wrong-type'),{code:'MESSAGE_COORDINATOR_REQUIRED'});
  await assert.rejects(bus.enqueueCoordinatorNotice(f.token,{...coordinator,session_id:'forged'},R,payload,'wrong-runtime'),{code:'MESSAGE_STALE_BINDING'});
  const wrongOrigin=await f.context.capture(coordinator,'RAW',Buffer.from(text));await assert.rejects(bus.enqueueCoordinatorNotice(f.token,coordinator,R,wrongOrigin,'wrong-payload-project'),{code:'CONTEXT_PROJECT_DENIED'});
  allowed=false;await assert.rejects(bus.enqueueCoordinatorNotice(f.token,coordinator,R,payload,'not-authorized'),{code:'MESSAGE_PERMISSION_DENIED'});allowed=true;
  const first=await bus.enqueueCoordinatorNotice(f.token,coordinator,R,payload,'stable-advisory'),copy=await f.context.capture(R,'RAW',Buffer.from(text));
  const duplicate=await bus.enqueueCoordinatorNotice(f.token,coordinator,R,copy,'stable-advisory');assert.equal(duplicate.message_id,first.message_id);assert.deepEqual(duplicate.payload,payload);
  const different=await f.context.capture(R,'RAW',Buffer.from('changed advisory'));await assert.rejects(bus.enqueueCoordinatorNotice(f.token,coordinator,R,different,'stable-advisory'),{code:'MESSAGE_DEDUP_CONFLICT'});
  const otherTask={...R,task_id:'other-target-task'};f.identities.set(R.agent_id,otherTask);await assert.rejects(bus.enqueueCoordinatorNotice(f.token,coordinator,otherTask,payload,'wrong-target-task'),{code:'MESSAGE_TASK_SCOPE'});
  assert.equal(f.state.count('MESSAGE'),1);return{content_dedup_message:first.message_id,retained_original_event:first.payload.event_id,denials_before_enqueue:true,message_count:1};
});
}
