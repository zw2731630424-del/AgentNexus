import { readFile } from 'node:fs/promises';
import { openHost } from '../host.ts';
import type { HostOptions } from '../host.ts';
import { canonical, invariant, sha256, uid } from '../types.ts';
import type { Scope } from '../types.ts';
import { NativeState } from './state.ts';
import { AGENT_TYPES, hostSubject, identifier, identityOf, snapshot } from './contracts.ts';
import type { Subject } from './contracts.ts';
import { AgentRuntime } from './agents.ts';
import type { AgentInput, AgentRecord } from './agents.ts';
import { ContextAssembly } from './context.ts';
import { MessageBus } from './messages.ts';
import { ModelGateway } from './models.ts';
import type { MockStep, ModelBudget, ModelGatewayOptions, ModelDefinition } from './models.ts';
import { BudgetManager } from '../resources/index.ts';
import type { ResourceAmounts } from '../resources/index.ts';
import { NativeToolRuntime } from './tools.ts';
import { TaskScheduler } from './scheduler.ts';
import type { ProjectRecord, TaskInput } from './scheduler.ts';
import { WorkflowRuntime } from './workflow.ts';
import type { GateInput, CheckpointInput, ChecklistInput } from './workflow.ts';

const DEFAULT_LIMITS: ResourceAmounts=Object.freeze({workers:4,memory_bytes:268435456,processes:16,disk_bytes:67108864,cpu_user_us:10000000,cpu_kernel_us:10000000,
  io_read_bytes:67108864,io_write_bytes:67108864,log_bytes:8388608,network_connections:0,network_bytes:0,model_tokens:1000000,model_requests:1000,model_cost_micros:10000000,wall_ms:3000000});
export type HarnessOptions={ host?:HostOptions; platform_limits?:ResourceAmounts; mocks?:Record<string,MockStep[]>; routes?:ModelGatewayOptions['routes']; models?:ModelDefinition[]; maxConcurrent?:number };

