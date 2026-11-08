import { readFileSync } from 'node:fs';
import { TextDecoder } from 'node:util';
import { boundedJson, canonical, invariant, now, sha256, uid } from '../types.ts';
import type { ArtifactRef, Scope } from '../types.ts';
import { validateArtifactRef } from '../records.ts';
import { metadata, contains, scopeKey } from '../control.ts';
import { POLICY_CONTRACTS } from '../policy-contracts.ts';
import { identifier, snapshot, subject } from './contracts.ts';
import type { Subject } from './contracts.ts';
import type { ContextSource } from './context.ts';
import type { NativeState } from './state.ts';

export const RULE_LIMITS = Object.freeze({ sources: 16, source_bytes: 65536, total_source_bytes: 262144, rules: 32, versions_per_project: 64, registries: 512, migrations: 1024 });
export type RuleClassification = 'HUMAN_READABLE'|'MODEL_GUIDANCE'|'MACHINE_CHECKABLE'|'POLICY_ENFORCED'|'MANUAL_REVIEW';
export type NativeGateId = 'g0'|'g1'|'g2'|'g3'|'g4'|'g5'|'g6';
export type RuleConstraint = { kind:'MAX_EVIDENCE_BYTES'; max_bytes:number } | { kind:'REQUIRE_CHECKER'; checker_id:string } |
  { kind:'REQUIRE_ARTIFACT'; evidence_kind:string } | { kind:'REQUIRE_HUMAN_REVIEW' } | {kind:'FROZEN_RULE_BINDING'} | {kind:'GATE_FAIL_CLOSED'};
export type CompiledRule = { id:string; classification:RuleClassification; description:string; scope:Scope; depends_on:string[];
  feature_dependencies:string[]; gates:NativeGateId[]; constraint:RuleConstraint|null;
  enforcement:{policy_id:string;owner:string}|null; source_id:string; source_hash:string };
export type RuleSourceInput = { id:string; format:'TEXT'|'RULE_DSL'; payload_ref:ArtifactRef; context_source?:ContextSource;
  classification?:'HUMAN_READABLE'|'MODEL_GUIDANCE'|'MANUAL_REVIEW' };
export type RuleTaskBinding = { registry_id:string; project_rules_version:string; rule_hash:string; feature_epoch:number; policy_epoch:number; workflow_version:string };
export type RuleRegistry = { id:string; revision:number; project_id:string; version:string; rule_hash:string; workflow_version:string;
  feature_epoch:number; policy_epoch:number; sources:RuleSourceInput[]; rules:CompiledRule[]; compiled_ref:ArtifactRef; created_at:string };
export type CompileRulesInput = { version:string; workflow_version:string; sources:RuleSourceInput[] };
type CurrentRules = {id:string;revision:number;registry_id:string};
export type RuleMigration = {id:string;revision:number;project_id:string;task_id:string;from:RuleTaskBinding;to:RuleTaskBinding;reason:string;authorization_ref:ArtifactRef;observed_at:string};
const CLASSES:RuleClassification[]=['HUMAN_READABLE','MODEL_GUIDANCE','MACHINE_CHECKABLE','POLICY_ENFORCED','MANUAL_REVIEW'];
const GATE_IDS:NativeGateId[]=['g0','g1','g2','g3','g4','g5','g6'];
function fields(value:object,allowed:string[],required=allowed):void {
  invariant(value!==null&&!Array.isArray(value)&&Object.keys(value).every(key=>allowed.includes(key))&&required.every(key=>Object.hasOwn(value,key)),'RULE_SCHEMA');
}
function list(value:unknown,max:number):asserts value is unknown[] {invariant(Array.isArray(value)&&value.length<=max,'RULE_LIMIT');}
function label(value:unknown,max=128):asserts value is string {invariant(typeof value==='string'&&Buffer.byteLength(value)>0&&Buffer.byteLength(value)<=max,'RULE_SCHEMA');}
function version(value:unknown):asserts value is string {label(value,64);identifier(value);}
function epochs(value:RuleTaskBinding):void {invariant(Number.isSafeInteger(value.feature_epoch)&&value.feature_epoch>=0&&Number.isSafeInteger(value.policy_epoch)&&value.policy_epoch>=0,'RULE_BINDING');}

