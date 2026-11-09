import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir,mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openHarness } from '../../src/agentnexus/harness/index.ts';
import type { HarnessOptions } from '../../src/agentnexus/harness/index.ts';
import type { MockStep } from '../../src/agentnexus/harness/models.ts';
const limits={workers:4,memory_bytes:268435456,model_tokens:1000000,model_requests:1000,model_cost_micros:10000000,wall_ms:1000000};
async function fixture(options:HarnessOptions){const base=process.env.AGENTNEXUS_TEST_DATA_ROOT??join(tmpdir(),'agentnexus-m17');await mkdir(base,{recursive:true});const root=await mkdtemp(join(base,'history-')),h=await openHarness(root,options);await h.administration.createProject({id:'p',rules:['Original Archive records must never be replaced by a bounded index window.'],budget:limits});await h.administration.createAgent({id:'lead',project_id:'p',task_id:'task',type:'DEVELOPMENT',read_tasks:['child','sender'],budget:{...limits,workers:1}});await h.administration.createTask({id:'task',agent_id:'lead',goal:'Continue actual model/tool turns across a Host reopen.',max_turns:32,wall_ms:300000});return{h,root};}
const echo=(n:number):MockStep=>({reply:{kind:'TOOL_CALL',tool_name:'native.echo',arguments:{n}}});
test('M17 bounded task history continues beyond 32 references, preserves raw inputs and reopens the original task',async()=>{
  const steps:MockStep[]=[...Array.from({length:18},(_,i)=>echo(i)),{reply:{kind:'WAIT'}},...Array.from({length:6},(_,i)=>echo(i+18)),{reply:{kind:'FINAL',text:'completed after restoration'}}];
  const options:HarnessOptions={historyWindow:true,mocks:{'mock-main':steps}},first=await fixture(options);let h=first.h;
  try{assert.equal((await h.administration.dispatch('task')).state,'WAITING');const task=h.inspectTask('task');assert.equal(task.turns,19);assert.equal(task.history.length,32);assert.equal(task.history_dropped,5);
    const original=h.state.get<{context_view_id:string}>('MODEL_REQUEST','task.turn.1')!,before=await h.context.reconstruct(h.inspectAgent('lead').subject,original.context_view_id),oldRuntime=h.inspectAgent('lead').subject.runtime_instance_id;
    const raw=h.store.query('context',{project_id:'p',task_id:'task',limit:100}).map(record=>({event_id:record.event_id,hash:record.hash}));assert(raw.length>32);
    await h.close();h=await openHarness(first.root,options);assert.notEqual(h.inspectAgent('lead').subject.runtime_instance_id,oldRuntime);assert.equal(h.state.count('MODEL_REQUEST'),19);
    const restored=await h.context.reconstruct(h.inspectAgent('lead').subject,original.context_view_id);assert.deepEqual(restored.bytes,before.bytes);await h.administration.resumeTask('task');assert.equal((await h.administration.dispatch('task')).state,'SUCCEEDED');
    assert.equal(h.inspectTask('task').history.length,32);assert.equal(h.inspectTask('task').history_dropped,18);
    for(const record of raw){const actual=h.store.db.prepare('SELECT hash FROM anx_records WHERE event_id=?').get(record.event_id);assert.equal(actual?.hash,record.hash);}
    const rollover=h.store.db.prepare("SELECT COUNT(*) AS n FROM anx_records WHERE domain='audit' AND project_id='p' AND task_id='task' AND json_extract(body,'$.phase')='TASK_HISTORY_WINDOW_ADVANCED'").get();assert.equal(rollover?.n,18);await h.store.verify();
  }finally{await h.close();}
});
test('M17 default task history retains the inherited hard reference limit unless explicitly enabled',async()=>{
  const {h}=await fixture({mocks:{'mock-main':Array.from({length:20},(_,i)=>echo(i))}});try{const task=await h.administration.dispatch('task');assert.equal(task.state,'FAILED');assert.equal(task.reason,'TASK_HISTORY_REFERENCE_LIMIT');assert.equal(task.history.length,32);assert.equal(task.history_window,undefined);assert.equal(h.state.count('resource_reservation',{state:'UNKNOWN_QUARANTINED'}),0);}finally{await h.close();}
});
test('M17 handoff freezes both enabled and disabled history policies across opposite Host defaults',async()=>{
  for(const enabled of [true,false]){const first=await fixture({historyWindow:enabled});let h=first.h;
    try{await h.administration.createAgent({id:'child',task_id:'child',project_id:'p',type:'SUBAGENT',parent_id:'lead',read_tasks:['task'],budget:{...limits,workers:1}});
      await h.close();h=await openHarness(first.root,{historyWindow:!enabled});const target=await h.administration.handoffTask('task','child');assert.equal(target.history_window===true,enabled);
      const intent=h.state.list<{input:{history_window:boolean}}>('TASK_HANDOFF',{limit:1})[0];assert.equal(intent.input.history_window,enabled);const contract=await h.context.readRange(h.inspectAgent('child').subject,target.contract_ref);assert.equal(JSON.parse(contract.text).history_window!==undefined,enabled);
      assert.equal((await h.administration.handoffTask('task','child')).creation_hash,target.creation_hash);
    }finally{await h.close();}
  }
});
test('M17 message adoption and a pending handoff roll only the bounded index and preserve all original payloads',async()=>{
  const {h}=await fixture({historyWindow:true});let release!:()=>void,ready!:()=>void;const held=new Promise<void>(resolve=>release=resolve),reached=new Promise<void>(resolve=>ready=resolve),flush=h.store.flush.bind(h.store);let intercepted=false;
  try{await h.administration.createAgent({id:'child',task_id:'child',project_id:'p',type:'SUBAGENT',parent_id:'lead',read_tasks:['task','sender'],budget:{...limits,workers:1}});await h.administration.createAgent({id:'sender',task_id:'sender',project_id:'p',type:'RESIDENT',budget:{...limits,workers:1}});
    h.store.flush=async()=>{await flush();const row=h.store.db.prepare("SELECT json_extract(body,'$.phase') AS phase,json_extract(body,'$.agent_id') AS agent FROM anx_records WHERE domain='audit' ORDER BY seq DESC LIMIT 1").get();if(!intercepted&&row?.phase==='TASK_CREATED'&&row.agent==='child'){intercepted=true;ready();await held;}};
    const handoff=h.administration.handoffTask('task','child');await reached;const payloads=[];
    for(let i=0;i<32;i++)payloads.push((await h.bindAgent('sender').sendText({receiver_agent_id:'child',message_type:'INPUT',text:'Original payload '+i,dedup_key:'payload.'+i})).payload);
    assert.equal((await h.administration.dispatch('child')).state,'QUEUED');assert.equal((await h.administration.dispatch('child')).state,'QUEUED');assert.equal(h.inspectTask('child').history.length,32);assert.equal(h.state.count('MODEL_REQUEST'),0);
    release();const target=await handoff;assert.equal(target.history.length,32);assert.equal(target.history_dropped,1);assert.equal(target.received_message_ids.length,32);
    assert.equal((await h.administration.dispatch('child')).state,'SUCCEEDED');assert.equal(h.inspectTask('child').history_dropped,2);
    for(let i=0;i<payloads.length;i++)assert.equal((await h.context.readRange(h.inspectAgent('child').subject,payloads[i])).text,'Original payload '+i);await h.store.verify();
  }finally{release?.();h.store.flush=flush;await h.close();}
});
