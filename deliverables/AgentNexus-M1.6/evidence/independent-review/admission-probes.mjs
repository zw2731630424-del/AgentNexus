import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdir,mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openHarness} from '../../source/src/agentnexus/harness/index.ts';

const evidence=dirname(fileURLToPath(import.meta.url));
await mkdir(join(evidence,'runtime'),{recursive:true});
const worker={workers:1,memory_bytes:16777216,disk_bytes:1024,wall_ms:300000,model_tokens:100000,model_requests:100,model_cost_micros:1000000};
const results=[];
async function fixture(name,options={}){
  const root=await mkdtemp(join(evidence,'runtime',name+'-')),h=await openHarness(root,options);
  await h.administration.createProject({id:'probe',rules:['Only independent review-owned files and mock models.']});
  return {h,root};
}
async function agentTask(h,id,task,extra={},requirements){
  await h.administration.createAgent({id,project_id:'probe',task_id:task,type:'DEVELOPMENT',budget:worker,...extra});
  await h.administration.createTask({id:task,agent_id:id,goal:'Review admission and settlement invariants',wall_ms:30000,...(requirements?{requirements}:{})});
}
async function featureOff(h,id){const meta=h.administration.features.metadata(),p=await h.administration.features.previewFeatures([{id,scope:{project_id:'probe'},state:'OFF'}],meta.feature_revision);await h.administration.features.commitFeatures(p.challenge_id,p.preview_hash);}
function flushBarrier(h,phase,taskId){
  let reached,release,used=false;const ready=new Promise(r=>reached=r),gate=new Promise(r=>release=r),original=h.store.flush.bind(h.store);
  h.store.flush=async()=>{const row=h.store.db.prepare("SELECT task_id,json_extract(body,'$.phase') AS phase FROM anx_records WHERE domain='audit' ORDER BY seq DESC LIMIT 1").get();
    if(!used&&row?.phase===phase&&row.task_id===taskId){used=true;await original();reached();await gate;return;}return original();};
  return {ready,release,restore:()=>{h.store.flush=original;}};
}
async function probe(name,fn){if(process.env.REVIEW_PROBE_FILTER&&!name.includes(process.env.REVIEW_PROBE_FILTER))return;try{results.push({name,...await fn()});}catch(e){results.push({name,probe_error:String(e),stack:e.stack});}process.stdout.write(JSON.stringify(results.at(-1))+'\n');}

await probe('cancel-resource-wait-actual',async()=>{
  const {h}=await fixture('wait-cancel-actual',{platform_limits:{...worker,workers:1},mocks:{'mock-main':[{reply:{kind:'TOOL_CALL',tool_name:'review.hold',arguments:null}},{reply:{kind:'FINAL',text:'done'}}]}});
  let releaseHolder,holderStarted,b,runHolder,runWaiter;const gate=new Promise(r=>releaseHolder=r),started=new Promise(r=>holderStarted=r);
  try{
    h.administration.registerTool({id:'review.hold',version:'1',feature_id:'tool.test',capability:'PURE',policy_ids:[],requires_sandbox:false,schema:()=>{},execute:async()=>{holderStarted();await gate;return {data:'settled'};}});
    await agentTask(h,'holder','holder-task',{tools:[{tool_id:'review.hold',version:'1',capability:'PURE',resources:[]}]});await agentTask(h,'waiter','wait-task');
    runHolder=h.administration.dispatch('holder-task');const holderEntered=await Promise.race([started.then(()=>true),runHolder.then(t=>({early_task:t.state,reason:t.reason}))]);
    if(holderEntered!==true)return {precondition_failed:holderEntered};
    b=flushBarrier(h,'RESOURCE_RESERVED','wait-task');runWaiter=h.administration.dispatch('wait-task');const waitReached=await Promise.race([b.ready.then(()=>true),runWaiter.then(t=>({early_task:t.state,reason:t.reason}))]);
    if(waitReached!==true)return {precondition_failed:waitReached};
    const cancelled=await h.administration.cancelTask('wait-task');b.release();const waiter=await runWaiter;
    releaseHolder();await runHolder;
    return {cancel_ack:cancelled.state,waiter_state:waiter.state,stop_reason:waiter.stop_reason,pending_waiters:h.state.count('resource_reservation',{state:'WAITING'}),models_for_waiter:h.state.count('MODEL_REQUEST',{task_id:'wait-task'})};
  }finally{releaseHolder?.();b?.release();await runHolder?.catch(()=>{});await runWaiter?.catch(()=>{});b?.restore();await h.close();}
});

