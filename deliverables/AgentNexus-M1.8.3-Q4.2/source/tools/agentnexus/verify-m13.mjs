import { mkdir, cp, readFile, writeFile, readdir } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { createInterface } from 'node:readline';

const root=fileURLToPath(new URL('../../',import.meta.url));
const stamp=new Date().toISOString().replace(/[:.]/g,'-')+'-'+process.pid;
const out=join(root,'.workflow-kit/runtime/AgentNexus-M1.3/verification',stamp),workspace=join(out,'workspace');
const dataRoot=join(root,'.workflow-kit/runtime/AgentNexus-M1.3/data',Date.now().toString(36)+'-'+process.pid);
await mkdir(workspace,{recursive:true});
for(const name of ['src','tests','tools','config','package.json'])await cp(join(root,name),join(workspace,name),{recursive:true,errorOnExist:true,force:false});
const files=[];
async function inventory(base){for(const e of (await readdir(base,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const p=join(base,e.name);if(e.isDirectory())await inventory(p);else if(e.isFile()){const h=createHash('sha256');let bytes=0;for await(const chunk of createReadStream(p,{highWaterMark:65536})){h.update(chunk);bytes+=chunk.length;}files.push({path:relative(workspace,p).replaceAll('\\','/'),bytes,sha256:h.digest('hex')});}else throw Error('non-regular source');}}
await inventory(workspace);await writeFile(join(out,'source-manifest.json'),JSON.stringify({schema:'agentnexus/m1.3/source/1',version:JSON.parse(await readFile(join(workspace,'package.json'),'utf8')).version,files},null,2)+'\n',{flag:'wx'});
const tests=(await readdir(join(workspace,'tests/agentnexus'))).filter(x=>x.endsWith('.test.ts')).sort().map(x=>'tests/agentnexus/'+x);
const started_at=new Date().toISOString();
const child=spawn(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap','--test-reporter=./tools/agentnexus/json-reporter.mjs','--test-reporter-destination=../all-tests.tap','--test-reporter-destination=../events.jsonl',...tests],{cwd:workspace,shell:false,windowsHide:true,env:{...process.env,NODE_OPTIONS:'',NODE_PATH:'',AGENTNEXUS_TEST_DATA_ROOT:dataRoot},stdio:['ignore','pipe','pipe']});
const exited=once(child,'exit'),bound=max=>{let n=0;return new Transform({transform(c,_e,cb){n+=c.length;cb(n>max?Error('runner output budget'):null,c);}});};
let timedOut=false;const timer=setTimeout(()=>{timedOut=true;child.kill();},180000);
let exit_code;
try{await Promise.all([pipeline(child.stdout,bound(1048576),createWriteStream(join(out,'runner.stdout.txt'),{flags:'wx'})),pipeline(child.stderr,bound(1048576),createWriteStream(join(out,'runner.stderr.txt'),{flags:'wx'}))]);[exit_code]=await exited;}finally{clearTimeout(timer);}
let summary=null;const cases=[];
for await(const line of createInterface({input:createReadStream(join(out,'events.jsonl')),crlfDelay:Infinity})){if(Buffer.byteLength(line)>65536)throw Error('event limit');const e=JSON.parse(line);if(e.type==='test:summary')summary=e;if(['test:pass','test:fail'].includes(e.type))cases.push(e);if(cases.length>1000)throw Error('case limit');}
const result={schema:'agentnexus/m1.3/verification/1',started_at,ended_at:new Date().toISOString(),exit_code,timedOut,node:process.version,platform:process.platform,test_files:tests,summary,cases,isolated_workspace:relative(root,workspace).replaceAll('\\','/'),test_data_root:dataRoot,source_manifest:'source-manifest.json',real_model:false,deployment:'BLOCKED',os_probe_assurance:'PRIMITIVE_ONLY',linux:'NOT_RUN',hard_power_loss:'NOT_RUN'};
await writeFile(join(out,'results.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output:out,exit_code,summary,dataRoot}));process.exitCode=timedOut?1:exit_code??1;
