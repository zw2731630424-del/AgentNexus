import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { mkdir,readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runPilot } from '../../src/agentnexus/harness/pilot-run.ts';
const typeTools=process.env.AGENTNEXUS_TYPE_TOOLS,git=process.env.AGENTNEXUS_TEST_GIT_PATH;
test('M17 Native Pilot actually publishes, reviews, repairs, restores and gates a complete CLI through a SIMULATED provider',
  {skip:typeTools&&git?false:'NOT_RUN: explicit pinned type-tools and Git executable paths required',timeout:240000},async t=>{
    const base=join(process.env.AGENTNEXUS_TEST_DATA_ROOT??join(tmpdir(),'agentnexus-m17'),'native-pilot');await mkdir(base,{recursive:true});
    const report=await runPilot(base,{type_tools_root:typeTools!,git_path:git!,baseline_commit:'78a9d54b96417c262321be35ee44e86e300ca46d'});t.diagnostic('Evidence: '+report.root);
    assert.equal(report.status,'PASS',report.error??'Actual Pilot did not finish');assert.equal(report.model_autonomy,'SIMULATED');assert.equal(report.production_os,'BLOCKED');assert.equal(report.strict_cpu,'BLOCKED');
    assert.equal(report.concurrency.coding_peak,3);assert.equal(report.pre_repair_gates.length,2);assert(report.pre_repair_gates.every(gate=>gate.status==='FAIL'));
    assert.deepEqual(report.gate_records.map(gate=>gate.gate_id),['g0','g1','g2','g3','g4','g5','g6']);assert(report.gate_records.every(gate=>gate.status==='PASS'&&gate.allows_protected));
    const recovery=report.recovery as {status:string;old_runtime_instance_id:string;new_runtime_instance_id:string;automatic_model_calls_on_reopen:number};assert.equal(recovery.status,'PASS');assert.notEqual(recovery.old_runtime_instance_id,recovery.new_runtime_instance_id);assert.equal(recovery.automatic_model_calls_on_reopen,0);
    for(const id of ['research','architecture','code-model','code-analytics','code-cli','test','debug','docs','integration','lead','delivery','test-runner'])assert.equal(report.role_tasks.find(task=>task.id===id)?.state,'SUCCEEDED',id);
    assert.equal(new Set(report.role_tasks.map(task=>task.runtime_instance_id)).size,report.role_tasks.length);
    const db=new DatabaseSync(join(report.root,'host/kernel.sqlite'),{readOnly:true});
    try{const writes=db.prepare("SELECT o.operation_id,o.state,o.executor_state,p.consumed AS permit_consumed,EXISTS(SELECT 1 FROM control_approvals a WHERE a.intent_hash=o.intent_hash AND a.subject=o.subject AND a.consumed=1) AS approval_consumed FROM control_operations o JOIN control_permits p ON p.operation_id=o.operation_id WHERE o.workspace IS NOT NULL").all();assert.equal(writes.length,21);
      for(const write of writes){assert.equal(write.state,'SUCCEEDED');assert.equal(write.executor_state,'SETTLED');assert.equal(write.permit_consumed,1);assert.equal(write.approval_consumed,1);}
      const versions=db.prepare("SELECT body FROM m16_entities WHERE kind='STORAGE_VERSION' AND json_extract(body,'$.resource_id')='pilot:delivery'").all();assert.equal(versions.length,10);
      for(const row of versions){const version=JSON.parse(String(row.body)),bytes=await readFile(join(report.project_root,version.path));assert.equal(createHash('sha256').update(bytes).digest('hex'),version.file.sha256);assert.equal(version.version,version.path==='src/analytics.ts'?2:1);}
      const unknown=db.prepare("SELECT COUNT(*) AS n FROM m16_entities WHERE kind='resource_reservation' AND state='UNKNOWN_QUARANTINED'").get();assert.equal(unknown?.n,0);
      const windows=db.prepare("SELECT COUNT(*) AS n FROM anx_records WHERE domain='audit' AND json_extract(body,'$.phase')='TASK_HISTORY_WINDOW_ADVANCED'").get();assert(Number(windows?.n)>0);
      const gateTests=report.gate_records.filter(gate=>gate.gate_id==='g3'||gate.gate_id==='g4');assert(gateTests.every(gate=>gate.checks.some(check=>(check.evidence_refs?.length??0)>0)));
    }finally{db.close();}
  });