await probe('agent-type-registry-off',async()=>{
  const {h}=await fixture('registry-off');try{
    await featureOff(h,'native.agent-type-registry');let creationError=null;
    try{await agentTask(h,'agent','task');}catch(e){creationError=e.message;}
    const result=creationError?null:await h.administration.dispatch('task');
    return {feature_enabled:h.state.enabled('native.agent-type-registry',{project_id:'probe'}),creation_error:creationError,state:result?.state??'BLOCKED',models:h.state.count('MODEL_REQUEST')};
  }finally{await h.close();}
});

await probe('cancel-model-before-fixture-dispatch',async()=>{
  const {h}=await fixture('cancel-model');let b;
  try{
    await agentTask(h,'agent','task');b=flushBarrier(h,'MODEL_BUDGET_RESERVED','task');const running=h.administration.dispatch('task');const reached=await Promise.race([b.ready.then(()=>true),running.then(t=>({early_task:t.state,reason:t.reason}))]);
    if(reached!==true)return {precondition_failed:reached};
    const before=h.state.get('MODEL_MODEL','mock-main').sequence,cancelled=await h.administration.cancelTask('task');b.release();const result=await running;
    const model=h.state.get('MODEL_MODEL','mock-main'),budget=h.state.get('resource_budget','platform');
    return {sequence_at_cancel:before,cancel_ack:cancelled.state,sequence_after_cancel:model.sequence,task_state:result.state,model_tokens_spent:budget.spent.model_tokens,request_states:h.state.list('MODEL_REQUEST',{task_id:'task'}).map(r=>r.state)};
  }finally{b?.release();b?.restore();await h.close();}
});

await probe('subagent-shares-parent-task',async()=>{
  const {h}=await fixture('subagent-task');try{
    await agentTask(h,'parent','parent-task');
    let child,creationError=null;try{child=await h.administration.createAgent({id:'child',project_id:'probe',task_id:'parent-task',type:'SUBAGENT',parent_id:'parent',budget:worker});}catch(e){creationError=e.message;}
    if(!child)return {child_created:false,creation_error:creationError};
    const parent=h.inspectAgent('parent'),read=await h.bindAgent('child').readContext(parent.context_ref);
    return {child_created:true,same_task:child.subject.task_id===parent.subject.task_id,explicit_read_tasks:child.read_tasks,parent_context_read_bytes:Buffer.byteLength(read.text),independent_context_events:child.context_ref.event_id!==parent.context_ref.event_id};
  }finally{await h.close();}
});

await probe('sendText-logical-dedupe-after-reopen',async()=>{
  const {h,root}=await fixture('text-replay');
  await agentTask(h,'parent','parent-task',{read_tasks:['child-task']});
  await h.administration.createAgent({id:'child',project_id:'probe',task_id:'child-task',type:'SUBAGENT',parent_id:'parent',read_tasks:['parent-task'],budget:worker});
  const input={receiver_agent_id:'child',message_type:'QUESTION',text:'Stable text and business key across restart',dedup_key:'logical-one'};
  const first=await h.bindAgent('parent').sendText(input);await h.close();const restored=await openHarness(root);
  try{
    let duplicate=null,error=null;try{duplicate=await restored.bindAgent('parent').sendText(input);}catch(e){error=e.message;}
    return {first_message_id:first.message_id,duplicate_message_id:duplicate?.message_id??null,error,message_records:restored.state.count('MESSAGE'),text_drafts:restored.state.count('MESSAGE_TEXT')};
  }finally{await restored.close();}
});

await probe('budget-feature-off-host-reopen',async()=>{
  const {h,root}=await fixture('budget-off-reopen');await agentTask(h,'agent','task');
  const meta=h.administration.features.metadata(),changes=['resource.worker.budget','native.task-scheduler'].map(id=>({id,scope:{project_id:'probe'},state:'OFF'}));
  const preview=await h.administration.features.previewFeatures(changes,meta.feature_revision);await h.administration.features.commitFeatures(preview.challenge_id,preview.preview_hash);await h.close();
  let restored=null,error=null;try{restored=await openHarness(root);}catch(e){error=e.message;}
  try{return {harness_reopened:restored!==null,reopen_error:error,disabled_features:changes.map(c=>c.id)};}finally{await restored?.close();}
});

