import {spawn,spawnSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';
const current=resolve(fileURLToPath(new URL('../../',import.meta.url))),workspace=resolve(current,'../../..'),baseline=join(workspace,'deliverables/AgentNexus-M1.8.3-Q4.2/source');
const output=join(workspace,'.workflow-kit/runtime/AgentNexus-M2.0/baseline-comparison',new Date().toISOString().replace(/[:.]/g,'-'));await mkdir(output,{recursive:true});
const ps=spawnSync('C:/Windows/System32/where.exe',['pwsh.exe'],{encoding:'utf8',windowsHide:true}).stdout.trim().split(/\r?\n/)[0];
const files=['tests/agentnexus/m14-native.test.ts','tests/agentnexus/m14-production.test.ts','tests/agentnexus/m151-lifecycle.test.ts'];
const selected=['src/agentnexus/production/service.ts','src/agentnexus/production/windows-supervisor.ts','src/agentnexus/production/qualification.ts',...files];
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');const report={scope:'UNCHANGED_LEGACY_OS_AND_RESOURCE_FIXTURES_ONLY',output,real_provider_requests:0,comparisons:[],runs:[]};
for(const path of selected){const a=hash(await readFile(join(baseline,path))),b=hash(await readFile(join(current,path)));report.comparisons.push({path,baseline_sha256:a,candidate_sha256:b,unchanged:a===b});}
for(const [name,source]of [['baseline',baseline],['candidate',current]]){
  let stdout='',stderr='';const args=['--test','--test-concurrency=1','--test-reporter=tap','--test-name-pattern=cumulative Job CPU time|uncooperative owners|CREATE_BREAKAWAY_FROM_JOB',...files];
  const env={...process.env,AGENTNEXUS_TEST_DATA_ROOT:join(output,name+'-data'),AGENTNEXUS_TEST_POWERSHELL_PATH:ps};for(const k of Object.keys(env))if(/API_KEY|AUTH_TOKEN|ACCESS_TOKEN|BEARER/.test(k))delete env[k];
  const code=await new Promise((accept,reject)=>{const p=spawn(process.execPath,args,{cwd:source,env,windowsHide:true,stdio:['ignore','pipe','pipe']});p.stdout.on('data',b=>stdout+=b);p.stderr.on('data',b=>stderr+=b);p.once('error',reject);p.once('close',accept);});
  await writeFile(join(output,name+'.stdout.txt'),stdout);await writeFile(join(output,name+'.stderr.txt'),stderr);report.runs.push({name,source,command:[process.execPath,...args],exit_code:code,pass:Number(/^# pass (\d+)/m.exec(stdout)?.[1]??0),fail:Number(/^# fail (\d+)/m.exec(stdout)?.[1]??0),status:code===0?'PASS':'FAIL'});await writeFile(join(output,'results.json'),JSON.stringify(report,null,2)+'\n');
}
process.stdout.write(JSON.stringify({output,comparisons:report.comparisons.map(c=>({path:c.path,unchanged:c.unchanged})),runs:report.runs})+'\n');
