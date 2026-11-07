import { mkdir,cp,readFile,writeFile,readdir } from 'node:fs/promises';
import { createReadStream,createWriteStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join,relative,resolve,sep } from 'node:path';
import { spawn,spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { createInterface } from 'node:readline';

const source=fileURLToPath(new URL('../../',import.meta.url));
const args=process.argv.slice(2);if(args.length!==2||args[0]!=='--output-root')throw Error('Use --output-root <M1.4 runtime directory>');
const outputRoot=resolve(args[1]);if(outputRoot===resolve(source)||outputRoot.startsWith(resolve(source)+sep))throw Error('Output must be outside candidate source');
const stamp=new Date().toISOString().replace(/[:.]/g,'-')+'-'+process.pid,out=join(outputRoot,'verification',stamp),workspace=join(out,'workspace'),data=join(out,'data');
await mkdir(workspace,{recursive:true});
for(const name of ['src','tests','tools','config','package.json'])await cp(join(source,name),join(workspace,name),{recursive:true,errorOnExist:true,force:false});
const files=[];
async function inventory(base){for(const e of (await readdir(base,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const p=join(base,e.name);if(e.isDirectory())await inventory(p);else if(e.isFile()){const h=createHash('sha256');let bytes=0;for await(const chunk of createReadStream(p)){h.update(chunk);bytes+=chunk.length;}files.push({path:relative(workspace,p).replaceAll('\\','/'),bytes,sha256:h.digest('hex')});}else throw Error('Non-regular source');}}
await inventory(workspace);files.sort((a,b)=>a.path.localeCompare(b.path,'en'));
const sorted=[...files].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0),set=createHash('sha256').update(sorted.map(f=>f.path+'\0'+f.sha256+'\n').join('')).digest('hex');
await writeFile(join(out,'source-manifest.json'),JSON.stringify({schema:'agentnexus/m1.4/source/1',files,set_sha256:set},null,2)+'\n',{flag:'wx'});
const syntax=[];for(const f of files.filter(f=>/\.(ts|mjs)$/.test(f.path))){const r=spawnSync(process.execPath,['--check',f.path],{cwd:workspace,shell:false,windowsHide:true,encoding:'utf8',timeout:10000});syntax.push({path:f.path,status:r.status===0?'PASS':'FAIL',error:r.status===0?null:r.stderr.slice(0,4096)});}
await writeFile(join(out,'syntax.json'),JSON.stringify({kind:'NODE_SYNTAX_ONLY_NOT_TSC',checks:syntax},null,2)+'\n',{flag:'wx'});
const tests=(await readdir(join(workspace,'tests/agentnexus'))).filter(n=>n.endsWith('.test.ts')).sort().map(n=>'tests/agentnexus/'+n),started_at=new Date().toISOString();
const child=spawn(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap','--test-reporter=./tools/agentnexus/json-reporter.mjs','--test-reporter-destination=../all-tests.tap','--test-reporter-destination=../events.jsonl',...tests],{cwd:workspace,shell:false,windowsHide:true,env:{...process.env,NODE_OPTIONS:'',NODE_PATH:'',AGENTNEXUS_TEST_DATA_ROOT:data},stdio:['ignore','pipe','pipe']});
const exited=once(child,'exit');let timedOut=false;const timer=setTimeout(()=>{timedOut=true;child.kill();},240000);
const bound=()=>{let n=0;return new Transform({transform(c,_e,cb){n+=c.length;cb(n>1048576?Error('Runner output budget'):null,c);}});};
let exit_code;try{await Promise.all([pipeline(child.stdout,bound(),createWriteStream(join(out,'runner.stdout.txt'),{flags:'wx'})),pipeline(child.stderr,bound(),createWriteStream(join(out,'runner.stderr.txt'),{flags:'wx'}))]);[exit_code]=await exited;}finally{clearTimeout(timer);}
let summary;const cases=[];for await(const line of createInterface({input:createReadStream(join(out,'events.jsonl')),crlfDelay:Infinity})){if(Buffer.byteLength(line)>65536)throw Error('Test event too large');const e=JSON.parse(line);if(e.type==='test:summary')summary=e;if(['test:pass','test:fail'].includes(e.type))cases.push(e);}
const result={schema:'agentnexus/m1.4/verification/1',started_at,ended_at:new Date().toISOString(),node:process.version,platform:process.platform,exit_code,timedOut,source_set_sha256:set,test_files:tests,summary,cases,syntax_pass:syntax.every(s=>s.status==='PASS'),workspace,data,security_assurance:'PER_CASE_EXPLICIT_REAL_WINDOWS_OR_SIMULATED',production_deployment:'BLOCKED',linux:'NOT_RUN',os_reboot:'NOT_RUN',tsc:'NOT_RUN'};
await writeFile(join(out,'results.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,exit_code,timedOut,summary,source_set_sha256:set,syntax_pass:result.syntax_pass}));process.exitCode=timedOut||!result.syntax_pass?1:exit_code??1;
