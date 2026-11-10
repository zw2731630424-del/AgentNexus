import { canonical, invariant, sha256 } from '../types.ts';
import { hostSubject, identifier, snapshot } from '../harness/contracts.ts';
import type { Subject } from '../harness/contracts.ts';
import type { NativeState } from '../harness/state.ts';
import type { Assurance, ProviderUsage } from './protocol.ts';
import { natural } from './protocol.ts';

export const M181_TOKEN_LIMIT = 100_000_000;
const CAMPAIGN='MODEL181_CAMPAIGN', REQUEST='MODEL181_CAMPAIGN_REQUEST';
type Campaign = {revision:number;id:string;assurance:Assurance;authorization_ref:string;limit:number;used:number;held:number;
  requests:number;unknown:number;state:'OPEN'|'BLOCKED';input_tokens:number;output_tokens:number;cache_hit_tokens:number;reasoning_tokens:number;
  estimated_tokens:number;cost_estimate_micros:number};
type Request = {revision:number;id:string;entity_id:string;campaign_id:string;owner:Subject;hash:string;state:'RESERVED'|'SENT'|'SETTLED'|'UNKNOWN'|'NOT_SENT';
  input_limit:number;output_limit:number;held:number;usage:ProviderUsage|null;cost_estimate_micros:number;response_hash:string|null};

/** One immutable campaign per durable Host store, across Keys, Tasks and Sessions.
 * Deployment must pin this Host store; a new database is not a new authorization.
 * REAL cannot select a custom limit, campaign id, or reset counters.
 */
