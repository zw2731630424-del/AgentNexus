import { invariant, uid } from '../types.ts';
import type { NativeState } from './state.ts';
import { AGENT_TYPES, identifier, snapshot } from './contracts.ts';
import type { AgentType, Lifecycle, Subject } from './contracts.ts';
import type { ContextAssembly, ContextSource } from './context.ts';
import type { BudgetManager, ResourceAmounts } from '../resources/index.ts';
import type { ToolCapability } from '../gateway.ts';

export type ToolGrant = { tool_id: string; version: string; capability: ToolCapability; resources: string[] };
export type AgentRecord = { id: string; revision: number; subject: Subject; lifecycle: Lifecycle; parent_id: string | null;
  tools: ToolGrant[]; file_scope: string[]; read_tasks: string[]; context_ref: ContextSource | null; worker_limits: ResourceAmounts; reason: string | null;
  work_role:'SCOUT'|'WORKER'|'VERIFIER'|'REVIEWER'|null };
export type AgentInput = { id?: string; project_id: string; task_id: string; type: AgentType; parent_id?: string;
  model_binding?: string; tools?: ToolGrant[]; file_scope?: string[]; read_tasks?: string[]; budget: ResourceAmounts;
  work_role?:'SCOUT'|'WORKER'|'VERIFIER'|'REVIEWER' };

