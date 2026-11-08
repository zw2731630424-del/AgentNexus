import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDevelopmentPlan,pilotPath } from '../../src/agentnexus/harness/development.ts';
import { openHarness } from '../../src/agentnexus/harness/index.ts';
import { canonical,sha256 } from '../../src/agentnexus/types.ts';
import { mkdir,mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { DevelopmentPlan,PlanEnvelope } from '../../src/agentnexus/harness/development.ts';
const envelope:PlanEnvelope={project_id:'pilot',allowed_outputs:['src/a.ts','src/b.ts','src/c.ts'],max_tasks:12,max_requests:100,max_disk_bytes:65536};
function plan():DevelopmentPlan{return {schema:'agentnexus/development-plan/1',project_id:'pilot',requirements_sha256:'a'.repeat(64),goal:'Implement validated tasks',tasks:['a','b','c'].map(id=>({id,role:'CODING',goal:'Implement '+id,dependencies:[],priority:1,outputs:['src/'+id+'.ts'],acceptance:['Actual tests pass'],model_strategy:'LOW_COST',estimated_requests:5,disk_bytes:4096}))};}
test('M17 Development plan exposes three independent jobs without broadening model permissions',()=>{
  const result=validateDevelopmentPlan(plan(),envelope);assert.equal(result.batches[0].length,3);assert.equal(Object.keys(result.owners).length,3);assert(Object.isFrozen(result.plan));
  const stronger=plan();stronger.tasks[0].model_strategy='REASONING';assert.deepEqual(validateDevelopmentPlan(stronger,envelope).owners,result.owners);
});
test('M17 Development admission rejects scope escalation, cycles, file aliases, and budget abuse',()=>{
  const variants:[(p:DevelopmentPlan)=>void,RegExp][]=[
    [p=>p.tasks[1].outputs=['src/a.ts'],/FILE_CONFLICT/],[p=>p.tasks[1].outputs=['src/A.ts'],/FILE_CONFLICT/],
    [p=>p.tasks[0].outputs=['src/elsewhere.ts'],/OUTPUT_SCOPE/],[p=>p.tasks[0].outputs=['../outside.ts'],/OUTPUT_PATH/],
    [p=>{p.tasks[0].dependencies=['b'];p.tasks[1].dependencies=['a'];},/CYCLE/],
    [p=>p.tasks[0].dependencies=['missing'],/DEPENDENCY/],[p=>p.tasks[0].role='REVIEW',/READ_ONLY_ROLE/],
    [p=>p.tasks[0].disk_bytes=1048576,/RESOURCE_ENVELOPE/],[p=>(p.tasks[0] as unknown as {admin:boolean}).admin=true,/PLAN_FIELDS/],
  ];
  for(const [change,pattern]of variants){const p=plan();change(p);assert.throws(()=>validateDevelopmentPlan(p,envelope),pattern);}
});
test('M17 Development output paths reject Windows devices, alternate streams, and normalization aliases',()=>{
  for(const value of ['CON.txt','x/NUL','x:stream','/absolute','a\\b','a/../b','a.','x//y','x/COM1.ts'])assert.throws(()=>pilotPath(value),/OUTPUT_PATH/);
  assert.equal(pilotPath('tests/model.test.ts'),'tests/model.test.ts');
});
test('M17 Development ownership treats prototype names and directory prefix conflicts as real files',()=>{
  const p=plan();p.tasks[0].outputs=['__proto__'];p.tasks[1].outputs=['__proto__'];
  assert.throws(()=>validateDevelopmentPlan(p,{...envelope,allowed_outputs:['__proto__','src/c.ts']}),/FILE_CONFLICT/);
  p.tasks[0].outputs=['tree'];p.tasks[1].outputs=['tree/child.ts'];
  assert.throws(()=>validateDevelopmentPlan(p,{...envelope,allowed_outputs:['tree','tree/child.ts','src/c.ts']}),/FILE_CONFLICT/);
});
test('M17 Development plan must actually consume the exact original requirement source in its verified model input',async()=>{
  const base=process.env.AGENTNEXUS_TEST_DATA_ROOT??join(tmpdir(),'agentnexus-m17');await mkdir(base,{recursive:true});const root=await mkdtemp(join(base,'plan-provenance-'));
  const original=canonical({schema:'test-requirements',goal:'Preserve actual original inputs'}),p=plan();p.requirements_sha256=sha256(original);
  const reply={kind:'WAIT' as const,text:canonical(p)},h=await openHarness(root,{mocks:{'mock-main':[{reply},{reply}]}});
  try{await h.administration.createProject({id:'pilot',rules:['Original requirement sources must be present in model context.']});
    for(const id of ['missing','present'])await h.administration.createAgent({id,task_id:id,project_id:'pilot',type:'DEVELOPMENT',budget:{workers:1,memory_bytes:67108864,model_tokens:100000,model_requests:100,model_cost_micros:1000000,wall_ms:300000}});
    const absent=await h.administration.captureContext('missing',original);await h.administration.createTask({id:'missing',agent_id:'missing',goal:'Propose a plan without the hidden requirement source'});
    assert.equal((await h.administration.dispatch('missing')).state,'WAITING');await assert.rejects(h.administration.admitDevelopmentPlan('missing',h.inspectTask('missing').history.at(-1)!,absent,envelope),/REQUIREMENTS_NOT_IN_MODEL_CONTEXT/);
    const required=await h.administration.captureContext('present',original);await h.administration.createTask({id:'present',agent_id:'present',goal:'Propose a plan using the original source',inputs:[{source:required,section:'FILE_CONTENT',required:true}]});
    assert.equal((await h.administration.dispatch('present')).state,'WAITING');const source=h.inspectTask('present').history.at(-1)!;
    const equalBytesNewSource=await h.administration.captureContext('present',original);await assert.rejects(h.administration.admitDevelopmentPlan('present',source,equalBytesNewSource,envelope),/REQUIREMENTS_NOT_IN_MODEL_CONTEXT/);
    const admitted=await h.administration.admitDevelopmentPlan('present',source,required,envelope);assert.equal(admitted.requirements.event_id,required.event_id);assert.equal(admitted.proposer_request_id,'present.turn.1');assert.equal(h.state.count('DEVELOPMENT_PLAN'),1);
    assert.equal((await h.administration.admitDevelopmentPlan('present',source,required,envelope)).id,admitted.id);
  }finally{await h.close();}
});