export class CampaignTokenLedger {
  #state:NativeState;readonly assurance:Assurance;#id:string;#allProviders:boolean;
  constructor(state:NativeState,admin:unknown,assurance:Assurance,allConfiguredProviders=false){state.checkAdmin(admin);invariant(['REAL','SIMULATED'].includes(assurance),'MODEL181_CAMPAIGN_ASSURANCE');this.#state=state;this.assurance=assurance;this.#id=assurance==='REAL'?'m181-deepseek':'m181-fixture';this.#allProviders=allConfiguredProviders;}
  #check(admin:unknown){this.#state.checkAdmin(admin);}
  #get(){const r=this.#state.get<Campaign>(CAMPAIGN,this.#id);invariant(r&&r.assurance===this.assurance,'MODEL181_CAMPAIGN_REQUIRED');return r;}
  #save(r:Campaign,changes:Partial<Campaign>){const n={...r,...changes,revision:r.revision+1};this.#state.update(CAMPAIGN,r.id,r.revision,n.state,n);}
  #requestKey(id:string){return sha256(canonical({campaign:this.#id,request_id:id}));}
  #request(id:string,s:Subject){const r=this.#state.get<Request>(REQUEST,this.#requestKey(id));invariant(r&&r.campaign_id===this.#id&&canonical(r.owner)===canonical(s),'MODEL181_CAMPAIGN_REQUEST');return r;}
  #saveRequest(r:Request,changes:Partial<Request>){const n={...r,...changes,revision:r.revision+1};this.#state.update(REQUEST,r.entity_id,r.revision,n.state,n);}
  async initialize(admin:unknown,authorization_ref:string,fixture_limit?:number):Promise<void>{
    this.#check(admin);identifier(authorization_ref);const limit=fixture_limit??M181_TOKEN_LIMIT;natural(limit,M181_TOKEN_LIMIT);
    invariant(limit>0&&(this.assurance==='SIMULATED'||fixture_limit===undefined),'MODEL181_CAMPAIGN_LIMIT');
    await this.#state.change(hostSubject(this.#state.boot_id),'MODEL181_CAMPAIGN_INITIALIZED',()=>{
      const old=this.#state.get<Campaign>(CAMPAIGN,this.#id);
      if(old){invariant(old.authorization_ref===authorization_ref&&old.limit===limit&&old.assurance===this.assurance,'MODEL181_CAMPAIGN_IMMUTABLE');return;}
      const r:Campaign={revision:0,id:this.#id,assurance:this.assurance,authorization_ref,limit,used:0,held:0,requests:0,unknown:0,state:'OPEN',input_tokens:0,output_tokens:0,cache_hit_tokens:0,reasoning_tokens:0,estimated_tokens:0,cost_estimate_micros:0};
      this.#state.insert(CAMPAIGN,this.#id,hostSubject(this.#state.boot_id),'OPEN',r);
    },{campaign_id:this.#id,limit,authorization_ref,assurance:this.assurance});
  }
  async reserve(admin:unknown,s:Subject,input:{request_id:string;provider_id:string;input_tokens:number;output_tokens:number;body_hash:string}):Promise<void>{
    this.#check(admin);const p=snapshot(input);identifier(p.request_id);natural(p.input_tokens);natural(p.output_tokens);natural(p.input_tokens+p.output_tokens);
    identifier(p.provider_id);invariant((this.#allProviders||p.provider_id==='deepseek')&&/^[a-f0-9]{64}$/.test(p.body_hash),'MODEL181_CAMPAIGN_PROVIDER');
    const hash=sha256(canonical({owner:s,...p}));
    await this.#state.change(s,'MODEL181_CAMPAIGN_RESERVED',()=>{
      const c=this.#get(),entity_id=this.#requestKey(p.request_id),old=this.#state.get<Request>(REQUEST,entity_id);
      if(old){invariant(old.hash===hash&&old.state==='RESERVED','MODEL181_CAMPAIGN_REPLAY');return;}
      invariant(c.state==='OPEN'&&c.unknown===0,'MODEL181_CAMPAIGN_RECONCILIATION_REQUIRED');
      const held=p.input_tokens+p.output_tokens;invariant(c.used+c.held+held<=c.limit,'MODEL181_CAMPAIGN_EXHAUSTED');
      invariant(this.#state.count(REQUEST)<4096,'MODEL181_CAMPAIGN_CAPACITY');
      this.#save(c,{held:c.held+held});
      this.#state.insert(REQUEST,entity_id,s,'RESERVED',{revision:0,id:p.request_id,entity_id,campaign_id:this.#id,owner:s,hash,state:'RESERVED',input_limit:p.input_tokens,output_limit:p.output_tokens,held,usage:null,cost_estimate_micros:0,response_hash:null} satisfies Request);
    },{campaign_id:this.#id,request_id:p.request_id,body_hash:p.body_hash,input_limit:p.input_tokens,output_limit:p.output_tokens},p.request_id);
  }
  async markSent(admin:unknown,s:Subject,id:string):Promise<void>{this.#check(admin);await this.#state.change(s,'MODEL181_CAMPAIGN_SENT',()=>{
    const r=this.#request(id,s);invariant(r.state==='RESERVED','MODEL181_CAMPAIGN_STATE');const c=this.#get();
    invariant(c.state==='OPEN'&&c.unknown===0,'MODEL181_CAMPAIGN_RECONCILIATION_REQUIRED');this.#saveRequest(r,{state:'SENT'});this.#save(c,{requests:c.requests+1});
  },{request_id:id},id);}
  async notSent(admin:unknown,s:Subject,id:string):Promise<void>{this.#check(admin);await this.#state.change(s,'MODEL181_CAMPAIGN_NOT_SENT',()=>{
    const r=this.#request(id,s);if(r.state==='NOT_SENT')return;invariant(r.state==='RESERVED','MODEL181_CAMPAIGN_ALREADY_SENT');const c=this.#get();this.#save(c,{held:c.held-r.held});this.#saveRequest(r,{state:'NOT_SENT',held:0});
  },{request_id:id},id);}
  async observe(admin:unknown,s:Subject,id:string,usage:ProviderUsage|null,cost_estimate_micros:number,complete:boolean):Promise<void>{
    this.#check(admin);invariant(typeof complete==='boolean','MODEL181_CAMPAIGN_COMPLETE');natural(cost_estimate_micros);const meter=usage?snapshot(usage):null;
    if(meter){natural(meter.input_tokens);natural(meter.output_tokens);natural(meter.input_tokens+meter.output_tokens);if(meter.reasoning_tokens!==null){natural(meter.reasoning_tokens);invariant(meter.reasoning_tokens<=meter.output_tokens,'MODEL181_CAMPAIGN_USAGE');}for(const key of ['cache_hit_tokens','cache_miss_tokens'] as const)if(meter[key]!=null){natural(meter[key]);invariant(meter[key]<=meter.input_tokens,'MODEL181_CAMPAIGN_USAGE');}if(meter.cache_hit_tokens!=null&&meter.cache_miss_tokens!=null)invariant(meter.cache_hit_tokens+meter.cache_miss_tokens===meter.input_tokens,'MODEL181_CAMPAIGN_USAGE');}
    const response_hash=sha256(canonical({meter,cost_estimate_micros,complete}));
    await this.#state.change(s,'MODEL181_CAMPAIGN_OBSERVED',()=>{
      const r=this.#request(id,s);if(r.response_hash){invariant(r.response_hash===response_hash,'MODEL181_CAMPAIGN_USAGE_CONFLICT');return;}
      invariant(r.state==='SENT','MODEL181_CAMPAIGN_STATE');const c=this.#get();const actual=meter?meter.input_tokens+meter.output_tokens:0;
      const overrun=!!meter&&(meter.input_tokens>r.input_limit||meter.output_tokens>r.output_limit);
      const unknown=!complete||!meter||overrun;
      // Missing/partial usage retains the entire reservation. Valid provider usage is counted once even on failure.
      const retained=unknown?r.held:0;
      const next={used:c.used+actual,held:c.held-r.held+retained,unknown:c.unknown+(unknown?1:0),state:unknown?'BLOCKED' as const:c.state,
        input_tokens:c.input_tokens+(meter?.input_tokens??0),output_tokens:c.output_tokens+(meter?.output_tokens??0),cache_hit_tokens:c.cache_hit_tokens+(meter?.cache_hit_tokens??0),reasoning_tokens:c.reasoning_tokens+(meter?.reasoning_tokens??0),
        estimated_tokens:c.estimated_tokens+(meter?0:r.held),cost_estimate_micros:c.cost_estimate_micros+cost_estimate_micros};
      for(const n of [next.used,next.held,next.cost_estimate_micros])natural(n);
      this.#save(c,next);this.#saveRequest(r,{state:unknown?'UNKNOWN':'SETTLED',held:retained,usage:meter,cost_estimate_micros,response_hash});
    },{request_id:id,provider_usage:meter,usage_source:meter?'PROVIDER':'ESTIMATED',cost_estimate_micros,complete},id);
  }
  async recover(admin:unknown):Promise<void>{this.#check(admin);let after:string|undefined;for(;;){const page=this.#state.list<Request>(REQUEST,{...(after?{after}:{}),limit:100});for(const r of page){
    if(r.campaign_id!==this.#id)continue;
    if(r.state==='SENT')await this.observe(admin,r.owner,r.id,null,0,false);
    else if(r.state==='RESERVED')await this.#state.change(r.owner,'MODEL181_CAMPAIGN_RECOVERY_BLOCKED',()=>{const c=this.#get(),current=this.#request(r.id,r.owner);if(current.state!=='RESERVED')return;this.#save(c,{state:'BLOCKED',unknown:c.unknown+1,estimated_tokens:c.estimated_tokens+current.held});this.#saveRequest(current,{state:'UNKNOWN'});},{request_id:r.id,automatic_retry:false},r.id);
  }if(page.length<100)break;after=page.at(-1)!.entity_id;}}
  inspect(admin:unknown){this.#check(admin);const c=this.#get();return snapshot({...c,remaining_tokens:Math.max(0,c.limit-c.used-c.held),near_limit:c.used+c.held>=c.limit*0.9});}
}
