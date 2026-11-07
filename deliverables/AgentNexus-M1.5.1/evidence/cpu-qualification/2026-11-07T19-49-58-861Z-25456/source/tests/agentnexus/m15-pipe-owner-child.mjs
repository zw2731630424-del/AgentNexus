// Fixed local owner-death fixture. Uses only a new temporary native pipe.
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const powerShell=process.env.AGENTNEXUS_TEST_POWERSHELL_PATH;
if(!powerShell)throw Error('fixed PowerShell path is required');
const directory=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT,'m15-pipe');mkdirSync(directory,{recursive:true});
const evidence=join(directory,`owner-helper-${Date.now()}-${randomUUID()}.jsonl`);
const child=spawn(powerShell,['-NoLogo','-NoProfile','-NonInteractive','-File',fileURLToPath(new URL('../../src/agentnexus/production/windows/runtime.ps1',import.meta.url))],{shell:false,windowsHide:true,stdio:'pipe'});
let buffer=Buffer.alloc(0),serial=0;const pending=new Map();let stderr='';
child.stderr.on('data',b=>{stderr+=b.toString();});
child.stdout.on('data',b=>{
 buffer=Buffer.concat([buffer,b]);if(buffer.length>131072)throw Error('fixture frame budget');
 for(;;){const end=buffer.indexOf(10);if(end<0)break;const raw=buffer.subarray(0,end).toString('utf8');buffer=buffer.subarray(end+1);if(Buffer.byteLength(raw)+1>65536)throw Error('native frame budget');const frame=JSON.parse(raw);appendFileSync(evidence,JSON.stringify({received_at:new Date().toISOString(),helper_pid:child.pid,frame,raw_jsonl:raw+'\n'})+'\n');const p=pending.get(frame.id);if(p){pending.delete(frame.id);clearTimeout(p.timer);p.resolve(frame);}}
});
function call(op,params={}){const id='owner-'+ ++serial;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('owner helper deadline '+stderr));},10000);pending.set(id,{resolve,reject,timer});child.stdin.write(JSON.stringify({id,op,deadline_ms:3000,params})+'\n');});}
function good(frame){if(!frame.ok)throw Error(JSON.stringify(frame.error));return frame.result;}
const identity=good(await call('identity'));
const listen=await call('bootstrap.testpipe.listen',{name:`AgentNexus-M15-owner-${process.pid}-${randomUUID()}`,peer_sid:identity.principal,peer_image:process.execPath,peer_image_sha256:createHash('sha256').update(readFileSync(process.execPath)).digest('hex')});
if(!listen.ok){process.send?.({status:'BLOCKED',error:listen.error});child.stdin.end();await new Promise(resolve=>child.once('exit',resolve));process.exit(0);}
process.send?.({status:'READY',helper_pid:child.pid,process:identity,endpoint_id:listen.result.endpoint_id,evidence});
// The parent test kills this Node owner. No signal is sent to its helper here.
setInterval(()=>{},1000);