/** Project text is data. Only this explicit finite DSL creates executable constraints. Trusted bootstrap only. */
export class RulesCompiler {
  #state:NativeState; #features:Set<string>;
  constructor(state:NativeState,options:{feature_ids?:readonly string[]}={}) {
    this.#state=state;
    const ids=options.feature_ids??(JSON.parse(readFileSync(new URL('../../../config/agentnexus/features.json',import.meta.url),'utf8')) as {features:{id:string}[]}).features.map(item=>item.id);
    invariant(ids.length<=512&&new Set(ids).size===ids.length,'RULE_CATALOG_LIMIT');for(const id of ids)identifier(id);this.#features=new Set(ids);
  }
  current(projectId:string):RuleRegistry|null {identifier(projectId);const current=this.#state.get<CurrentRules>('RULE_CURRENT',projectId);return current?this.getRegistry(current.registry_id):null;}
  getRegistry(id:string):RuleRegistry {identifier(id);const record=this.#state.get<RuleRegistry>('RULE_REGISTRY',id);invariant(record,'RULE_REGISTRY_UNKNOWN');
    version(record.version);version(record.workflow_version);
    const {id:_id,revision:_revision,rule_hash,compiled_ref:_ref,created_at:_at,...body}=record;
    invariant(sha256(canonical(body))===rule_hash,'RULE_REGISTRY_HASH');return record;}
  captureBinding(actor:Subject):RuleTaskBinding {
    subject(actor);this.#state.require('native.rules-compiler',actor);const registry=this.current(actor.project_id);invariant(registry,'RULE_REGISTRY_REQUIRED');
    version(registry.version);version(registry.workflow_version);const epoch=metadata(this.#state.store);return snapshot({registry_id:registry.id,project_rules_version:registry.version,rule_hash:registry.rule_hash,
      feature_epoch:epoch.feature_epoch,policy_epoch:epoch.policy_epoch,workflow_version:registry.workflow_version});
  }
  assertBinding(actor:Subject,input:RuleTaskBinding):RuleRegistry {
    subject(actor);const binding=snapshot(input);fields(binding,['registry_id','project_rules_version','rule_hash','feature_epoch','policy_epoch','workflow_version']);epochs(binding);version(binding.project_rules_version);version(binding.workflow_version);
    const record=this.getRegistry(binding.registry_id);
    invariant(record.project_id===actor.project_id&&record.version===binding.project_rules_version&&record.rule_hash===binding.rule_hash&&record.workflow_version===binding.workflow_version,'RULE_BINDING');
    // Frozen task epochs are provenance, never a replacement for current Gateway/Policy fences.
    invariant(binding.feature_epoch>=record.feature_epoch&&binding.policy_epoch>=record.policy_epoch,'RULE_BINDING');return record;
  }
  applicable(actor:Subject,binding:RuleTaskBinding):CompiledRule[] {return this.assertBinding(actor,binding).rules.filter(rule=>contains(rule.scope,actor));}
  async #read(ref:ArtifactRef,max:number):Promise<string> {
    validateArtifactRef(ref);invariant(ref.bytes>0&&ref.bytes<=max,'RULE_SOURCE_LIMIT');const chunks:Buffer[]=[];let bytes=0;
    for await(const chunk of this.#state.store.artifacts.read(ref)){bytes+=chunk.byteLength;invariant(bytes<=max,'RULE_SOURCE_LIMIT');chunks.push(Buffer.from(chunk));}
    return new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,bytes));
  }
  #rule(raw:unknown,source:RuleSourceInput,actor:Subject):CompiledRule {
    invariant(raw!==null&&typeof raw==='object','RULE_SCHEMA');const rule=raw as CompiledRule;
    fields(rule,['id','classification','description','scope','depends_on','feature_dependencies','gates','constraint','enforcement']);
    identifier(rule.id);label(rule.description,1024);invariant(CLASSES.includes(rule.classification),'RULE_CLASSIFICATION');scopeKey(rule.scope);
    invariant(Object.keys(rule.scope).length===0||rule.scope.project_id===actor.project_id,'RULE_SCOPE');list(rule.depends_on,16);list(rule.feature_dependencies,16);list(rule.gates,7);
    invariant(new Set(rule.depends_on).size===rule.depends_on.length&&new Set(rule.feature_dependencies).size===rule.feature_dependencies.length&&new Set(rule.gates).size===rule.gates.length,'RULE_DUPLICATE_DEPENDENCY');
    for(const dependency of rule.depends_on)identifier(dependency);
    for(const feature of rule.feature_dependencies){identifier(feature);invariant(this.#features.has(feature),'RULE_UNKNOWN_FEATURE');}
    for(const gate of rule.gates)invariant(GATE_IDS.includes(gate),'RULE_GATE_BINDING');
    const automatic=rule.classification==='MACHINE_CHECKABLE'||rule.classification==='POLICY_ENFORCED';
    if(!automatic){invariant(rule.constraint===null&&rule.enforcement===null,'RULE_NATURAL_LANGUAGE_NOT_EXECUTABLE');}
    else {
      invariant(rule.constraint!==null&&typeof rule.constraint==='object'&&rule.gates.length>0,'RULE_CONSTRAINT_REQUIRED');
      const constraint=rule.constraint;
      switch(constraint.kind){
        case 'MAX_EVIDENCE_BYTES':fields(constraint,['kind','max_bytes']);invariant(Number.isSafeInteger(constraint.max_bytes)&&constraint.max_bytes>=1&&constraint.max_bytes<=8388608,'RULE_CONSTRAINT');break;
        case 'REQUIRE_CHECKER':fields(constraint,['kind','checker_id']);identifier(constraint.checker_id);break;
        case 'REQUIRE_ARTIFACT':fields(constraint,['kind','evidence_kind']);identifier(constraint.evidence_kind);break;
        case 'REQUIRE_HUMAN_REVIEW':case 'FROZEN_RULE_BINDING':case 'GATE_FAIL_CLOSED':fields(constraint,['kind']);break;
        default:invariant(false,'RULE_UNKNOWN_CONSTRAINT');
      }
      if(rule.classification==='POLICY_ENFORCED'){
        invariant(rule.enforcement!==null,'RULE_ENFORCEMENT_REQUIRED');fields(rule.enforcement,['policy_id','owner']);
        invariant(Object.hasOwn(POLICY_CONTRACTS,rule.enforcement.policy_id),'RULE_UNKNOWN_POLICY');
        invariant(rule.enforcement.policy_id==='P.WORKFLOW_BINDING'&&POLICY_CONTRACTS[rule.enforcement.policy_id][0]==='L0'&&!POLICY_CONTRACTS[rule.enforcement.policy_id][1],'RULE_POLICY_OWNER');
        invariant((constraint.kind==='FROZEN_RULE_BINDING'&&rule.enforcement.owner==='Project Rules Compiler')||(constraint.kind==='GATE_FAIL_CLOSED'&&rule.enforcement.owner==='Native Gate Engine'),'RULE_POLICY_OWNER');
      } else invariant(rule.enforcement===null&&!['FROZEN_RULE_BINDING','GATE_FAIL_CLOSED'].includes(constraint.kind),'RULE_POLICY_OWNER');
    }
    return snapshot({...rule,source_id:source.id,source_hash:source.payload_ref.sha256});
  }
  async compile(admin:unknown,actor:Subject,input:CompileRulesInput):Promise<RuleRegistry> {
    this.#state.checkAdmin(admin);subject(actor);this.#state.require('native.rules-compiler',actor);this.#state.require('wf.rules.registration',actor);
    const data=snapshot(input,32768);fields(data,['version','workflow_version','sources']);version(data.version);version(data.workflow_version);list(data.sources,RULE_LIMITS.sources);invariant(data.sources.length>0,'RULE_SOURCE_REQUIRED');
    invariant(this.#state.count('RULE_REGISTRY')<RULE_LIMITS.registries&&this.#state.count('RULE_REGISTRY',{project_id:actor.project_id})<RULE_LIMITS.versions_per_project,'RULE_REGISTRY_LIMIT');
    const startEpoch=metadata(this.#state.store),rules:CompiledRule[]=[];let total=0;const sources=new Set<string>();
    for(const source of data.sources){
      fields(source,['id','format','payload_ref','context_source','classification'],['id','format','payload_ref']);identifier(source.id);invariant(!sources.has(source.id),'RULE_DUPLICATE_SOURCE');sources.add(source.id);
      invariant(source.format==='TEXT'||source.format==='RULE_DSL','RULE_SOURCE_FORMAT');validateArtifactRef(source.payload_ref);total+=source.payload_ref.bytes;invariant(total<=RULE_LIMITS.total_source_bytes,'RULE_SOURCE_LIMIT');
      if(source.context_source){invariant(source.context_source.project_id===actor.project_id&&canonical(source.context_source.payload_ref)===canonical(source.payload_ref),'RULE_SOURCE_CONTEXT');
        invariant(source.context_source.offset===0&&source.context_source.length===source.payload_ref.bytes,'RULE_SOURCE_CONTEXT');
        const record=this.#state.store.db.prepare("SELECT domain,hash,body,project_id,task_id FROM anx_records WHERE event_id=?").get(source.context_source.event_id) as {domain:string;hash:string;body:string;project_id:string;task_id:string}|undefined;
        invariant(record?.domain==='context'&&record.hash===source.context_source.record_hash&&record.project_id===actor.project_id&&record.task_id===source.context_source.task_id&&canonical((JSON.parse(record.body) as {payload_ref:ArtifactRef}).payload_ref)===canonical(source.payload_ref),'RULE_SOURCE_CONTEXT');}
      const text=await this.#read(source.payload_ref,RULE_LIMITS.source_bytes);
      if(source.format==='TEXT'){
        invariant(source.classification===undefined||['HUMAN_READABLE','MODEL_GUIDANCE','MANUAL_REVIEW'].includes(source.classification),'RULE_NATURAL_LANGUAGE_NOT_EXECUTABLE');
        rules.push({id:'text.'+source.id,classification:source.classification??'HUMAN_READABLE',description:'Original text retained verbatim in source artifact; no executable interpretation.',scope:{project_id:actor.project_id},depends_on:[],feature_dependencies:[],gates:[],constraint:null,enforcement:null,source_id:source.id,source_hash:source.payload_ref.sha256});
      }else{
        invariant(source.classification===undefined,'RULE_SOURCE_CLASSIFICATION');let document:unknown;try{document=JSON.parse(text);}catch{invariant(false,'RULE_DSL_PARSE');}
        invariant(document!==null&&typeof document==='object','RULE_SCHEMA');const doc=document as {schema:string;rules:unknown[]};fields(doc,['schema','rules']);invariant(doc.schema==='agentnexus/project-rules/1','RULE_DSL_SCHEMA');list(doc.rules,RULE_LIMITS.rules);
        for(const raw of doc.rules)rules.push(this.#rule(raw,source,actor));
      }
      invariant(rules.length<=RULE_LIMITS.rules,'RULE_LIMIT');
    }
    const ids=new Map(rules.map(rule=>[rule.id,rule]));invariant(ids.size===rules.length,'RULE_DUPLICATE_ID');
    const visiting=new Set<string>(),done=new Set<string>();const visit=(id:string):void=>{invariant(!visiting.has(id),'RULE_DEPENDENCY_CYCLE');if(done.has(id))return;const rule=ids.get(id);invariant(rule,'RULE_UNKNOWN_DEPENDENCY');visiting.add(id);for(const dependency of rule.depends_on){const dep=ids.get(dependency);invariant(dep&&contains(dep.scope,rule.scope),'RULE_DEPENDENCY_SCOPE');visit(dependency);}visiting.delete(id);done.add(id);};for(const id of ids.keys())visit(id);
    const body={project_id:actor.project_id,version:data.version,workflow_version:data.workflow_version,feature_epoch:startEpoch.feature_epoch,policy_epoch:startEpoch.policy_epoch,sources:data.sources,rules};
    const raw=boundedJson(body,43008),ruleHash=sha256(raw),id=sha256(actor.project_id+':'+data.version);const old=this.#state.get<RuleRegistry>('RULE_REGISTRY',id);
    if(old){invariant(old.rule_hash===ruleHash,'RULE_VERSION_IMMUTABLE');return this.getRegistry(id);}
    const ref=await this.#state.store.artifacts.putBytesQueued(Buffer.from(raw),{maxBytes:43008,media_type:'application/json'});
    const registry:RuleRegistry={id,revision:0,...body,rule_hash:ruleHash,compiled_ref:ref,created_at:now()};
    return this.#state.change(actor,'WORKFLOW_RULES_COMPILED',()=>{
      this.#state.require('native.rules-compiler',actor);this.#state.require('wf.rules.registration',actor);const currentEpoch=metadata(this.#state.store);
      invariant(currentEpoch.feature_epoch===startEpoch.feature_epoch&&currentEpoch.policy_epoch===startEpoch.policy_epoch,'RULE_COMPILE_EPOCH_CHANGED');
      invariant(!this.#state.get('RULE_REGISTRY',id),'RULE_VERSION_IMMUTABLE');invariant(this.#state.count('RULE_REGISTRY')<RULE_LIMITS.registries&&this.#state.count('RULE_REGISTRY',{project_id:actor.project_id})<RULE_LIMITS.versions_per_project,'RULE_REGISTRY_LIMIT');
      this.#state.insert('RULE_REGISTRY',id,actor,'COMPILED',registry);const current=this.#state.get<CurrentRules>('RULE_CURRENT',actor.project_id);
      const pointer={id:actor.project_id,revision:current?current.revision+1:0,registry_id:id};if(current)this.#state.update('RULE_CURRENT',actor.project_id,current.revision,'CURRENT',pointer);else this.#state.insert('RULE_CURRENT',actor.project_id,actor,'CURRENT',pointer);
      return snapshot(registry);
    },{registry_id:id,rule_hash:ruleHash,compiled_ref:ref,enforcement_policy:'P.WORKFLOW_BINDING',owner:'Project Rules Compiler'});
  }
  async migrate(admin:unknown,actor:Subject,input:{from:RuleTaskBinding;to:RuleTaskBinding;reason:string;authorization_ref:ArtifactRef}):Promise<RuleMigration> {
    this.#state.checkAdmin(admin);const data=snapshot(input);fields(data,['from','to','reason','authorization_ref']);this.assertBinding(actor,data.from);this.assertBinding(actor,data.to);label(data.reason,2048);
    invariant(data.from.registry_id!==data.to.registry_id,'RULE_MIGRATION_NO_CHANGE');await this.#read(data.authorization_ref,16384);
    const record:RuleMigration={id:uid(),revision:0,project_id:actor.project_id,task_id:actor.task_id,...data,observed_at:now()};
    return this.#state.change(actor,'WORKFLOW_RULES_MIGRATION_AUTHORIZED',()=>{this.#state.require('native.rules-compiler',actor);invariant(this.#state.count('RULE_MIGRATION')<RULE_LIMITS.migrations,'RULE_MIGRATION_LIMIT');
      this.#state.insert('RULE_MIGRATION',record.id,actor,'AUTHORIZED',record);return snapshot(record);
    },{migration_id:record.id,from:data.from.registry_id,to:data.to.registry_id,authorization_ref:data.authorization_ref});
  }
}