await probe('audit-claimed-flush-failure-zero-write',async()=>{
  const {h,root}=await fixture('audit-no-write',{mocks:{'mock-main':[{reply:{kind:'TOOL_CALL',tool_name:'review.write',resource_id:'probe:file',arguments:{text:'must never reach disk'}}}]}});
  const path=join(root,'audit-forbidden-output.txt');let calls=0,injected=false,original;
  try{
    h.administration.registerTool({id:'review.write',version:'1',feature_id:'tool.test',capability:'LOCAL_WRITE',policy_ids:['P.GIT_PUBLISH'],requires_sandbox:false,schema:()=>{},writer_resource:()=> 'probe:file',execute:async args=>{calls++;await writeFile(path,args.text);return {data:{written:true}};}});
    await agentTask(h,'agent','task',{tools:[{tool_id:'review.write',version:'1',capability:'LOCAL_WRITE',resources:['probe:file']}],file_scope:['probe:file']});
    assert.equal((await h.administration.dispatch('task')).reason,'APPROVAL_REQUIRED');await h.administration.approveTaskTool('task','Independent review allows this path only after audit ACK');await h.administration.resumeTask('task');
    original=h.store.flush.bind(h.store);h.store.flush=async()=>{const row=h.store.db.prepare("SELECT json_extract(body,'$.phase') AS phase FROM anx_records WHERE domain='audit' ORDER BY seq DESC LIMIT 1").get();
      if(!injected&&row?.phase==='CLAIMED'){injected=true;throw new Error('INDEPENDENT_SIMULATED_AUDIT_ACK_FAILURE');}return original();};
    const task=await h.administration.dispatch('task');
    return {injected,task_state:task.state,write_calls:calls,file_exists:existsSync(path),gateway_operations:h.store.db.prepare('SELECT state,executor_state FROM control_operations').all()};
  }finally{if(original)h.store.flush=original;await h.close();}
});

await probe('persistent-disk-after-task-release',async()=>{
  const {h,root}=await fixture('disk-release',{mocks:{'mock-main':[{reply:{kind:'TOOL_CALL',tool_name:'review.write',resource_id:'probe:file',arguments:{text:'x'.repeat(100)}}},{reply:{kind:'FINAL',text:'done'}}]}});const path=join(root,'persistent-review-output.txt');let calls=0;
  try{
    h.administration.registerTool({id:'review.write',version:'1',feature_id:'tool.test',capability:'LOCAL_WRITE',policy_ids:['P.GIT_PUBLISH'],requires_sandbox:false,schema:()=>{},writer_resource:()=> 'probe:file',execute:async args=>{calls++;await writeFile(path,args.text);return {data:{bytes:args.text.length}};}});
    await agentTask(h,'agent','task',{tools:[{tool_id:'review.write',version:'1',capability:'LOCAL_WRITE',resources:['probe:file']}],file_scope:['probe:file']},{disk_bytes:100});
    assert.equal((await h.administration.dispatch('task')).reason,'APPROVAL_REQUIRED');await h.administration.approveTaskTool('task','Write review-owned persistent output');await h.administration.resumeTask('task');const result=await h.administration.dispatch('task');
    const budget=h.state.get('resource_budget','platform');return {state:result.state,write_calls:calls,persistent_bytes:Buffer.byteLength(await readFile(path)),platform_disk_held:budget.held.disk_bytes,platform_disk_spent:budget.spent.disk_bytes,reservations:h.state.list('resource_reservation',{task_id:'task'}).map(r=>({state:r.state,mode:r.mode,disk:r.amounts.disk_bytes}))};
  }finally{await h.close();}
});

const label=process.env.REVIEW_RUN_LABEL??'initial';await writeFile(join(evidence,'admission-results-'+label+'.json'),JSON.stringify({node:process.version,observed_at:new Date().toISOString(),results},null,2)+'\n');
