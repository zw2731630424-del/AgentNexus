import {mkdir,mkdtemp,writeFile,stat} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const productURL=process.env.REVIEW_SOURCE_ROOT?pathToFileURL(join(process.env.REVIEW_SOURCE_ROOT,'src/agentnexus/harness/index.ts')).href:new URL('../../source/src/agentnexus/harness/index.ts',import.meta.url).href;
const {openHarness}=await import(productURL);

const evidence=dirname(fileURLToPath(import.meta.url));await mkdir(join(evidence,'runtime'),{recursive:true});
async function run(dataLength){
  const root=await mkdtemp(join(evidence,'runtime','disk-capture-')),output=join(root,'persistent-output.bin');
  const h=await openHarness(root,{mocks:{'mock-main':[{reply:{kind:'TOOL_CALL',tool_name:'review.write',resource_id:'probe:file',arguments:null}}]}});
  let calls=0;
  try{
    await h.administration.createProject({id:'probe',rules:['Only independent review-owned persistent output may be written.']});
    h.administration.registerTool({id:'review.write',version:'1',feature_id:'tool.test',capability:'LOCAL_WRITE',policy_ids:['P.GIT_PUBLISH'],requires_sandbox:false,schema:()=>{},writer_resource:()=> 'probe:file',execute:async()=>{calls++;await writeFile(output,Buffer.alloc(100,65));return {data:'x'.repeat(dataLength)};}});
    await h.administration.createAgent({id:'agent',project_id:'probe',task_id:'task',type:'DEVELOPMENT',budget:{workers:1,memory_bytes:16777216,disk_bytes:1024,wall_ms:300000,model_tokens:100000,model_requests:100,model_cost_micros:1000000},
      tools:[{tool_id:'review.write',version:'1',capability:'LOCAL_WRITE',resources:['probe:file']}],file_scope:['probe:file']});
    await h.administration.createTask({id:'task',agent_id:'agent',goal:'Verify persistent disk retention when tool-result archive reaches its envelope limit',requirements:{disk_bytes:100}});
    const first=await h.administration.dispatch('task');if(first.reason!=='APPROVAL_REQUIRED')throw Error('Precondition: '+first.reason);
    await h.administration.approveTaskTool('task','Authorize review-owned persistent-output.bin only');await h.administration.resumeTask('task');const task=await h.administration.dispatch('task');
    const budget=h.state.get('resource_budget','platform'),rows=h.store.query('context',{project_id:'probe',task_id:'task',limit:100});let toolResultBytes=null,nativeCaptureBytes=null;
    for(const row of rows){
      const kind=row.body.kind;if(kind==='tool.result')toolResultBytes=row.body.payload_ref.bytes;
      if(kind==='harness.RAW'){
        const chunks=[];for await(const chunk of h.store.artifacts.read(row.body.payload_ref))chunks.push(chunk);
        const parsed=JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if(parsed.status==='PASS'&&parsed.operation_id)nativeCaptureBytes=row.body.payload_ref.bytes;
      }
    }
    return {data_length:dataLength,task_state:task.state,reason:task.reason,persistent_write:task.persistent_write,store_faulted:h.store.faulted,native_state_faulted:h.state.faulted,
      write_calls:calls,persistent_file_bytes:(await stat(output)).size,platform_disk_held:budget.held.disk_bytes,platform_workers_held:budget.held.workers,
      gateway_operations:h.store.db.prepare('SELECT state,executor_state FROM control_operations').all(),tool_result_bytes:toolResultBytes,native_capture_bytes:nativeCaptureBytes,root};
  }finally{await h.close();}
}
const calibration=await run(0),dataLength=65536-calibration.tool_result_bytes-32,result=await run(dataLength);
const output={name:'persistent-write-capture-limit-retains-claims',node:process.version,product_url:productURL,observed_at:new Date().toISOString(),calibration,result};
const label=process.env.REVIEW_RUN_LABEL??'initial';await writeFile(join(evidence,'disk-capture-results-'+label+'.json'),JSON.stringify(output,null,2)+'\n');process.stdout.write(JSON.stringify(output)+'\n');