const TRANSITIONS: Record<Lifecycle, readonly Lifecycle[]> = {
  CREATED: ['INITIALIZING','STOPPING','FAILED'], INITIALIZING: ['READY','FAILED','STOPPING'],
  READY: ['RUNNING','WAITING','STOPPING','FAILED'], RUNNING: ['WAITING','STOPPING','FAILED','UNKNOWN_QUARANTINED'],
  WAITING: ['RESUMING','STOPPING','FAILED'], RESUMING: ['READY','RUNNING','STOPPING','FAILED'],
  STOPPING: ['STOPPED','FAILED','UNKNOWN_QUARANTINED'], STOPPED: [], FAILED: ['INITIALIZING','UNKNOWN_QUARANTINED'], UNKNOWN_QUARANTINED: [],
};
export class AgentRuntime {
  #state: NativeState; #context: ContextAssembly; #budgets: BudgetManager;
  constructor(state: NativeState, context: ContextAssembly, budgets: BudgetManager) { this.#state=state; this.#context=context; this.#budgets=budgets; }
  get(id: string): AgentRecord { const record=this.#state.get<AgentRecord>('AGENT',id); invariant(record,'AGENT_UNKNOWN'); return record; }
  current(actor: Subject): AgentRecord {
    const record=this.get(actor.agent_id);
    invariant(record.subject.runtime_instance_id===actor.runtime_instance_id && record.subject.session_id===actor.session_id && record.subject.project_id===actor.project_id && record.subject.task_id===actor.task_id, 'AGENT_STALE_RUNTIME');
    invariant(!['STOPPED','FAILED','UNKNOWN_QUARANTINED'].includes(record.lifecycle),'AGENT_UNAVAILABLE');
    this.#state.require(AGENT_TYPES[record.subject.agent_type].feature,record.subject);
    this.#state.require('native.agent-type-registry',record.subject);
    this.#state.require('native.agent-lifecycle',record.subject);
    if(record.work_role)this.#state.require('wf.role.'+record.work_role.toLowerCase(),record.subject);
    invariant(this.#state.get<{state:string}>('PROJECT',record.subject.project_id)?.state==='ACTIVE','PROJECT_NOT_ACTIVE');return record;
  }
  async create(admin: unknown, input: AgentInput): Promise<AgentRecord> {
    this.#state.checkAdmin(admin); const p=snapshot(input); identifier(p.project_id); identifier(p.task_id);
    invariant(Object.hasOwn(AGENT_TYPES,p.type),'NATIVE_AGENT_TYPE');
    invariant(this.#state.get<{state:string}>('PROJECT',p.project_id)?.state==='ACTIVE','PROJECT_NOT_ACTIVE');
    const id=p.id??uid(); identifier(id); invariant(!this.#state.get('AGENT',id),'AGENT_DUPLICATE');
    invariant(this.#state.list('AGENT',{project_id:p.project_id,task_id:p.task_id,limit:1}).length===0,'AGENT_TASK_MUST_BE_INDEPENDENT');
    invariant(this.#state.count('AGENT')<128,'AGENT_REGISTRY_LIMIT');
    const parent=p.parent_id?this.get(p.parent_id):null;
    if (p.type==='SUBAGENT') invariant(parent && parent.subject.project_id===p.project_id && parent.subject.agent_type==='DEVELOPMENT','SUBAGENT_PARENT_REQUIRED');
    else invariant(parent===null,'AGENT_PARENT_TYPE');
    const tools=p.tools??[{tool_id:'native.echo',version:'1',capability:'PURE' as const,resources:[]}];
    invariant(p.work_role===undefined||['SCOUT','WORKER','VERIFIER','REVIEWER'].includes(p.work_role),'WORK_ROLE');
    invariant(tools.length<=16 && new Set(tools.map(t=>t.tool_id)).size===tools.length && (p.file_scope?.length??0)<=16 && (p.read_tasks?.length??0)<=16,'AGENT_CAPABILITY_LIMIT');
    for(const grant of tools) {
      identifier(grant.tool_id); invariant(grant.version.length>0 && grant.version.length<=32 && grant.resources.length<=16,'AGENT_TOOL_GRANT');
      invariant(['PURE','READ_ONLY','LOCAL_WRITE','PROCESS','EXTERNAL_EFFECT'].includes(grant.capability),'AGENT_TOOL_GRANT');
      for(const resource of grant.resources) invariant(resource.startsWith(p.project_id+':') && resource.length<=256,'AGENT_RESOURCE_SCOPE');
      if(AGENT_TYPES[p.type].read_only) invariant(['PURE','READ_ONLY'].includes(grant.capability),'AGENT_READ_ONLY_ROLE');
      if(p.work_role&&p.work_role!=='WORKER')invariant(['PURE','READ_ONLY'].includes(grant.capability),'WORK_ROLE_READ_ONLY');
      if(parent) invariant(parent.tools.some(t=>t.tool_id===grant.tool_id && t.version===grant.version && t.capability===grant.capability && grant.resources.every(r=>t.resources.includes(r))),'SUBAGENT_CAPABILITY_ESCALATION');
    }
    for(const resource of p.file_scope??[]) invariant(resource.startsWith(p.project_id+':') && resource.length<=256 && (!parent || parent.file_scope.includes(resource)),'AGENT_FILE_SCOPE');
    for(const task of p.read_tasks??[]) { identifier(task); invariant(!parent || task===parent.subject.task_id || parent.read_tasks.includes(task),'SUBAGENT_CONTEXT_ESCALATION'); }
    const runtime=uid(), actor:Subject={agent_id:id,project_id:p.project_id,task_id:p.task_id,session_id:uid(),runtime_instance_id:runtime,
      agent_type:p.type,model_binding:p.model_binding??'mock',resource_budget_id:'worker.'+runtime,policy_scope:p.project_id};
    this.#state.require(AGENT_TYPES[p.type].feature,actor); this.#state.require('native.agent-lifecycle',actor);
    this.#state.require('native.agent-type-registry',actor);
    if(p.work_role)this.#state.require('wf.role.'+p.work_role.toLowerCase(),actor);
    await this.#budgets.configure(admin,actor,{id:actor.resource_budget_id,scope:'WORKER',owner_id:runtime,limits:p.budget});
    const record:AgentRecord={id,revision:0,subject:actor,lifecycle:'CREATED',parent_id:parent?.id??null,tools,file_scope:p.file_scope??[],read_tasks:p.read_tasks??[],context_ref:null,worker_limits:p.budget,reason:null,work_role:p.work_role??null};
    await this.#state.change(actor,'AGENT_CREATED',()=>{
      this.#state.require(AGENT_TYPES[p.type].feature,actor);this.#state.require('native.agent-type-registry',actor);this.#state.require('native.agent-lifecycle',actor);
      if(p.work_role)this.#state.require('wf.role.'+p.work_role.toLowerCase(),actor);
      invariant(this.#state.count('AGENT')<128 && !this.#state.get('AGENT',id),'AGENT_REGISTRY_LIMIT'); this.#state.insert('AGENT',id,actor,record.lifecycle,record);
    },{type:p.type,parent_id:record.parent_id,os_runtime_identity:null,assurance:'LOCAL_TRUSTED_LIBRARY'});
    await this.transition(admin,id,'INITIALIZING');
    const source=await this.#context.capture(actor,'RAW',Buffer.from(JSON.stringify({type:p.type,tools,file_scope:record.file_scope,read_tasks:record.read_tasks,model_strategy:AGENT_TYPES[p.type].model_strategy})),{maxBytes:16384});
    await this.#state.change(actor,'AGENT_CONTEXT_BOUND',()=>{const current=this.get(id);this.#state.update('AGENT',id,current.revision,current.lifecycle,{...current,revision:current.revision+1,context_ref:source});});
    return this.transition(admin,id,'READY');
  }
  async transition(admin: unknown, id: string, next: Lifecycle, reason: string | null=null): Promise<AgentRecord> {
    this.#state.checkAdmin(admin); const actor=this.get(id).subject;
    return this.#state.change(actor,'AGENT_LIFECYCLE',()=>{
      const current=this.get(id); invariant(TRANSITIONS[current.lifecycle].includes(next),'AGENT_LIFECYCLE_TRANSITION');
      if(['INITIALIZING','READY','RUNNING','RESUMING'].includes(next)){
        this.#state.require(AGENT_TYPES[actor.agent_type].feature,actor);this.#state.require('native.agent-type-registry',actor);this.#state.require('native.agent-lifecycle',actor);
        if(current.work_role)this.#state.require('wf.role.'+current.work_role.toLowerCase(),actor);
        invariant(this.#state.get<{state:string}>('PROJECT',actor.project_id)?.state==='ACTIVE','PROJECT_NOT_ACTIVE');
      }
      const record={...current,lifecycle:next,reason,revision:current.revision+1}; this.#state.update('AGENT',id,current.revision,next,record);return snapshot(record);
    },{to:next,reason});
  }
  async recover(admin: unknown): Promise<void> {
    this.#state.checkAdmin(admin); let after:string|undefined;
    for(;;) {
      const page=this.#state.list<AgentRecord>('AGENT',{...(after?{after}:{}),limit:32}); if(!page.length)break;
      for(const old of page) {
        if(old.lifecycle==='STOPPED')continue;
        const unsafe=['RUNNING','STOPPING','UNKNOWN_QUARANTINED'].includes(old.lifecycle);
        const instance=uid(), actor:Subject={...old.subject,runtime_instance_id:instance,session_id:uid(),resource_budget_id:'worker.'+instance};
        // Recovery restores the control plane without allocating a new worker budget.
        // The scheduler provisions it only on an explicit, qualified dispatch.
        await this.#state.change(actor,'AGENT_RECOVERED',()=>{
          const current=this.get(old.id); const lifecycle:Lifecycle=unsafe?'UNKNOWN_QUARANTINED':old.context_ref?'WAITING':'FAILED';
          this.#state.update('AGENT',old.id,current.revision,lifecycle,{...current,subject:actor,lifecycle,revision:current.revision+1,reason:unsafe?'EXIT_RECONCILIATION_REQUIRED':'RECOVERED_NO_AUTOMATIC_MODEL_CALL'});
        },{previous_runtime:old.subject.runtime_instance_id,os_identity_inferred:false,automatic_execution:false});
      }
      after=page.at(-1)!.id;
    }
  }
}
