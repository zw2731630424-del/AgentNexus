import { canonical, invariant, NexusError, sha256 } from '../types.ts';
import { identifier, snapshot, subject as validateSubject } from '../harness/contracts.ts';
import type { Subject } from '../harness/contracts.ts';
import { assertContextView, ContextAssembly } from '../harness/context.ts';
import type { AssembledContext, ContextSource } from '../harness/context.ts';
import type { NativeState } from '../harness/state.ts';
import type { ModelResult, ModelUsage } from '../harness/models.ts';
import { ModelRouter, natural, priceCost, STRUCTURED_REPLY_INSTRUCTION } from './protocol.ts';
import type { DataGuard, ProviderAdapter, ToolSpec, Transport,Escalation,Assurance,ProviderUsage,Price } from './protocol.ts';
import { ProviderFault, ProviderParseFault } from './adapters.ts';
import type { DataEgressPolicy, EgressReceipt, EgressInput } from './egress.ts';
import type { CampaignTokenLedger } from './campaign.ts';
import { responseEvidence } from './response-evidence.ts';
import type { CredentialVault,VaultAdminCapability } from './vault.ts';
import type { ModelUsageLedger } from './ledger.ts';

type RuntimeRequest={revision:number;request_id:string;owner:Subject;input_hash:string;context_view_id:string;state:string;result:ModelResult|null;key_handle_id:string|null;provider_id:string;model_id:string;assurance:Assurance};
export type RuntimeOptions={vault:CredentialVault;vaultAdmin:VaultAdminCapability;ledger:ModelUsageLedger;router:ModelRouter;adapters:ProviderAdapter[];transport:Transport;guard:DataGuard;
  authorizeSubject:(s:Subject)=>void;tools?:ToolSpec[];maxConcurrent?:number;egress?:DataEgressPolicy;campaign?:CampaignTokenLedger};
export interface RuntimeModelPort {handles(s:Subject):boolean;bind(s:Subject):{complete(input:{request_id:string;context:AssembledContext;max_output_tokens:number},signal?:AbortSignal):Promise<ModelResult>};recover(admin:unknown):Promise<void>}
function interruptible<T>(pending:Promise<T>,signal:AbortSignal):Promise<T>{return new Promise((resolve,reject)=>{
  const abort=()=>{cleanup();reject(new NexusError('MODEL18_CANCELLED'));};const cleanup=()=>signal.removeEventListener('abort',abort);
  signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();void pending.catch(()=>{});return;}
  pending.then(v=>{cleanup();resolve(v);},()=>{cleanup();reject(new NexusError('MODEL18_TRANSPORT_FAILURE'));});
});}

