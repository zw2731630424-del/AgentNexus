import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, linkSync, symlinkSync, unlinkSync, rmdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { EvidenceRpc, testRoot } from './m151-rpc.ts';
import type { ProcessIdentity } from '../../src/agentnexus/runtime/contracts.ts';

const windows=process.platform==='win32'&&!!process.env.AGENTNEXUS_TEST_POWERSHELL_PATH;
type FileResult={content_base64:string;file_id:string;ancestor_handles_pinned:boolean;ancestor_share_delete:boolean;ancestor_share_write:boolean};
type JobResult={root:ProcessIdentity;members:{identity:ProcessIdentity;exited:boolean;root:boolean}[];root_exit_observed:boolean;tree_empty_observed:boolean;output_producers_settled:boolean;root_exit_observed_at:string;termination_requested_at:string|null;job_handle_close_succeeded:boolean;process_handles_close_succeeded:boolean;membership_complete:boolean;release_authority:boolean;proof_status:string};
function fixture(t:test.TestContext){mkdirSync(testRoot,{recursive:true});const base=mkdtempSync(join(testRoot,'b-'));const rpc=new EvidenceRpc(join(base,'evidence'));t.after(()=>rpc.close());return {base,rpc};}

for(const kind of ['file','dir','junction','hard'] as const)test(`M151 REAL_WINDOWS_PRIMITIVE: actual ${kind} link cannot escape the directory handle boundary`,{skip:!windows},async t=>{
  const {base,rpc}=fixture(t),inside=join(base,'inside'),outside=join(base,'outside');mkdirSync(inside);mkdirSync(outside);writeFileSync(join(outside,'value'),'outside-secret');
  const link=join(inside,'link');
  try{if(kind==='hard')linkSync(join(outside,'value'),link);else symlinkSync(kind==='file'?join(outside,'value'):outside,link,kind==='file'?'file':kind==='dir'?'dir':'junction');}
  catch(e){const code=(e as NodeJS.ErrnoException).code;if(['EPERM','EACCES'].includes(code??'')){rpc.record({test:kind,status:'BLOCKED',reason:code,system_configuration_changed:false});t.skip(`BLOCKED: OS refused ${kind} fixture (${code}); no privilege or policy changed`);return;}throw e;}
  if(kind!=='hard')t.after(()=>{try{unlinkSync(link);}catch{rmdirSync(link);}});
  const p=await rpc.call('file.read',{root:inside,relative_path:kind==='dir'||kind==='junction'?'link\\value':'link',max_bytes:128});
  assert.equal(p.ok,false);if(kind==='hard')assert.equal(p.error?.code,'HARDLINK_REJECTED');else assert.ok(['REPARSE_REJECTED','WIN32_1920','WIN32_4390'].includes(p.error?.code??''),JSON.stringify(p));
  assert.equal(readFileSync(join(outside,'value'),'utf8'),'outside-secret');
});

test('M151 REAL_WINDOWS_PRIMITIVE: sibling project and management fixture paths are rejected; file byte limit is enforced',{skip:!windows},async t=>{
  const {base,rpc}=fixture(t),root=join(base,'project-a');mkdirSync(root);for(const d of ['project-b','host']){mkdirSync(join(base,d));writeFileSync(join(base,d,'secret'),'outside');}
  for(const relative_path of ['..\\project-b\\secret','..\\host\\secret']){const p=await rpc.call('file.read',{root,relative_path,max_bytes:128});assert.equal(p.ok,false);assert.equal(p.error?.code,'PATH_REJECTED');}
  writeFileSync(join(root,'large'),Buffer.alloc(24576));const p=await rpc.call('file.read',{root,relative_path:'large',max_bytes:4096});assert.equal(p.ok,false);assert.equal(p.error?.code,'FILE_LIMIT');
  const q=await rpc.call('file.create',{root,relative_path:'output',max_bytes:4,content_base64:Buffer.alloc(5).toString('base64')});assert.equal(q.ok,false);assert.equal(q.error?.code,'FILE_LIMIT');
  rpc.record({scope:'Actual handle broker against synthetic sibling files; no independent-account isolation or OS disk quota claimed'});
});