/** Trusted bootstrap. The returned administration/store handles must never enter a Worker. */
export async function openHarness(root:string,options:HarnessOptions={}) {
  const host=await openHost(root,options.host);const token=Object.freeze({});const boot=uid();let closed=false;
  const checkAdmin=(value:unknown)=>invariant(value===token&&!closed,'NATIVE_ADMIN_CAPABILITY_REQUIRED');
  try {
    const state=new NativeState(host.store,host.features,checkAdmin,boot),adminSubject=hostSubject(boot);
    let scheduler:TaskScheduler|undefined;
    const catalog=JSON.parse(await readFile(new URL('../../../config/agentnexus/features.json',import.meta.url),'utf8')) as {m16_implemented_features:string[]};
    const executing=new Set(['native.harness','native.context-assembly','native.agent-lifecycle','native.agent-type-registry','native.agent-loop','native.task-scheduler',
      'model.gateway','model.mock-provider','resource.registry','resource.worker.budget','resource.project.budget','resource.platform.budget']);
    for(const id of catalog.m16_implemented_features){
      const role=Object.entries(AGENT_TYPES).find(([,value])=>value.feature===id)?.[0] as keyof typeof AGENT_TYPES|undefined;
      const workRole=id.startsWith('wf.role.')?id.slice(8).toUpperCase():undefined;
      host.administration.registerModule(id,executing.has(id)||role||workRole?{stop:async(scope:Scope)=>{if(scheduler)await scheduler.quiesce(token,scope,role,workRole);}}:{});
    }
    const budgets=new BudgetManager(state);
    const readTask=(actor:Subject,taskId:string)=>{
      if(taskId===actor.task_id||taskId==='project-rules')return true;
      const agent=state.get<AgentRecord>('AGENT',actor.agent_id);
      return !!agent&&agent.subject.project_id===actor.project_id&&agent.subject.runtime_instance_id===actor.runtime_instance_id&&agent.read_tasks.includes(taskId);
    };
    const context=new ContextAssembly(state,{readTask}),agents=new AgentRuntime(state,context,budgets),workflow=new WorkflowRuntime(state);
    const ensurePlatform=async()=>{if(!state.get('resource_budget','platform'))await budgets.configure(token,adminSubject,{id:'platform',scope:'PLATFORM',owner_id:'platform',limits:options.platform_limits??DEFAULT_LIMITS});};
    if(['resource.registry','resource.worker.budget','resource.project.budget','resource.platform.budget'].every(id=>state.enabled(id,adminSubject)))await ensurePlatform();
    const modelBudget:ModelBudget={
      reserve:async(actor,demand)=>{
        agents.current(actor);const project=state.get<ProjectRecord>('PROJECT',actor.project_id);invariant(project,'PROJECT_UNKNOWN');const id=uid();
        const reservation=await budgets.reserve(token,actor,{id,worker_budget_id:actor.resource_budget_id,project_budget_id:project.budget_id,platform_budget_id:'platform',
          amounts:{model_tokens:demand.input_tokens+demand.output_tokens,model_requests:1,model_cost_micros:demand.estimated_cost_micros},mode:'SIMULATED',operation_id:demand.request_id,wait:false,expires_at:Date.now()+30000});
        invariant(reservation.state==='RESERVED','MODEL_BUDGET_EXHAUSTED');await budgets.start(token,actor,id);return id;
      },
      settle:async(actor,id,usage)=>{
        const reservation=budgets.inspect(token,actor,id);
        const dispatched=state.get<{state:string}>('MODEL_REQUEST',usage.request_id)?.state==='SENT';
        await budgets.account(token,actor,id,{sequence:reservation.sequence+1,source:'SIMULATED',values:{model_tokens:usage.input_tokens+usage.output_tokens,model_requests:dispatched?1:0,model_cost_micros:usage.cost_micros},complete:true,evidence_hash:sha256(canonical(usage))});
        const closure=await budgets.issueClosure(token,actor,id,'SIMULATED_SETTLED');await budgets.release(token,actor,id,closure);
      },
      retain:async(actor,id,reason)=>{const reservation=budgets.inspect(token,actor,id);if(reservation.state!=='RELEASED')await budgets.unknown(token,actor,id,reason);},
    };
    const defaultRoutes=Object.fromEntries(Object.keys(AGENT_TYPES).map(type=>[type,['mock-main']])) as ModelGatewayOptions['routes'][string];
    const models=new ModelGateway(state,{budget:modelBudget,routes:options.routes??{mock:defaultRoutes},mocks:options.mocks??{'mock-main':[]}});
    const definitions=options.models??[{model_id:'mock-main',provider_id:'mock-provider',max_input_tokens:65536,max_output_tokens:4096,input_cost_micros_per_token:1,output_cost_micros_per_token:1}];
    for(const provider of new Set(definitions.map(d=>d.provider_id)))if(!state.get('MODEL_PROVIDER',provider)){
      await models.registerProvider(token,{provider_id:provider,kind:'MOCK'});
      await models.registerKey(token,{key_id:provider+'.mock-key',provider_id:provider,credential_handle:'vault:mock:'+provider+':handle',maxConcurrency:4});
    }
    for(const definition of definitions)if(!state.get('MODEL_MODEL',definition.model_id))await models.registerModel(token,definition);
    const sessions=new Map<string,ReturnType<typeof host.bindAgent>>();
    const tools=new NativeToolRuntime(state,agents,host.gateway,(actor,request,signal)=>{
      const session=sessions.get(actor.agent_id);invariant(session&&session.identity.session_id===actor.session_id,'AGENT_TOOL_SESSION_UNBOUND');return session.request(request,signal);
    });
    scheduler=new TaskScheduler({state,agents,context,budgets,models,tools,workflow,platform_budget_id:'platform',maxConcurrent:options.maxConcurrent,
      prepareResources:ensurePlatform,
      approve:(hash,actor,reason)=>host.administration.approve(hash,identityOf(actor),reason),deliver:async(actor,target,payload,taskId)=>{
        await messages.bind(actor).send({receiver_agent_id:target,message_type:actor.agent_type==='BACKGROUND_REVIEWER'?'REVIEW_COMPLETED':'RESULT',payload,dedup_key:'completion.'+taskId});
      }});
    const tasks=scheduler;
    const messages=new MessageBus(state,{
      resolve:(id,project)=>{const agent=state.get<AgentRecord>('AGENT',id);return agent&&agent.subject.project_id===project&&!['STOPPED','FAILED','UNKNOWN_QUARANTINED'].includes(agent.lifecycle)?agent.subject:null;},
      authorize:(sender,receiver)=>{
        if(sender.project_id!==receiver.project_id)return false;
        try{const record=agents.get(sender.agent_id);agents.current(receiver);
          return state.get<ProjectRecord>('PROJECT',sender.project_id)?.state==='ACTIVE'&&record.subject.project_id===sender.project_id&&record.subject.task_id===sender.task_id&&readTask(receiver,sender.task_id);
        }catch{return false;}
      },readTask,onDeliverable:async(receiver)=>{await tasks.wake(token,receiver);},
    });
    await budgets.recover(token,adminSubject);
    await models.recover(token);
    await agents.recover(token);
    await tasks.recover(token);
    await state.change(adminSubject,'HARNESS_BOOTED',()=>{}, {model_configuration_sha256:sha256(canonical({mocks:options.mocks??{},routes:options.routes??{}})),assurance:'SIMULATED_PROVIDER_LOCAL_RUNTIME',production:'BLOCKED'});

    async function createProject(input:{id:string;rules:string[];global_rules?:string[];budget?:ResourceAmounts}):Promise<ProjectRecord>{
      checkAdmin(token);const p=snapshot(input);identifier(p.id);invariant(p.id.length<=96&&p.rules.length>=1&&p.rules.length<=8,'PROJECT_RULES_LIMIT');
      invariant(!state.get('PROJECT',p.id)&&state.count('PROJECT')<32,'PROJECT_REGISTRY_LIMIT');
      const actor:Subject={...adminSubject,project_id:p.id,task_id:'project-rules',policy_scope:p.id};
      state.require('wf.rules.registration',actor);
      const refs=[];for(const rule of p.rules){invariant(typeof rule==='string'&&Buffer.byteLength(rule)>0&&Buffer.byteLength(rule)<=16384,'PROJECT_RULES_LIMIT');refs.push(await context.capture(actor,'RAW',Buffer.from(rule),{maxBytes:16384}));}
      const globalRefs=[];invariant((p.global_rules?.length??0)<=8,'PROJECT_RULES_LIMIT');
      for(const rule of p.global_rules??[]){state.require('wf.rules.global',actor);invariant(typeof rule==='string'&&Buffer.byteLength(rule)>0&&Buffer.byteLength(rule)<=16384,'PROJECT_RULES_LIMIT');globalRefs.push(await context.capture(actor,'RAW',Buffer.from(rule),{maxBytes:16384}));}
      const budgetId='project.'+p.id;await budgets.configure(token,actor,{id:budgetId,scope:'PROJECT',owner_id:p.id,limits:p.budget??DEFAULT_LIMITS});
      const project:ProjectRecord={id:p.id,revision:0,state:'ACTIVE',budget_id:budgetId,rules:refs,global_rules:globalRefs};
      await state.change(actor,'PROJECT_CREATED',()=>{state.require('wf.rules.registration',actor);invariant(state.count('PROJECT')<32,'PROJECT_REGISTRY_LIMIT');state.insert('PROJECT',p.id,actor,project.state,project);});return snapshot(project);
    }
    async function setProjectState(id:string,status:'ACTIVE'|'PAUSED'|'CLOSED'):Promise<void>{
      checkAdmin(token);invariant(['ACTIVE','PAUSED','CLOSED'].includes(status),'PROJECT_STATE');const project=state.get<ProjectRecord>('PROJECT',id);invariant(project,'PROJECT_UNKNOWN');
      invariant(['ACTIVE','PAUSED'].includes(project.state),'PROJECT_STATE_TRANSITION_PENDING');
      if(status!=='ACTIVE'){
        await state.change({...adminSubject,project_id:id},'PROJECT_ADMISSION_CLOSED',()=>{const current=state.get<ProjectRecord>('PROJECT',id)!;invariant(current.state!=='CLOSED','PROJECT_CLOSED');
          const pending=status==='CLOSED'?'CLOSING':'PAUSING';state.update('PROJECT',id,current.revision,pending,{...current,state:pending,revision:current.revision+1});});
        await tasks.quiesce(token,{project_id:id});
      }
      await state.change({...adminSubject,project_id:id},'PROJECT_STATE',()=>{const current=state.get<ProjectRecord>('PROJECT',id)!;invariant(current.state!=='CLOSED','PROJECT_CLOSED');state.update('PROJECT',id,current.revision,status,{...current,state:status,revision:current.revision+1});});
      let after:string|undefined;for(;;){const page=state.list<AgentRecord>('AGENT',{project_id:id,...(after?{after}:{}),limit:32});if(!page.length)break;
        for(const agent of page){
          if(status==='CLOSED'&&!['STOPPED','FAILED','UNKNOWN_QUARANTINED'].includes(agent.lifecycle)){await agents.transition(token,agent.id,'STOPPING','PROJECT_CLOSED');await agents.transition(token,agent.id,'STOPPED');continue;}
          if(agent.subject.agent_type!=='RESIDENT')continue;
          if(status==='PAUSED'&&agent.lifecycle==='READY')await agents.transition(token,agent.id,'WAITING','PROJECT_PAUSED');
          if(status==='ACTIVE'&&agent.lifecycle==='WAITING'){await agents.transition(token,agent.id,'RESUMING');await agents.transition(token,agent.id,'READY');}
        }after=page.at(-1)!.id;
      }
    }
    const administration=Object.freeze({
      createProject,setProjectState,createAgent:(input:AgentInput)=>agents.create(token,input),createTask:(input:TaskInput)=>tasks.create(token,input),
      dispatch:async(id:string)=>{
        const task=tasks.get(id),actor=agents.get(task.subject.agent_id).subject;
        invariant(!sessions.has(actor.agent_id),'TASK_ALREADY_DISPATCHED');
        invariant(['QUEUED','WAITING_RESOURCES'].includes(task.state),'TASK_DISPATCH_STATE');
        const session=host.bindAgent(identityOf(actor));sessions.set(actor.agent_id,session);
        try {
          const inbox=await messages.bind(actor).receive({limit:16});
          for(const message of inbox){await tasks.acceptMessage(token,actor,message.message_id,message.payload);await messages.bind(actor).ack(message.message_id,message.lease_token!);}
          return await tasks.dispatch(token,id);
        }finally{sessions.delete(actor.agent_id);await session.close();}
      },
      resumeTask:(id:string)=>tasks.resume(token,id),cancelTask:(id:string)=>tasks.stop(token,id,'CANCELLED'),pauseTask:(id:string)=>tasks.stop(token,id,'PAUSED'),
      handoffTask:(id:string,targetAgentId:string)=>tasks.handoff(token,id,targetAgentId),tick:()=>tasks.expire(token),
      approveTaskTool:(id:string,reason:string)=>tasks.approveTool(token,id,reason),
      gate:(actorId:string,input:GateInput)=>workflow.gate(token,agents.get(actorId).subject,input),
      checkpoint:(actorId:string,input:CheckpointInput)=>workflow.checkpoint(token,agents.get(actorId).subject,input),
      checklist:(actorId:string,input:ChecklistInput)=>workflow.checklist(token,agents.get(actorId).subject,input),
      captureContext:(actorId:string,text:string)=>{const actor=agents.get(actorId).subject;agents.current(actor);invariant(typeof text==='string'&&Buffer.byteLength(text)<=65536,'TASK_CAPTURE_LIMIT');return context.capture(actor,'RAW',Buffer.from(text),{maxBytes:65536});},
      decision:(actorId:string,value:Parameters<WorkflowRuntime['decision']>[2],status:'PROPOSED'|'ACCEPTED')=>workflow.decision(token,agents.get(actorId).subject,value,status),
      transitionAgent:(id:string,next:Parameters<AgentRuntime['transition']>[2])=>agents.transition(token,id,next),
      features:host.administration,registerTool:host.administration.registerTool,
      registerModelProvider:(input:Parameters<ModelGateway['registerProvider']>[1])=>models.registerProvider(token,input),
      registerModel:(input:ModelDefinition)=>models.registerModel(token,input),registerModelKey:(input:Parameters<ModelGateway['registerKey']>[1])=>models.registerKey(token,input),
      setModelKeyState:(id:string,status:Parameters<ModelGateway['setKeyState']>[2])=>models.setKeyState(token,id,status),
    });
    return Object.freeze({administration,
      bindAgent:(id:string)=>{
        const actor=agents.get(id).subject;agents.current(actor);
        const bound=messages.bind(actor);const live=()=>{invariant(!closed,'HARNESS_CLOSED');agents.current(actor);};
        return Object.freeze({identity:snapshot(actor),status:()=>{live();return agents.get(id);},
          sendText:async(input:{receiver_agent_id:string;message_type:string;text:string;dedup_key:string})=>{
            live();const value=snapshot(input);invariant(Object.keys(value).sort().join(',')==='dedup_key,message_type,receiver_agent_id,text','MESSAGE_SCHEMA');
            invariant(typeof value.text==='string'&&Buffer.byteLength(value.text)<=16384,'MESSAGE_PAYLOAD_LIMIT');
            identifier(value.dedup_key);identifier(value.message_type);identifier(value.receiver_agent_id);
            const receiver=state.get<AgentRecord>('AGENT',value.receiver_agent_id);invariant(receiver&&receiver.subject.project_id===actor.project_id,'MESSAGE_PROJECT_DENIED');
            agents.current(receiver.subject);invariant(readTask(receiver.subject,actor.task_id),'MESSAGE_PERMISSION_DENIED');
            const draftId=sha256(canonical({agent_id:actor.agent_id,project_id:actor.project_id,task_id:actor.task_id,dedup_key:value.dedup_key}));
            const inputHash=sha256(canonical(value));
            type Draft={revision:number;input_hash:string;owner:string;source:Parameters<ContextAssembly['validate']>[1]|null};const owner=uid();
            const draft=await state.change(actor,'MESSAGE_TEXT_ADMITTED',()=>{
              const old=state.get<Draft>('MESSAGE_TEXT',draftId);if(old){invariant(old.input_hash===inputHash,'MESSAGE_DEDUP_CONFLICT');invariant(old.source,'MESSAGE_CAPTURE_INFLIGHT');return old;}
              invariant(state.count('MESSAGE_TEXT')<4096,'MESSAGE_CAPACITY');const record:Draft={revision:0,input_hash:inputHash,owner,source:null};state.insert('MESSAGE_TEXT',draftId,actor,'RESERVING',record);return record;
            });
            let source=draft.source;
            if(!source){const captured=await context.capture(actor,'RAW',Buffer.from(value.text),{maxBytes:16384});
              source=await state.change(actor,'MESSAGE_TEXT_CAPTURED',()=>{const current=state.get<Draft>('MESSAGE_TEXT',draftId)!;invariant(current.owner===owner&&!current.source,'MESSAGE_CAPTURE_CONFLICT');
                state.update('MESSAGE_TEXT',draftId,current.revision,'CAPTURED',{...current,revision:current.revision+1,source:captured});return captured;});}
            return bound.send({receiver_agent_id:value.receiver_agent_id,message_type:value.message_type,payload:source,dedup_key:value.dedup_key});
          },receive:bound.receive,ack:bound.ack,retry:bound.retry,revoke:bound.revoke,
          source:(eventId:string)=>{live();return context.source(actor,eventId);},readContext:(source:Parameters<ContextAssembly['readRange']>[1])=>{live();return context.readRange(actor,source);},
        });
      },
      inspectAgent:(id:string)=>agents.get(id),inspectTask:(id:string)=>tasks.get(id),
      qualification:Object.freeze({runtime:'LOCAL_TRUSTED_LIBRARY',provider:'SIMULATED',windows_production:'BLOCKED',strict_cpu:'BLOCKED',ubuntu:'NOT_RUN'}),
      // Trusted test/administration inspection, never passed to any Agent or model.
      store:host.store,state,budgets,models,workflow,
      close:async()=>{if(closed)return;await tasks.close();closed=true;await host.close();},
    });
  }catch(error){await host.close().catch(()=>{});throw error;}
}
