import { spawn, spawnSync } from 'node:child_process';
import {existsSync} from 'node:fs';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const source=resolve(fileURLToPath(new URL('../../',import.meta.url))),candidate=resolve(source,'../../..'),workspace=existsSync(join(candidate,'.workflow-kit/governance/policy.json'))?candidate:source;
const output=join(workspace,'.workflow-kit/runtime/AgentNexus-M2.0/verification',new Date().toISOString().replace(/[:.]/g,'-')+'-'+process.pid);
await mkdir(output,{recursive:true});
const locate=name=>spawnSync('C:/Windows/System32/where.exe',[name],{encoding:'utf8',windowsHide:true}).stdout?.trim().split(/\r?\n/).find(existsSync);
const env={...process.env,AGENTNEXUS_TEST_DATA_ROOT:join(output,'data'),AGENTNEXUS_TEST_PYTHON_PATH:process.env.AGENTNEXUS_TEST_PYTHON_PATH??locate('python.exe'),AGENTNEXUS_TEST_POWERSHELL_PATH:process.env.AGENTNEXUS_TEST_POWERSHELL_PATH??locate('pwsh.exe')??'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe'};
for(const k of Object.keys(env))if(/(?:API_KEY|AUTH_TOKEN|ACCESS_TOKEN|BEARER|ELECTRON_RUN_AS_NODE)/i.test(k))delete env[k];
const tests=process.argv.includes('--full')?[...(await readdir(join(source,'tests/agentnexus'))).filter(n=>n.endsWith('.test.ts')).sort().map(n=>'tests/agentnexus/'+n),...(await readdir(join(source,'tests/desktop'))).filter(n=>n.endsWith('.test.ts')).sort().map(n=>'tests/desktop/'+n)]:['tests/agentnexus/m20-security.test.ts','tests/agentnexus/m20-recovery.test.ts','tests/desktop/m20-local.test.ts','tests/desktop/service.test.ts'];
const stages=[['typecheck',['tools/agentnexus/typecheck-m15.mjs']],['build',['tools/agentnexus/build-desktop.mjs']],['tests',['--test','--test-concurrency=1','--test-reporter=tap',...tests]]];
const report={schema:'agentnexus/m20/verification/1',output,source,started_at:new Date().toISOString(),scope:'REAL_LOCAL_HOST_NATIVE_CREDMAN_AND_SYNTHETIC_PROVIDER_ONLY',real_credentials:0,real_provider_requests:0,os_hardened_qualification:'NOT_RUN',stages:[]};
process.stdout.write('M20 evidence: '+output+'\n');
for(const [name,args] of stages){
  const start=Date.now();let stdout='',stderr='';
  const code=await new Promise((accept,reject)=>{const p=spawn(process.execPath,args,{cwd:source,env,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});p.stdout.on('data',b=>{stdout+=b;});p.stderr.on('data',b=>{stderr+=b;});p.once('error',reject);p.once('close',accept);});
  await writeFile(join(output,name+'.stdout.txt'),stdout);await writeFile(join(output,name+'.stderr.txt'),stderr);
  const counter=n=>Number(new RegExp('^# '+n+' (\\d+)','m').exec(stdout)?.[1]??0);
  const result={name,command:[process.execPath,...args],exit_code:code,status:code===0?'PASS':'FAIL',elapsed_ms:Date.now()-start,...(name==='tests'?{tests:counter('tests'),pass:counter('pass'),fail:counter('fail'),skipped:counter('skipped')}:{} )};report.stages.push(result);process.stdout.write(JSON.stringify(result)+'\n');
  await writeFile(join(output,'results.json'),JSON.stringify(report,null,2)+'\n');
}
report.finished_at=new Date().toISOString();report.status=report.stages.every(s=>s.exit_code===0)?'PASS':'FAIL';await writeFile(join(output,'results.json'),JSON.stringify(report,null,2)+'\n');
process.exitCode=report.status==='PASS'?0:1;
