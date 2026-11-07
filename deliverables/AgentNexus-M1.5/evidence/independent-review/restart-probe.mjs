import { spawn } from 'node:child_process';
import { mkdir,mkdtemp,readFile } from 'node:fs/promises';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const source = new URL('../../../../deliverables/AgentNexus-M1.5/source/',import.meta.url);
const moduleUrl=new URL('src/agentnexus/storage.ts',source).href;
const {KernelStore}=await import(moduleUrl);
const data=join(dirname(fileURLToPath(import.meta.url)),'storage-probe-data');await mkdir(data,{recursive:true});
const root=await mkdtemp(join(data,'crash-'));
const child=spawn(process.execPath,['--input-type=module','-e',`const {KernelStore}=await import(${JSON.stringify(moduleUrl)});await KernelStore.open(process.argv[1]);process.stdout.write('OPENED\\n');process.exit(0);`,root],{shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
let stdout='',stderr='';child.stdout.on('data',b=>{stdout+=b;});child.stderr.on('data',b=>{stderr+=b;});
const childExit=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>resolve(code));});
let reopenFailure=null;try{const store=await KernelStore.open(root);await store.close();}catch(error){reopenFailure={code:error.code,message:error.message};}
const recovery=await KernelStore.recoverAbandonedLock(root);const reopened=await KernelStore.open(root);await reopened.close();
const files=['src/agentnexus/storage.ts','src/agentnexus/bootstrap/runtime.ts','src/agentnexus/bootstrap/entry.ts'];
const hashes=Object.fromEntries(await Promise.all(files.map(async path=>[path,createHash('sha256').update(await readFile(new URL(path,source))).digest('hex')])));
console.log(JSON.stringify({schema:'agentnexus/independent-storage-probe/1',timestamp:new Date().toISOString(),assurance:'REAL_OS_CURRENT_ACCOUNT_STORAGE_PRIMITIVE',scope:'A current-account Node child opened its own test store then exited without close; this does not run or certify production Host bootstrap.',root,childExit,stdout,stderr,reopenFailure,explicit_recovery:recovery,reopen_after_explicit_recovery:true,source_sha256:hashes},null,2));
