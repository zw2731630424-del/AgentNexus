import { boundedJson, canonical, invariant, NexusError, sha256 } from '../types.ts';
import type { Json } from '../types.ts';
import { identifier, snapshot, subject as validateSubject } from './contracts.ts';
import type { AgentType, Subject } from './contracts.ts';
import { assertContextView, ContextAssembly } from './context.ts';
import type { AssembledContext, ContextSource } from './context.ts';
import type { NativeState } from './state.ts';

export type ModelDemand = { request_id: string; input_tokens: number; output_tokens: number; estimated_cost_micros: number; concurrency: 1; assurance: 'SIMULATED' };
export type ModelUsage = { request_id: string; input_tokens: number; output_tokens: number; cost_micros: number; concurrency: 0; assurance: 'SIMULATED' };
export type ModelBudget = {
  reserve: (subject: Subject, demand: ModelDemand) => Promise<string>;
  settle: (subject: Subject, reservationId: string, usage: ModelUsage) => Promise<void>;
  retain: (subject: Subject, reservationId: string, reason: string) => Promise<void>;
};
export type ModelReply = { kind: 'FINAL' | 'TOOL_CALL' | 'WAIT' | 'HANDOFF'; text?: string; tool_name?: string; tool_version?: string; resource_id?: string; arguments?: Json; target_agent_id?: string };
export type MockStep = { reply?: ModelReply; failure?: 'KNOWN_NOT_SENT' | 'UNKNOWN' | 'AUTH'; input_tokens?: number; output_tokens?: number; cost_micros?: number };
export type ModelResult = {
  status: 'SIMULATED'; assurance: 'SIMULATED'; outcome: 'SUCCEEDED' | 'FAILED' | 'INDETERMINATE'; request_id: string;
  provider_id: string | null; model_id: string | null; reply: ModelReply | null; usage: ModelUsage | null;
  reason: string; response_source: ContextSource | null;
};
export type ModelGatewayOptions = {
  budget: ModelBudget; routes: Record<string, Partial<Record<AgentType, string[]>>>; mocks: Record<string, MockStep[]>;
};
type Provider = { revision: number; provider_id: string; kind: 'MOCK'; state: 'ACTIVE' | 'DISABLED' };
export type ModelDefinition = { model_id: string; provider_id: string; max_input_tokens: number; max_output_tokens: number; input_cost_micros_per_token: number; output_cost_micros_per_token: number };
type Model = ModelDefinition & { revision: number; state: 'ACTIVE'; sequence: number; key_cursor: number };
export type ModelKeyDefinition = { key_id: string; provider_id: string; credential_handle: string; maxConcurrency: number };
type Key = ModelKeyDefinition & { revision: number; state: 'ACTIVE' | 'INVALID' | 'RETIRED'; requests: string[] };
type RequestState = 'RESERVING' | 'RESERVED' | 'SENT' | 'SUCCEEDED' | 'FAILED' | 'INDETERMINATE';
type Request = {
  revision: number; request_id: string; owner: Subject; input_hash: string; state: RequestState;
  reservation_id: string | null; model_id: string | null; provider_id: string | null; key_id: string | null;
  attempts: number; result: ModelResult | null; context_view_id: string; demand: ModelDemand;
};
const TERMINAL: RequestState[] = ['SUCCEEDED','FAILED','INDETERMINATE'];
const MAX_REQUESTS = 4096;
const SAFE_FAILURES = new Set(['MODEL_KEY_CONCURRENCY','MODEL_REAL_PROVIDER_BLOCKED','MODEL_REQUEST_CONFLICT','MODEL_REQUEST_INFLIGHT',
  'MODEL_BACKPRESSURE','MODEL_CONTEXT_LIMIT','MODEL_CANCELLED_NOT_SENT','BACKPRESSURE','STORE_FAULTED','STORE_CLOSED','NATIVE_REVISION_CONFLICT']);
function integer(value: unknown, max: number, code = 'MODEL_LIMIT'): asserts value is number { invariant(Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= max, code); }

