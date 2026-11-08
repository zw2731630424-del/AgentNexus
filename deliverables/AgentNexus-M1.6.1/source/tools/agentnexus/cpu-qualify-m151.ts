import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile, cp, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { once } from 'node:events';
import { performance } from 'node:perf_hooks';
import { adjudicateCpu } from './cpu-qualify-m15.mjs';
import type { CpuObservation } from './cpu-qualify-m15.mjs';

type NativeCpu = CpuObservation & {
  history_complete_observed:boolean; output_producers_settled:boolean;
  job_handle_close_succeeded:boolean; process_handles_close_succeeded:boolean;
  active_processes_final:number; historical_assigned_processes:number;
  root_exit_code:number; members:unknown[];
};
type Packet = {ok:boolean; result?:NativeCpu; error?:{code:string;message:string}};
type Scenario = {id:string;mode:string;budget:number;deadline:number;load:string;round:number};

/** Qualification retains M1.5's budget and tolerance. One violation fails the run.
 * Extra repetitions characterize phase/parallelism; finite successes could never
 * create a documented OS overshoot bound or authorize production automatically.
 */
async function main(outputRoot:string):Promise<void>{
  if(process.platform!=='win32')throw Error('Windows required');
  const ps=process.env.AGENTNEXUS_TEST_POWERSHELL_PATH;
  if(!ps||!isAbsolute(ps))throw Error('Absolute PowerShell 7+ required');
  const source=fileURLToPath(new URL('../../',import.meta.url));
  const destination=resolve(outputRoot);
  if(destination===resolve(source)||destination.startsWith(resolve(source)+sep))throw Error('Evidence must be outside source');
  const runId=new Date().toISOString().replace(/[:.]/g,'-')+'-'+process.pid;
  const out=join(resolve(outputRoot),runId),workspace=join(out,'source');await mkdir(out,{recursive:true});
  for(const name of ['src','tests','tools','config','package.json','package-lock.json','tsconfig.json'])await cp(join(source,name),join(workspace,name),{recursive:true,errorOnExist:true,force:false});
  const files:{path:string;sha256:string;bytes:number}[]=[];
  async function inventory(dir:string):Promise<void>{for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())await inventory(p);else if(e.isFile()){const b=await readFile(p);files.push({path:relative(workspace,p).replaceAll('\\','/'),sha256:createHash('sha256').update(b).digest('hex'),bytes:b.length});}else throw Error('Source link refused');}}
  await inventory(workspace);files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  const sourceHash=createHash('sha256').update(files.map(f=>f.path+'\0'+f.sha256+'\n').join('')).digest('hex');
  await writeFile(join(out,'source-manifest.json'),JSON.stringify({files,set_sha256:sourceHash},null,2)+'\n',{flag:'wx'});
  const nodeHash=createHash('sha256').update(await readFile(process.execPath)).digest('hex');
  const reports:Record<string,unknown>[]=[];
  const rounds=12;
  const plan={run_id:runId,rounds_per_sequential_topology:rounds,concurrent_pairs:8,long_trials:6,
    budgets:{single:80,multi:300,child:300,long:3000},tolerance:'unchanged M1.5 max(50ms, 5%)',
    stopping_rule:'run all predetermined cases; any FAIL fails qualification; no rerun selection',
    statistics:'Descriptive only. Runs share a host and periodic enforcement; not independent Bernoulli trials. No reliability/production claim from a finite sample.',
    planned_cases:58,source_set_sha256:sourceHash};
  await writeFile(join(out,'plan.json'),JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
  async function run(s:Scenario):Promise<void>{
    const started=performance.now(),started_at=new Date().toISOString();
    const request={id:s.id,op:'primitive.job',deadline_ms:s.deadline,params:{executable:process.execPath,executable_sha256:nodeHash,args:[join(workspace,'tests/agentnexus/m15-cpu-worker.mjs'),s.mode],cwd:workspace,limits:{active_processes:4,process_memory_bytes:134217728,job_memory_bytes:402653184,cpu_rate:10000,cpu_ms:s.budget},stdout_max_bytes:4096,stderr_max_bytes:4096}};
    await writeFile(join(out,s.id+'.request.json'),JSON.stringify(request,null,2)+'\n',{flag:'wx'});
    const child=spawn(ps!,['-NoProfile','-NonInteractive','-File',join(workspace,'src/agentnexus/production/windows/runtime.ps1')],{shell:false,windowsHide:true,cwd:workspace,env:{SystemRoot:process.env.SystemRoot,WINDIR:process.env.WINDIR,TEMP:out,TMP:out,PSModulePath:''},stdio:'pipe'});
    const closed=once(child,'close'),bound=()=>{let n=0;return new Transform({transform(b:Buffer,_e,cb){n+=b.length;cb(n>1048576?Error('Evidence output bound'):null,b);}});};
    let timeout=false;const timer=setTimeout(()=>{timeout=true;child.kill();},45000);let code:number|null=null,signal:string|null=null;
    try{child.stdin.end(JSON.stringify(request)+'\n');await Promise.all([pipeline(child.stdout,bound(),createWriteStream(join(out,s.id+'.stdout.jsonl'),{flags:'wx'})),pipeline(child.stderr,bound(),createWriteStream(join(out,s.id+'.stderr.txt'),{flags:'wx'}))]);[code,signal]=await closed as [number|null,string|null];}finally{clearTimeout(timer);}
    let packet:Packet|undefined;try{packet=JSON.parse(await readFile(join(out,s.id+'.stdout.jsonl'),'utf8')) as Packet;}catch{}
    const r=packet?.ok?packet.result:undefined;
    const base=r?adjudicateCpu(r,s.budget):null;
    const exitObserved=!!r&&r.root_exit_observed&&r.tree_empty_observed&&r.history_complete_observed&&r.output_producers_settled&&r.active_processes_final===0;
    const handlesClosed=!!r&&r.job_handle_close_succeeded===true&&r.process_handles_close_succeeded===true;
    const status=!r||timeout||code!==0?'INCONCLUSIVE':base?.status==='PASS'&&exitObserved&&handlesClosed?'PASS':'FAIL';
    const record={...s,run_id:runId,started_at,ended_at:new Date().toISOString(),wall_ms:performance.now()-started,...(base??{}),status,
      qualification_status:status,exit_observed:exitObserved,handle_cleanup_observed:handlesClosed,helper_exit:{code,signal,timeout},error:packet?.error??null,
      historical_processes:r?.historical_assigned_processes??null,root_exit_code:r?.root_exit_code??null,assurance:'REAL_WINDOWS_PRIMITIVE',production_guarantee:false};
    reports.push(record);await writeFile(join(out,s.id+'.result.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
  }
  for(let round=1;round<=rounds;round++)for(const [mode,budget] of [['single',80],['multi',300],['child',300]] as const)await run({id:`seq-${mode}-${round}`,mode,budget,deadline:6000,load:'ONE_TEST_JOB',round});
  for(let round=1;round<=6;round++)await run({id:`long-${round}`,mode:'long',budget:3000,deadline:20000,load:'ONE_TEST_JOB',round});
  for(let round=1;round<=8;round++)await Promise.all([run({id:`parallel-single-${round}`,mode:'single',budget:80,deadline:6000,load:'TWO_INDEPENDENT_JOBS',round}),run({id:`parallel-multi-${round}`,mode:'multi',budget:300,deadline:6000,load:'TWO_INDEPENDENT_JOBS',round})]);
  const counts={PASS:0,FAIL:0,INCONCLUSIVE:0};for(const r of reports)counts[r.qualification_status as keyof typeof counts]++;
  const result={schema:'agentnexus/cpu-qualification/1.5.1',run_id:runId,source_set_sha256:sourceHash,node:process.version,node_sha256:nodeHash,powershell:ps,counts,status:counts.FAIL?'FAIL':'INCONCLUSIVE',production_qualified:false,plan,cases:reports,
    host_restart:'NOT_RUN: distinct deployed Host unavailable',resource_release:'No Writer/Workspace/ProcessSlot/Quota/Sandbox claim released by these primitive observations',
    failure_classification:'OS_BEHAVIOR_LIMITATION: periodic JOB_TIME has no qualified bounded overshoot; exact kernel cadence remains INCONCLUSIVE'};
  await writeFile(join(out,'report.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({out,run_id:runId,source_set_sha256:sourceHash,counts,status:result.status}));process.exitCode=counts.FAIL?1:2;
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){if(process.argv.length!==4||process.argv[2]!=='--output-root')throw Error('Use --output-root <evidence outside source>');await main(process.argv[3]);}
