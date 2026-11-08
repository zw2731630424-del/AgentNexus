import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir,mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openHarness } from '../../src/agentnexus/harness/index.ts';
import type { PilotCheckReport } from '../../src/agentnexus/harness/pilot-checker.ts';
const limits={workers:4,memory_bytes:268435456,processes:4,wall_ms:1000000};
function observation(started:boolean):PilotCheckReport{return {schema:'agentnexus/m17/pilot-check/1',status:started?'INCONCLUSIVE':'BLOCKED',scope:'LOCAL_TRUSTED_FIXED_RUNNER',production_os_qualified:false,automatic_retry:false,candidate_hash:'a'.repeat(64),candidate_files:[],root:'SIMULATED_FAULT_FIXTURE',evidence_directory:null,snapshot_root:null,scratch_directory:null,execution_started:started,syntax:{status:'NOT_RUN',commands:[]},types:{status:'NOT_RUN',commands:[]},tests:{status:'NOT_RUN',commands:[]},findings:[],reason:'SIMULATED_MISSING_RESULT_RECORD',toolchain:null,limitation:'Injected report only; no process was launched in this negative test.'};}
async function fixture(){const base=process.env.AGENTNEXUS_TEST_DATA_ROOT??join(tmpdir(),'agentnexus-m17');await mkdir(base,{recursive:true});const h=await openHarness(await mkdtemp(join(base,'quality-proof-')),{platform_limits:limits});await h.administration.createProject({id:'p',rules:['Missing exit/result evidence never releases a checker reservation.'],budget:limits});await h.administration.createAgent({id:'verifier',task_id:'verifier',project_id:'p',type:'DEVELOPMENT',budget:{...limits,workers:1,memory_bytes:67108864,processes:1}});return h;}
test('M17 started checker without command/exit evidence retains UNKNOWN and cannot be silently retried',async()=>{
  const h=await fixture();try{assert.equal((await h.administration.runPilotQualityCheck('verifier',async()=>observation(true))).status,'INCONCLUSIVE');assert.equal(h.state.count('resource_reservation',{state:'UNKNOWN_QUARANTINED'}),1);
    assert.equal(h.state.get<{held:{workers:number}}>('resource_budget','platform')!.held.workers,1);await assert.rejects(h.administration.runPilotQualityCheck('verifier',async()=>observation(false)),/PILOT_CHECK_BUDGET_EXHAUSTED|RESOURCE/);
  }finally{await h.close();}
});
test('M17 known checker admission rejection has zero invocation and releases only its own logical reservation',async()=>{
  const h=await fixture();try{assert.equal((await h.administration.runPilotQualityCheck('verifier',async()=>observation(false))).status,'BLOCKED');assert.equal(h.state.count('resource_reservation',{state:'UNKNOWN_QUARANTINED'}),0);assert.equal(h.state.count('resource_reservation',{state:'RELEASED'}),1);assert.equal(h.state.get<{held:{workers:number}}>('resource_budget','platform')!.held.workers,0);}finally{await h.close();}
});
test('M17 thrown checker result retains UNKNOWN rather than manufacturing a completion receipt',async()=>{
  const h=await fixture();try{await assert.rejects(h.administration.runPilotQualityCheck('verifier',async()=>{throw Error('Injected result loss');}),/Injected result loss/);assert.equal(h.state.count('resource_reservation',{state:'UNKNOWN_QUARANTINED'}),1);assert.equal(h.state.count('resource_reservation',{state:'RELEASED'}),0);}finally{await h.close();}
});
