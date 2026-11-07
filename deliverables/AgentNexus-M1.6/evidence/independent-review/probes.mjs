import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openHarness} from '../../source/src/agentnexus/harness/index.ts';

const evidence=dirname(fileURLToPath(import.meta.url));
await mkdir(join(evidence,'runtime'),{recursive:true});
const results=[];
async function fixture(name,steps=[]){
  const root=await mkdtemp(join(evidence,'runtime',name+'-'));
  const h=await openHarness(root,{mocks:{'mock-main':steps}});
  await h.administration.createProject({id:'probe',rules:['Only review-owned files may be written. Mock models only.']});
  return {h,root};
}
async function agentAndTask(h,{id='probe-agent',task='probe-task',tools,file_scope}={}){
  const record=await h.administration.createAgent({id,project_id:'probe',task_id:task,type:'DEVELOPMENT',
    budget:{workers:1,memory_bytes:16777216,wall_ms:300000,model_tokens:100000,model_requests:100,model_cost_micros:1000000},
    ...(tools?{tools}:{}),...(file_scope?{file_scope}:{})});
  await h.administration.createTask({id:task,agent_id:id,goal:'Complete independent review probe',wall_ms:30000});
  return record;
}
async function featureOff(h,id){
  const meta=h.administration.features.metadata();
  const p=await h.administration.features.previewFeatures([{id,scope:{project_id:'probe'},state:'OFF'}],meta.feature_revision);
  await h.administration.features.commitFeatures(p.challenge_id,p.preview_hash);
}
function flushBarrier(h,phase,taskId){
  let reached,release,used=false;
  const ready=new Promise(r=>reached=r),gate=new Promise(r=>release=r),original=h.store.flush.bind(h.store);
  h.store.flush=async()=>{
    const row=h.store.db.prepare("SELECT task_id,json_extract(body,'$.phase') AS phase FROM anx_records WHERE domain='audit' ORDER BY seq DESC LIMIT 1").get();
    if(!used&&row?.phase===phase&&(!taskId||row.task_id===taskId)){used=true;await original();reached();await gate;return;}
    return original();
  };
  return {ready,release,restore:()=>{h.store.flush=original;}};
}
async function probe(name,fn){
  if(process.env.REVIEW_PROBE_FILTER&&!name.includes(process.env.REVIEW_PROBE_FILTER))return;
  try{results.push({name,...await fn()});}catch(e){results.push({name,probe_error:String(e),stack:e.stack});}
  process.stdout.write(JSON.stringify(results.at(-1))+'\n');
}

await probe('role-off-existing-agent',async()=>{
  const {h}=await fixture('role-off');try{
    await agentAndTask(h);await featureOff(h,'runtime.role.lead');
    let task,error=null;try{task=await h.administration.dispatch('probe-task');}catch(e){error=e.message;}
    return {feature_effective:h.state.enabled('runtime.role.lead',{project_id:'probe'}),state:task?.state??'BLOCKED',error,model_requests:h.state.count('MODEL_REQUEST')};
  }finally{await h.close();}
});

await probe('mock-provider-off',async()=>{
  const {h}=await fixture('mock-off');try{
    await agentAndTask(h);await featureOff(h,'model.mock-provider');
    let task,error=null;try{task=await h.administration.dispatch('probe-task');}catch(e){error=e.message;}
    return {feature_effective:h.state.enabled('model.mock-provider',{project_id:'probe'}),state:task?.state??'BLOCKED',error,model_requests:h.state.count('MODEL_REQUEST')};
  }finally{await h.close();}
});

await probe('cancel-before-approved-pending-tool',async()=>{
  const {h,root}=await fixture('cancel-write',[{reply:{kind:'TOOL_CALL',tool_name:'review.write',tool_version:'1',resource_id:'probe:file',arguments:{text:'real write after cancel'}}}]);
  const output=join(root,'review-side-effect.txt');let calls=0;let b;
  try{
    h.administration.registerTool({id:'review.write',version:'1',feature_id:'tool.test',capability:'LOCAL_WRITE',policy_ids:['P.GIT_PUBLISH'],requires_sandbox:false,
      schema:args=>assert.equal(typeof args.text,'string'),writer_resource:()=> 'probe:file',execute:async args=>{calls++;await writeFile(output,args.text,'utf8');return {data:{written:true}};}});
    await agentAndTask(h,{tools:[{tool_id:'review.write',version:'1',capability:'LOCAL_WRITE',resources:['probe:file']}],file_scope:['probe:file']});
    assert.equal((await h.administration.dispatch('probe-task')).reason,'APPROVAL_REQUIRED');
    await h.administration.approveTaskTool('probe-task','Independent review authorizes this review-owned file only');
    await h.administration.resumeTask('probe-task');
    b=flushBarrier(h,'TASK_DISPATCHED');const running=h.administration.dispatch('probe-task');
    const reached=await Promise.race([b.ready.then(()=>true),running.then(t=>({early_task:t.state,reason:t.reason}))]);
    if(reached!==true)return {precondition_failed:reached};
    const stopped=await h.administration.cancelTask('probe-task');b.release();
    const task=await running;
    return {cancel_ack_state:stopped.state,final_state:task.state,write_calls:calls,file_text:calls?await readFile(output,'utf8'):null,output};
  }finally{b?.release();b?.restore();await h.close();}
});

