import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync, appendFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { EvidenceRpc,testRoot } from './m151-rpc.ts';
import type { ProcessIdentity } from '../../src/agentnexus/runtime/contracts.ts';

const ps=process.env.AGENTNEXUS_TEST_POWERSHELL_PATH;
const available=process.platform==='win32'&&!!ps;
const worker=fileURLToPath(new URL('./m151-tree-worker.mjs',import.meta.url));
const probe=fileURLToPath(new URL('./m151-lifecycle-probe.ps1',import.meta.url));
type ProbeResult={ok:boolean;error?:string;result?:{exits:boolean[];release_authority:boolean;membership_complete:boolean}};
async function observe(base:string,processes:ProcessIdentity[],onPinned:()=>void):Promise<ProbeResult>{
  const child=spawn(ps!,['-NoProfile','-NonInteractive','-File',probe],{shell:false,windowsHide:true,stdio:'pipe'}),closed=once(child,'close');let raw='',stderr='',pinned=false;
  child.stdout.on('data',(b:Buffer)=>{assert.ok(Buffer.byteLength(raw)+b.length<65536);raw+=b.toString();if(!pinned&&raw.includes('{"event":"PINNED"}')){pinned=true;onPinned();}});
  child.stderr.on('data',(b:Buffer)=>{assert.ok(stderr.length+b.length<65536);stderr+=b.toString();});
  const timer=setTimeout(()=>child.kill(),15000);try{child.stdin.end(JSON.stringify({mode:'wait',processes})+'\n');await closed;}finally{clearTimeout(timer);appendFileSync(join(base,'observer.stdout.jsonl'),raw);appendFileSync(join(base,'observer.stderr.txt'),stderr);}
  const lines=raw.trim().split(/\r?\n/);return JSON.parse(lines[lines.length-1]) as ProbeResult;
}

test('M151 REAL_WINDOWS_PRIMITIVE: owner death closes its Job and pinned root/descendant producers actually exit',{skip:!available},async t=>{
  mkdirSync(testRoot,{recursive:true});const base=mkdtempSync(join(testRoot,'owner-')),owner=new EvidenceRpc(join(base,'owner')),identityObserver=new EvidenceRpc(join(base,'identity'));t.after(()=>owner.close());t.after(()=>identityObserver.close());
  await identityObserver.good('identity',{});
  const prepared=await owner.good<{prepare_id:string;process:ProcessIdentity}>('primitive.prepare',{executable:process.execPath,executable_sha256:createHash('sha256').update(readFileSync(process.execPath)).digest('hex'),args:[worker,'levels'],cwd:fileURLToPath(new URL('../../',import.meta.url)),prepare_ttl_ms:10000,stream_output:true,limits:{active_processes:12,process_memory_bytes:268435456,job_memory_bytes:805306368,cpu_rate:10000,cpu_ms:5000}});
  const pending=owner.call('primitive.resume',{prepare_id:prepared.prepare_id,expected_process:prepared.process},15000).then(()=>({unexpected_result:true}),()=>({owner_terminated:true}));
  let pids:number[]=[];
  for(let i=0;i<30&&pids.length<2;i++){await delay(50);const lines=readFileSync(owner.log,'utf8').trim().split('\n');let text='';for(const l of lines){const r=JSON.parse(l) as {raw_jsonl?:string};if(r.raw_jsonl){const f=JSON.parse(r.raw_jsonl) as {event?:string;data_base64?:string};if(f.event==='stdout'&&f.data_base64)text+=Buffer.from(f.data_base64,'base64').toString();}}pids=[...new Set([...text.matchAll(/spawned-(\d+)/g)].map(m=>Number(m[1])))];}
  assert.equal(pids.length,2,'both descendant fixtures must actually start');
  const identities=[prepared.process];for(const pid of pids)identities.push(await identityObserver.good<ProcessIdentity>('identity',{pid}));
  const observation=await observe(base,identities,()=>owner.child.kill());assert.equal(observation.ok,true,observation.error);assert.ok(observation.result?.exits.every(Boolean));assert.equal(observation.result?.exits.length,3);assert.equal(observation.result?.release_authority,false);assert.equal(observation.result?.membership_complete,false);assert.deepEqual(await pending,{owner_terminated:true});
});

test('M151 REAL_WINDOWS_PRIMITIVE: stale creation time is rejected before an exit observation is accepted',{skip:!available},async()=>{
  mkdirSync(testRoot,{recursive:true});const base=mkdtempSync(join(testRoot,'pid-'));const r=await observe(base,[{os:'windows',principal:'S-1-0-0',pid:process.pid,start_id:'1',os_session:'1'}],()=>{throw Error('stale identity must never be pinned');});assert.equal(r.ok,false);assert.match(r.error??'',/PROCESS_IDENTITY_MISMATCH/);
});

test('M151 REAL_WINDOWS_PRIMITIVE: CREATE_BREAKAWAY_FROM_JOB is denied by the private Job',{skip:!available},async t=>{
  mkdirSync(testRoot,{recursive:true});const base=mkdtempSync(join(testRoot,'escape-')),rpc=new EvidenceRpc(join(base,'evidence'));t.after(()=>rpc.close());
  const prepared=await rpc.good<{prepare_id:string;process:ProcessIdentity}>('primitive.prepare',{executable:ps,executable_sha256:createHash('sha256').update(readFileSync(ps!)).digest('hex'),args:['-NoProfile','-NonInteractive','-File',probe],cwd:fileURLToPath(new URL('../../',import.meta.url)),prepare_ttl_ms:10000,limits:{active_processes:8,process_memory_bytes:268435456,job_memory_bytes:805306368,cpu_rate:10000,cpu_ms:5000},stdout_max_bytes:4096,stderr_max_bytes:4096},4000);
  const input=Buffer.from(JSON.stringify({mode:'breakaway',executable:process.execPath,fixture:worker})+'\n').toString('base64');
  const result=await rpc.good<{stdout:{content_base64:string};release_authority:boolean}>('primitive.resume',{prepare_id:prepared.prepare_id,expected_process:prepared.process,bootstrap_input_base64:input},5000);
  assert.equal(result.release_authority,false);
  const data=Buffer.from(result.stdout.content_base64,'base64').toString();
  const packet=JSON.parse(data) as {ok:boolean;result:{created:boolean;win32_error:number;unexpected_child_cleanup_observed:boolean}};
  assert.equal(packet.ok,true,data);assert.equal(packet.result.created,false);assert.equal(packet.result.win32_error,5);assert.equal(packet.result.unexpected_child_cleanup_observed,true);
});