/** Trusted Host service. bind() exposes only a scoped completion capability; no Vault/admin/Transport. */
export class UnifiedModelGateway implements RuntimeModelPort {
  #state:NativeState;#admin:unknown;#options:RuntimeOptions;#context:ContextAssembly;#active=new Set<string>();#adapters=new Map<string,ProviderAdapter>();
  constructor(state:NativeState,admin:unknown,options:RuntimeOptions){state.checkAdmin(admin);this.#state=state;this.#admin=admin;this.#options={...options,tools:snapshot(options.tools??[],32768)};
    invariant(options.guard&&typeof options.guard.assertSafe==='function'&&typeof options.authorizeSubject==='function','MODEL18_HOST_BOUNDARY');
    invariant(state.store.enforcesContentGuard(options.guard)&&options.guard===options.vault.guard,'MODEL18_STORAGE_GUARD_REQUIRED');
    invariant(options.transport.assurance!=='REAL'||typeof options.transport.preflight==='function','MODEL18_AUTHORIZATION_REQUIRED');
    invariant(options.transport.assurance!=='REAL'||(options.egress&&options.campaign?.assurance==='REAL'),'MODEL181_LIVE_GATES_REQUIRED');
    invariant(options.vault.assurance===options.transport.assurance,'MODEL18_CREDENTIAL_ASSURANCE');
    natural(options.maxConcurrent??4,16);invariant((options.maxConcurrent??4)>0,'MODEL18_CONCURRENCY');
    for(const adapter of options.adapters){invariant(!this.#adapters.has(adapter.provider_id),'MODEL18_DUPLICATE_PROVIDER');this.#adapters.set(adapter.provider_id,adapter);}
    this.#context=new ContextAssembly(state,{readTask:(actor,id)=>{const a=state.get<{subject:Subject;read_tasks:string[]}>('AGENT',actor.agent_id);return id==='project-rules'||!!a&&canonical(a.subject)===canonical(actor)&&a.read_tasks.includes(id);}});
  }
  handles(s:Subject):boolean{return this.#options.router.handles(s);}
  /** A Host accepts a reasoned upgrade proposal; two upgrades per task, with all budgets checked on actual dispatch. */
  async requestEscalation(admin:unknown,s:Subject,input:Escalation):Promise<void>{
    this.#state.checkAdmin(admin);this.#options.authorizeSubject(s);const e=snapshot(input);invariant(Object.keys(e).sort().join(',')==='from,max_extra_cost_micros,reason,to'&&['CONTEXT_LIMIT','CAPABILITY_REQUIRED','QUALITY_INSUFFICIENT'].includes(e.reason),'MODEL18_ESCALATION_REASON');natural(e.max_extra_cost_micros);
    const id=sha256(canonical({project_id:s.project_id,task_id:s.task_id}));await this.#state.change(s,'MODEL18_ESCALATION_ACCEPTED',()=>{const old=this.#state.get<{revision:number;count:number;owner:Subject;escalation:Escalation}>('MODEL18_ESCALATION',id);
      invariant(!old||canonical(old.owner)===canonical(s),'MODEL18_ESCALATION_SCOPE');invariant((old?.count??0)<2,'MODEL18_ESCALATION_LIMIT');
      const record={revision:old?old.revision+1:0,count:(old?.count??0)+1,owner:s,escalation:e};if(old)this.#state.update('MODEL18_ESCALATION',id,old.revision,'ACCEPTED',record);else this.#state.insert('MODEL18_ESCALATION',id,s,'ACCEPTED',record);
    },{from:e.from,to:e.to,reason:e.reason,max_extra_cost_micros:e.max_extra_cost_micros});
  }
  bind(candidate:Subject){validateSubject(candidate);const s=snapshot(candidate);return Object.freeze({complete:(input:{request_id:string;context:AssembledContext;max_output_tokens:number},signal?:AbortSignal)=>this.#complete(s,input,signal)});}
  #fence(s:Subject,signal?:AbortSignal){invariant(!signal?.aborted,'MODEL18_CANCELLED_BEFORE_SEND');this.#options.authorizeSubject(s);this.#state.require('model.gateway',s);}
  async recover(admin:unknown):Promise<void>{this.#state.checkAdmin(admin);await this.#options.ledger.recover(this.#admin);
    await this.#options.campaign?.recover(this.#admin);
    for(const r of this.#requests())if(!['SUCCEEDED','FAILED','INDETERMINATE'].includes(r.state)){
      const result=this.#result(r,'INDETERMINATE','MODEL18_HOST_RESTART',null,null,null);
      await this.#finish(r.owner,r.request_id,result,false);
    }
  }
  *#requests(){let after:string|undefined;for(;;){const page=this.#state.list<RuntimeRequest>('MODEL18_REQUEST',{...(after?{after}:{}),limit:100});yield* page;if(page.length<100)break;after=page.at(-1)!.request_id;}}
  #get(id:string){const r=this.#state.get<RuntimeRequest>('MODEL18_REQUEST',id);invariant(r,'MODEL18_REQUEST_UNKNOWN');return r;}
  #result(r:RuntimeRequest,outcome:ModelResult['outcome'],reason:string,reply:ModelResult['reply'],usage:ModelUsage|null,response:ContextSource|null):ModelResult{
    invariant(r.assurance==='REAL'||r.assurance==='SIMULATED','MODEL18_ASSURANCE_MIGRATION_REQUIRED');
    return {status:r.assurance,assurance:r.assurance,outcome,request_id:r.request_id,provider_id:r.provider_id,model_id:r.model_id,reply,usage,reason,response_source:response};
  }
  async #finish(s:Subject,id:string,result:ModelResult,check=true):Promise<ModelResult>{
    if(check)this.#options.guard.assertSafe(canonical(result),'MODEL_RESULT');
    await this.#state.change(s,'MODEL18_RESULT',()=>{const old=this.#get(id);this.#state.update('MODEL18_REQUEST',id,old.revision,result.outcome,{...old,state:result.outcome,result,revision:old.revision+1});},
      {request_id:id,outcome:result.outcome,assurance:result.assurance,reason:result.reason},id);return snapshot(result);
  }
  async #complete(s:Subject,input:{request_id:string;context:AssembledContext;max_output_tokens:number},signal?:AbortSignal):Promise<ModelResult>{
    invariant(signal===undefined||signal instanceof AbortSignal,'MODEL18_SIGNAL');this.#fence(s,signal);
    invariant(Object.keys(input).sort().join(',')==='context,max_output_tokens,request_id','MODEL18_REQUEST_SCHEMA');identifier(input.request_id);natural(input.max_output_tokens,4096);invariant(input.max_output_tokens>0,'MODEL18_OUTPUT_LIMIT');
    const outputLimit=input.max_output_tokens,context=assertContextView(this.#state,s,input.context);this.#options.guard.assertSafe(context.text,'MODEL_PROMPT');
    const fingerprint=sha256(canonical({owner:s,context_view_id:context.view_id,context_hash:context.sha256,max_output_tokens:input.max_output_tokens})),id=input.request_id;
    const old=this.#state.get<RuntimeRequest>('MODEL18_REQUEST',id);
    if(old){invariant(old.input_hash===fingerprint&&canonical(old.owner)===canonical(s),'MODEL18_REQUEST_CONFLICT');invariant(old.result,'MODEL18_REQUEST_INFLIGHT');
      const ack=this.#state.store.db.prepare("SELECT 1 FROM anx_records r JOIN anx_exports e USING(seq) WHERE operation_id=? AND json_extract(body,'$.phase')='MODEL18_RESULT'").get(id);invariant(ack,'MODEL18_RESULT_UNACKNOWLEDGED');return old.result;}
    // UNKNOWN transport/stream closure keeps a durable slot, including after Host reopen.
    const unresolved=this.#state.count('MODEL18_REQUEST',{state:'INDETERMINATE'});
    invariant(!this.#active.has(id)&&this.#active.size+unresolved<(this.#options.maxConcurrent??4),'MODEL18_BACKPRESSURE');this.#active.add(id);
    let created=false,reserved=false,sent=false,campaignReserved=false,campaignSent=false,campaignObserved=false,lease:string|null=null,knownUsage:ModelUsage|null=null,observedUsage:ModelUsage|null=null;
    const parseObservation={usage:null as ProviderUsage|null};let selectedPrice:Price|null=null,wire:ReturnType<typeof responseEvidence>|undefined;
    let faultCategory:ProviderFault['category']|null=null;let abort:AbortController|undefined,timer:ReturnType<typeof setTimeout>|undefined;
    const forward=()=>abort?.abort();const start=Date.now();
    try{
      const restored=await this.#context.reconstruct(s,context.view_id,{signal});this.#options.guard.assertSafe(restored.bytes,'MODEL_PROMPT');this.#fence(s,signal);
      // Conservative UTF-8 byte upper bound plus wire framing/tool schema headroom; never bytes/4 as verified Provider usage.
      const inputLimit=context.bytes+Buffer.byteLength(STRUCTURED_REPLY_INSTRUCTION)+Buffer.byteLength(canonical(this.#options.tools))+4096;
      const upgrade=this.#state.get<{owner:Subject;escalation:Escalation}>('MODEL18_ESCALATION',sha256(canonical({project_id:s.project_id,task_id:s.task_id})));
      if(upgrade)invariant(upgrade.owner.project_id===s.project_id&&upgrade.owner.task_id===s.task_id&&upgrade.owner.agent_id===s.agent_id,'MODEL18_ESCALATION_SCOPE');
      const candidates=this.#options.router.select(s,{input_tokens:inputLimit,output_tokens:outputLimit,required:this.#options.tools!.length?['streaming','json','tools']:['streaming','json'],assurance:this.#options.transport.assurance,...(upgrade?{escalation:upgrade.escalation}:{})});
      const m=candidates[0],adapter=this.#adapters.get(m.provider_id);invariant(adapter,'MODEL18_ADAPTER_MISSING');
      selectedPrice=m.price;
      await this.#state.change(s,'MODEL18_PREPARED',()=>{invariant(!this.#state.get('MODEL18_REQUEST',id)&&!this.#state.get('MODEL_REQUEST',id),'MODEL18_REQUEST_CONFLICT');invariant(this.#state.count('MODEL18_REQUEST')<4096,'MODEL18_REQUEST_LIMIT');
        const rateId=sha256(m.provider_id+':'+m.model_id),rate=this.#state.get<{revision:number;minute:number;requests:number}>('MODEL18_RATE',rateId),minute=Math.floor(Date.now()/60000),requests=rate?.minute===minute?rate.requests+1:1;
        invariant(requests<=m.requests_per_minute,'MODEL18_PROVIDER_RATE_LIMIT');const next={revision:rate?rate.revision+1:0,minute,requests};if(rate)this.#state.update('MODEL18_RATE',rateId,rate.revision,'COUNTED',next);else this.#state.insert('MODEL18_RATE',rateId,s,'COUNTED',next);
        this.#state.insert('MODEL18_REQUEST',id,s,'RESERVING',{revision:0,request_id:id,owner:s,input_hash:fingerprint,context_view_id:context.view_id,state:'RESERVING',result:null,key_handle_id:null,provider_id:m.provider_id,model_id:m.model_id,assurance:this.#options.transport.assurance});},
        {request_id:id,context_hash:context.sha256,context_input_ref:restored.context.input_ref??null,provenance_sha256:restored.context.provenance_sha256??null,assurance:this.#options.transport.assurance},id);created=true;
      const cost=priceCost(m.price,inputLimit,outputLimit);
      const envelope=adapter.build({request_id:id,model:m,prompt:restored.context.text,max_output_tokens:outputLimit,stream:true,json:true,reasoning:'disabled',tools:this.#options.tools??[]});
      invariant(Buffer.byteLength(envelope.body)<=inputLimit*4,'MODEL18_WIRE_LIMIT');this.#options.guard.assertSafe(envelope.body,'PROVIDER_REQUEST');this.#fence(s,signal);
      const egressInput:EgressInput={subject:s,context:restored.context,request:envelope,model:m};
      const egressReceipt:EgressReceipt|undefined=await this.#options.egress?.admit(this.#admin,egressInput);this.#fence(s,signal);
      if(this.#options.campaign){invariant(this.#options.campaign.assurance===this.#options.transport.assurance,'MODEL181_CAMPAIGN_ASSURANCE');await this.#options.campaign.reserve(this.#admin,s,{request_id:id,provider_id:m.provider_id,input_tokens:inputLimit,output_tokens:outputLimit,body_hash:sha256(envelope.body)});campaignReserved=true;}
      await this.#options.ledger.reserve(this.#admin,s,{request_id:id,input_tokens:inputLimit,output_tokens:outputLimit,cost_micros:cost,assurance:this.#options.transport.assurance,context_hash:context.sha256,provider_id:m.provider_id,model_id:m.model_id});reserved=true;this.#fence(s,signal);
      await this.#options.transport.preflight?.({subject:s,request:envelope,input_tokens:inputLimit,output_tokens:outputLimit,estimated_cost_micros:cost,context_hash:context.sha256,model:m,...(egressReceipt?{egress:egressReceipt}:{})});this.#fence(s,signal);
      const selected=await this.#options.vault.acquire(this.#options.vaultAdmin,{provider_id:m.provider_id,model_id:m.model_id,request_id:id,estimated_cost_micros:cost,subject_key:canonical(s)});lease=selected.lease_id;
      await this.#context.capture(s,'RAW',Buffer.from(canonical({kind:'MODEL18_REQUEST',request_id:id,provider_id:m.provider_id,model_id:m.model_id,endpoint:adapter.endpoint,context_view_id:context.view_id,context_hash:context.sha256,request_body_sha256:sha256(envelope.body),egress:egressReceipt??null,request:JSON.parse(envelope.body),price:m.price,assurance:this.#options.transport.assurance})),{operation_id:id,maxBytes:1024*1024});this.#fence(s,signal);
      if(this.#options.campaign){await this.#options.campaign.markSent(this.#admin,s,id);campaignSent=true;}
      sent=true; // Conservative durable send-intent window: never release this hold automatically after a crash.
      await this.#options.ledger.markSent(this.#admin,s,id,{key_handle_id:selected.key_handle_id});
      await this.#state.change(s,'MODEL18_SEND_INTENT',()=>{const r=this.#get(id);this.#state.update('MODEL18_REQUEST',id,r.revision,'SENT',{...r,state:'SENT',key_handle_id:selected.key_handle_id,revision:r.revision+1});},{request_id:id,provider_id:m.provider_id,model_id:m.model_id,key_handle_id:selected.key_handle_id,assurance:this.#options.transport.assurance},id);
      this.#fence(s,signal);abort=new AbortController();signal?.addEventListener('abort',forward,{once:true});if(signal?.aborted)abort.abort();timer=setTimeout(()=>abort!.abort(),adapter.timeout_ms);
      sent=true;
      const response=await this.#options.vault.withCredential(this.#options.vaultAdmin,lease,async authorization=>{
        this.#fence(s,abort!.signal);
        if(egressReceipt)this.#options.egress!.fence(this.#admin,egressInput,egressReceipt);
        const received=await interruptible(this.#options.transport.send(envelope,authorization,abort!.signal),abort!.signal);
        wire=responseEvidence(received.body);
        // Local binding overwrites remote text; no remote-selected request/tool scope.
        try{return await adapter.parse({...received,body:wire.body,headers:{...received.headers,'x-agentnexus-local-request-id':id}},abort!.signal,this.#options.guard);}
        catch(error){if(error instanceof ProviderFault)faultCategory=error.category;if(error instanceof ProviderParseFault)parseObservation.usage=error.observed_usage;throw error;}
      },canonical(s));
      this.#options.guard.assertSafe(canonical(response),'MODEL_RESPONSE');
      const meter=response.usage;
      if(this.#options.campaign){await this.#options.campaign.observe(this.#admin,s,id,meter,meter?priceCost(m.price,meter.input_tokens,meter.output_tokens):0,!!meter);campaignObserved=true;}
      if(!meter){await this.#options.ledger.unknown(this.#admin,s,id,'USAGE_UNAVAILABLE');await this.#options.vault.settle(this.#options.vaultAdmin,lease,{outcome:'UNKNOWN',cost_micros:0,usage_source:this.#options.transport.assurance==='SIMULATED'?'SIMULATED':'PROVIDER'},canonical(s));return this.#finish(s,id,this.#result(this.#get(id),'INDETERMINATE','MODEL18_USAGE_UNAVAILABLE',null,null,null));}
      const actualCost=priceCost(m.price,meter.input_tokens,meter.output_tokens);
      observedUsage={request_id:id,...meter,cost_micros:actualCost,concurrency:0,assurance:this.#options.transport.assurance};
      await this.#options.ledger.settle(this.#admin,s,id,{...meter,cost_micros:actualCost,cost_source:this.#options.transport.assurance==='SIMULATED'?'SYNTHETIC':'RATE_ESTIMATE',usage_source:this.#options.transport.assurance==='SIMULATED'?'SIMULATED':'PROVIDER',elapsed_ms:Date.now()-start,provider_request_id:response.provider_request_id,retries:0});
      invariant(this.#options.ledger.inspect(this.#admin,id).state==='SETTLED','MODEL18_USAGE_OVER_BUDGET');
      knownUsage={request_id:id,...meter,cost_micros:actualCost,concurrency:0,assurance:this.#options.transport.assurance};
      await this.#options.vault.settle(this.#options.vaultAdmin,lease,{outcome:'SUCCESS',cost_micros:actualCost,usage_source:this.#options.transport.assurance==='SIMULATED'?'SIMULATED':'PROVIDER'},canonical(s));lease=null;
      const usage:ModelUsage={request_id:id,...meter,cost_micros:actualCost,concurrency:0,assurance:this.#options.transport.assurance};
      const source=await this.#context.capture(s,'RAW',Buffer.from(canonical({kind:'MODEL18_RESPONSE',request_id:id,provider_request_id:response.provider_request_id,response_model:response.response_model??null,system_fingerprint:response.system_fingerprint??null,reply:response.reply,usage,usage_source:this.#options.transport.assurance==='SIMULATED'?'SIMULATED':'PROVIDER',cost_source:this.#options.transport.assurance==='SIMULATED'?'SYNTHETIC':'PEAK_UPPER_BOUND_ESTIMATE',actual_invoice_cost_micros:null,price:m.price,wire:wire?.inspect()??null,reasoning_deltas_archived:false})),{operation_id:id,maxBytes:32768});
      return this.#finish(s,id,this.#result(this.#get(id),'SUCCEEDED','MODEL18_COMPLETE',response.reply,usage,source));
    }catch(error){
      if(!created)throw error instanceof NexusError?error:new NexusError('MODEL18_REJECTED');
      if(sent||campaignSent){
        const category=faultCategory;
        const parseUsage=parseObservation.usage;
        if(campaignSent&&!campaignObserved&&this.#options.campaign){await this.#options.campaign.observe(this.#admin,s,id,parseUsage,parseUsage&&selectedPrice?priceCost(selectedPrice,parseUsage.input_tokens,parseUsage.output_tokens):0,false);campaignObserved=true;}
        if(parseUsage&&!knownUsage&&reserved){const r=this.#options.ledger.inspect(this.#admin,id);if(r.state==='SENT'&&!r.usage){
          const usage={...parseUsage,cost_micros:selectedPrice?priceCost(selectedPrice,parseUsage.input_tokens,parseUsage.output_tokens):r.reserved.cost_micros,response_complete:false,cost_source:this.#options.transport.assurance==='SIMULATED'?'SYNTHETIC' as const:'RATE_ESTIMATE' as const,usage_source:this.#options.transport.assurance==='SIMULATED'?'SIMULATED' as const:'PROVIDER' as const,elapsed_ms:Date.now()-start,provider_request_id:null,retries:0};
          await this.#options.ledger.settle(this.#admin,s,id,usage);observedUsage={request_id:id,...parseUsage,cost_micros:usage.cost_micros,concurrency:0,assurance:this.#options.transport.assurance};knownUsage=observedUsage;
        }}
        // Known 401/429 changes pool health for the next request; this request is never automatically re-sent.
        if(lease)try{this.#options.vault.settle(this.#options.vaultAdmin,lease,{outcome:category==='AUTH'?'AUTH':category==='RATE_LIMIT'?'RATE_LIMIT':'UNKNOWN',cost_micros:observedUsage?.cost_micros??0,usage_source:this.#options.transport.assurance==='SIMULATED'?'SIMULATED':'PROVIDER'},canonical(s));}catch{/* retain the original unresolved lease */}
        if(!knownUsage)await this.#options.ledger.unknown(this.#admin,s,id,category==='AUTH'?'AUTH_REJECTED':category==='RATE_LIMIT'?'RATE_LIMIT_REJECTED':'TRANSPORT_UNKNOWN');
        return this.#finish(s,id,this.#result(this.#get(id),'INDETERMINATE',category?'MODEL18_'+category:'MODEL18_SENT_OUTCOME_UNKNOWN',null,knownUsage,null),false);
      }
      if(lease)await this.#options.vault.settle(this.#options.vaultAdmin,lease,{outcome:'NOT_SENT',cost_micros:0,usage_source:this.#options.transport.assurance==='SIMULATED'?'SIMULATED':'PROVIDER'},canonical(s));
      if(reserved)await this.#options.ledger.notSent(this.#admin,s,id,'KNOWN_NOT_SENT');
      if(campaignReserved)await this.#options.campaign!.notSent(this.#admin,s,id);
      return this.#finish(s,id,this.#result(this.#get(id),'FAILED','MODEL18_NOT_SENT',null,null,null),false);
    }finally{clearTimeout(timer);abort?.abort();signal?.removeEventListener('abort',forward);this.#options.transport.abandon?.(id);this.#active.delete(id);for(const a of this.#adapters.values())if('abandon' in a)(a as ProviderAdapter&{abandon(id:string):void}).abandon(id);
      if(created&&wire)await this.#state.change(s,'MODEL181_WIRE_EVIDENCE',()=>{}, {request_id:id,...wire.inspect(),result_state:this.#get(id).state},id);
    }
  }
}