await probe('project-pause-concurrent-admission',async()=>{
  const {h}=await fixture('project-pause');let a,b;
  try{
    await agentAndTask(h,{id:'agent-a',task:'task-a'});await agentAndTask(h,{id:'agent-b',task:'task-b'});
    a=flushBarrier(h,'TASK_DISPATCHED','task-a');b=flushBarrier(h,'TASK_DISPATCHED','task-b');
    const runA=h.administration.dispatch('task-a');const reached=await Promise.race([a.ready.then(()=>true),runA.then(t=>({early_task:t.state,reason:t.reason}))]);
    if(reached!==true)return {precondition_failed:reached};
    const pausing=h.administration.setProjectState('probe','PAUSED');
    const runB=h.administration.dispatch('task-b').catch(e=>({state:'BLOCKED',reason:e.message}));const enteredB=await Promise.race([b.ready.then(()=>true),runB.then(()=>false)]);a.release();
    await runA;await pausing;
    const pauseAck={project_state:h.state.get('PROJECT','probe').state,task_b_state:h.inspectTask('task-b').state,model_requests:h.state.count('MODEL_REQUEST',{task_id:'task-b'})};
    b.release();const task=await runB;
    return {entered_b_while_pausing:enteredB,pause_ack:pauseAck,task_b_final:task.state,model_requests_after_pause:h.state.count('MODEL_REQUEST',{task_id:'task-b'})};
  }finally{a?.release();b?.release();b?.restore();a?.restore();await h.close();}
});

await probe('restart-approved-pending-tool',async()=>{
  const {h,root}=await fixture('restart-approval',[{reply:{kind:'TOOL_CALL',tool_name:'review.write',tool_version:'1',resource_id:'probe:file',arguments:{text:'approved before restart'}}}]);
  const output=join(root,'restart-side-effect.txt');let calls=0;
  const definition={id:'review.write',version:'1',feature_id:'tool.test',capability:'LOCAL_WRITE',policy_ids:['P.GIT_PUBLISH'],requires_sandbox:false,
    schema:args=>assert.equal(typeof args.text,'string'),writer_resource:()=> 'probe:file',execute:async args=>{calls++;await writeFile(output,args.text,'utf8');return {data:{written:true}};}};
  h.administration.registerTool(definition);
  await agentAndTask(h,{tools:[{tool_id:'review.write',version:'1',capability:'LOCAL_WRITE',resources:['probe:file']}],file_scope:['probe:file']});
  assert.equal((await h.administration.dispatch('probe-task')).reason,'APPROVAL_REQUIRED');
  await h.administration.approveTaskTool('probe-task','Independent review file write before restart');
  const before=h.inspectTask('probe-task').pending_tool;
  await h.close();const restored=await openHarness(root);
  try{
    restored.administration.registerTool(definition);
    const afterReopen={task_state:restored.inspectTask('probe-task').state,pending_approval:restored.inspectTask('probe-task').pending_tool?.approval_id??null,write_calls:calls};
    let reapproveError=null,newApproval=null;try{newApproval=await restored.administration.approveTaskTool('probe-task','Renew approval after trusted runtime changed');}catch(e){reapproveError=e.message;}
    await restored.administration.resumeTask('probe-task');const task=await restored.administration.dispatch('probe-task');
    return {old_approval:before.approval_id,after_reopen:afterReopen,new_approval:newApproval,reapprove_error:reapproveError,final_state:task.state,reason:task.reason,write_calls:calls};
  }finally{await restored.close();}
});

const label=process.env.REVIEW_RUN_LABEL??'extended-initial';
await writeFile(join(evidence,'probe-results-'+label+'.json'),JSON.stringify({node:process.version,observed_at:new Date().toISOString(),results},null,2)+'\n','utf8');
