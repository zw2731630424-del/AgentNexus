import { performance } from 'node:perf_hooks';
import { canonical, invariant, now, sha256, uid } from '../types.ts';
import type { ToolRequest, ToolResult } from '../gateway.ts';
import type { Scope } from '../types.ts';
import { intentHash } from '../gateway.ts';
import { identityOf, snapshot } from './contracts.ts';
import { AGENT_TYPES } from './contracts.ts';
import type { Subject, TaskState, AgentType } from './contracts.ts';
import type { NativeState } from './state.ts';
import type { AgentRuntime } from './agents.ts';
import type { ContextAssembly, ContextSource, ContextSelection } from './context.ts';
import type { ModelGateway } from './models.ts';
import type { NativeToolRuntime } from './tools.ts';
import type { WorkflowRuntime } from './workflow.ts';
import type { BudgetManager, ResourceAmounts, Reservation } from '../resources/index.ts';

export type ProjectRecord = { id: string; revision: number; state: 'ACTIVE'|'PAUSING'|'PAUSED'|'CLOSING'|'CLOSED'; budget_id: string; rules: ContextSource[];global_rules:ContextSource[] };
export type TaskRecord = {
  id: string; revision: number; subject: Subject; state: TaskState; goal: string; contract_ref: ContextSource;
  dependencies: string[]; requirements: ResourceAmounts; max_turns: number; turns: number; attempts: number;
  created_at: string; deadline_at: number; started_at: string | null; finished_at: string | null;
  startup_ms:number;execution_ms: number; waiting_ms: number; paused_ms: number; state_since: number;
  reservation_id: string | null; history: ContextSource[]; pending_tool: ToolRequest | null;
  result_ref: ContextSource | null; reason: string | null; stop_reason: 'CANCELLED'|'PAUSED'|'TIMED_OUT'|null;
  received_message_ids: string[];
  persistent_write: boolean;
  inputs:ContextSelection[];
  review_binding:{commit:string;diff_sha256:string;candidate_sha256:string;author_agent_id:string}|null;
};
export type TaskInput = { id: string; agent_id: string; goal: string; dependencies?: string[]; requirements?: ResourceAmounts; max_turns?: number; wall_ms?: number;
  contract?:{acceptance:string[];allowed_scope:string[]};inputs?:ContextSelection[];
  review_binding?:{commit:string;diff_sha256:string;candidate_sha256:string;author_agent_id:string} };
type Dependencies = { state: NativeState; agents: AgentRuntime; context: ContextAssembly; budgets: BudgetManager; models: ModelGateway;
  tools: NativeToolRuntime; workflow: WorkflowRuntime; approve: (hash:string,actor:Subject,reason:string)=>Promise<string>; platform_budget_id:string; maxConcurrent?:number;
  deliver?:(actor:Subject,target:string,payload:ContextSource,taskId:string)=>Promise<void> };
const TERMINAL: TaskState[]=['SUCCEEDED','FAILED','CANCELLED','TIMED_OUT','UNKNOWN_QUARANTINED'];