test('M151 REAL_WINDOWS_PRIMITIVE: concurrent directory replacement never returns junction target bytes',{skip:!windows},async t=>{
  const {base,rpc}=fixture(t),root=join(base,'root'),slot=join(root,'slot'),saved=join(root,'saved'),outside=join(base,'outside');mkdirSync(root);mkdirSync(slot);mkdirSync(outside);writeFileSync(join(slot,'value'),'safe');writeFileSync(join(outside,'value'),'outside-secret');
  const before=await rpc.good<FileResult>('file.read',{root,relative_path:'slot\\value',max_bytes:128});assert.equal(Buffer.from(before.content_base64,'base64').toString(),'safe');assert.equal(before.ancestor_handles_pinned,true);assert.equal(before.ancestor_share_delete,false);assert.equal(before.ancestor_share_write,false);
  let attempts=0,swaps=0,active=false;
  function swap(){attempts++;try{if(active){unlinkSync(slot);renameSync(saved,slot);active=false;}else{renameSync(slot,saved);try{symlinkSync(outside,slot,'junction');active=true;swaps++;}catch(e){renameSync(saved,slot);throw e;}}}catch{/* An OS sharing denial is expected while directory handles are retained. */}}
  const timer=setInterval(swap,2);let successes=0,rejections=0;
  try{for(let i=0;i<40;i++){const p=await rpc.call('file.read',{root,relative_path:'slot\\value',max_bytes:128},1000);if(p.ok){const r=p.result as FileResult;assert.equal(Buffer.from(r.content_base64,'base64').toString(),'safe');assert.equal(r.file_id,before.file_id);successes++;}else{assert.ok(['REPARSE_REJECTED','WIN32_1920','WIN32_4390','WIN32_2','WIN32_3','WIN32_5','WIN32_32'].includes(p.error?.code??''),JSON.stringify(p));rejections++;}}}
  finally{clearInterval(timer);if(active){unlinkSync(slot);renameSync(saved,slot);}}
  assert.ok(attempts>0);assert.ok(swaps>0,'fixture must actually install junction replacements');assert.equal(successes+rejections,40);rpc.record({test:'TOCTOU',attempts,swaps,successes,rejections,outside_bytes_returned:false});
});

for(const mode of ['normal','crash','hold','levels','orphan'])test(`M151 REAL_WINDOWS_PRIMITIVE: ${mode} observes root, tree, producers and native handle cleanup separately`,{skip:!windows},async t=>{
  const {rpc}=fixture(t),worker=fileURLToPath(new URL('./m151-tree-worker.mjs',import.meta.url)),cwd=fileURLToPath(new URL('../../',import.meta.url));
  const r=await rpc.good<JobResult>('primitive.job',{executable:process.execPath,executable_sha256:createHash('sha256').update(readFileSync(process.execPath)).digest('hex'),args:[worker,mode],cwd,limits:{active_processes:12,process_memory_bytes:268435456,job_memory_bytes:805306368,cpu_rate:10000,cpu_ms:1000},stdout_max_bytes:4096,stderr_max_bytes:4096},mode==='normal'||mode==='crash'?4000:2500);
  assert.equal(r.root_exit_observed,true);assert.equal(r.tree_empty_observed,true);assert.equal(r.output_producers_settled,true);assert.equal(r.job_handle_close_succeeded,true);assert.equal(r.process_handles_close_succeeded,true);assert.ok(r.members.every(m=>m.exited));
  if(mode==='levels'||mode==='orphan')assert.ok(r.members.length>=3);
  if(mode==='orphan'){assert.ok(r.termination_requested_at);assert.ok(Date.parse(r.root_exit_observed_at)<Date.parse(r.termination_requested_at));}
  assert.equal(r.membership_complete,false);assert.equal(r.release_authority,false);assert.equal(r.proof_status,'EXIT_UNVERIFIED');
});
