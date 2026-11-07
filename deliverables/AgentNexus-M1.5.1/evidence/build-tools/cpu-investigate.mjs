import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { once } from 'node:events';
import { resolve, join } from 'node:path';

const [output, helper, worker, powershell, mode='single', trials='3', budget='80'] = process.argv.slice(2);
if (!output || !helper || !worker || !powershell) throw Error('output helper worker powershell [mode trials budget]');
const out=join(resolve(output),new Date().toISOString().replaceAll(':','-').replaceAll('.','-')+'-'+process.pid);
await mkdir(out,{recursive:true});
const nodeHash=createHash('sha256').update(await readFile(process.execPath)).digest('hex');
const env={SystemRoot:process.env.SystemRoot,WINDIR:process.env.WINDIR,TEMP:out,TMP:out,PSModulePath:''};
const results=[];
for(let i=0;i<Number(trials);i++){
  const id=mode+'-'+i,request={id,op:'primitive.job',deadline_ms:6000,params:{executable:process.execPath,executable_sha256:nodeHash,args:[resolve(worker),mode],cwd:resolve(join(worker,'..')),limits:{active_processes:4,process_memory_bytes:134217728,job_memory_bytes:402653184,cpu_rate:10000,cpu_ms:Number(budget)},stdout_max_bytes:4096,stderr_max_bytes:4096}};
  await writeFile(join(out,id+'.request.json'),JSON.stringify(request,null,2)+'\n',{flag:'wx'});
  const child=spawn(powershell,['-NoProfile','-NonInteractive','-File',resolve(helper)],{shell:false,windowsHide:true,env,stdio:'pipe'}),closed=once(child,'close');
  const bound=()=>{let count=0;return new Transform({transform(b,_e,cb){count+=b.length;cb(count>1048576?Error('Evidence overflow'):null,b);}});};
  const timer=setTimeout(()=>child.kill(),30000);
  let code,signal;
  try {child.stdin.end(JSON.stringify(request)+'\n');await Promise.all([pipeline(child.stdout,bound(),createWriteStream(join(out,id+'.stdout.jsonl'),{flags:'wx'})),pipeline(child.stderr,bound(),createWriteStream(join(out,id+'.stderr.txt'),{flags:'wx'}))]);[code,signal]=await closed;}finally{clearTimeout(timer);}
  let packet;try{packet=JSON.parse(await readFile(join(out,id+'.stdout.jsonl'),'utf8'));}catch{}
  const r=packet?.result;
  results.push({id,code,signal,ok:packet?.ok??false,error:packet?.error??null,user_ms:r?Number(r.job_user_cpu_100ns)/10000:null,kernel_ms:r?Number(r.job_kernel_cpu_100ns)/10000:null,termination:r?.termination_reason??null,members:r?.members?.map(m=>({pid:m.identity.pid,image:m.image,user_ms:Number(m.user_cpu_100ns)/10000})),helper_in_job:r?.helper_in_inherited_job??null,root_appcontainer:r?.root?.token?.is_appcontainer??null});
}
await writeFile(join(out,'summary.json'),JSON.stringify({node:process.version,node_sha256:nodeHash,diagnostic_only:true,production_qualified:false,results},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,results}));
