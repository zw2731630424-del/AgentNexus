import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { FeatureRegistry } from '../../src/agentnexus/features.ts';
import { initializeControl, metadata } from '../../src/agentnexus/control.ts';
import { NativeState } from '../../src/agentnexus/harness/state.ts';
import { openHarness } from '../../src/agentnexus/harness/index.ts';
import { RulesCompiler } from '../../src/agentnexus/harness/rules.ts';
import { NativeGateEngine, NATIVE_GATES, GATE_LIMITS } from '../../src/agentnexus/harness/gates.ts';
import type { NativeGateInput, NativeGateProfile, GateCheckerDefinition, NativeGateRecord } from '../../src/agentnexus/harness/gates.ts';
import type { Subject } from '../../src/agentnexus/harness/contracts.ts';
import type { FeatureDefinition, ArtifactRef } from '../../src/agentnexus/types.ts';
import type { NativeGateId } from '../../src/agentnexus/harness/rules.ts';
import { canonical, invariant, sha256 } from '../../src/agentnexus/types.ts';

async function fixture(profile:Partial<NativeGateProfile>={}){
  const base=process.env.AGENTNEXUS_TEST_DATA_ROOT??join(tmpdir(),'AgentNexus-M161');await mkdir(base,{recursive:true});const root=await mkdtemp(join(base,'gates-'));
  const store=await KernelStore.open(root);initializeControl(store);const admin=Object.freeze({});const check=(token:unknown)=>invariant(token===admin,'ADMIN_REQUIRED');
  const definitions=(JSON.parse(await readFile(new URL('../../config/agentnexus/features.json',import.meta.url),'utf8')) as {features:FeatureDefinition[]}).features;
  const features=new FeatureRegistry(store,definitions,check,{busy:false}),required=new Set<string>();const add=(id:string)=>{if(required.has(id))return;required.add(id);const def=definitions.find(item=>item.id===id);assert(def,'Missing feature '+id);for(const dep of def.depends_on)add(dep);};
  add('native.rules-compiler');add('native.gate-engine');add('wf.checklists');for(const gate of Object.keys(NATIVE_GATES))add('wf.gate.'+gate);for(const id of required)features.register(admin,id,{});
  const state=new NativeState(store,features,check,'gate-test-boot'),rules=new RulesCompiler(state),engine=new NativeGateEngine(state,rules);
  const actor:Subject={agent_id:'lead',project_id:'project',task_id:'task',session_id:'session',runtime_instance_id:'instance',agent_type:'DEVELOPMENT',model_binding:'mock',resource_budget_id:'budget',policy_scope:'project'};
  const put=async(value:unknown):Promise<ArtifactRef>=>store.artifacts.putBytes(Buffer.from(typeof value==='string'?value:canonical(value)),{maxBytes:131072,media_type:typeof value==='string'?'text/plain':'application/json'});
  const rulesSource=await put('Preserve immutable rules and verify actual evidence.');await rules.compile(admin,actor,{version:'1',workflow_version:'m161-native',sources:[{id:'AGENTS',format:'TEXT',payload_ref:rulesSource}]});
  const binding=rules.captureBinding(actor);const candidate=await put('export const answer = 42;'),baseline=await put('export const answer = 41;');
  const testProfile=await put({schema:'agentnexus/gate-profile/1',required_checkers:{},manual_gates:[],qualification:'LOCAL_TRUSTED_LIBRARY',...profile});
  await state.change(actor,'TASK_TEST_FIXTURE',()=>{state.insert('PROJECT','project',actor,'ACTIVE',{id:'project',revision:0,state:'ACTIVE'});state.insert('TASK','task',actor,'QUEUED',{id:'task',revision:0,subject:actor,state:'QUEUED',goal:'Verify this exact candidate.',rules_binding:binding});});
  const input=(gate_id:NativeGateId='g1',extra:Partial<NativeGateInput>={}):NativeGateInput=>({gate_id,binding,candidate_ref:candidate,baseline_ref:baseline,test_profile_ref:testProfile,evidence:[],author_id:actor.agent_id,...extra});
  const feature=async(id:string,value:'ON'|'OFF')=>{const m=metadata(store),p=await features.preview(admin,[{id,scope:{project_id:actor.project_id},state:value}],m.feature_revision);await features.commit(admin,p.challenge_id,p.preview_hash);};
  const checker=async(kind:'TEST'|'INDEPENDENT_REVIEW'='TEST',assurance:'LOCAL_TRUSTED_LIBRARY'|'SIMULATED'='LOCAL_TRUSTED_LIBRARY',run?:GateCheckerDefinition['run'])=>engine.registerChecker(admin,{id:kind==='TEST'?'actual.tests':'actual.review',version:'1',gates:kind==='TEST'?['g3']:['g4'],kind,assurance,...(kind==='INDEPENDENT_REVIEW'?{reviewer_id:'reviewer'}:{}),run:run??(async(context)=>{let bytes=0;for await(const chunk of context.readArtifact(context.candidate_ref))bytes+=chunk.length;return{status:bytes===context.candidate_ref.bytes?'PASS':'FAIL',reason:'Actually consumed the complete bound candidate stream.'};})});
  const reviewer=async(candidateHash=candidate.sha256,author='lead')=>{const reviewer:Subject={...actor,agent_id:'reviewer',task_id:'review-task',runtime_instance_id:'review-instance',session_id:'review-session',agent_type:'BACKGROUND_REVIEWER'};await state.change(actor,'AGENT_TEST_FIXTURE',()=>{state.insert('AGENT','reviewer',reviewer,'READY',{id:'reviewer',revision:0,subject:reviewer,lifecycle:'READY'});state.insert('TASK','review-task',reviewer,'QUEUED',{id:'review-task',revision:0,subject:reviewer,rules_binding:binding,review_binding:{candidate_sha256:candidateHash,author_agent_id:author}});});};
  return{root,store,state,admin,actor,features,rules,engine,put,binding,candidate,baseline,testProfile,input,feature,checker,reviewer};
}
test('M161-GATE-FORGERY: caller status and a model PASS artifact never certify an unexecuted gate',async()=>{
  const f=await fixture();try{await assert.rejects(f.engine.evaluate(f.admin,f.actor,{...f.input('g3'),status:'PASS'} as NativeGateInput),/NATIVE_GATE_SCHEMA/);
    const fake=await f.put({status:'PASS',checker_id:'actual.tests'});const result=await f.engine.evaluate(f.admin,f.actor,f.input('g3',{evidence:[{kind:'model-proposal',ref:fake}]}));assert.equal(result.status,'NOT_RUN');assert.equal(result.allows_protected,false);assert.equal(result.checks.length,0);
    await assert.rejects(f.engine.evaluate({},f.actor,f.input()),/ADMIN_REQUIRED/);
  }finally{await f.store.close();}
});
test('M161-GATE-ADMISSION-INTEGRITY: engine validates admitted Task, frozen rules and actual Artifact bytes',async()=>{
  const f=await fixture();try{const admission=await f.engine.evaluate(f.admin,f.actor,f.input('g0'));assert.equal(admission.status,'PASS');const integrity=await f.engine.evaluate(f.admin,f.actor,f.input());assert.equal(integrity.status,'PASS');assert.equal(integrity.candidate_hash,f.candidate.sha256);assert.equal(integrity.baseline_hash,f.baseline.sha256);assert.equal(integrity.test_profile_hash,f.testProfile.sha256);assert.equal(f.engine.assertPass(f.actor,integrity.id,f.input()).id,integrity.id);
    assert.throws(()=>f.engine.assertPass(f.actor,integrity.id,f.input('g1',{candidate_ref:f.baseline})),/NATIVE_GATE_PASS_REQUIRED/);
    assert.throws(()=>f.engine.assertPass(f.actor,integrity.id,f.input('g6')),/NATIVE_GATE_PASS_REQUIRED/);
  }finally{await f.store.close();}
});
test('M161-GATE-CHECKER: trusted checker runs actual bounded reads and engine captures code provenance',async()=>{
  const f=await fixture({required_checkers:{g3:['actual.tests']}});try{let executed=0;const metadata=await f.checker('TEST','LOCAL_TRUSTED_LIBRARY',async(context)=>{executed++;const chunks:Buffer[]=[];for await(const chunk of context.readArtifact(context.candidate_ref))chunks.push(Buffer.from(chunk));return{status:Buffer.concat(chunks).toString()==='export const answer = 42;'?'PASS':'FAIL',reason:'Actual content comparison from verified candidate.'};});
    const result=await f.engine.evaluate(f.admin,f.actor,f.input('g3'));assert.equal(result.status,'PASS');assert.equal(executed,1);assert.equal(result.checks[0].code_sha256,metadata.code_sha256);assert.equal(result.checks[0].source_ref.sha256,metadata.code_sha256);assert.equal(result.checks[0].checker_version,'1');assert(result.checks[0].execution_id);
    await assert.rejects(f.engine.registerChecker({}, {id:'forged',version:'1',gates:['g3'],kind:'TEST',assurance:'LOCAL_TRUSTED_LIBRARY',run:()=>({status:'PASS',reason:'model'})}),/ADMIN_REQUIRED/);
  }finally{await f.store.close();}
});
test('M161-GATE-STATUS: FAIL, NOT_RUN, BLOCKED, INCONCLUSIVE and SIMULATED remain distinct',async()=>{
  for(const status of ['FAIL','NOT_RUN','BLOCKED','INCONCLUSIVE','SIMULATED'] as const){const f=await fixture({required_checkers:{g3:['actual.tests']}});try{await f.checker('TEST','LOCAL_TRUSTED_LIBRARY',()=>({status,reason:'Explicit actual checker outcome.'}));const result=await f.engine.evaluate(f.admin,f.actor,f.input('g3'));assert.equal(result.status,status);assert.equal(result.allows_protected,false);}finally{await f.store.close();}}
});
test('M161-GATE-MOCK: simulated checkers and profiles cannot become real PASS',async()=>{
  const f=await fixture({required_checkers:{g3:['actual.tests']}});try{await f.checker('TEST','SIMULATED');const result=await f.engine.evaluate(f.admin,f.actor,f.input('g3'));assert.equal(result.status,'SIMULATED');assert.equal(result.allows_protected,false);}finally{await f.store.close();}
  const next=await fixture({qualification:'SIMULATED'});try{assert.equal((await next.engine.evaluate(next.admin,next.actor,next.input())).status,'SIMULATED');}finally{await next.store.close();}
});
test('M161-GATE-MISSING: missing design, delivery and unknown checker are NOT_RUN',async()=>{
  const f=await fixture();try{for(const gate of ['g2','g5'] as const)assert.equal((await f.engine.evaluate(f.admin,f.actor,f.input(gate))).status,'NOT_RUN');assert.equal((await f.engine.evaluate(f.admin,f.actor,f.input('g3',{checker_ids:['unknown']}))).status,'NOT_RUN');}finally{await f.store.close();}
});
test('M161-GATE-INDEPENDENCE: G4 requires registered independent reviewer and exact candidate/author binding',async()=>{
  const f=await fixture({required_checkers:{g4:['actual.review']}});try{await f.checker('INDEPENDENT_REVIEW');assert.equal((await f.engine.evaluate(f.admin,f.actor,f.input('g4'))).status,'BLOCKED');await f.reviewer();const record=await f.engine.evaluate(f.admin,f.actor,f.input('g4'));assert.equal(record.status,'PASS');assert.equal(record.checks[0].reviewer_id,'reviewer');}finally{await f.store.close();}
  const next=await fixture({required_checkers:{g4:['actual.review']}});try{await next.reviewer(sha256('other candidate'));await next.checker('INDEPENDENT_REVIEW');assert.equal((await next.engine.evaluate(next.admin,next.actor,next.input('g4'))).status,'BLOCKED');}finally{await next.store.close();}
});
test('M161-GATE-HUMAN: actual trusted approval record is required and bound to candidate/rules/profile',async()=>{
  const f=await fixture({manual_gates:['g1']});try{assert.equal((await f.engine.evaluate(f.admin,f.actor,f.input())).status,'BLOCKED');const auth=await f.put('Synthetic unit fixture: trusted local administrator records a review decision.');
    const review={gate_id:'g1' as const,binding:f.binding,candidate_hash:f.candidate.sha256,baseline_hash:f.baseline.sha256,test_profile_hash:f.testProfile.sha256,decision:'APPROVE' as const,human_id:'test-human',reason:'This is a local administration API unit fixture.',authorization_ref:auth,assurance:'TRUSTED_ADMIN_CONFIRMATION' as const};
    await assert.rejects(f.engine.recordHumanReview({},f.actor,review),/ADMIN_REQUIRED/);const approved=await f.engine.recordHumanReview(f.admin,f.actor,review);assert.equal((await f.engine.evaluate(f.admin,f.actor,f.input('g1',{human_review_id:approved.id}))).status,'PASS');
    assert.equal((await f.engine.evaluate(f.admin,f.actor,f.input('g1',{human_review_id:approved.id,candidate_ref:f.baseline}))).status,'BLOCKED');
    const simulated=await f.engine.recordHumanReview(f.admin,f.actor,{...review,assurance:'SIMULATED'});assert.equal((await f.engine.evaluate(f.admin,f.actor,f.input('g1',{human_review_id:simulated.id}))).status,'SIMULATED');
    const rejected=await f.engine.recordHumanReview(f.admin,f.actor,{...review,decision:'REJECT'});assert.equal((await f.engine.evaluate(f.admin,f.actor,f.input('g1',{human_review_id:rejected.id}))).status,'FAIL');
  }finally{await f.store.close();}
});
test('M161-GATE-OFF: OFF records BYPASSED, does not execute checker, and cannot authorize protected capability',async()=>{
  const f=await fixture({required_checkers:{g3:['actual.tests']}});try{let calls=0;await f.checker('TEST','LOCAL_TRUSTED_LIBRARY',()=>{calls++;return{status:'PASS',reason:'Fixture'};});await f.feature('wf.gate.g3','OFF');const result=await f.engine.evaluate(f.admin,f.actor,f.input('g3'));assert.equal(result.status,'BYPASSED');assert.equal(calls,0);assert.equal(result.allows_protected,false);assert.throws(()=>f.engine.assertPass(f.actor,result.id,f.input('g3')),/NATIVE_GATE_PASS_REQUIRED/);}finally{await f.store.close();}
});
test('M161-GATE-OFF-RACE: gate disabled while actual artifact stream awaits commits BYPASSED',async()=>{
  const f=await fixture({required_checkers:{g3:['actual.tests']}});const original=f.store.artifacts.read.bind(f.store.artifacts);let reached!:()=>void,release!:()=>void;const ready=new Promise<void>(r=>reached=r),hold=new Promise<void>(r=>release=r);let first=true,calls=0;
  try{await f.checker('TEST','LOCAL_TRUSTED_LIBRARY',()=>{calls++;return{status:'PASS',reason:'Actual callback fixture'};});f.store.artifacts.read=async function*(ref){if(first){first=false;reached();await hold;}yield*original(ref);};const pending=f.engine.evaluate(f.admin,f.actor,f.input('g3'));await ready;await f.feature('wf.gate.g3','OFF');release();const record=await pending;assert.equal(record.status,'BYPASSED');assert.equal(record.feature_enabled,false);assert.equal(record.allows_protected,false);assert.equal(calls,0);}finally{release?.();f.store.artifacts.read=original;await f.store.close();}
});
test('M161-GATE-EPOCH-RACE: unrelated control change during validation becomes INCONCLUSIVE',async()=>{
  const f=await fixture();const original=f.store.artifacts.read.bind(f.store.artifacts);let reached!:()=>void,release!:()=>void;const ready=new Promise<void>(r=>reached=r),hold=new Promise<void>(r=>release=r);let first=true;
  try{f.store.artifacts.read=async function*(ref){if(first){first=false;reached();await hold;}yield*original(ref);};const pending=f.engine.evaluate(f.admin,f.actor,f.input());await ready;await f.feature('wf.checklists','OFF');release();assert.equal((await pending).status,'INCONCLUSIVE');}finally{release?.();f.store.artifacts.read=original;await f.store.close();}
});
test('M161-GATE-RULE-BINDING: changed Task binding is blocked while new registry alone preserves frozen Task',async()=>{
  const f=await fixture();try{const source=await f.put('New rule source');await f.rules.compile(f.admin,f.actor,{version:'2',workflow_version:'m161-native',sources:[{id:'new',format:'TEXT',payload_ref:source}]});assert.equal((await f.engine.evaluate(f.admin,f.actor,f.input())).status,'PASS');
    const next=f.rules.captureBinding(f.actor);await f.state.change(f.actor,'TASK_TEST_MIGRATION',()=>{const task=f.state.get<{revision:number}>('TASK','task')!;f.state.update('TASK','task',task.revision,'QUEUED',{...task,revision:task.revision+1,subject:f.actor,goal:'Migrated task',rules_binding:next});});assert.equal((await f.engine.evaluate(f.admin,f.actor,f.input())).status,'BLOCKED');
  }finally{await f.store.close();}
});
test('M161-GATE-FINAL: seven actual gates share candidate/baseline/profile/rules and old evidence cannot pass a new candidate',async()=>{
  const f=await fixture({required_checkers:{g3:['actual.tests'],g4:['actual.review']}});try{await f.reviewer();await f.checker();await f.checker('INDEPENDENT_REVIEW');
    const plan=await f.put({schema:'agentnexus/design-plan/1',task_id:'task',candidate_hash:f.candidate.sha256,steps:['Inspect inputs','Implement and run verification'],acceptance:['Verify exact bytes']});
    const delivery=await f.put({schema:'agentnexus/delivery/1',task_id:'task',candidate_hash:f.candidate.sha256,baseline_hash:f.baseline.sha256,test_profile_hash:f.testProfile.sha256,artifacts:[f.candidate],remaining:[]});const evidence=[{kind:'design-plan',ref:plan},{kind:'delivery-manifest',ref:delivery}];
    const prior:string[]=[];for(const gate of ['g0','g1','g2','g3','g4','g5'] as const){const record=await f.engine.evaluate(f.admin,f.actor,f.input(gate,{evidence}));assert.equal(record.status,'PASS',gate+': '+record.reason);prior.push(record.id);}
    const final=await f.engine.evaluate(f.admin,f.actor,f.input('g6',{evidence,prior_gate_ids:prior}));assert.equal(final.status,'PASS');assert.equal(final.allows_protected,true);
    assert.equal((await f.engine.evaluate(f.admin,f.actor,f.input('g6',{evidence,prior_gate_ids:prior.slice(1)}))).status,'NOT_RUN');assert.equal((await f.engine.evaluate(f.admin,f.actor,f.input('g6',{evidence,prior_gate_ids:prior,candidate_ref:f.baseline}))).status,'BLOCKED');
  }finally{await f.store.close();}
});
test('M161-GATE-CORRUPT: actual corrupted Artifact freezes owner and leaves no PASS or protected authorization',async()=>{
  const f=await fixture();const object=join(f.store.artifacts.objects,f.candidate.artifact_id+'.zst');const original=await readFile(object);try{const corrupt=Buffer.from(original);corrupt[corrupt.length-1]^=1;await writeFile(object,corrupt);await assert.rejects(f.engine.evaluate(f.admin,f.actor,f.input()),/NATIVE_STATE_FAULTED|STORE_FAULTED/);assert.equal(f.state.faulted,true);assert.equal(f.state.count('NATIVE_GATE',{state:'PASS'}),0);const record=f.state.list<NativeGateRecord>('NATIVE_GATE')[0];assert.equal(record.allows_protected,false);}finally{await writeFile(object,original);await f.store.close();}
});
test('M161-GATE-LIMITS: evidence, duplicate kinds and concurrent gate execution are bounded',async()=>{
  const f=await fixture();try{await assert.rejects(f.engine.evaluate(f.admin,f.actor,f.input('g1',{evidence:Array.from({length:GATE_LIMITS.evidence+1},(_,i)=>({kind:'kind'+i,ref:f.candidate}))})),/NATIVE_GATE_EVIDENCE_LIMIT/);await assert.rejects(f.engine.evaluate(f.admin,f.actor,f.input('g1',{evidence:[{kind:'same',ref:f.candidate},{kind:'same',ref:f.candidate}]})),/NATIVE_GATE_EVIDENCE_LIMIT/);
    const original=f.store.artifacts.read.bind(f.store.artifacts);let release!:()=>void;const hold=new Promise<void>(r=>release=r);f.store.artifacts.read=async function*(ref){await hold;yield*original(ref);};const pending=Array.from({length:4},()=>f.engine.evaluate(f.admin,f.actor,f.input()));await assert.rejects(f.engine.evaluate(f.admin,f.actor,f.input()),/NATIVE_GATE_BACKPRESSURE/);release();const records=await Promise.all(pending);assert(records.every(record=>record.status==='PASS'));f.store.artifacts.read=original;
  }finally{await f.store.close();}
});
test('M161-GATE-COMPILED-CONSTRAINT: frozen DSL predicates enforce artifact, checker, byte and human requirements',async()=>{
  const f=await fixture();try{
    const common={classification:'MACHINE_CHECKABLE',description:'Finite gate predicate',scope:{project_id:'project'},depends_on:[],feature_dependencies:[],gates:['g1'],enforcement:null};
    const source=await f.put({schema:'agentnexus/project-rules/1',rules:[{...common,id:'artifact',constraint:{kind:'REQUIRE_ARTIFACT',evidence_kind:'required'}},{...common,id:'bytes',constraint:{kind:'MAX_EVIDENCE_BYTES',max_bytes:8}},{...common,id:'human',classification:'MANUAL_REVIEW',constraint:null},{...common,id:'fail-closed',classification:'POLICY_ENFORCED',constraint:{kind:'GATE_FAIL_CLOSED'},enforcement:{policy_id:'P.WORKFLOW_BINDING',owner:'Native Gate Engine'}}]});
    await f.rules.compile(f.admin,f.actor,{version:'2',workflow_version:'m161-native',sources:[{id:'DSL',format:'RULE_DSL',payload_ref:source}]});const binding=f.rules.captureBinding(f.actor);
    await f.state.change(f.actor,'TASK_TEST_MIGRATION',()=>{const task=f.state.get<{revision:number}>('TASK','task')!;f.state.update('TASK','task',task.revision,'QUEUED',{...task,subject:f.actor,revision:task.revision+1,state:'QUEUED',goal:'Test machine rules',rules_binding:binding});});
    const missing=await f.engine.evaluate(f.admin,f.actor,f.input('g1',{binding}));assert.equal(missing.status,'BLOCKED');
    assert.deepEqual(f.engine.requiredGates(f.actor,binding),['g1']);
    const oversized=await f.engine.evaluate(f.admin,f.actor,f.input('g1',{binding,evidence:[{kind:'required',ref:f.candidate}]}));assert.equal(oversized.status,'FAIL');
  }finally{await f.store.close();}
});
test('M161-GATE-CHECKER-PROVENANCE: an invalid checker report cannot forge engine-generated provenance',async()=>{
  const f=await fixture({required_checkers:{g3:['actual.tests']}});try{await f.checker('TEST','LOCAL_TRUSTED_LIBRARY',()=>({status:'PASS',reason:'Untrusted fields',checker_id:'pretend-run'} as unknown as import('../../src/agentnexus/harness/gates.ts').CheckerResult));const result=await f.engine.evaluate(f.admin,f.actor,f.input('g3'));assert.equal(result.status,'INCONCLUSIVE');assert.equal(result.checks[0].checker_id,'actual.tests');assert.equal(result.allows_protected,false);}finally{await f.store.close();}
});
test('M161-GATE-ENGINE-OFF: disabling the engine records BYPASSED and preserves core feature owners',async()=>{
  const f=await fixture();try{await f.feature('native.gate-engine','OFF');const result=await f.engine.evaluate(f.admin,f.actor,f.input());assert.equal(result.status,'BYPASSED');assert.equal(result.allows_protected,false);assert.equal(f.state.enabled('core.artifact.store',f.actor),true);assert.equal(f.state.enabled('core.audit.trail',f.actor),true);}finally{await f.store.close();}
});
test('M161-GATE-STALE-PASS: OFF then ON cannot revive an earlier gate authorization epoch',async()=>{
  const f=await fixture();try{const original=await f.engine.evaluate(f.admin,f.actor,f.input());assert.equal(original.status,'PASS');await f.feature('wf.gate.g1','OFF');await f.feature('wf.gate.g1','ON');assert.throws(()=>f.engine.assertPass(f.actor,original.id,f.input()),/NATIVE_GATE_FEATURE_BLOCKED/);const fresh=await f.engine.evaluate(f.admin,f.actor,f.input());assert.equal(f.engine.assertPass(f.actor,fresh.id,f.input()).id,fresh.id);}finally{await f.store.close();}
});
test('M161-GATE-RECOVERY: interrupted intent is INCONCLUSIVE without rerunning trusted code',async()=>{
  const f=await fixture();try{const input=f.input();const record:NativeGateRecord={id:'interrupted',revision:0,phase:'RUNNING',status:'NOT_RUN',reason:'TRUSTED_ENGINE_RUNNING',gate_id:'g1',subject:f.actor,binding:f.binding,candidate_hash:f.candidate.sha256,baseline_hash:f.baseline.sha256,test_profile_hash:f.testProfile.sha256,input,checks:[],feature_enabled:true,allows_protected:false,observed_at:new Date().toISOString(),completed_at:null,feature_epoch:0,policy_epoch:0,engine_version:'1.6.1'};
    await f.state.change(f.actor,'WORKFLOW_TEST_INTERRUPTED',()=>f.state.insert('NATIVE_GATE',record.id,f.actor,'RUNNING',record));assert.equal(await f.engine.recover(f.admin,f.actor),1);assert.equal(f.state.get<NativeGateRecord>('NATIVE_GATE','interrupted')!.status,'INCONCLUSIVE');assert.equal(await f.engine.recover(f.admin,f.actor),0);
  }finally{await f.store.close();}
});
test('M161-GATE-ACTUAL-NODE-TEST: trusted runner executes a real bounded Node test and gate consumes its actual exit/result',async()=>{
  const f=await fixture({required_checkers:{g3:['actual.tests']}});try{
    const candidate=await f.put("import test from 'node:test';import assert from 'node:assert/strict';test('actual arithmetic',()=>assert.equal(2+2,4));\n");let executions=0;
    await f.checker('TEST','LOCAL_TRUSTED_LIBRARY',async(context)=>{
      const chunks:Buffer[]=[];for await(const chunk of context.readArtifact(context.candidate_ref))chunks.push(Buffer.from(chunk));const source=Buffer.concat(chunks);invariant(source.byteLength<4096,'TEST_FIXTURE_BOUND');
      // This exact synthetic program is authored by this test, not an Agent-supplied executable.
      invariant(context.candidate_ref.sha256===candidate.sha256,'TEST_FIXTURE_CANDIDATE');const path=join(f.root,'actual-node-test.mjs');await writeFile(path,source,{flag:'wx'});
      const run=spawnSync(process.execPath,['--test','--test-concurrency=1','--test-reporter=tap',path],{cwd:f.root,encoding:'utf8',timeout:5000,maxBuffer:16384,windowsHide:true,shell:false});executions++;
      const output=await f.put({exit_code:run.status,signal:run.signal,stdout:run.stdout,stderr:run.stderr,candidate_sha256:context.candidate_ref.sha256,profile_sha256:context.test_profile_ref.sha256});
      return{status:run.status===0?'PASS':'FAIL',reason:'Actual Node --test exit code, bounded output and exact candidate binding.',evidence_refs:[output]};
    });
    const result=await f.engine.evaluate(f.admin,f.actor,f.input('g3',{candidate_ref:candidate}));assert.equal(result.status,'PASS');assert.equal(executions,1);assert.equal(result.checks[0].evidence_refs!.length,1);const refs=result.checks[0].evidence_refs!;for await(const _ of f.store.artifacts.read(refs[0])){/* real stored stdout/stderr/exit evidence */}
  }finally{await f.store.close();}
});
test('M161-GATE-SCHEDULER: frozen requirements block dispatch until a trusted matching native gate is explicitly bound',async()=>{
  const base=process.env.AGENTNEXUS_TEST_DATA_ROOT??join(tmpdir(),'AgentNexus-M161');await mkdir(base,{recursive:true});const root=await mkdtemp(join(base,'gate-scheduler-'));
  const h=await openHarness(root),limits={workers:2,memory_bytes:67108864,processes:8,disk_bytes:1048576,model_tokens:100000,model_requests:20,model_cost_micros:1000000,wall_ms:100000};
  const put=async(value:unknown)=>h.store.artifacts.putBytes(Buffer.from(typeof value==='string'?value:canonical(value)),{maxBytes:16384});
  try{await h.administration.createProject({id:'project',rules:['Capture and enforce the task gate contract.'],budget:limits});await h.administration.createAgent({id:'lead',project_id:'project',task_id:'task',type:'DEVELOPMENT',budget:{...limits,workers:1,memory_bytes:33554432}});
    const candidate=await put('actual candidate'),baseline=await put('actual baseline'),profile=await put({schema:'agentnexus/gate-profile/1',required_checkers:{},manual_gates:[],qualification:'LOCAL_TRUSTED_LIBRARY'});
    const task=await h.administration.createTask({id:'task',agent_id:'lead',goal:'A gate-bound Task.',gate_requirements:[{gate_id:'g1',record_id:null,candidate_hash:candidate.sha256,baseline_hash:baseline.sha256,test_profile_hash:profile.sha256}]});
    const waiting=await h.administration.dispatch('task');assert.equal(waiting.state,'QUEUED');assert.equal(waiting.reason,'TASK_GATE_REQUIRED');assert.equal(h.state.count('MODEL_REQUEST'),0);assert.equal(h.state.count('resource_reservation'),0);
    const legacy=await h.administration.gate('lead',{gate_id:'g1',status:'PASS',candidate_hash:candidate.sha256,baseline:'legacy',test_profile_hash:profile.sha256,evidence_refs:[candidate],reason:'Legacy ledger is not automatic certification.',author_id:'lead',reviewer_id:null});await assert.rejects(h.administration.bindTaskGate('task','g1',legacy.id),/NATIVE_GATE_PASS_REQUIRED/);
    const gate=await h.administration.nativeGate('lead',{gate_id:'g1',binding:task.rules_binding,candidate_ref:candidate,baseline_ref:baseline,test_profile_ref:profile,evidence:[],author_id:'lead'});assert.equal(gate.status,'PASS');await h.administration.bindTaskGate('task','g1',gate.id);assert.equal((await h.administration.dispatch('task')).state,'SUCCEEDED');assert.equal(h.state.count('MODEL_REQUEST'),1);
    const constraint={schema:'agentnexus/project-rules/1',rules:[{id:'required-gate',classification:'POLICY_ENFORCED',description:'Required gate cannot be omitted by Task input.',scope:{project_id:'project'},depends_on:[],feature_dependencies:[],gates:['g1'],constraint:{kind:'GATE_FAIL_CLOSED'},enforcement:{policy_id:'P.WORKFLOW_BINDING',owner:'Native Gate Engine'}}]};
    await h.administration.updateProjectRules('project',{version:'2',rules:['Updated project rules'],dsl:[canonical(constraint)]});await h.administration.createAgent({id:'second',project_id:'project',task_id:'second-task',type:'DEVELOPMENT',budget:{...limits,workers:1,memory_bytes:33554432}});await h.administration.createTask({id:'second-task',agent_id:'second',goal:'Try omitting required gates.'});const blocked=await h.administration.dispatch('second-task');assert.equal(blocked.state,'QUEUED');assert.equal(blocked.reason,'TASK_GATE_REQUIRED');assert.equal(h.state.count('MODEL_REQUEST'),1);
    const facade=h.bindAgent('second');assert.equal('nativeGate' in facade,false);assert.equal('registerGateChecker' in facade,false);assert.equal('rules' in facade,false);
  }finally{await h.close();}
});