/** Durable bounded scheduler and native loop. No timer releases a resource. */
export class TaskScheduler {
  #d: Dependencies; #active = new Map<string,{promise:Promise<TaskRecord>;controller:AbortController}>(); #closed=false;
  constructor(dependencies:Dependencies){this.#d=dependencies;}
  get(id:string):TaskRecord {const task=this.#d.state.get<TaskRecord>('TASK',id);invariant(task,'TASK_UNKNOWN');return task;}
  #project(id:string):ProjectRecord {const project=this.#d.state.get<ProjectRecord>('PROJECT',id);invariant(project,'PROJECT_UNKNOWN');return project;}
  #current(task:TaskRecord):Subject {const agent=this.#d.agents.get(task.subject.agent_id);invariant(agent.subject.project_id===task.subject.project_id && agent.subject.task_id===task.id,'TASK_AGENT_BINDING');return agent.subject;}
  async #update(id:string,phase:string,changes:Partial<TaskRecord>):Promise<TaskRecord> {
    const actor=this.#current(this.get(id));
    return this.#d.state.change(actor,phase,()=>{
      const task=this.get(id); const time=Date.now(); let waiting=task.waiting_ms,paused=task.paused_ms;
      if(changes.state && changes.state!==task.state){if(['QUEUED','WAITING_RESOURCES','WAITING'].includes(task.state))waiting+=Math.max(0,time-task.state_since);if(task.state==='PAUSED')paused+=Math.max(0,time-task.state_since);}
      const next:TaskRecord={...task,...changes,subject:actor,revision:task.revision+1,waiting_ms:waiting,paused_ms:paused,state_since:changes.state&&changes.state!==task.state?time:task.state_since};
      this.#d.state.update('TASK',id,task.revision,next.state,next);return snapshot(next);
    },{task_id:id,state:changes.state??null,reason:changes.reason??null});
  }
  async create(admin:unknown,input:TaskInput):Promise<TaskRecord> {
    this.#d.state.checkAdmin(admin); const p=snapshot(input); const agent=this.#d.agents.get(p.agent_id),actor=agent.subject;
    invariant(actor.task_id===p.id,'TASK_AGENT_BINDING');this.#d.state.require('native.task-scheduler',actor);
    invariant(this.#project(actor.project_id).state==='ACTIVE','PROJECT_NOT_ACTIVE');
    invariant(typeof p.goal==='string' && Buffer.byteLength(p.goal)>0 && Buffer.byteLength(p.goal)<=8192,'TASK_GOAL_LIMIT');
    const maxTurns=p.max_turns??8,wall=p.wall_ms??30000;
    invariant(Number.isSafeInteger(maxTurns)&&maxTurns>0&&maxTurns<=32&&Number.isSafeInteger(wall)&&wall>=10&&wall<=300000,'TASK_LIMIT');
    const dependencies=p.dependencies??[];invariant(dependencies.length<=16&&new Set(dependencies).size===dependencies.length&&!dependencies.includes(p.id),'TASK_DEPENDENCY');
    for(const id of dependencies){const dependency=this.get(id);invariant(dependency.subject.project_id===actor.project_id,'TASK_DEPENDENCY_SCOPE');}
    const existing=this.#d.state.get<TaskRecord>('TASK',p.id);
    if(existing){invariant(existing.goal===p.goal&&existing.subject.agent_id===p.agent_id&&canonical(existing.dependencies)===canonical(dependencies),'TASK_DUPLICATE_CONTRACT');return existing;}
    invariant(this.#d.state.count('TASK')<512,'TASK_QUEUE_LIMIT');
    const requirements={workers:1,memory_bytes:16777216,wall_ms:wall,...p.requirements};
    if(p.contract){this.#d.state.require('wf.templates.contract',actor);invariant(p.contract.acceptance.length>0&&p.contract.acceptance.length<=16&&p.contract.allowed_scope.length<=16&&p.contract.allowed_scope.every(resource=>agent.file_scope.includes(resource))&&p.contract.acceptance.every(item=>typeof item==='string'&&item.length>0&&item.length<=512),'WORKFLOW_TASK_CONTRACT');}
    const inputs=p.inputs??[];invariant(inputs.length<=8,'TASK_CONTEXT_INPUT_LIMIT');for(const item of inputs)this.#d.context.validate(actor,item.source);
    if(p.review_binding){const author=this.#d.agents.get(p.review_binding.author_agent_id);invariant(actor.agent_type==='BACKGROUND_REVIEWER'&&author.subject.project_id===actor.project_id&&author.id!==actor.agent_id&&/^[a-f0-9]{40,64}$/.test(p.review_binding.commit)&&/^[a-f0-9]{64}$/.test(p.review_binding.diff_sha256)&&/^[a-f0-9]{64}$/.test(p.review_binding.candidate_sha256),'REVIEW_VERSION_BINDING');}
    const ref=await this.#d.context.capture(actor,'RAW',Buffer.from(canonical({goal:p.goal,dependencies,requirements,max_turns:maxTurns,wall_ms:wall,workflow_contract:p.contract??null,review_binding:p.review_binding??null,inputs})),{maxBytes:16384});
    const task:TaskRecord={id:p.id,revision:0,subject:actor,state:'QUEUED',goal:p.goal,contract_ref:ref,dependencies,requirements,max_turns:maxTurns,turns:0,attempts:0,
      created_at:now(),deadline_at:Date.now()+wall,started_at:null,finished_at:null,startup_ms:0,execution_ms:0,waiting_ms:0,paused_ms:0,state_since:Date.now(),reservation_id:null,
      history:[],pending_tool:null,result_ref:null,reason:null,stop_reason:null,received_message_ids:[],persistent_write:false,inputs,review_binding:p.review_binding??null};
    await this.#d.state.change(actor,'TASK_CREATED',()=>{invariant(this.#d.state.count('TASK')<512,'TASK_QUEUE_LIMIT');this.#d.state.insert('TASK',p.id,actor,task.state,task);});
    return snapshot(task);
  }
  async dispatch(admin:unknown,id:string):Promise<TaskRecord> {
    this.#d.state.checkAdmin(admin);invariant(!this.#closed,'SCHEDULER_CLOSED');
    invariant(!this.#active.has(id),'TASK_ALREADY_DISPATCHED');invariant(this.#active.size<(this.#d.maxConcurrent??4),'SCHEDULER_CONCURRENCY_LIMIT');
    const task=this.get(id);invariant(['QUEUED','WAITING_RESOURCES'].includes(task.state),'TASK_DISPATCH_STATE');
    invariant(![...this.#active.keys()].some(key=>this.get(key).subject.agent_id===task.subject.agent_id),'AGENT_TURN_ACTIVE');
    const controller=new AbortController(); const promise=this.#turn(admin,id,controller);
    this.#active.set(id,{promise,controller});
    try{return await promise;}finally{this.#active.delete(id);}
  }
  #unsettled(actor:Subject):boolean {
    return !!this.#d.state.store.db.prepare("SELECT 1 FROM control_operations WHERE subject=? AND (executor_state='UNKNOWN' OR state IN ('CLAIMED','STARTED','INDETERMINATE','RESULT_RECORDED')) LIMIT 1").get(actor.agent_id);
  }
  async #reserve(admin:unknown,task:TaskRecord):Promise<Reservation> {
    const actor=this.#current(task),project=this.#project(actor.project_id);
    await this.#d.budgets.configure(admin,actor,{id:actor.resource_budget_id,scope:'WORKER',owner_id:actor.runtime_instance_id,limits:this.#d.agents.get(actor.agent_id).worker_limits});
    if(task.reservation_id){
      await this.#d.budgets.drainWaiters(admin,actor,1);
      return this.#d.budgets.inspect(admin,actor,task.reservation_id);
    }
    const id=uid();
    // Record the planned id before reserve. A crash never invents a second reservation.
    await this.#update(task.id,'TASK_RESERVATION_PLANNED',{state:'DISPATCHING',reservation_id:id,attempts:task.attempts+1});
    return this.#d.budgets.reserve(admin,actor,{id,worker_budget_id:actor.resource_budget_id,project_budget_id:project.budget_id,platform_budget_id:this.#d.platform_budget_id,
      amounts:task.requirements,mode:'SIMULATED',operation_id:id,wait:true,expires_at:task.deadline_at});
  }
  async #release(admin:unknown,task:TaskRecord,elapsed:number):Promise<void> {
    if(!task.reservation_id)return; const actor=this.#current(task); const reservation=this.#d.budgets.inspect(admin,actor,task.reservation_id);
    if(reservation.state==='RELEASED')return;
    if(reservation.state==='RESERVED'){
      const token=await this.#d.budgets.issueClosure(admin,actor,reservation.id,'NEVER_STARTED');await this.#d.budgets.release(admin,actor,reservation.id,token);return;
    }
    invariant(reservation.state==='ACTIVE'&&!this.#unsettled(actor),'TASK_EXIT_UNVERIFIED');
    const values={wall_ms:Math.ceil(elapsed)};
    await this.#d.budgets.account(admin,actor,reservation.id,{sequence:reservation.sequence+1,source:'SIMULATED',values,evidence_hash:sha256(canonical({task_id:task.id,elapsed_ms:elapsed,handler_and_outputs_settled:true,os_release:false})),complete:true});
    const token=await this.#d.budgets.issueClosure(admin,actor,reservation.id,'SIMULATED_SETTLED');await this.#d.budgets.release(admin,actor,reservation.id,token);
  }
  async #remember(id:string,source:ContextSource,extra:Partial<TaskRecord>={}):Promise<TaskRecord> {
    const task=this.get(id);invariant(task.history.length<32,'TASK_HISTORY_REFERENCE_LIMIT');
    return this.#update(id,'TASK_CONTEXT_ADVANCED',{...extra,history:[...task.history,source]});
  }
  async #tool(admin:unknown,id:string,request:ToolRequest,signal:AbortSignal):Promise<ToolResult> {
    const actor=this.#current(this.get(id));
    const definition=this.#d.tools.preview(actor,request);
    // ToolGateway owns schema, Feature, Policy, approval, permit, intent and output closure.
    const result=await this.#d.tools.run(actor,request,signal);
    const source=await this.#d.context.capture(actor,'RAW',Buffer.from(canonical(result)),{maxBytes:65536});
    const operation=this.#d.state.store.db.prepare('SELECT executor_state FROM control_operations WHERE operation_id=?').get(result.operation_id) as {executor_state:string}|undefined;
    const persistent=definition.capability==='LOCAL_WRITE'&&!!operation&&operation.executor_state!=='NOT_INVOKED';
    await this.#remember(id,source,{pending_tool:null,persistent_write:this.get(id).persistent_write||persistent});return result;
  }
  async #turn(admin:unknown,id:string,controller:AbortController):Promise<TaskRecord> {
    let timer:ReturnType<typeof setTimeout>|undefined;const started=performance.now();let executionStarted=started; let entered=false;
    try {
      let task=this.get(id); const actor=this.#current(task);
      this.#d.state.require('native.agent-loop',actor);this.#d.state.require('native.task-scheduler',actor);
      this.#d.agents.current(actor);
      this.#d.state.require(AGENT_TYPES[actor.agent_type].feature,actor);
      invariant(this.#project(actor.project_id).state==='ACTIVE','PROJECT_NOT_ACTIVE');
      for(const dependency of task.dependencies)invariant(this.get(dependency).state==='SUCCEEDED','TASK_DEPENDENCY_NOT_READY');
      invariant(Date.now()<task.deadline_at,'TASK_DEADLINE');
      const reservation=await this.#reserve(admin,task);
      if(reservation.state==='WAITING'){
        const stop=this.get(id).stop_reason;
        if(stop){await this.#d.budgets.cancelWait(admin,actor,reservation.id,stop);return this.#update(id,'TASK_WAIT_CANCELLED',{state:stop,reservation_id:null,reason:stop});}
        return this.#update(id,'TASK_RESOURCE_WAIT',{state:'WAITING_RESOURCES',reason:'INSUFFICIENT_BUDGET'});
      }
      invariant(reservation.state==='RESERVED','TASK_RESOURCE_REJECTED');
      if(controller.signal.aborted||this.get(id).stop_reason){
        task=this.get(id);await this.#release(admin,task,0);return this.#update(id,'TASK_STOPPED_BEFORE_START',{state:task.stop_reason==='PAUSED'?'PAUSED':task.stop_reason??'CANCELLED',reservation_id:null,reason:task.stop_reason??'CANCELLED'});
      }
      await this.#d.budgets.start(admin,actor,reservation.id);entered=true;
      task=await this.#update(id,'TASK_DISPATCHED',{state:'RUNNING',started_at:task.started_at??now(),reason:null});
      let agent=this.#d.agents.get(actor.agent_id);
      if(agent.lifecycle==='WAITING'){await this.#d.agents.transition(admin,agent.id,'RESUMING');agent=this.#d.agents.get(agent.id);}
      invariant(['READY','RESUMING'].includes(agent.lifecycle),'AGENT_NOT_READY');await this.#d.agents.transition(admin,agent.id,'RUNNING');
      task=await this.#update(id,'TASK_EXECUTION_ENTERED',{startup_ms:task.startup_ms+Math.ceil(performance.now()-started)});executionStarted=performance.now();
      timer=setTimeout(()=>{controller.abort('TIMED_OUT');void this.stop(admin,id,'TIMED_OUT').catch(()=>{});},Math.max(1,task.deadline_at-Date.now()));
      if(controller.signal.aborted||this.get(id).stop_reason)task=await this.#update(id,'TASK_STOP_OBSERVED',{state:'STOPPING'});
      if(task.pending_tool && task.state==='RUNNING'){
        if(!task.pending_tool.approval_id){await this.#update(id,'TASK_APPROVAL_WAIT',{state:'WAITING',reason:'APPROVAL_REQUIRED'});}
        else {const result=await this.#tool(admin,id,task.pending_tool,controller.signal);if(result.status!=='PASS'&&!controller.signal.aborted)await this.#update(id,'TASK_TOOL_FAILED',{state:result.status==='INCONCLUSIVE'?'UNKNOWN_QUARANTINED':'FAILED',reason:result.reason});}
      }
      while(this.get(id).state==='RUNNING') {
        task=this.get(id);
        if(task.persistent_write){await this.#update(id,'TASK_DISK_OWNER_UNVERIFIED',{state:'UNKNOWN_QUARANTINED',reason:'PERSISTENT_DISK_OWNER_UNVERIFIED'});break;}
        this.#d.state.require(AGENT_TYPES[actor.agent_type].feature,actor);
        if(controller.signal.aborted||task.stop_reason){await this.#update(id,'TASK_STOP_OBSERVED',{state:task.stop_reason==='PAUSED'?'PAUSED':task.stop_reason??'CANCELLED',reason:task.stop_reason??'CANCELLED'});break;}
        if(Date.now()>=task.deadline_at){await this.#update(id,'TASK_DEADLINE_OBSERVED',{state:'TIMED_OUT',reason:'TASK_DEADLINE'});break;}
        invariant(task.turns<task.max_turns,'TASK_TURN_LIMIT');
        const project=this.#project(actor.project_id);this.#d.state.require('wf.rules.project-index',actor);
        if(project.global_rules.length)this.#d.state.require('wf.rules.global',actor);
        const base:ContextSelection[]=[...[...project.global_rules,...project.rules].map(source=>({source,section:'PROJECT_RULES' as const,required:true})),
          {source:this.#d.agents.get(actor.agent_id).context_ref!,section:'AGENT_CONTRACT',required:true},
          {source:task.contract_ref,section:'TASK_CONTRACT',required:true},...task.inputs];
        const slots=Math.max(0,Math.min(12,32-base.length));const selections:ContextSelection[]=[...base,...(slots?task.history.slice(-slots):[]).map(source=>({source,section:'RECENT_INTERACTION' as const,required:false}))];
        const view=await this.#d.context.assemble(actor,selections,{maxBytes:32768,maxSources:32});
        this.#d.state.require('native.agent-loop',actor);
        invariant(this.#project(actor.project_id).state==='ACTIVE','PROJECT_NOT_ACTIVE');
        if(controller.signal.aborted||this.get(id).stop_reason)continue;
        task=await this.#update(id,'TASK_MODEL_INTENT',{turns:task.turns+1});
        this.#d.agents.current(actor);
        const result=await this.#d.models.bind(actor).complete({request_id:id+'.turn.'+task.turns,context:view,max_output_tokens:1024},controller.signal);
        const source=await this.#d.context.capture(actor,'RAW',Buffer.from(canonical(result)),{maxBytes:32768});await this.#remember(id,source);
        if(result.outcome!=='SUCCEEDED'||!result.reply){
          if(controller.signal.aborted&&result.outcome!=='INDETERMINATE')await this.#update(id,'TASK_MODEL_CANCELLED_BEFORE_SEND',{state:'STOPPING',reason:result.reason});
          else await this.#update(id,'TASK_MODEL_FAILED',{state:result.outcome==='INDETERMINATE'?'UNKNOWN_QUARANTINED':'FAILED',reason:result.reason});break;
        }
        if(controller.signal.aborted||this.get(id).stop_reason)continue;
        const reply=result.reply;
        if(reply.kind==='FINAL') {await this.#update(id,'TASK_RESULT',{state:'SUCCEEDED',result_ref:source,reason:'SIMULATED_MODEL_COMPLETE'});break;}
        if(reply.kind==='WAIT'||reply.kind==='HANDOFF'){await this.#update(id,'TASK_WAIT',{state:'WAITING',reason:reply.kind});break;}
        const request=this.#d.tools.request(actor,reply.tool_name!,reply.tool_version??'1',reply.arguments??null,reply.resource_id);
        const tool=this.#d.tools.preview(actor,request);
        await this.#update(id,'TASK_TOOL_INTENT',{pending_tool:request});
        if(tool.capability==='LOCAL_WRITE'){await this.#update(id,'TASK_APPROVAL_WAIT',{state:'WAITING',reason:'APPROVAL_REQUIRED'});break;}
        const output=await this.#tool(admin,id,request,controller.signal);
        if(output.status!=='PASS'&&!controller.signal.aborted){await this.#update(id,'TASK_TOOL_FAILED',{state:output.status==='INCONCLUSIVE'?'UNKNOWN_QUARANTINED':'FAILED',reason:output.reason});break;}
      }
      task=this.get(id);
      if(task.state==='STOPPING')task=await this.#update(id,'TASK_STOP_OBSERVED',{state:task.stop_reason==='PAUSED'?'PAUSED':task.stop_reason??'CANCELLED',reason:task.stop_reason??'CANCELLED'});
      if(this.#unsettled(actor)||task.state==='UNKNOWN_QUARANTINED'||task.persistent_write) {
        await this.#d.budgets.unknown(admin,actor,reservation.id,'TASK_EFFECT_OR_EXIT_UNKNOWN');
        await this.#update(id,'TASK_QUARANTINED',{state:'UNKNOWN_QUARANTINED',reason:task.persistent_write?'PERSISTENT_DISK_OWNER_UNVERIFIED':'TASK_EFFECT_OR_EXIT_UNKNOWN'});
        await this.#d.agents.transition(admin,actor.agent_id,'UNKNOWN_QUARANTINED','TASK_EFFECT_OR_EXIT_UNKNOWN');
      } else {
        await this.#release(admin,task,performance.now()-started);
        task=await this.#update(id,'TASK_HANDLER_SETTLED',{reservation_id:null,execution_ms:task.execution_ms+Math.ceil(performance.now()-executionStarted),finished_at:TERMINAL.includes(task.state)?now():null});
        const target=task.review_binding?.author_agent_id??this.#d.agents.get(actor.agent_id).parent_id;
        if(task.state==='SUCCEEDED'&&target&&task.result_ref&&this.#d.deliver){
          try{await this.#d.deliver(actor,target,task.result_ref,task.id);}catch{await this.#update(id,'TASK_DELIVERY_PENDING',{reason:'DELIVERY_PENDING_EXPLICIT_RECONCILIATION'});}
        }
        if(['WAITING','PAUSED'].includes(task.state))await this.#d.agents.transition(admin,actor.agent_id,'WAITING',task.reason);
        else {await this.#d.agents.transition(admin,actor.agent_id,'STOPPING',task.reason);await this.#d.agents.transition(admin,actor.agent_id,'STOPPED',task.reason);}
      }
      if(this.#d.state.enabled('native.checkpoints-auto',actor)&&this.#d.state.enabled('wf.templates.checkpoint',actor))await this.#checkpoint(admin,id);
      return this.get(id);
    } catch(error) {
      let task=this.get(id);const actor=this.#current(task);const reason=error instanceof Error?error.message:'TASK_FAILURE';
      const reservation=task.reservation_id?this.#d.state.get<Reservation>('resource_reservation',task.reservation_id):null;
      const unknownModel=this.#d.state.count('MODEL_REQUEST',{project_id:actor.project_id,agent_id:actor.agent_id,task_id:actor.task_id,state:'INDETERMINATE'})>0;
      if(this.#d.state.faulted||task.state==='UNKNOWN_QUARANTINED'||reservation?.state==='UNKNOWN_QUARANTINED'||task.persistent_write||unknownModel||this.#unsettled(actor)) {
        if(reservation&&['ACTIVE','RESERVED'].includes(reservation.state))await this.#d.budgets.unknown(admin,actor,reservation.id,reason.slice(0,1024)).catch(()=>{});
        await this.#update(id,'TASK_FAILURE_QUARANTINED',{state:'UNKNOWN_QUARANTINED',reason:reason.slice(0,1024)}).catch(()=>{});
        const agent=this.#d.agents.get(actor.agent_id);
        if(['RUNNING','STOPPING'].includes(agent.lifecycle))await this.#d.agents.transition(admin,agent.id,'UNKNOWN_QUARANTINED',reason.slice(0,1024)).catch(()=>{});
      } else if(!entered&&!reservation&&(reason==='TASK_DEPENDENCY_NOT_READY'||reason==='PROJECT_NOT_ACTIVE')) {
        // These are recoverable scheduling preconditions; no worker started.
        return task;
      } else {
        if(reservation&&['RESERVED','ACTIVE'].includes(reservation.state))await this.#release(admin,task,entered?performance.now()-started:0);
        const stopped=task.stop_reason==='PAUSED'?'PAUSED':task.stop_reason;
        task=await this.#update(id,'TASK_REJECTED',{state:stopped??(reason==='TASK_DEADLINE'?'TIMED_OUT':'FAILED'),reason:reason.slice(0,1024),finished_at:stopped==='PAUSED'?null:now(),reservation_id:null});
        const agent=this.#d.agents.get(actor.agent_id);
        if(agent.lifecycle==='RUNNING'){
          if(stopped==='PAUSED')await this.#d.agents.transition(admin,agent.id,'WAITING',task.reason);
          else {await this.#d.agents.transition(admin,agent.id,'STOPPING',task.reason);await this.#d.agents.transition(admin,agent.id,'STOPPED',task.reason);}
        }
      }
      return this.get(id);
    } finally {if(timer)clearTimeout(timer);}
  }
  async #checkpoint(admin:unknown,id:string):Promise<void> {
    const task=this.get(id),actor=this.#current(task);
    await this.#d.workflow.checkpoint(admin,actor,{task_revision:task.revision,context_cursor:Number((this.#d.state.store.db.prepare('SELECT COALESCE(MAX(seq),0) AS n FROM anx_records').get() as {n:number}).n),
      pending_operation_ids:task.pending_tool?[task.pending_tool.call_id]:[],reservation_ids:task.reservation_id?[task.reservation_id]:[],candidate_hash:sha256(canonical({task_id:id,goal:task.goal})),note:task.reason??task.state});
  }
  async approveTool(admin:unknown,id:string,reason:string):Promise<string> {
    this.#d.state.checkAdmin(admin);const task=this.get(id),actor=this.#current(task);
    invariant(task.state==='WAITING'&&task.reason==='APPROVAL_REQUIRED'&&task.pending_tool&&!task.pending_tool.approval_id,'TASK_NO_PENDING_APPROVAL');
    this.#d.tools.preview(actor,task.pending_tool);const approval=await this.#d.approve(intentHash(identityOf(actor),task.pending_tool),actor,reason);
    await this.#update(id,'TASK_TOOL_APPROVED',{pending_tool:{...task.pending_tool,approval_id:approval}});return approval;
  }
  async resume(admin:unknown,id:string):Promise<TaskRecord> {
    this.#d.state.checkAdmin(admin);const task=this.get(id);invariant(['WAITING','PAUSED'].includes(task.state)&&!this.#active.has(id),'TASK_RESUME_STATE');
    invariant(!this.#unsettled(this.#current(task)),'TASK_EXIT_UNVERIFIED');return this.#update(id,'TASK_RESUMED',{state:'QUEUED',stop_reason:null,reason:null});
  }
  async stop(admin:unknown,id:string,reason:'CANCELLED'|'PAUSED'|'TIMED_OUT'='CANCELLED'):Promise<TaskRecord> {
    this.#d.state.checkAdmin(admin);invariant(['CANCELLED','PAUSED','TIMED_OUT'].includes(reason),'TASK_STOP_REASON');
    const task=this.get(id);invariant(!TERMINAL.includes(task.state),'TASK_TERMINAL');
    const active=this.#active.get(id);
    if(active){active.controller.abort(reason);return this.#update(id,'TASK_STOP_REQUESTED',{state:'STOPPING',stop_reason:reason,reason});}
    if(task.reservation_id){
      const r=this.#d.budgets.inspect(admin,this.#current(task),task.reservation_id);
      if(r.state==='RESERVED')await this.#release(admin,task,0);
      else if(r.state==='WAITING')await this.#d.budgets.cancelWait(admin,this.#current(task),r.id,reason);
      else invariant(r.state==='REJECTED'||r.state==='RELEASED','TASK_EXIT_UNVERIFIED');
    }
    const result=await this.#update(id,'TASK_STOPPED',{state:reason,stop_reason:reason,reservation_id:null,reason,finished_at:reason==='PAUSED'?null:now()});
    const agent=this.#d.agents.get(task.subject.agent_id);
    if(reason==='PAUSED'&&agent.lifecycle==='READY')await this.#d.agents.transition(admin,agent.id,'WAITING',reason);
    if(reason!=='PAUSED'&&['READY','WAITING','RESUMING'].includes(agent.lifecycle)){await this.#d.agents.transition(admin,agent.id,'STOPPING',reason);await this.#d.agents.transition(admin,agent.id,'STOPPED',reason);}
    return result;
  }
  async wake(admin:unknown,actor:Subject):Promise<void> {
    this.#d.state.checkAdmin(admin);const task=this.#d.state.get<TaskRecord>('TASK',actor.task_id);
    if(task&&task.subject.agent_id===actor.agent_id&&task.state==='WAITING'&&!this.#active.has(task.id))await this.resume(admin,task.id);
  }
  async acceptMessage(admin:unknown,actor:Subject,messageId:string,source:ContextSource):Promise<void> {
    this.#d.state.checkAdmin(admin);const task=this.get(actor.task_id);
    invariant(task.subject.agent_id===actor.agent_id&&task.subject.project_id===actor.project_id,'TASK_MESSAGE_SCOPE');
    if(task.received_message_ids.includes(messageId))return;
    invariant(task.received_message_ids.length<32,'TASK_MESSAGE_LIMIT');
    this.#d.context.validate(actor,source);
    await this.#remember(task.id,source,{received_message_ids:[...task.received_message_ids,messageId]});
  }
  async quiesce(admin:unknown,scope:Scope,type?:AgentType,workRole?:string):Promise<void> {
    this.#d.state.checkAdmin(admin);const matches=[...this.#active.entries()].filter(([id])=>{
      const actor=this.get(id).subject;return (!type||actor.agent_type===type)&&(!workRole||this.#d.agents.get(actor.agent_id).work_role===workRole)&&Object.entries(scope).every(([key,value])=>actor[key as keyof Subject]===value);
    });
    for(const [id] of matches)if(!TERMINAL.includes(this.get(id).state))await this.stop(admin,id,'PAUSED');
    await Promise.all(matches.map(([,active])=>active.promise));
  }
  async handoff(admin:unknown,id:string,targetAgentId:string):Promise<TaskRecord> {
    this.#d.state.checkAdmin(admin);const original=this.get(id),target=this.#d.agents.get(targetAgentId);
    invariant(['QUEUED','WAITING','PAUSED'].includes(original.state)&&!original.reservation_id&&!original.pending_tool&&!original.persistent_write&&!this.#active.has(id),'TASK_HANDOFF_STATE');
    invariant(target.subject.project_id===original.subject.project_id&&target.subject.task_id!==id&&target.read_tasks.includes(id),'TASK_HANDOFF_SCOPE');
    invariant(original.deadline_at>Date.now(),'TASK_DEADLINE');this.#d.context.validate(target.subject,original.contract_ref);
    const next=await this.create(admin,{id:target.subject.task_id,agent_id:targetAgentId,goal:original.goal,requirements:original.requirements,max_turns:original.max_turns,wall_ms:Math.max(10,original.deadline_at-Date.now())});
    await this.#remember(next.id,original.contract_ref,{deadline_at:Math.min(next.deadline_at,original.deadline_at)});
    await this.#update(id,'TASK_HANDED_OFF',{state:'WAITING',reason:'HANDOFF:'+next.id});
    if(this.#d.agents.get(original.subject.agent_id).lifecycle==='READY')await this.#d.agents.transition(admin,original.subject.agent_id,'WAITING','HANDOFF');
    return this.get(next.id);
  }
  async expire(admin:unknown):Promise<number> {
    this.#d.state.checkAdmin(admin);let after:string|undefined,total=0;
    for(;;){const page=this.#d.state.list<TaskRecord>('TASK',{...(after?{after}:{}),limit:32});if(!page.length)break;
      for(const task of page)if(!TERMINAL.includes(task.state)&&task.deadline_at<=Date.now()){await this.stop(admin,task.id,'TIMED_OUT');total++;}
      after=page.at(-1)!.id;
    }return total;
  }
  async recover(admin:unknown):Promise<void> {
    this.#d.state.checkAdmin(admin);let after:string|undefined;
    for(;;){const page=this.#d.state.list<TaskRecord>('TASK',{...(after?{after}:{}),limit:32});if(!page.length)break;
      for(const task of page){if(TERMINAL.includes(task.state))continue;
        const actor=this.#current(task),unsafe=['RUNNING','DISPATCHING','STOPPING','WAITING_RESOURCES'].includes(task.state)||!!task.reservation_id||this.#unsettled(actor);
        const pending=task.pending_tool?{...task.pending_tool}:null;if(pending)delete pending.approval_id;
        await this.#update(task.id,'TASK_RECOVERED',{state:unsafe?'UNKNOWN_QUARANTINED':task.state,pending_tool:pending,
          reason:unsafe?'HOST_RESTART_REQUIRES_RECONCILIATION':pending?'APPROVAL_REQUIRED':'RECOVERED_EXPLICIT_DISPATCH_REQUIRED'});
      }after=page.at(-1)!.id;
    }
  }
  activeCount():number{return this.#active.size;}
  async close():Promise<void>{invariant(this.#active.size===0,'SCHEDULER_ACTIVE_TASKS');this.#closed=true;}
}
