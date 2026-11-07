import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';

test('M13-WINDOWS: actual native primitives; no full sandbox or release authority inferred',async t=>{
  if(process.platform!=='win32'||!process.env.AGENTNEXUS_TEST_POWERSHELL_PATH){t.skip('Windows and trusted PowerShell path required');return;}
  const base=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT??'.workflow-kit/runtime/AgentNexus-M1.3/data','windows');await mkdir(base,{recursive:true});const out=await mkdtemp(join(base,'probe-'));
  const stdout=join(out,'stdout.json'),stderr=join(out,'stderr.txt');
  const child=spawn(process.env.AGENTNEXUS_TEST_POWERSHELL_PATH,['-NoLogo','-NoProfile','-NonInteractive','-File',fileURLToPath(new URL('../../tools/agentnexus/windows-probes.ps1',import.meta.url)),'-NodePath',process.execPath],{shell:false,windowsHide:true,env:{SystemRoot:process.env.SystemRoot,WINDIR:process.env.WINDIR,PSModulePath:''},stdio:['ignore','pipe','pipe']});
  const bounded=(max:number)=>{let bytes=0;return new Transform({transform(chunk,_e,cb){bytes+=chunk.length;cb(bytes>max?new Error('native probe output limit'):null,chunk);}});};
  const exited=once(child,'exit');let timedOut=false;const timer=setTimeout(()=>{timedOut=true;child.kill();},45000);
  try{await Promise.all([pipeline(child.stdout,bounded(262144),createWriteStream(stdout,{flags:'wx'})),pipeline(child.stderr,bounded(32768),createWriteStream(stderr,{flags:'wx'}))]);const [code]=await exited;assert.equal(timedOut,false,'timeout is not exit proof');assert.equal(code,0,await readFile(stderr,'utf8'));}finally{clearTimeout(timer);}
  const report=JSON.parse(await readFile(stdout,'utf8'));assert.equal(report.deployment,'BLOCKED');assert.equal(report.system_configuration_modified,false);
  for(const c of report.cases)await t.test(c.name,(sub)=>{
    if(c.status!=='OBSERVED'){sub.skip('Native observation unavailable: '+c.reason);return;}
    const o=c.observation;
    if(c.name==='restricted-token'){assert.equal(o.token_restricted,true);assert.equal(o.worker_launched,false);return;}
    if(c.name.startsWith('pipe-')){assert.equal(o.peer_authenticated,c.name==='pipe-True');assert.notEqual(o.peer.pid,1);return;}
    if(c.name==='job-orphan'&&!(o.root_exited_before_termination&&o.active_before_termination>0)){sub.skip('Parent-exited/child-alive window not observed in this managed environment');return;}
    assert.equal(o.tree_empty_observed,true);assert.equal(o.root_exit_observed,true);assert.ok(o.members.every((m:any)=>m.exited));
    assert.equal(o.release_authority,false);assert.equal(o.membership_complete,false);
    assert.match(o.root.principal,/^S-1-/);assert.match(o.root.start_id,/^\d+$/);
    if(c.name==='job-hold'){assert.ok(o.active_before_termination>0);assert.ok(o.termination_requested_at);}
  });
});
