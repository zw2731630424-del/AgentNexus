import type test from 'node:test';
import { mkdir,mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openHarness } from '../../src/agentnexus/harness/index.ts';
import type { HarnessOptions } from '../../src/agentnexus/harness/index.ts';
import type { AgentInput } from '../../src/agentnexus/harness/agents.ts';
import type { Subject } from '../../src/agentnexus/harness/contracts.ts';
import { CapabilityRegistry,ModelRouter } from '../../src/agentnexus/model-runtime/protocol.ts';
import type { HttpEnvelope,ModelSpec,ProviderAdapter,Transport,TransportResponse,Routes } from '../../src/agentnexus/model-runtime/protocol.ts';
import { UnifiedModelGateway } from '../../src/agentnexus/model-runtime/gateway.ts';
import { ModelUsageLedger,modelTaskBudgetId } from '../../src/agentnexus/model-runtime/ledger.ts';
import { OpenAIAdapter,DeepSeekAdapter,GLMAdapter } from '../../src/agentnexus/model-runtime/adapters.ts';
import { FixtureTransport,wireFixture } from '../../src/agentnexus/model-runtime/transport.ts';
import { CredentialVault,createVaultAdminCapability,SyntheticMemoryProtector } from '../../src/agentnexus/model-runtime/vault.ts';

export const LIMITS={workers:4,memory_bytes:268435456,processes:8,disk_bytes:67108864,wall_ms:1000000,model_tokens:1000000,model_requests:100,model_cost_micros:1000000};
export function model(model_id='synthetic-small',provider_id='openai',extra:Partial<ModelSpec>={}):ModelSpec{return {provider_id,model_id,context_tokens:65536,output_tokens:4096,capabilities:{reasoning:true,tools:true,json:true,streaming:true,multimodal:false},price:{currency:'USD',input_micros_per_million:1000000,output_micros_per_million:2000000,source:'SYNTHETIC_FIXTURE',checked_at:'2026-11-08T00:00:00Z',valid_until:'2027-11-08T00:00:00Z',assurance:'SIMULATED'},requests_per_minute:1000,state:'ACTIVE',evidence_url:'SYNTHETIC_FIXTURE',checked_at:'2026-11-08T00:00:00Z',...extra};}
export async function root(name:string){const base=process.env.AGENTNEXUS_TEST_DATA_ROOT??fileURLToPath(new URL('../../../../../.workflow-kit/runtime/AgentNexus-M1.8/tests',import.meta.url));await mkdir(base,{recursive:true});return mkdtemp(join(base,name+'-'));}
export async function fixture(t:test.TestContext,options:{respond?:(request:HttpEnvelope,sequence:number,signal:AbortSignal)=>TransportResponse|Promise<TransportResponse>;models?:ModelSpec[];adapters?:ProviderAdapter[];transport?:Transport;maxConcurrency?:number;gatewayConcurrency?:number;eventLoop?:HarnessOptions['eventLoop'];routes?:Routes}={}){
  const dir=await root('wire'),vaultAdmin=createVaultAdminCapability(),protector=new SyntheticMemoryProtector();const vault=await CredentialVault.open({root:join(dir,'vault'),admin:vaultAdmin,protector,mode:'SYNTHETIC'});
  const specs=options.models??[model()],registry=new CapabilityRegistry();for(const spec of specs)registry.register(spec);
  for(const provider of new Set(specs.map(m=>m.provider_id)))await vault.add(vaultAdmin,{key_id:provider+'.key',provider_id:provider,models:specs.filter(m=>m.provider_id===provider).map(m=>m.model_id),secret:Buffer.from('synthetic-test-'+provider+'-private-value-abc123'),max_concurrency:options.maxConcurrency??4,requests_per_minute:1000});
  const transport=options.transport??new FixtureTransport(options.respond??(()=>wireFixture(JSON.stringify({kind:'FINAL',text:'SIMULATED wire fixture'}))));
  const routes=options.routes??{wire:Object.fromEntries(['RESIDENT','DEVELOPMENT','SUBAGENT','BACKGROUND_REVIEWER','COORDINATOR'].map(type=>[type,specs.map(m=>m.provider_id+':'+m.model_id)]))};
  let unified!:UnifiedModelGateway,ledger!:ModelUsageLedger,admin:unknown;
  const h=await openHarness(join(dir,'host'),{host:{contentGuard:vault.guard},eventLoop:options.eventLoop,platform_limits:LIMITS,
    modelRuntimeFactory:host=>{admin=host.admin;ledger=new ModelUsageLedger(host.state,host.admin);unified=new UnifiedModelGateway(host.state,host.admin,{vault,vaultAdmin,guard:vault.guard,ledger,router:new ModelRouter(registry,routes),adapters:options.adapters??[new OpenAIAdapter(),new DeepSeekAdapter(),new GLMAdapter()],transport,authorizeSubject:host.authorizeSubject,maxConcurrent:options.gatewayConcurrency});return unified;}});
  await h.administration.createProject({id:'project',rules:['Preserve source provenance. All tools use the Tool Gateway. No secret material in context.'],budget:LIMITS});
  const configure=async(s:Subject)=>{for(const [scope,id]of [['AGENT',s.agent_id],['TASK',modelTaskBudgetId(s)],['PROJECT',s.project_id],['PLATFORM','platform']] as const)await ledger.configure(admin,{scope,id,assurance:'SIMULATED',tokens:1000000,requests:100,cost_micros:1000000});};
  const agent=async(id='lead',task='work',extra:Partial<AgentInput>={})=>{const a=await h.administration.createAgent({id,project_id:'project',task_id:task,type:'DEVELOPMENT',model_binding:'wire',budget:{...LIMITS,workers:1},...extra});await configure(a.subject);return a;};
  const view=async(s:Subject,text='Original requirement')=>{const source=await h.context.capture(s,'RAW',Buffer.from(text));return h.context.assemble(s,[{source,section:'TASK_CONTRACT',required:true}],{maxBytes:65536});};
  t.after(async()=>{await h.close();vault.close();protector.destroy();});return {dir,h,admin,ledger,unified,vault,vaultAdmin,transport,agent,view,configure,specs};
}
