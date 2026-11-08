import { mkdir,writeFile,appendFile,lstat,readdir,readFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { openHarness } from '../../src/agentnexus/harness/index.ts';
import { outsideSource } from './output-root.ts';
import { fileURLToPath } from 'node:url';
import { invariant } from '../../src/agentnexus/types.ts';

const args=process.argv.slice(2);invariant(args.length===4&&args[0]==='--output-root'&&args[2]==='--duration-ms','SOAK_ARGUMENTS');
const duration=Number(args[3]);invariant(Number.isSafeInteger(duration)&&duration>=1000&&duration<=86400000,'SOAK_DURATION_LIMIT');
const source=fileURLToPath(new URL('../../',import.meta.url)),root=await outsideSource(source,args[1]);
const stamp=new Date().toISOString().replace(/[:.]/g,'-')+'-'+process.pid,output=join(root,stamp);await mkdir(output,{recursive:true});
const limits={workers:3,memory_bytes:268435456,disk_bytes:67108864,model_requests:1000,model_tokens:1000000,model_cost_micros:10000000,wall_ms:10000000};
const options={eventLoop:{maxConcurrent:3},maxConcurrent:3,platform_limits:limits};
let h=await openHarness(join(output,'host'),options),count=0,reopens=0;
await h.administration.createProject({id:'soak',rules:['Only admitted internal message events may wake safe tasks. Never replay UNKNOWN effects.'],budget:limits});
await h.administration.createAgent({id:'resident',project_id:'soak',task_id:'producer',type:'RESIDENT',budget:{...limits,workers:1}});
await h.administration.startEvents();
const start=performance.now(),cpuStart=process.cpuUsage(),started_at=new Date().toISOString(),samples:unknown[]=[];
async function size(folder:string):Promise<{files:number;bytes:number}>{let files=0,bytes=0;const queue=[folder];while(queue.length){const dir=queue.pop()!;for(const item of await readdir(dir,{withFileTypes:true})){const path=join(dir,item.name);if(item.isDirectory())queue.push(path);else if(item.isFile()){files++;bytes+=(await lstat(path)).size;}invariant(files<100000&&queue.length<100000,'SOAK_DISK_INVENTORY_LIMIT');}}return{files,bytes};}
async function checkpoint(kind:string){const stats=process.memoryUsage(),cpu=process.cpuUsage(cpuStart),disk=await size(join(output,'host'));
  const sample={at:new Date().toISOString(),elapsed_ms:Math.round(performance.now()-start),kind,count,reopens,rss:stats.rss,heap_used:stats.heapUsed,cpu_user_us:cpu.user,cpu_system_us:cpu.system,
    sqlite_bytes:(await lstat(join(output,'host/kernel.sqlite'))).size,disk,event:h.administration.eventStatus(),requests:h.state.count('MODEL_REQUEST'),
    queued_messages:h.state.count('MESSAGE',{state:'QUEUED'}),unknown_tasks:h.state.count('TASK',{state:'UNKNOWN_QUARANTINED'}),active_reservations:h.state.count('resource_reservation',{state:'ACTIVE'})};
  samples.push(sample);await appendFile(join(output,'samples.jsonl'),JSON.stringify(sample)+'\n');}
await writeFile(join(output,'start.json'),JSON.stringify({schema:'agentnexus/m18/resident-soak/1',started_at,duration_ms:duration,pid:process.pid,scope:'EVENT_DRIVEN_LOCAL_TRUSTED_LIBRARY',provider:'SIMULATED',strict_cpu:'BLOCKED',os_reboot:'NOT_RUN'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,started_at,duration_ms:duration,status:'RUNNING'}));
const source_before=await sourceManifest();await writeFile(join(output,'source-before.json'),JSON.stringify(source_before,null,2)+'\n',{flag:'wx'});
let failure:string|null=null;
try{
  while(performance.now()-start<duration){
    const id='event-'+String(count).padStart(3,'0');await h.administration.createAgent({id,project_id:'soak',task_id:id,type:'DEVELOPMENT',read_tasks:['producer'],budget:{...limits,workers:1}});
    await h.administration.createTask({id,agent_id:id,goal:'Consume this original durable event once and finish.',wall_ms:30000});
    const sent=await h.bindAgent('resident').sendText({receiver_agent_id:id,message_type:'SOAK_EVENT',text:'Bounded internal event '+count,dedup_key:id});
    await h.administration.idleEvents();invariant(h.inspectTask(id).state==='SUCCEEDED','SOAK_TASK_NOT_COMPLETED');
    const receipt=h.state.get<{state:string}>('MESSAGE_HANDOFF',sent.message_id);invariant(receipt?.state==='COMPLETED','SOAK_MESSAGE_NOT_COMPLETED');
    count++;await checkpoint('EVENT_SETTLED');
    if(count%30===0){await h.administration.stopEvents();await h.close();h=await openHarness(join(output,'host'),options);await h.administration.recoverEvents();await h.administration.startEvents();reopens++;await checkpoint('HOST_STORE_REOPEN');}
    const before=h.state.count('MODEL_REQUEST'),remaining=duration-(performance.now()-start),untilNext=Math.min(Math.max(60000,Math.ceil(duration/100)),remaining);
    if(untilNext>0){const idleUntil=performance.now()+untilNext;while(performance.now()<idleUntil)await new Promise<void>(resolve=>setTimeout(resolve,Math.min(60000,Math.max(1,idleUntil-performance.now()))));}
    invariant(h.state.count('MODEL_REQUEST')===before,'SOAK_IDLE_MODEL_REQUEST');
  }
  await h.administration.idleEvents();await h.store.verify();await checkpoint('FINAL');invariant(JSON.stringify(await sourceManifest())===JSON.stringify(source_before),'SOAK_SOURCE_CHANGED');
}catch(error){failure=error instanceof Error?error.message:String(error);await checkpoint('FAILURE').catch(()=>{});}
finally{await h.administration.stopEvents();await h.close();}
const elapsed=performance.now()-start,report={schema:'agentnexus/m18/resident-soak/1',status:failure?'FAIL':elapsed>=86400000?'PASS':'NOT_RUN',short_run_status:failure?'FAIL':'PASS',
  scope:'EVENT_DRIVEN_LOCAL_TRUSTED_LIBRARY',provider:'SIMULATED',strict_cpu:'BLOCKED',production_os:'BLOCKED',os_reboot:'NOT_RUN',hard_power_loss:'NOT_RUN',
  started_at,ended_at:new Date().toISOString(),duration_requested_ms:duration,duration_observed_ms:elapsed,events:count,store_reopens:reopens, failure,samples,
  conclusion:failure?'FAILED':'Actual local events, durable receipts and idle model silence observed. CPU/memory are observations; logical resource budgets are not OS hard limits. This is not general autonomous development.'};
await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
const files=[];for(const rel of ['start.json','samples.jsonl','report.json']){const hash=createHash('sha256');for await(const block of createReadStream(join(output,rel)))hash.update(block);files.push({path:rel,sha256:hash.digest('hex')});}
await writeFile(join(output,'sha256.json'),JSON.stringify({files},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,status:report.status,events:count,elapsed_ms:elapsed,failure}));if(failure)process.exitCode=1;

async function sourceManifest(){
  const files:{path:string;sha256:string}[]=[];
  async function visit(folder:string,relative:string){for(const item of await readdir(folder,{withFileTypes:true})){const p=join(folder,item.name),r=relative+'/'+item.name;if(item.isDirectory())await visit(p,r);else if(item.isFile()){const hash=createHash('sha256');for await(const block of createReadStream(p))hash.update(block);files.push({path:r,sha256:hash.digest('hex')});}else throw Error('SOAK_LINKED_SOURCE');}}
  for(const name of ['src','tests','tools','config'])await visit(join(source,name),name);
  for(const name of ['package.json','package-lock.json','tsconfig.json']){const hash=createHash('sha256');for await(const block of createReadStream(join(source,name)))hash.update(block);files.push({path:name,sha256:hash.digest('hex')});}
  return files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