/** Only immutable fixture data is accepted. There is deliberately no HTTP, SDK, environment, or adapter entry point. */
export class ModelGateway {
  #state: NativeState; #options: ModelGatewayOptions; #context: ContextAssembly;
  constructor(state: NativeState, options: ModelGatewayOptions) {
    invariant(Object.keys(options).sort().join(',') === 'budget,mocks,routes' && options.budget &&
      ['reserve','settle','retain'].every(k => typeof options.budget[k as keyof ModelBudget] === 'function'), 'MODEL_BUDGET_REQUIRED');
    const configuration = snapshot({ routes: options.routes, mocks: options.mocks }, 512 * 1024);
    for (const [profile, routes] of Object.entries(configuration.routes)) {
      identifier(profile); invariant(Object.keys(routes).every(k => ['RESIDENT','DEVELOPMENT','SUBAGENT','BACKGROUND_REVIEWER','COORDINATOR'].includes(k)), 'MODEL_ROUTE');
      for (const route of Object.values(routes)) { invariant(Array.isArray(route) && route.length >= 1 && route.length <= 8 && new Set(route).size === route.length, 'MODEL_ROUTE'); route.forEach(identifier); }
    }
    for (const [model, steps] of Object.entries(configuration.mocks)) {
      identifier(model); invariant(Array.isArray(steps) && steps.length <= 128, 'MODEL_MOCK_LIMIT');
      for (const step of steps) {
        invariant(Object.keys(step).every(k => ['reply','failure','input_tokens','output_tokens','cost_micros'].includes(k)) &&
          (step.reply !== undefined) !== (step.failure !== undefined), 'MODEL_MOCK_SCHEMA');
        if (step.failure !== undefined) invariant(['KNOWN_NOT_SENT','UNKNOWN','AUTH'].includes(step.failure), 'MODEL_MOCK_SCHEMA');
        if (step.reply) this.#reply(step.reply);
        if (step.input_tokens !== undefined) integer(step.input_tokens,65536);
        if (step.output_tokens !== undefined) integer(step.output_tokens,4096);
        if (step.cost_micros !== undefined) integer(step.cost_micros,Number.MAX_SAFE_INTEGER);
      }
    }
    this.#state = state; this.#options = { ...configuration, budget: Object.freeze({ reserve: options.budget.reserve.bind(options.budget),
      settle: options.budget.settle.bind(options.budget),retain: options.budget.retain.bind(options.budget) }) }; this.#context = new ContextAssembly(state);
  }
  #reply(input: ModelReply): ModelReply {
    const reply = snapshot(input, 20000);
    invariant(Object.keys(reply).every(k => ['kind','text','tool_name','tool_version','resource_id','arguments','target_agent_id'].includes(k)) && ['FINAL','TOOL_CALL','WAIT','HANDOFF'].includes(reply.kind), 'MODEL_REPLY_SCHEMA');
    invariant(reply.text === undefined || (typeof reply.text === 'string' && Buffer.byteLength(reply.text) <= 16384), 'MODEL_REPLY_LIMIT');
    if (reply.kind === 'TOOL_CALL') {
      invariant(Object.hasOwn(reply,'arguments'), 'MODEL_TOOL_ARGUMENTS'); boundedJson(reply.arguments,16384);
      if (reply.tool_name !== undefined) identifier(reply.tool_name);
      if (reply.tool_version !== undefined) identifier(reply.tool_version);
      if (reply.resource_id !== undefined) invariant(typeof reply.resource_id === 'string' && /^[A-Za-z0-9_.:-]{1,256}$/.test(reply.resource_id), 'MODEL_RESOURCE');
      return snapshot({ ...reply, tool_name: reply.tool_name ?? 'native.echo', tool_version: reply.tool_version ?? '1' });
    }
    invariant(reply.arguments === undefined && reply.tool_name === undefined && reply.tool_version === undefined && reply.resource_id === undefined, 'MODEL_REPLY_SCHEMA');
    if (reply.target_agent_id !== undefined) identifier(reply.target_agent_id); return reply;
  }
  async registerProvider(admin: unknown, input: { provider_id: string; kind: 'MOCK' }): Promise<void> {
    this.#state.checkAdmin(admin); const value = snapshot(input); identifier(value.provider_id);
    invariant(Object.keys(value).sort().join(',') === 'kind,provider_id' && value.kind === 'MOCK', 'MODEL_REAL_PROVIDER_BLOCKED');
    await this.#state.change(this.#adminSubject(), 'MODEL_PROVIDER_REGISTERED', () => {
      invariant(this.#state.count('MODEL_PROVIDER') < 16, 'MODEL_POOL_LIMIT');
      this.#state.insert('MODEL_PROVIDER', value.provider_id, this.#adminSubject(), 'ACTIVE', { ...value, state: 'ACTIVE', revision: 0 });
    }, { provider_id: value.provider_id, assurance: 'SIMULATED' });
  }
  async registerModel(admin: unknown, input: ModelDefinition): Promise<void> {
    this.#state.checkAdmin(admin); const value = snapshot(input); identifier(value.model_id); identifier(value.provider_id);
    invariant(Object.keys(value).sort().join(',') === 'input_cost_micros_per_token,max_input_tokens,max_output_tokens,model_id,output_cost_micros_per_token,provider_id', 'MODEL_SCHEMA');
    integer(value.max_input_tokens,65536); integer(value.max_output_tokens,4096); invariant(value.max_input_tokens > 0 && value.max_output_tokens > 0, 'MODEL_LIMIT');
    integer(value.input_cost_micros_per_token,1000000); integer(value.output_cost_micros_per_token,1000000);
    await this.#state.change(this.#adminSubject(), 'MODEL_REGISTERED', () => {
      invariant(this.#state.get<Provider>('MODEL_PROVIDER', value.provider_id)?.kind === 'MOCK', 'MODEL_PROVIDER_UNKNOWN');
      invariant(this.#state.count('MODEL_MODEL') < 64, 'MODEL_POOL_LIMIT');
      this.#state.insert('MODEL_MODEL', value.model_id, this.#adminSubject(), 'ACTIVE', { ...value, state: 'ACTIVE', sequence: 0, key_cursor: 0, revision: 0 });
    }, { model_id: value.model_id, provider_id: value.provider_id, assurance: 'SIMULATED' });
  }
  #adminSubject(): Subject {
    return { agent_id: 'host-admin', project_id: 'host', task_id: 'administration', session_id: 'host-control', runtime_instance_id: this.#state.boot_id,
      agent_type: 'COORDINATOR', model_binding: 'mock', resource_budget_id: 'platform', policy_scope: 'host' };
  }
  #key(value: ModelKeyDefinition): void {
    identifier(value.key_id); identifier(value.provider_id);
    invariant(Object.keys(value).sort().join(',') === 'credential_handle,key_id,maxConcurrency,provider_id', 'MODEL_KEY_SCHEMA');
    // The mock credential boundary accepts only provider-bound opaque handles, never secret material.
    invariant(typeof value.credential_handle === 'string' && value.credential_handle.startsWith('vault:mock:' + value.provider_id + ':') &&
      /^[A-Za-z0-9_.:-]{1,256}$/.test(value.credential_handle) && value.credential_handle.length > ('vault:mock:' + value.provider_id + ':').length, 'MODEL_CREDENTIAL_HANDLE');
    integer(value.maxConcurrency,16); invariant(value.maxConcurrency > 0, 'MODEL_KEY_LIMIT');
  }
  async registerKey(admin: unknown, input: ModelKeyDefinition): Promise<void> {
    this.#state.checkAdmin(admin); const value = snapshot(input); this.#key(value);
    await this.#state.change(this.#adminSubject(), 'MODEL_KEY_REGISTERED', () => {
      invariant(this.#state.get<Provider>('MODEL_PROVIDER', value.provider_id)?.kind === 'MOCK', 'MODEL_PROVIDER_UNKNOWN');
      invariant(this.#state.count('MODEL_KEY') < 128, 'MODEL_POOL_LIMIT');
      this.#state.insert('MODEL_KEY', value.key_id, this.#adminSubject(), 'ACTIVE', { ...value, state: 'ACTIVE', requests: [], revision: 0 });
    }, { key_id: value.key_id, provider_id: value.provider_id, assurance: 'SIMULATED' });
  }
  async setKeyState(admin: unknown, keyId: string, state: 'ACTIVE' | 'INVALID' | 'RETIRED'): Promise<void> {
    this.#state.checkAdmin(admin); identifier(keyId); invariant(['ACTIVE','INVALID','RETIRED'].includes(state), 'MODEL_KEY_STATE');
    await this.#state.change(this.#adminSubject(), 'MODEL_KEY_STATE', () => {
      const key = this.#state.get<Key>('MODEL_KEY',keyId); invariant(key, 'MODEL_KEY_UNKNOWN');
      invariant(state !== 'ACTIVE' || key.requests.length === 0, 'MODEL_KEY_UNRESOLVED');
      this.#state.update('MODEL_KEY',keyId,key.revision,state,{ ...key, state, revision: key.revision+1 });
    }, { key_id: keyId, state, assurance: 'SIMULATED' });
  }
  async rotateKey(admin: unknown, oldId: string, replacement: ModelKeyDefinition): Promise<void> {
    this.#state.checkAdmin(admin); this.#key(replacement);
    const old = this.#state.get<Key>('MODEL_KEY', oldId); invariant(old && old.provider_id === replacement.provider_id, 'MODEL_KEY_PROVIDER_MISMATCH');
    await this.registerKey(admin,replacement); await this.setKeyState(admin,oldId,'RETIRED');
  }
  async recover(admin: unknown): Promise<void> {
    this.#state.checkAdmin(admin);
    for (const state of ['RESERVING','RESERVED','SENT'] as const) {
      let after: string | undefined;
      for (;;) {
        const page=this.#state.list<Request>('MODEL_REQUEST',{state,...(after?{after}:{}),limit:100});
        for(const old of page){
          if(old.reservation_id) await this.#options.budget.retain(old.owner,old.reservation_id,'MODEL_HOST_RESTART_UNKNOWN');
          const result:ModelResult={status:'SIMULATED',assurance:'SIMULATED',outcome:'INDETERMINATE',request_id:old.request_id,
            provider_id:old.provider_id,model_id:old.model_id,reply:null,usage:null,reason:'MODEL_HOST_RESTART_UNKNOWN',response_source:null};
          // No dispatch, key release, usage settlement or new reservation occurs during reconstruction.
          await this.#state.change(this.#adminSubject(),'MODEL_RESULT',()=>{
            const current=this.#get(old.request_id);invariant(current.revision===old.revision,'MODEL_RECOVERY_CONFLICT');
            this.#update(current,{state:'INDETERMINATE',result});
          },{request_id:old.request_id,previous_state:old.state,budget_retained:old.reservation_id!==null,automatic_retry:false,assurance:'SIMULATED'},old.request_id);
        }
        if(page.length<100)break;after=page.at(-1)!.request_id;
      }
    }
  }
  #update(old: Request, values: Partial<Request>): Request {
    const next = snapshot({ ...old, ...values, revision: old.revision+1 }); this.#state.update('MODEL_REQUEST',old.request_id,old.revision,next.state,next); return next;
  }
  #get(requestId: string): Request { const request = this.#state.get<Request>('MODEL_REQUEST',requestId); invariant(request,'MODEL_REQUEST_UNKNOWN'); return request; }
  #releaseKey(request: Request, invalid = false): void {
    if (!request.key_id) return;
    const key = this.#state.get<Key>('MODEL_KEY',request.key_id); invariant(key,'MODEL_KEY_UNKNOWN');
    this.#state.update('MODEL_KEY',key.key_id,key.revision,invalid ? 'INVALID' : key.state,
      { ...key, state: invalid ? 'INVALID' : key.state, requests: key.requests.filter(id => id !== request.request_id), revision: key.revision+1 });
  }
  bind(candidate: Subject) {
    validateSubject(candidate); const s = snapshot(candidate);
    return Object.freeze({ complete: (input: { request_id: string; context: AssembledContext; max_output_tokens: number }, trustedSignal?: AbortSignal) => this.#complete(s,input,trustedSignal) });
  }
  async #complete(s: Subject, input: { request_id: string; context: AssembledContext; max_output_tokens: number }, trustedSignal?: AbortSignal): Promise<ModelResult> {
    invariant(trustedSignal === undefined || trustedSignal instanceof AbortSignal,'MODEL_INVALID_SIGNAL');
    const fence = () => {
      invariant(!trustedSignal?.aborted,'MODEL_CANCELLED_NOT_SENT');
      this.#state.require('model.gateway',s); this.#state.require('model.mock-provider',s);
    };
    fence();
    invariant(Object.keys(input).sort().join(',') === 'context,max_output_tokens,request_id', 'MODEL_REQUEST_SCHEMA');
    identifier(input.request_id); integer(input.max_output_tokens,4096); invariant(input.max_output_tokens > 0,'MODEL_LIMIT');
    const context = assertContextView(this.#state,s,input.context), requestId = input.request_id,
      hash = sha256(canonical({ subject: s, context_view_id: context.view_id, context_sha256: context.sha256, max_output_tokens: input.max_output_tokens }));
    const existing = this.#state.get<Request>('MODEL_REQUEST',requestId);
    if (existing) {
      invariant(existing.input_hash === hash && canonical(existing.owner) === canonical(s),'MODEL_REQUEST_CONFLICT');
      invariant(TERMINAL.includes(existing.state) && existing.result,'MODEL_REQUEST_INFLIGHT');
      // A DB commit without an exported result is not an acknowledged success.
      const ack = this.#state.store.db.prepare("SELECT 1 FROM anx_records r JOIN anx_exports e USING(seq) WHERE r.operation_id=? AND r.domain='audit' AND json_extract(r.body,'$.phase')='MODEL_RESULT'").get(requestId);
      invariant(ack,'MODEL_RESULT_UNACKNOWLEDGED'); return existing.result;
    }
    const route = this.#options.routes[s.model_binding]?.[s.agent_type]; invariant(route && route.length > 0,'MODEL_ROUTE_MISSING');
    const inputTokens = Math.ceil(context.bytes / 4), outputTokens = input.max_output_tokens;
    const models = route.map(id => { const model = this.#state.get<Model>('MODEL_MODEL',id); invariant(model,'MODEL_UNKNOWN'); return model; });
    for (const model of models) invariant(inputTokens <= model.max_input_tokens && outputTokens <= model.max_output_tokens,'MODEL_CONTEXT_LIMIT');
    const estimated = Math.max(...models.map(model => inputTokens*model.input_cost_micros_per_token + outputTokens*model.output_cost_micros_per_token)); integer(estimated,Number.MAX_SAFE_INTEGER);
    const demand: ModelDemand = { request_id: requestId,input_tokens: inputTokens,output_tokens: outputTokens,estimated_cost_micros: estimated,concurrency: 1,assurance:'SIMULATED' };
    await this.#state.change(s,'MODEL_REQUEST_PREPARED',()=>{
      invariant(!this.#state.get('MODEL_REQUEST',requestId),'MODEL_REQUEST_INFLIGHT');
      invariant(this.#state.count('MODEL_REQUEST') < MAX_REQUESTS && ['RESERVING','RESERVED','SENT'].reduce((n,state)=>n+this.#state.count('MODEL_REQUEST',{state}),0) < 32,'MODEL_BACKPRESSURE');
      this.#state.insert('MODEL_REQUEST',requestId,s,'RESERVING',{ revision:0,request_id:requestId,owner:s,input_hash:hash,state:'RESERVING',reservation_id:null,
        model_id:null,provider_id:null,key_id:null,attempts:0,result:null,context_view_id:context.view_id,demand });
    }, { request_id:requestId,context_view_id:context.view_id,assurance:'SIMULATED' },requestId);
    let reservation: string | null = null, sent = false, budgetSettled = false, knownUsage: ModelUsage | null = null;
    const zeroUsage: ModelUsage = {request_id:requestId,input_tokens:0,output_tokens:0,cost_micros:0,concurrency:0,assurance:'SIMULATED'};
    try {
      fence();
      reservation = await this.#options.budget.reserve(s,snapshot(demand)); identifier(reservation); fence();
      await this.#state.change(s,'MODEL_BUDGET_RESERVED',()=>this.#update(this.#get(requestId),{ state:'RESERVED',reservation_id:reservation }),{request_id:requestId},requestId);
      fence();
      await this.#context.capture(s,'RAW',Buffer.from(canonical({ assurance:'SIMULATED',kind:'MODEL_REQUEST',request_id:requestId,context_view_id:context.view_id,
        context_sha256:context.sha256,text:context.text,sources:context.entries.map(entry=>entry.source) })),{operation_id:requestId,maxBytes:384*1024});
      fence();
      for (let attempt=0;attempt<models.length;attempt++) {
        fence();
        if (attempt > 0 && !this.#state.enabled('model.provider-failover',s)) break;
        const selected = await this.#state.change(s,'MODEL_DISPATCH_INTENT',()=>{
          fence();
          const model = this.#state.get<Model>('MODEL_MODEL',models[attempt].model_id)!;
          const provider = this.#state.get<Provider>('MODEL_PROVIDER',model.provider_id);
          invariant(provider?.kind==='MOCK' && provider.state==='ACTIVE','MODEL_REAL_PROVIDER_BLOCKED');
          const keys: Key[] = []; let after: string | undefined;
          do { const page = this.#state.list<Key>('MODEL_KEY',{...(after?{after}:{}),limit:100}); keys.push(...page); after=page.length===100?page.at(-1)!.key_id:undefined; } while(after);
          const eligible = keys.filter(key=>key.provider_id===model.provider_id && key.state==='ACTIVE' && key.requests.length<key.maxConcurrency);
          invariant(eligible.length>0,'MODEL_KEY_CONCURRENCY');
          const key = eligible[this.#state.enabled('model.key-round-robin',s)?model.key_cursor%eligible.length:0];
          this.#state.update('MODEL_KEY',key.key_id,key.revision,key.state,{...key,requests:[...key.requests,requestId],revision:key.revision+1});
          this.#update(this.#get(requestId),{state:'RESERVED',model_id:model.model_id,provider_id:model.provider_id,key_id:key.key_id,attempts:attempt+1});
          return {model};
        },{ request_id:requestId,model_id:models[attempt].model_id,assurance:'SIMULATED' },requestId);
        fence();
        // The durable intent above precedes the effect. No await separates this final fence and fixture dispatch.
        const step = await this.#state.change(s,'MODEL_SENT',()=>{
          fence();
          const current=this.#state.get<Model>('MODEL_MODEL',selected.model.model_id)!;
          this.#state.update('MODEL_MODEL',current.model_id,current.revision,current.state,{...current,sequence:current.sequence+1,key_cursor:current.key_cursor+1,revision:current.revision+1});
          this.#update(this.#get(requestId),{state:'SENT'});
          sent=true;
          return this.#options.mocks[current.model_id]?.[current.sequence] ?? {reply:{kind:'FINAL' as const,text:'SIMULATED complete'}};
        },{request_id:requestId,model_id:selected.model.model_id,assurance:'SIMULATED'},requestId);
        fence();
        if (step.failure==='UNKNOWN') return await this.#uncertain(s,requestId,reservation,'MODEL_SENT_OUTCOME_UNKNOWN');
        if (step.failure==='KNOWN_NOT_SENT' || step.failure==='AUTH') {
          sent=false;
          await this.#state.change(s,'MODEL_NOT_SENT',()=>{ const old=this.#get(requestId);this.#releaseKey(old,step.failure==='AUTH');this.#update(old,{state:'RESERVED',key_id:null}); },
            {request_id:requestId,reason:step.failure,assurance:'SIMULATED'},requestId);
          fence();
          continue;
        }
        const reply=this.#reply(step.reply!), replyTokens=Math.ceil(Buffer.byteLength(canonical(reply))/4), usage:ModelUsage={request_id:requestId,input_tokens:step.input_tokens??inputTokens,
          output_tokens:step.output_tokens??replyTokens,cost_micros:step.cost_micros??(inputTokens*selected.model.input_cost_micros_per_token+replyTokens*selected.model.output_cost_micros_per_token),concurrency:0,assurance:'SIMULATED'};
        invariant(usage.input_tokens<=inputTokens && usage.output_tokens<=outputTokens && usage.cost_micros<=estimated,'MODEL_USAGE_OVER_BUDGET');
        knownUsage=usage;
        const response=await this.#context.capture(s,'RAW',Buffer.from(canonical({assurance:'SIMULATED',kind:'MODEL_RESPONSE',request_id:requestId,reply,usage})),{operation_id:requestId,maxBytes:32768});
        fence();
        await this.#options.budget.settle(s,reservation,snapshot(usage)); budgetSettled=true; fence();
        return await this.#finish(s,requestId,{status:'SIMULATED',assurance:'SIMULATED',outcome:'SUCCEEDED',request_id:requestId,
          provider_id:selected.model.provider_id,model_id:selected.model.model_id,reply,usage,reason:'SIMULATED_FIXTURE_COMPLETE',response_source:response});
      }
      const usage=zeroUsage;
      await this.#options.budget.settle(s,reservation,usage);budgetSettled=true; fence();
      const last=this.#get(requestId);
      return await this.#finish(s,requestId,{status:'SIMULATED',assurance:'SIMULATED',outcome:'FAILED',request_id:requestId,provider_id:last.provider_id,
        model_id:last.model_id,reply:null,usage,reason:'MODEL_KNOWN_NOT_SENT',response_source:null});
    } catch (error) {
      if (trustedSignal?.aborted && budgetSettled && knownUsage) return this.#finish(s,requestId,{status:'SIMULATED',assurance:'SIMULATED',outcome:'FAILED',request_id:requestId,
        provider_id:this.#get(requestId).provider_id,model_id:this.#get(requestId).model_id,reply:null,usage:knownUsage,reason:'MODEL_CANCELLED_AFTER_RESULT',response_source:null});
      if (reservation && sent) return this.#uncertain(s,requestId,reservation,'MODEL_REQUEST_UNCERTAIN');
      if (reservation && !budgetSettled) {
        try { await this.#options.budget.settle(s,reservation,zeroUsage); budgetSettled=true; }
        catch { return this.#uncertain(s,requestId,reservation,'MODEL_BUDGET_RECONCILE_REQUIRED'); }
      }
      return this.#finish(s,requestId,{status:'SIMULATED',assurance:'SIMULATED',outcome:'FAILED',request_id:requestId,provider_id:null,
        model_id:null,reply:null,usage:trustedSignal?.aborted?zeroUsage:null,reason:error instanceof NexusError && SAFE_FAILURES.has(error.code) ? error.code : reservation?'MODEL_STORAGE_UNAVAILABLE':'MODEL_RESERVATION_FAILED',response_source:null});
    }
  }
  async #finish(s:Subject,id:string,result:ModelResult):Promise<ModelResult>{
    await this.#state.change(s,'MODEL_RESULT',()=>{const request=this.#get(id);this.#releaseKey(request);this.#update(request,{state:result.outcome,result});},
      {request_id:id,outcome:result.outcome,assurance:'SIMULATED'},id);return snapshot(result);
  }
  async #uncertain(s:Subject,id:string,reservation:string,reason:string):Promise<ModelResult>{
    // Retaining a reservation is conservative even if a settle callback threw after committing its own fact.
    await this.#options.budget.retain(s,reservation,reason);
    const request=this.#get(id),result:ModelResult={status:'SIMULATED',assurance:'SIMULATED',outcome:'INDETERMINATE',request_id:id,
      provider_id:request.provider_id,model_id:request.model_id,reply:null,usage:null,reason,response_source:null};
    await this.#state.change(s,'MODEL_RESULT',()=>this.#update(this.#get(id),{state:'INDETERMINATE',result}),
      {request_id:id,outcome:'INDETERMINATE',assurance:'SIMULATED'},id);return snapshot(result);
  }
}
