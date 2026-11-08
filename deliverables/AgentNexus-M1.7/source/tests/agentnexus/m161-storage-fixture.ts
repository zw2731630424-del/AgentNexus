import { join } from 'node:path';
import { openHarness } from '../../src/agentnexus/harness/index.ts';
import type { HarnessOptions } from '../../src/agentnexus/harness/index.ts';
import type { StorageRequest } from '../../src/agentnexus/harness/storage-owner.ts';
export const limits={workers:4,memory_bytes:268435456,disk_bytes:16777216,model_tokens:1000000,model_requests:1000,model_cost_micros:10000000,wall_ms:3000000};
export async function storageFixture(root:string,options:HarnessOptions={},quota=8388608){
  const h=await openHarness(join(root,'host'),options);
  await h.administration.createProject({id:'project',rules:['Preserve raw inputs; only precisely approved owned versions may be published.'],budget:limits});
  await h.administration.createAgent({id:'writer',project_id:'project',task_id:'task',type:'DEVELOPMENT',budget:{...limits,workers:1},file_scope:['project:files'],
    tools:[{tool_id:'native.storage.write',version:'1',capability:'LOCAL_WRITE',resources:['project:files']}]});
  await h.administration.registerStorageResource('writer',{id:'project:files',project_id:'project',task_id:null,root:join(root,'files'),quota_bytes:quota,max_file_bytes:Math.min(quota,4194304)});
  return h;
}
export async function prepare(h:Awaited<ReturnType<typeof openHarness>>,data:Uint8Array|AsyncIterable<Uint8Array>,bytes:number,request:Partial<Pick<StorageRequest,'path'|'mode'|'expected_version'|'expected_sha256'>>={},agent='writer',task='task'){
  await h.administration.createTask({id:task,agent_id:agent,goal:'Publish exact authorized content and retain persistent disk ownership.',requirements:{disk_bytes:bytes},wall_ms:120000});
  const source=await h.administration.captureStorageSource(agent,data,bytes);
  const args:StorageRequest={resource_id:'project:files',path:'result.txt',mode:'CREATE',expected_version:null,expected_sha256:null,source,...request};
  await h.administration.requestStorageWrite(task,args);return args;
}
export async function execute(h:Awaited<ReturnType<typeof openHarness>>,task='task'){
  await h.administration.approveTaskTool(task,'Explicit synthetic fixture authorization for this frozen write intent.');await h.administration.resumeTask(task);return h.administration.dispatch(task);
}
