import { TextDecoder } from 'node:util';
import { readFileSync } from 'node:fs';
import { canonical, invariant, now, sha256, uid } from '../types.ts';
import type { ArtifactRef } from '../types.ts';
import { validateArtifactRef } from '../records.ts';
import { ancestors, metadata, scopeKey } from '../control.ts';
import { identifier, snapshot, subject } from './contracts.ts';
import type { Subject } from './contracts.ts';
import type { NativeState } from './state.ts';
import type { AgentRecord } from './agents.ts';
import type { NativeGateId, RuleTaskBinding } from './rules.ts';
import { RulesCompiler } from './rules.ts';

export const NATIVE_GATES = Object.freeze({g0:'TASK_ADMISSION',g1:'RULE_INPUT_INTEGRITY',g2:'DESIGN_IMPLEMENTATION_PLAN',g3:'CODE_TEST',g4:'INDEPENDENT_REVIEW',g5:'DELIVERY_EVIDENCE',g6:'FINAL_ACCEPTANCE'});
export type NativeGateStatus = 'PASS'|'FAIL'|'NOT_RUN'|'BLOCKED'|'INCONCLUSIVE'|'SIMULATED'|'BYPASSED';
export const GATE_LIMITS=Object.freeze({evidence:16,evidence_bytes:8388608,artifact_bytes:4194304,json_bytes:65536,checkers:32,checks_per_gate:16,concurrent:4,records:2048,human_reviews:512});
export type GateEvidence={kind:string;ref:ArtifactRef};
export type NativeGateInput={gate_id:NativeGateId;binding:RuleTaskBinding;candidate_ref:ArtifactRef;baseline_ref:ArtifactRef;test_profile_ref:ArtifactRef;
  evidence:GateEvidence[];author_id:string;checker_ids?:string[];human_review_id?:string;prior_gate_ids?:string[]};
export type NativeGateBinding={gate_id:NativeGateId;binding:RuleTaskBinding;candidate_hash:string;baseline_hash:string;test_profile_hash:string};
export type NativeGateProfile={schema:'agentnexus/gate-profile/1';required_checkers:Partial<Record<NativeGateId,string[]>>;manual_gates:NativeGateId[];qualification:'LOCAL_TRUSTED_LIBRARY'|'SIMULATED'};
export type CheckerResult={status:Exclude<NativeGateStatus,'BYPASSED'>;reason:string;evidence_refs?:ArtifactRef[]};
export type GateCheckerContext={gate_id:NativeGateId;actor:Subject;task_actor:Subject;binding:RuleTaskBinding;candidate_ref:ArtifactRef;baseline_ref:ArtifactRef;test_profile_ref:ArtifactRef;evidence:GateEvidence[];
  readArtifact:(ref:ArtifactRef)=>AsyncGenerator<Uint8Array,void>};
export type GateCheckerDefinition={id:string;version:string;gates:NativeGateId[];kind:'TEST'|'INDEPENDENT_REVIEW'|'VALIDATION';assurance:'LOCAL_TRUSTED_LIBRARY'|'SIMULATED';reviewer_id?:string;
  run:(context:GateCheckerContext)=>CheckerResult|Promise<CheckerResult>};
type CheckerMetadata={id:string;revision:number;version:string;gates:NativeGateId[];kind:GateCheckerDefinition['kind'];assurance:GateCheckerDefinition['assurance'];reviewer_id:string|null;code_sha256:string;source_ref:ArtifactRef};
export type CheckerRun=CheckerResult&{checker_id:string;checker_version:string;code_sha256:string;source_ref:ArtifactRef;assurance:GateCheckerDefinition['assurance'];reviewer_id:string|null;execution_id:string;started_at:string;finished_at:string};
export type NativeGateRecord={id:string;revision:number;phase:'RUNNING'|'COMPLETE';status:NativeGateStatus;reason:string;gate_id:NativeGateId;subject:Subject;
  binding:RuleTaskBinding;candidate_hash:string;baseline_hash:string;test_profile_hash:string;input:NativeGateInput;checks:CheckerRun[];feature_enabled:boolean;
  allows_protected:boolean;observed_at:string;completed_at:string|null;feature_epoch:number;policy_epoch:number;engine_version:'1.6.1'};
export type HumanGateReview={id:string;revision:number;gate_id:NativeGateId;subject:Subject;binding:RuleTaskBinding;candidate_hash:string;baseline_hash:string;test_profile_hash:string;
  decision:'APPROVE'|'REJECT';human_id:string;reason:string;authorization_ref:ArtifactRef;assurance:'TRUSTED_ADMIN_CONFIRMATION'|'SIMULATED';observed_at:string};
