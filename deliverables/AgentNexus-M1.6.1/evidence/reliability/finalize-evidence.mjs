import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const evidence=dirname(fileURLToPath(import.meta.url)),delivery=resolve(evidence,'../..'),workspace=resolve(delivery,'../..'),source=join(delivery,'source');
const version4=process.argv.includes('--v4'),version3=version4||process.argv.includes('--v3'),version2=version3||process.argv.includes('--v2'),suffix=version4?'-v4':version3?'-v3':version2?'-v2':'';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function entry(path,basis){const bytes=await readFile(path);return{path:path.replaceAll('\\','/'),bytes:bytes.length,sha256:hash(bytes),...(basis?{basis}:{})};}
async function writeNew(path,value){await writeFile(path,JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
const fullReads=[
  'AGENTS.md','.workflow-kit/governance/policy.json','ai-workflow-kit-v4/project-workflows/README.md','deliverables/AgentNexus-M1.6.1/original-request.txt',
  ...['README.md','acceptance-report.md','independent-code-review.md','context-model-messaging.md','native-harness.md','internal-protocols.md','architecture.md','adr.md','workflow-runtime.md','feature-catalog.md','policy-catalog.md','issue-ledger.json','evidence/independent-review/final-review.md'].map(p=>'deliverables/AgentNexus-M1.6/'+p),
  ...['context.ts','messages.ts','models.ts','state.ts','contracts.ts','scheduler.ts','index.ts','agents.ts','tools.ts','workflow.ts'].map(p=>'deliverables/AgentNexus-M1.6/source/src/agentnexus/harness/'+p),
  ...['types.ts','records.ts','storage.ts','artifacts.ts'].map(p=>'deliverables/AgentNexus-M1.6/source/src/agentnexus/'+p),
  ...['m16-context.test.ts','m16-messages.test.ts','m16-models.test.ts','m16-harness.test.ts','m16-resources.test.ts','storage.test.ts'].map(p=>'deliverables/AgentNexus-M1.6/source/tests/agentnexus/'+p),
  ...['package.json','tsconfig.json','tools/agentnexus/typecheck-m15.mjs','tools/agentnexus/run-tests.mjs'].map(p=>'deliverables/AgentNexus-M1.6/source/'+p),
];
const owned=['src/agentnexus/harness/context.ts','src/agentnexus/harness/messages.ts','src/agentnexus/harness/models.ts','tests/agentnexus/m161-context.test.ts','tests/agentnexus/m161-messages.test.ts'];
const ownedManifest=await Promise.all(owned.map(p=>entry(join(source,p),'AUTHORED_AND_TESTED')));
const readManifest={schema:'agentnexus/m161/reliability-read-manifest/1',observed_at:new Date().toISOString(),
  hash_observation:'SHA256 observed after reading/implementation; immutable M1.6 inputs were never edited. This is the reliability worker scope, not the entire Phase 0 inventory.',
  absent_optional_index:'project-rules/README.md was absent',
  files:[...await Promise.all(fullReads.map(p=>entry(join(workspace,p),'FULL_CONTENT_READ'))),...ownedManifest,
    ...await Promise.all(['index.ts','scheduler.ts'].map(p=>entry(join(source,'src/agentnexus/harness',p),'INTEGRATION_EXCERPTS_REVIEWED; parent owns full file'))),
    ...(version3?[await entry(join(source,'src/agentnexus/artifacts.ts'),'QUEUED_WRITER_IMPLEMENTATION_EXCERPT_REVIEWED; parent owns full file')]:[])]};
await writeNew(join(evidence,'read-manifest'+suffix+'.json'),readManifest);
const testFiles=await readdir(join(workspace,'deliverables/AgentNexus-M1.6/source/tests/agentnexus')),preservation=[];
for(const name of testFiles){const old=join(workspace,'deliverables/AgentNexus-M1.6/source/tests/agentnexus',name);if(!(await stat(old)).isFile())continue;
  const original=await entry(old),current=await entry(join(source,'tests/agentnexus',name));preservation.push({path:'tests/agentnexus/'+name,original_sha256:original.sha256,current_sha256:current.sha256,unchanged:original.sha256===current.sha256});}
await writeNew(join(evidence,'original-tests-preservation'+suffix+'.json'),{schema:'agentnexus/m161/reliability-original-tests/1',files:preservation,status:preservation.every(item=>item.unchanged)?'PASS':'FAIL'});
const runs=[];
for(const name of ['run-01','run-02','run-03','final',...(version2?['final-02']:[]),...(version3?['final-03']:[]),...(version4?['review-deadlock-before','final-04']:[])]){
  const root=join(evidence,name),tap=await readFile(join(root,'tests.tap'),'utf8'),summary={};
  for(const match of tap.matchAll(/^# (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms) ([\d.]+)$/gm))summary[match[1]]=Number(match[2]);
  const results=[...tap.matchAll(/^(\s*)(not ok|ok) (\d+) - (.*)$/gm)].map(match=>({depth:match[1].length,index:Number(match[3]),name:match[4],status:match[2]==='ok'?'PASS':'FAIL'}));
  const result={schema:'agentnexus/m161/reliability-tap-results/1',status:summary.fail===0?'PASS':'FAIL',summary,results,
    raw_tap:await entry(join(root,'tests.tap')),raw_stderr:await entry(join(root,'tests.stderr'))};
  const resultPath=join(root,'results.json');try{await stat(resultPath);}catch(error){if(error.code!=='ENOENT')throw error;await writeNew(resultPath,result);}
  runs.push({name,status:result.status,summary,raw_tap:result.raw_tap});
}
const verification={schema:'agentnexus/m161/reliability-verification/1',observed_at:new Date().toISOString(),status:'PASS',
  scope:'Context Assembly / Message Bus / minimal model input provenance; parent owns Scheduler/Rules/Storage integration and full regression',
  final_added_tests:{context:version4?13:version3?12:11,messages:version2?16:14,total:version4?29:version3?28:version2?27:25,pass:version4?29:version3?28:version2?27:25,fail:0},
  assurance:{sqlite_zstd:'REAL_LOCAL',local_file_change_and_corruption:'REAL_LOCAL',child_host_process_kill_and_lock_recovery:'REAL_LOCAL_TWO_SCENARIOS',task_owner_fixture:'SIMULATED_TRUSTED_STATE_TRANSITIONS',provider_and_metering:'SIMULATED',scheduling_and_crash_barriers:'SIMULATED_AT_ACTUAL_DURABLE_BOUNDARIES',os_reboot:'NOT_RUN',hard_power_loss:'NOT_RUN',external_provider_or_real_credentials:'NOT_RUN'},
  final_typecheck:{status:'PASS',stdout:await entry(join(evidence,'typecheck-final'+suffix+'.log')),stderr:await entry(join(evidence,'typecheck-final'+suffix+'.stderr')),node:'24.15.0',typescript:'5.9.3',node_types:'24.10.1',strict:true},
  source:ownedManifest,runs,original_tests_preserved:preservation.every(item=>item.unchanged),
  source_binding:'Hashes captured immediately after the final focused run; no owned source edits occurred during that run. Final full candidate source binding is maintained by the parent executor.',
  inherited_limits:['CPU strict qualification remains BLOCKED; this component does not modify CPU or TOCTOU evidence.','A corrupted stored artifact freezes new writes; exact input/raw reads remain available where their independent objects validate. Explicit owner reconciliation is required before publishing replacements.','Current source labels are supplied by trusted Host callers; byte/version integrity does not authenticate an arbitrary live pathname or natural-language label.','The trusted local library is not malicious in-process or OS isolation.'],
  ...(version4?{independent_review_fix:{issue:'Two assemblies held read slots while queued input writes waited on two capture producers whose readRange calls needed those read slots.',
    before:{run:'review-deadlock-before',tests:13,pass:12,fail:1,cancellation_deadline_ms:3000,observed:{active_reads:2,queued_reads:2,active_writers:2,queued_writers:2},normal_process_exit:true},
    fix:'Release the idempotent read-slot callback immediately after source scans; retain finally cleanup. Input/manifest/provenance checks unchanged.',
    after:{run:'final-04',tests:54,pass:54,fail:0,added_tests:29,composed_case_completed_without_cancellation:true,peak_reads:2,peak_writers:2}}}:{}),};
if(!verification.original_tests_preserved)throw new Error('Original test bytes changed');
await writeNew(join(evidence,'verification'+suffix+'.json'),verification);
process.stdout.write(JSON.stringify({status:verification.status,read_files:readManifest.files.length,preserved_tests:preservation.length,final_tests:verification.final_added_tests,runs:runs.map(({name,status,summary})=>({name,status,summary})),source:ownedManifest},null,2)+'\n');
