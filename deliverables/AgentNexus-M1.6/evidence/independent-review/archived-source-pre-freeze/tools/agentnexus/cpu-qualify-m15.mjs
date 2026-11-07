import { spawn } from 'node:child_process';
import { mkdir,readFile,writeFile,cp,readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve,join,isAbsolute,relative } from 'node:path';
import { performance } from 'node:perf_hooks';

export function adjudicateCpu(r,budgetMs){
  const user=Number(r.job_user_cpu_100ns)/10000,kernel=Number(r.job_kernel_cpu_100ns)/10000,tolerance=Math.max(50,budgetMs*0.05);
  const budgetObserved=Number.isFinite(user)&&user>0&&user<=budgetMs+tolerance;
  const terminal=r.root_exit_observed===true&&r.tree_empty_observed===true&&r.termination_requested_at===null&&r.job_cpu_time_scope==='USER_MODE'&&r.job_cpu_time_end_action==='TERMINATE';
  return {status:budgetObserved&&terminal?'PASS':'FAIL',budget_ms:budgetMs,tolerance_ms:tolerance,job_user_cpu_ms:user,job_kernel_cpu_ms:kernel,cpu_rate:r.job_cpu_rate,wall_termination:r.termination_reason??null,budget_observed:budgetObserved,kernel_cpu_bounded:false,assurance:'REAL_WINDOWS_PRIMITIVE',production_guarantee:false};
}
export async function qualifyCpu(outputRoot){
  if(process.platform!=='win32')throw Error('Windows native qualification only');
  const source=fileURLToPath(new URL('../../',import.meta.url)),out=join(resolve(outputRoot),'cpu-qualification',new Date().toISOString().replaceAll(':','-').replaceAll('.','-')+'-'+process.pid),root=join(out,'workspace');
  await mkdir(root,{recursive:true});for(const name of ['src','tests','tools','config','package.json','package-lock.json','tsconfig.json'])await cp(join(source,name),join(root,name),{recursive:true,errorOnExist:true,force:false});
  const files=[];async function inventory(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())await inventory(p);else if(e.isFile()){const b=await readFile(p);files.push({path:relative(root,p).replaceAll('\\','/'),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}else throw Error('Nonregular source');}}await inventory(root);files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);const sourceSet=createHash('sha256').update(files.map(f=>f.path+'\0'+f.sha256+'\n').join('')).digest('hex');await writeFile(join(out,'source-manifest.json'),JSON.stringify({files,set_sha256:sourceSet},null,2)+'\n',{flag:'wx'});
  const runtime=join(root,'src/agentnexus/production/windows/runtime.ps1'),worker=join(root,'tests/agentnexus/m15-cpu-worker.mjs'),nodeHash=createHash('sha256').update(await readFile(process.execPath)).digest('hex'),ps=process.env.AGENTNEXUS_TEST_POWERSHELL_PATH;
  if(!ps||!isAbsolute(ps))throw Error('Set AGENTNEXUS_TEST_POWERSHELL_PATH to trusted existing PowerShell');
  const cases=[];
  async function run(mode,budget,trial,concurrent=false){
    const id=mode+'-'+budget+'-'+trial+(concurrent?'-concurrent':''),started=performance.now(),child=spawn(ps,['-NoProfile','-NonInteractive','-File',runtime],{windowsHide:true,shell:false,cwd:root,env:{SystemRoot:process.env.SystemRoot,WINDIR:process.env.WINDIR,TEMP:out,TMP:out,PSModulePath:''},stdio:'pipe'});
    let raw='',stderr='',overflow=false;child.stdout.on('data',b=>{if(Buffer.byteLength(raw)+b.length>1048576){overflow=true;child.kill();}else raw+=b;});child.stderr.on('data',b=>{if(Buffer.byteLength(stderr)+b.length<=65536)stderr+=b;else child.kill();});
    const ended=new Promise((res,rej)=>{child.once('error',rej);child.once('exit',(code,signal)=>res({code,signal}));});const timer=setTimeout(()=>child.kill(),45000);
    child.stdin.end(JSON.stringify({id,op:'primitive.job',deadline_ms:mode==='long'?20000:6000,params:{executable:process.execPath,executable_sha256:nodeHash,args:[worker,mode],cwd:root,limits:{active_processes:4,process_memory_bytes:134217728,job_memory_bytes:402653184,cpu_rate:10000,cpu_ms:budget},stdout_max_bytes:4096,stderr_max_bytes:4096}})+'\n');
    let exit;try{exit=await ended;}finally{clearTimeout(timer);}
    await writeFile(join(out,id+'.stdout.jsonl'),raw,{flag:'wx'});await writeFile(join(out,id+'.stderr.txt'),stderr,{flag:'wx'});
    let packet;try{packet=JSON.parse(raw.trim());}catch{}
    const result=packet?.ok?adjudicateCpu(packet.result,budget):{status:'INCONCLUSIVE',reason:overflow?'OUTPUT_LIMIT':packet?.error?.code??'NATIVE_FAILED',production_guarantee:false};
    const record={id,mode,trial,concurrent,wall_ms:performance.now()-started,exit,...result,raw_file:id+'.stdout.jsonl',member_history_complete:packet?.result?.history_complete_observed??false,historical_processes:packet?.result?.historical_assigned_processes??null};cases.push(record);return record;
  }
  for(let trial=1;trial<=3;trial++)await run('single',80,trial);
  for(const mode of ['multi','child'])for(let trial=1;trial<=2;trial++)await run(mode,300,trial);
  await run('long',3000,1);await Promise.all([run('single',300,4,true),run('multi',300,3,true)]);
  const result={schema:'agentnexus/cpu-qualification/1',node:process.version,observed_at:new Date().toISOString(),source_node_sha256:nodeHash,source_set_sha256:sourceSet,cases,all_cases_within_tolerance:cases.every(c=>c.status==='PASS'),status:cases.some(c=>c.status==='FAIL')?'FAIL':'INCONCLUSIVE',production_qualified:false,
    scope:'PerJobUserTimeLimit USER_MODE includes associated children; cpu_rate is independent bandwidth, wall is helper containment. No kernel CPU hard budget claimed.',remaining:['REAL_DISTINCT_WORKER_IDENTITY','COMBINED_SANDBOX','TARGET_HOST_LOAD_MATRIX','LONG_SOAK','REPEATED_TARGET_OS_QUALIFICATION'],historical_failures_preserved:true};
  await writeFile(join(out,'report.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});return {out,...result};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){if(process.argv.length!==4||process.argv[2]!=='--output-root')throw Error('Use --output-root <isolated runtime>');console.log(JSON.stringify(await qualifyCpu(process.argv[3])));}