const STATUSES:NativeGateStatus[]=['PASS','FAIL','NOT_RUN','BLOCKED','INCONCLUSIVE','SIMULATED','BYPASSED'];
const IDS=Object.keys(NATIVE_GATES) as NativeGateId[];
function fields(value:object,allowed:string[],required=allowed):void{invariant(value!==null&&!Array.isArray(value)&&Object.keys(value).every(key=>allowed.includes(key))&&required.every(key=>Object.hasOwn(value,key)),'NATIVE_GATE_SCHEMA');}
function text(value:unknown,max=2048):asserts value is string{invariant(typeof value==='string'&&Buffer.byteLength(value)>0&&Buffer.byteLength(value)<=max,'NATIVE_GATE_SCHEMA');}
function sameBinding(a:RuleTaskBinding,b:RuleTaskBinding):boolean{return canonical(a)===canonical(b);}
function aggregate(results:NativeGateStatus[]):NativeGateStatus {
  for(const status of ['FAIL','BLOCKED','INCONCLUSIVE','NOT_RUN','BYPASSED','SIMULATED'] as const)if(results.includes(status))return status;return 'PASS';
}

/** Only trusted, registered code executes checkers. Agent proposals and PASS-shaped artifacts grant nothing. */
export class NativeGateEngine {
  #state:NativeState;#rules:RulesCompiler;#checkers=new Map<string,{metadata:CheckerMetadata;run:GateCheckerDefinition['run']}>();#active=0;#defaults:Readonly<Record<string,'ON'|'OFF'>>;
  constructor(state:NativeState,rules:RulesCompiler,options:{feature_defaults?:Readonly<Record<string,'ON'|'OFF'>>}={}){
    this.#state=state;this.#rules=rules;const definitions=options.feature_defaults??Object.fromEntries((JSON.parse(readFileSync(new URL('../../../config/agentnexus/features.json',import.meta.url),'utf8')) as {features:{id:string;default:'ON'|'OFF'}[]}).features.map(item=>[item.id,item.default]));
    invariant(Object.keys(definitions).length<=512&&Object.values(definitions).every(value=>value==='ON'||value==='OFF'),'NATIVE_GATE_FEATURE_CATALOG');this.#defaults=snapshot(definitions,32768);
  }
  #features(actor:Subject,gate:NativeGateId):'ON'|'OFF'|'BLOCKED'{
    const ids=['native.gate-engine','native.rules-compiler','wf.runtime','wf.evidence','wf.gate.'+gate];let blocked=false;
    for(const id of ids){if(this.#state.enabled(id,actor))continue;let desired=this.#defaults[id];
      for(const scope of ancestors({project_id:actor.project_id,agent_id:actor.agent_id,task_id:actor.task_id})){
        const row=this.#state.store.db.prepare('SELECT value FROM control_features WHERE feature_id=? AND scope_key=?').get(id,scopeKey(scope)) as {value:string}|undefined;if(row?.value==='OFF')return 'OFF';if(row?.value==='ON')desired='ON';
      }if(desired==='OFF')return 'OFF';blocked=true;
    }return blocked?'BLOCKED':'ON';
  }
  #task(actor:Subject,binding:RuleTaskBinding):void{
    this.#rules.assertBinding(actor,binding);
    const task=this.#state.get<{subject:Subject;rules_binding?:RuleTaskBinding}>('TASK',actor.task_id);
    invariant(task&&task.subject.agent_id===actor.agent_id&&task.subject.project_id===actor.project_id,'NATIVE_GATE_TASK_SCOPE');
    invariant(task.rules_binding&&sameBinding(task.rules_binding,binding),'NATIVE_GATE_TASK_RULE_BINDING');
  }
  async #verify(ref:ArtifactRef,max:number=GATE_LIMITS.artifact_bytes):Promise<void>{
    validateArtifactRef(ref);invariant(ref.bytes>0&&ref.bytes<=max,'NATIVE_GATE_ARTIFACT_LIMIT');let bytes=0;
    for await(const chunk of this.#state.store.artifacts.read(ref)){bytes+=chunk.byteLength;invariant(bytes<=max,'NATIVE_GATE_ARTIFACT_LIMIT');}
    invariant(bytes===ref.bytes,'NATIVE_GATE_ARTIFACT_BYTES');
  }
  async #json(ref:ArtifactRef):Promise<unknown>{
    validateArtifactRef(ref);invariant(ref.bytes>0&&ref.bytes<=GATE_LIMITS.json_bytes,'NATIVE_GATE_JSON_LIMIT');const chunks:Buffer[]=[];let bytes=0;
    for await(const chunk of this.#state.store.artifacts.read(ref)){bytes+=chunk.byteLength;invariant(bytes<=GATE_LIMITS.json_bytes,'NATIVE_GATE_JSON_LIMIT');chunks.push(Buffer.from(chunk));}
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,bytes))) as unknown;
  }
  async registerChecker(admin:unknown,definition:GateCheckerDefinition):Promise<CheckerMetadata>{
    this.#state.checkAdmin(admin);fields(definition,['id','version','gates','kind','assurance','reviewer_id','run'],['id','version','gates','kind','assurance','run']);
    identifier(definition.id);text(definition.version,64);invariant(typeof definition.run==='function'&&Array.isArray(definition.gates)&&definition.gates.length>0&&definition.gates.length<=7&&new Set(definition.gates).size===definition.gates.length&&definition.gates.every(gate=>IDS.includes(gate)),'NATIVE_GATE_CHECKER');
    invariant(['TEST','INDEPENDENT_REVIEW','VALIDATION'].includes(definition.kind)&&['LOCAL_TRUSTED_LIBRARY','SIMULATED'].includes(definition.assurance),'NATIVE_GATE_CHECKER');
    invariant((definition.kind==='INDEPENDENT_REVIEW')===(definition.reviewer_id!==undefined),'NATIVE_GATE_REVIEWER');if(definition.reviewer_id)identifier(definition.reviewer_id);
    invariant(this.#checkers.size<GATE_LIMITS.checkers&&!this.#checkers.has(definition.id),'NATIVE_GATE_CHECKER_LIMIT');
    const code=Function.prototype.toString.call(definition.run);invariant(Buffer.byteLength(code)<=32768,'NATIVE_GATE_CHECKER_LIMIT');
    const codeHash=sha256(code),old=this.#state.get<CheckerMetadata>('NATIVE_GATE_CHECKER',definition.id);
    if(old){invariant(old.version===definition.version&&old.code_sha256===codeHash&&old.kind===definition.kind&&old.assurance===definition.assurance&&old.reviewer_id===(definition.reviewer_id??null)&&canonical(old.gates)===canonical(definition.gates),'NATIVE_GATE_CHECKER_IMMUTABLE');
      await this.#verify(old.source_ref,32768);this.#checkers.set(definition.id,{metadata:old,run:definition.run});return old;}
    const ref=await this.#state.store.artifacts.putBytesQueued(Buffer.from(code),{maxBytes:32768,media_type:'text/javascript'});
    const record:CheckerMetadata={id:definition.id,revision:0,version:definition.version,gates:[...definition.gates],kind:definition.kind,assurance:definition.assurance,reviewer_id:definition.reviewer_id??null,code_sha256:codeHash,source_ref:ref};
    const actor:Subject={agent_id:'host-admin',project_id:'host',task_id:'administration',session_id:'host-control',runtime_instance_id:this.#state.boot_id,agent_type:'COORDINATOR',model_binding:'mock',resource_budget_id:'platform',policy_scope:'host'};
    await this.#state.change(actor,'WORKFLOW_NATIVE_CHECKER_REGISTERED',()=>{invariant(this.#state.count('NATIVE_GATE_CHECKER')<GATE_LIMITS.checkers&&!this.#state.get('NATIVE_GATE_CHECKER',record.id),'NATIVE_GATE_CHECKER_LIMIT');this.#state.insert('NATIVE_GATE_CHECKER',record.id,actor,'REGISTERED',record);},{checker_id:record.id,code_sha256:record.code_sha256,source_ref:ref});
    this.#checkers.set(record.id,{metadata:snapshot(record),run:definition.run});return snapshot(record);
  }
  async recordHumanReview(admin:unknown,actor:Subject,input:Omit<HumanGateReview,'id'|'revision'|'subject'|'observed_at'>):Promise<HumanGateReview>{
    this.#state.checkAdmin(admin);subject(actor);const data=snapshot(input);fields(data,['gate_id','binding','candidate_hash','baseline_hash','test_profile_hash','decision','human_id','reason','authorization_ref','assurance']);
    invariant(IDS.includes(data.gate_id)&&['APPROVE','REJECT'].includes(data.decision)&&['TRUSTED_ADMIN_CONFIRMATION','SIMULATED'].includes(data.assurance),'NATIVE_GATE_HUMAN_REVIEW');
    this.#task(actor,data.binding);identifier(data.human_id);text(data.reason);for(const hash of [data.candidate_hash,data.baseline_hash,data.test_profile_hash])invariant(/^[a-f0-9]{64}$/.test(hash),'NATIVE_GATE_VERSION_BINDING');
    await this.#verify(data.authorization_ref,16384);const review:HumanGateReview={...data,id:uid(),revision:0,subject:snapshot(actor),observed_at:now()};
    return this.#state.change(actor,'WORKFLOW_NATIVE_HUMAN_REVIEW',()=>{this.#task(actor,data.binding);invariant(this.#state.count('NATIVE_HUMAN_REVIEW')<GATE_LIMITS.human_reviews,'NATIVE_GATE_REVIEW_LIMIT');
      this.#state.insert('NATIVE_HUMAN_REVIEW',review.id,actor,data.decision,review);return snapshot(review);
    },{human_review_id:review.id,authority:'TRUSTED_BOOTSTRAP_ADMIN',assurance:data.assurance,authorization_ref:data.authorization_ref});
  }
  #input(actor:Subject,input:NativeGateInput):NativeGateInput {
    subject(actor);const data=snapshot(input,24576);fields(data,['gate_id','binding','candidate_ref','baseline_ref','test_profile_ref','evidence','author_id','checker_ids','human_review_id','prior_gate_ids'],['gate_id','binding','candidate_ref','baseline_ref','test_profile_ref','evidence','author_id']);
    invariant(IDS.includes(data.gate_id),'NATIVE_GATE_ID');identifier(data.author_id);invariant(data.author_id===actor.agent_id,'NATIVE_GATE_AUTHOR');
    for(const ref of [data.candidate_ref,data.baseline_ref,data.test_profile_ref]){validateArtifactRef(ref);invariant(ref.bytes>0&&ref.bytes<=GATE_LIMITS.artifact_bytes,'NATIVE_GATE_ARTIFACT_LIMIT');}
    invariant(Array.isArray(data.evidence)&&data.evidence.length<=GATE_LIMITS.evidence,'NATIVE_GATE_EVIDENCE_LIMIT');let bytes=0;const seen=new Set<string>();
    for(const item of data.evidence){fields(item,['kind','ref']);identifier(item.kind);validateArtifactRef(item.ref);bytes+=item.ref.bytes;invariant(!seen.has(item.kind)&&item.ref.bytes>0&&bytes<=GATE_LIMITS.evidence_bytes&&item.ref.bytes<=GATE_LIMITS.artifact_bytes,'NATIVE_GATE_EVIDENCE_LIMIT');seen.add(item.kind);}
    for(const values of [data.checker_ids??[],data.prior_gate_ids??[]]){invariant(Array.isArray(values)&&values.length<=GATE_LIMITS.checks_per_gate&&new Set(values).size===values.length,'NATIVE_GATE_CHECKER_LIMIT');for(const id of values)identifier(id);}
    if(data.human_review_id)identifier(data.human_review_id);return data;
  }
  #profile(value:unknown):NativeGateProfile {
    invariant(value!==null&&typeof value==='object','NATIVE_GATE_PROFILE');const p=value as NativeGateProfile;fields(p,['schema','required_checkers','manual_gates','qualification']);
    invariant(p.schema==='agentnexus/gate-profile/1'&&p.required_checkers!==null&&typeof p.required_checkers==='object'&&!Array.isArray(p.required_checkers)&&Object.keys(p.required_checkers).every(gate=>IDS.includes(gate as NativeGateId)),'NATIVE_GATE_PROFILE');
    for(const ids of Object.values(p.required_checkers)){invariant(Array.isArray(ids)&&ids.length<=16&&new Set(ids).size===ids.length,'NATIVE_GATE_PROFILE');for(const id of ids)identifier(id);}
    invariant(Array.isArray(p.manual_gates)&&p.manual_gates.length<=7&&new Set(p.manual_gates).size===p.manual_gates.length&&p.manual_gates.every(gate=>IDS.includes(gate))&&['LOCAL_TRUSTED_LIBRARY','SIMULATED'].includes(p.qualification),'NATIVE_GATE_PROFILE');return snapshot(p);
  }
  #matches(record:NativeGateRecord,input:NativeGateInput,actor:Subject):boolean{return record.subject.project_id===actor.project_id&&record.subject.task_id===actor.task_id&&record.subject.agent_id===actor.agent_id&&sameBinding(record.binding,input.binding)&&record.candidate_hash===input.candidate_ref.sha256&&record.baseline_hash===input.baseline_ref.sha256&&record.test_profile_hash===input.test_profile_ref.sha256;}
  requiredGates(actor:Subject,binding:RuleTaskBinding):NativeGateId[]{
    return [...new Set(this.#rules.applicable(actor,binding).filter(rule=>rule.classification==='POLICY_ENFORCED'&&rule.constraint?.kind==='GATE_FAIL_CLOSED').flatMap(rule=>rule.gates))];
  }
  assertPass(actor:Subject,id:string,input:NativeGateBinding|NativeGateInput):NativeGateRecord{
    const data=snapshot('candidate_ref' in input?{gate_id:input.gate_id,binding:input.binding,candidate_hash:input.candidate_ref.sha256,baseline_hash:input.baseline_ref.sha256,test_profile_hash:input.test_profile_ref.sha256}:input);
    fields(data,['gate_id','binding','candidate_hash','baseline_hash','test_profile_hash']);invariant(IDS.includes(data.gate_id),'NATIVE_GATE_ID');for(const hash of [data.candidate_hash,data.baseline_hash,data.test_profile_hash])invariant(/^[a-f0-9]{64}$/.test(hash),'NATIVE_GATE_VERSION_BINDING');
    this.#task(actor,data.binding);identifier(id);const record=this.#state.get<NativeGateRecord>('NATIVE_GATE',id);
    invariant(record&&record.gate_id===data.gate_id&&record.phase==='COMPLETE'&&record.status==='PASS'&&record.allows_protected&&record.subject.project_id===actor.project_id&&record.subject.task_id===actor.task_id&&record.subject.agent_id===actor.agent_id&&sameBinding(record.binding,data.binding)&&record.candidate_hash===data.candidate_hash&&record.baseline_hash===data.baseline_hash&&record.test_profile_hash===data.test_profile_hash,'NATIVE_GATE_PASS_REQUIRED');
    const epoch=metadata(this.#state.store);invariant(this.#features(actor,record.gate_id)==='ON'&&record.feature_epoch===epoch.feature_epoch&&record.policy_epoch===epoch.policy_epoch,'NATIVE_GATE_FEATURE_BLOCKED');return record;
  }
  async #run(actor:Subject,input:NativeGateInput,checks:CheckerRun[]):Promise<{status:NativeGateStatus;reason:string}>{
    this.#task(actor,input.binding);
    const registry=this.#rules.assertBinding(actor,input.binding);for(const source of registry.sources)await this.#verify(source.payload_ref,65536);await this.#verify(registry.compiled_ref,65536);
    for(const ref of [input.candidate_ref,input.baseline_ref,input.test_profile_ref,...input.evidence.map(item=>item.ref)])await this.#verify(ref);
    const profile=this.#profile(await this.#json(input.test_profile_ref)),statuses:NativeGateStatus[]=[];
    const rules=this.#rules.applicable(actor,input.binding).filter(rule=>rule.gates.includes(input.gate_id));const required=new Set(profile.required_checkers[input.gate_id]??[]);
    let humanRequired=profile.manual_gates.includes(input.gate_id);
    for(const rule of rules){for(const feature of rule.feature_dependencies)if(!this.#state.enabled(feature,actor))statuses.push('BLOCKED');
      if(rule.classification==='MANUAL_REVIEW')humanRequired=true;
      if(rule.constraint?.kind==='REQUIRE_HUMAN_REVIEW')humanRequired=true;
      if(rule.constraint?.kind==='REQUIRE_CHECKER')required.add(rule.constraint.checker_id);
      if(rule.constraint?.kind==='MAX_EVIDENCE_BYTES'&&input.evidence.reduce((n,item)=>n+item.ref.bytes,0)>rule.constraint.max_bytes)statuses.push('FAIL');
      if(rule.constraint?.kind==='REQUIRE_ARTIFACT'&&!input.evidence.some(item=>item.kind===(rule.constraint as {evidence_kind:string}).evidence_kind))statuses.push('NOT_RUN');
    }
    if(input.gate_id==='g0'){
      const project=this.#state.get<{state:string}>('PROJECT',actor.project_id),task=this.#state.get<{state:string;goal:string}>('TASK',actor.task_id);
      if(project?.state!=='ACTIVE'||!task||!['QUEUED','WAITING_RESOURCES','DISPATCHING','RUNNING','WAITING'].includes(task.state))statuses.push('BLOCKED');else text(task.goal,8192);
    }
    if(input.gate_id==='g2'){
      const plan=input.evidence.find(item=>item.kind==='design-plan');if(!plan)statuses.push('NOT_RUN');else{
        const parsed=await this.#json(plan.ref);invariant(parsed!==null&&typeof parsed==='object','NATIVE_GATE_DESIGN');const data=parsed as {schema:string;task_id:string;candidate_hash:string;steps:string[];acceptance:string[]};fields(data,['schema','task_id','candidate_hash','steps','acceptance']);
        invariant(data.schema==='agentnexus/design-plan/1'&&data.task_id===actor.task_id&&data.candidate_hash===input.candidate_ref.sha256,'NATIVE_GATE_DESIGN');
        for(const items of [data.steps,data.acceptance]){invariant(Array.isArray(items)&&items.length>0&&items.length<=16,'NATIVE_GATE_DESIGN');for(const item of items)text(item,512);}
      }
    }
    if(input.gate_id==='g5'){
      const delivery=input.evidence.find(item=>item.kind==='delivery-manifest');if(!delivery)statuses.push('NOT_RUN');else{
        const parsed=await this.#json(delivery.ref);invariant(parsed!==null&&typeof parsed==='object','NATIVE_GATE_DELIVERY');const data=parsed as {schema:string;task_id:string;candidate_hash:string;baseline_hash:string;test_profile_hash:string;artifacts:ArtifactRef[];remaining:string[]};fields(data,['schema','task_id','candidate_hash','baseline_hash','test_profile_hash','artifacts','remaining']);
        invariant(data.schema==='agentnexus/delivery/1'&&data.task_id===actor.task_id&&data.candidate_hash===input.candidate_ref.sha256&&data.baseline_hash===input.baseline_ref.sha256&&data.test_profile_hash===input.test_profile_ref.sha256,'NATIVE_GATE_DELIVERY');
        invariant(Array.isArray(data.artifacts)&&data.artifacts.length>0&&data.artifacts.length<=16&&Array.isArray(data.remaining)&&data.remaining.length<=16,'NATIVE_GATE_DELIVERY');
        let bytes=0;for(const ref of data.artifacts){bytes+=ref.bytes;invariant(bytes<=GATE_LIMITS.evidence_bytes,'NATIVE_GATE_EVIDENCE_LIMIT');await this.#verify(ref);}for(const item of data.remaining)text(item,512);
        if(!data.artifacts.some(ref=>canonical(ref)===canonical(input.candidate_ref)))statuses.push('FAIL');
      }
    }
    if(input.gate_id==='g6'){
      const prior=input.prior_gate_ids??[];const gates=new Map<NativeGateId,NativeGateRecord>();for(const id of prior){const record=this.#state.get<NativeGateRecord>('NATIVE_GATE',id);if(!record||!this.#matches(record,input,actor)||record.phase!=='COMPLETE'){statuses.push('BLOCKED');continue;}invariant(!gates.has(record.gate_id),'NATIVE_GATE_DUPLICATE_PRIOR');gates.set(record.gate_id,record);}
      const epoch=metadata(this.#state.store);for(const gate of IDS.filter(id=>id!=='g6')){const record=gates.get(gate);if(!record)statuses.push('NOT_RUN');else if(record.status!=='PASS'||!record.allows_protected||this.#features(actor,gate)!=='ON'||record.feature_epoch!==epoch.feature_epoch||record.policy_epoch!==epoch.policy_epoch)statuses.push(record.status==='SIMULATED'?'SIMULATED':'BLOCKED');}
    }
    for(const id of input.checker_ids??[])required.add(id);invariant(required.size<=GATE_LIMITS.checks_per_gate,'NATIVE_GATE_CHECKER_LIMIT');
    let test=false,review=false;
    for(const id of required){
      const registered=this.#checkers.get(id);if(!registered){statuses.push('NOT_RUN');continue;}const info=registered.metadata;
      invariant(info.gates.includes(input.gate_id),'NATIVE_GATE_CHECKER_SCOPE');await this.#verify(info.source_ref,32768);
      let checkerActor=actor;if(info.kind==='INDEPENDENT_REVIEW'){
        const reviewer=this.#state.get<AgentRecord>('AGENT',info.reviewer_id!);invariant(reviewer&&reviewer.subject.agent_type==='BACKGROUND_REVIEWER'&&reviewer.subject.project_id===actor.project_id&&reviewer.id!==input.author_id&&reviewer.subject.runtime_instance_id!==actor.runtime_instance_id&&!['STOPPED','FAILED','UNKNOWN_QUARANTINED'].includes(reviewer.lifecycle),'NATIVE_GATE_INDEPENDENCE');
        const task=this.#state.get<{rules_binding?:RuleTaskBinding;review_binding?:{candidate_sha256:string;author_agent_id:string}}>('TASK',reviewer.subject.task_id);
        invariant(task?.rules_binding&&sameBinding(task.rules_binding,input.binding)&&task.review_binding?.candidate_sha256===input.candidate_ref.sha256&&task.review_binding.author_agent_id===input.author_id,'NATIVE_GATE_REVIEW_BINDING');review=true;checkerActor=reviewer.subject;
      }else if(info.kind==='TEST')test=true;
      const executionId=uid(),started=now();let result:CheckerResult;
      const readiness=this.#features(actor,input.gate_id);if(readiness!=='ON')return{status:readiness==='OFF'?'BYPASSED':'BLOCKED',reason:'FEATURE_CHANGED_BEFORE_CHECKER'};
      try{
        const context:GateCheckerContext={gate_id:input.gate_id,actor:snapshot(checkerActor),task_actor:snapshot(actor),binding:input.binding,candidate_ref:input.candidate_ref,baseline_ref:input.baseline_ref,test_profile_ref:input.test_profile_ref,evidence:input.evidence,
          readArtifact:(ref)=>{invariant([input.candidate_ref,input.baseline_ref,input.test_profile_ref,...input.evidence.map(item=>item.ref)].some(allowed=>canonical(allowed)===canonical(ref)),'NATIVE_GATE_CHECKER_READ_SCOPE');return this.#state.store.artifacts.read(ref);}};
        result=snapshot(await registered.run(Object.freeze(context)),8192);fields(result,['status','reason','evidence_refs'],['status','reason']);invariant(STATUSES.includes(result.status)&&String(result.status)!=='BYPASSED','NATIVE_GATE_CHECKER_STATUS');text(result.reason);
        invariant((result.evidence_refs?.length??0)<=8,'NATIVE_GATE_EVIDENCE_LIMIT');for(const ref of result.evidence_refs??[])await this.#verify(ref);
      }catch{result={status:'INCONCLUSIVE',reason:'TRUSTED_CHECKER_DID_NOT_PRODUCE_VERIFIABLE_RESULT'};}
      if(info.assurance==='SIMULATED'&&result.status==='PASS')result={...result,status:'SIMULATED'};
      checks.push({...result,checker_id:info.id,checker_version:info.version,code_sha256:info.code_sha256,source_ref:info.source_ref,assurance:info.assurance,reviewer_id:info.reviewer_id,execution_id:executionId,started_at:started,finished_at:now()});statuses.push(result.status);
    }
    if(input.gate_id==='g3'&&!test)statuses.push('NOT_RUN');if(input.gate_id==='g4'&&!review)statuses.push('NOT_RUN');
    if(humanRequired){
      const approval=input.human_review_id?this.#state.get<HumanGateReview>('NATIVE_HUMAN_REVIEW',input.human_review_id):null;
      if(!approval)statuses.push('BLOCKED');else{
        invariant(approval.subject.project_id===actor.project_id&&approval.subject.task_id===actor.task_id&&approval.subject.agent_id===actor.agent_id&&approval.gate_id===input.gate_id&&sameBinding(approval.binding,input.binding)&&approval.candidate_hash===input.candidate_ref.sha256&&approval.baseline_hash===input.baseline_ref.sha256&&approval.test_profile_hash===input.test_profile_ref.sha256,'NATIVE_GATE_HUMAN_BINDING');await this.#verify(approval.authorization_ref,16384);
        statuses.push(approval.decision==='REJECT'?'FAIL':approval.assurance==='SIMULATED'?'SIMULATED':'PASS');
      }
    }
    if(profile.qualification==='SIMULATED')statuses.push('SIMULATED');const result=aggregate(statuses);return{status:result,reason:result==='PASS'?'TRUSTED_AUTOMATIC_CHECKS_PASSED_LOCAL_SCOPE':'TRUSTED_CHECKS_'+result};
  }
  async evaluate(admin:unknown,actor:Subject,input:NativeGateInput):Promise<NativeGateRecord>{
    this.#state.checkAdmin(admin);const data=this.#input(actor,input);invariant(this.#active<GATE_LIMITS.concurrent,'NATIVE_GATE_BACKPRESSURE');this.#active++;
    try{
      const epoch=metadata(this.#state.store),id=uid();const start:NativeGateRecord={id,revision:0,phase:'RUNNING',status:'NOT_RUN',reason:'TRUSTED_ENGINE_RUNNING',gate_id:data.gate_id,subject:snapshot(actor),binding:data.binding,candidate_hash:data.candidate_ref.sha256,baseline_hash:data.baseline_ref.sha256,test_profile_hash:data.test_profile_ref.sha256,input:data,checks:[],feature_enabled:false,allows_protected:false,observed_at:now(),completed_at:null,feature_epoch:epoch.feature_epoch,policy_epoch:epoch.policy_epoch,engine_version:'1.6.1'};
      await this.#state.change(actor,'WORKFLOW_NATIVE_GATE_INTENT',()=>{invariant(this.#state.count('NATIVE_GATE')<GATE_LIMITS.records,'NATIVE_GATE_CAPACITY');this.#state.insert('NATIVE_GATE',id,actor,'RUNNING',start);},{gate_id:data.gate_id,run_id:id,candidate_hash:start.candidate_hash,rule_hash:data.binding.rule_hash});
      const checks:CheckerRun[]=[];let result:{status:NativeGateStatus;reason:string};const state=this.#features(actor,data.gate_id);
      if(state==='OFF')result={status:'BYPASSED',reason:'FEATURE_OFF'};else if(state==='BLOCKED')result={status:'BLOCKED',reason:'FEATURE_UNAVAILABLE'};else{
        try{result=await this.#run(actor,data,checks);}catch(error){const code=(error as {code?:string}).code??'UNVERIFIABLE_INPUT';result={status:code.includes('BINDING')||code.includes('SCOPE')||code.includes('INDEPENDENCE')?'BLOCKED':'FAIL',reason:code.slice(0,128)};}
      }
      return await this.#state.change(actor,'WORKFLOW_NATIVE_GATE_RESULT',()=>{
        const latest=this.#state.get<NativeGateRecord>('NATIVE_GATE',id)!;const feature=this.#features(actor,data.gate_id),currentEpoch=metadata(this.#state.store);
        if(feature==='OFF')result={status:'BYPASSED',reason:'FEATURE_OFF_AT_COMMIT'};else if(feature==='BLOCKED')result={status:'BLOCKED',reason:'FEATURE_UNAVAILABLE_AT_COMMIT'};
        else if(currentEpoch.feature_epoch!==epoch.feature_epoch||currentEpoch.policy_epoch!==epoch.policy_epoch)result={status:'INCONCLUSIVE',reason:'CONTROL_EPOCH_CHANGED_DURING_GATE'};
        else{try{this.#task(actor,data.binding);}catch{result={status:'BLOCKED',reason:'TASK_BINDING_CHANGED_DURING_GATE'};}}
        const record:NativeGateRecord={...latest,revision:latest.revision+1,phase:'COMPLETE',...result,checks,feature_enabled:feature==='ON',allows_protected:result.status==='PASS'&&feature==='ON',completed_at:now()};
        this.#state.update('NATIVE_GATE',id,latest.revision,record.status,record);return snapshot(record);
      },{gate_id:data.gate_id,run_id:id,owner:'Native Gate Engine',enforcement_policy:'P.WORKFLOW_BINDING'});
    }finally{this.#active--;}
  }
  async recover(admin:unknown,actor:Subject):Promise<number>{
    this.#state.checkAdmin(admin);invariant(this.#active===0,'NATIVE_GATE_BUSY');let count=0,after:string|undefined;
    for(;;){const page=this.#state.list<NativeGateRecord>('NATIVE_GATE',{state:'RUNNING',...(after?{after}:{}),limit:32});if(!page.length)break;
      for(const old of page){await this.#state.change(actor,'WORKFLOW_NATIVE_GATE_RECOVERED',()=>{const current=this.#state.get<NativeGateRecord>('NATIVE_GATE',old.id)!;this.#state.update('NATIVE_GATE',old.id,current.revision,'INCONCLUSIVE',{...current,revision:current.revision+1,phase:'COMPLETE',status:'INCONCLUSIVE',reason:'INTERRUPTED_TRUSTED_GATE_NO_AUTOMATIC_RERUN',allows_protected:false,completed_at:now()});},{run_id:old.id});count++;}after=page.at(-1)!.id;
    }return count;
  }
}
