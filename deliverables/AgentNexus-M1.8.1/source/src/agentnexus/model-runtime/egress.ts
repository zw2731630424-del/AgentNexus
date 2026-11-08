import { canonical, invariant, sha256 } from '../types.ts';
import { hostSubject, identifier, snapshot } from '../harness/contracts.ts';
import type { Subject } from '../harness/contracts.ts';
import type { AssembledContext } from '../harness/context.ts';
import type { NativeState } from '../harness/state.ts';
import type { DataGuard, HttpEnvelope, ModelSpec, TransportAdmission } from './protocol.ts';

export type DataClassification='PUBLIC'|'SYNTHETIC'|'INTERNAL'|'CONFIDENTIAL'|'SECRET';
export type EgressGrant={project_id:string;provider_id:'deepseek';model_id:string;endpoint:string;classification:DataClassification;
  context_hash:string;body_hash:string;sources_hash:string;authorization_ref:string;expires_at:string};
type StoredGrant=EgressGrant&{revision:number;id:string;state:'ACTIVE'|'REVOKED'};
export type EgressInput={subject:Subject;context:AssembledContext;request:HttpEnvelope;model:ModelSpec};
export type EgressReceipt={grant_id:string;context_hash:string;body_hash:string;sources_hash:string;classification:DataClassification;authorization_ref:string};
const KIND='MODEL181_EGRESS_GRANT';
export function assertEgressAdmission(state:NativeState,input:TransportAdmission):void{
  invariant(!state.faulted,'MODEL181_EGRESS_STORE_FAULTED');const e=input.egress,g=e?state.get<StoredGrant>(KIND,e.grant_id):null;
  invariant(g&&e&&Object.keys(e).sort().join(',')==='authorization_ref,body_hash,classification,context_hash,grant_id,sources_hash'&&g.state==='ACTIVE'&&Date.parse(g.expires_at)>Date.now()&&['PUBLIC','SYNTHETIC'].includes(g.classification)&&g.provider_id===input.model.provider_id&&g.model_id===input.model.model_id&&g.project_id===input.subject.project_id&&g.endpoint===input.request.url&&g.context_hash===input.context_hash&&g.body_hash===sha256(input.request.body)&&e.body_hash===g.body_hash&&e.context_hash===g.context_hash&&e.sources_hash===g.sources_hash&&e.authorization_ref===g.authorization_ref&&e.classification===g.classification,'MODEL181_EGRESS_REQUIRED');
}
export function egressSources(context:AssembledContext){
  return context.entries.map(e=>({section:e.section,source:e.source,range_sha256:e.range_sha256,binding:e.binding??null}));
}
export function egressBinding(input:EgressInput){return {project_id:input.subject.project_id,provider_id:input.model.provider_id,model_id:input.model.model_id,endpoint:input.request.url,
  context_hash:input.context.sha256,body_hash:sha256(input.request.body),sources_hash:sha256(canonical(egressSources(input.context)))};}

/** Host-reviewed exact bytes, not Agent classification labels. Initial M1.8.1 scope
 * permits PUBLIC/SYNTHETIC only; INTERNAL/CONFIDENTIAL/SECRET cannot be enabled here.
 * The verifier must attest actual source review and the user's authorization.
 */
export class DataEgressPolicy {
  #state:NativeState;#guard:DataGuard;#verify:(grant:EgressGrant,hash:string)=>Promise<boolean>;
  constructor(state:NativeState,admin:unknown,guard:DataGuard,verify:(grant:EgressGrant,hash:string)=>Promise<boolean>){state.checkAdmin(admin);invariant(typeof verify==='function','MODEL181_EGRESS_REVIEW_REQUIRED');this.#state=state;this.#guard=guard;this.#verify=verify;}
  async approve(admin:unknown,input:EgressGrant):Promise<string>{
    this.#state.checkAdmin(admin);const g=snapshot(input);
    invariant(Object.keys(g).sort().join(',')==='authorization_ref,body_hash,classification,context_hash,endpoint,expires_at,model_id,project_id,provider_id,sources_hash','MODEL181_EGRESS_SCHEMA');
    for(const v of [g.project_id,g.model_id,g.authorization_ref])identifier(v);
    invariant(g.provider_id==='deepseek'&&['deepseek-flash','deepseek-v4-pro'].includes(g.model_id)&&g.endpoint==='https://api.deepseek.com/chat/completions','MODEL181_EGRESS_PROVIDER');
    invariant(['PUBLIC','SYNTHETIC'].includes(g.classification),'MODEL181_EGRESS_CLASSIFICATION_DENIED');
    for(const h of [g.context_hash,g.body_hash,g.sources_hash])invariant(/^[a-f0-9]{64}$/.test(h),'MODEL181_EGRESS_HASH');
    invariant(Number.isFinite(Date.parse(g.expires_at))&&Date.parse(g.expires_at)>Date.now(),'MODEL181_EGRESS_EXPIRED');
    const id=sha256(canonical(g));let verified=false;try{verified=await this.#verify(g,id);}catch{/* no raw errors */}
    invariant(verified,'MODEL181_EGRESS_REVIEW_REQUIRED');
    await this.#state.change(hostSubject(this.#state.boot_id),'MODEL181_EGRESS_APPROVED',()=>{
      invariant(Date.parse(g.expires_at)>Date.now(),'MODEL181_EGRESS_EXPIRED');
      const old=this.#state.get<StoredGrant>(KIND,id);if(old){invariant(old.state==='ACTIVE','MODEL181_EGRESS_REVOKED');return;}
      invariant(this.#state.count(KIND)<4096,'MODEL181_EGRESS_CAPACITY');this.#state.insert(KIND,id,hostSubject(this.#state.boot_id),'ACTIVE',{...g,revision:0,id,state:'ACTIVE'});
    },{grant_id:id,...g});return id;
  }
  async revoke(admin:unknown,id:string):Promise<void>{this.#state.checkAdmin(admin);await this.#state.change(hostSubject(this.#state.boot_id),'MODEL181_EGRESS_REVOKED',()=>{
    const g=this.#state.get<StoredGrant>(KIND,id);invariant(g,'MODEL181_EGRESS_GRANT_REQUIRED');if(g.state==='REVOKED')return;this.#state.update(KIND,id,g.revision,'REVOKED',{...g,state:'REVOKED',revision:g.revision+1});
  },{grant_id:id});}
  #find(input:EgressInput):StoredGrant|null{
    const b=egressBinding(input);let after:string|undefined;
    for(;;){const page=this.#state.list<StoredGrant>(KIND,{project_id:'host',...(after?{after}:{}),limit:100});
      for(const g of page)if(g.state==='ACTIVE'&&Date.parse(g.expires_at)>Date.now()&&Object.entries(b).every(([k,v])=>g[k as keyof EgressGrant]===v))return g;
      if(page.length<100)return null;after=page.at(-1)!.id;
    }
  }
  fence(admin:unknown,input:EgressInput,receipt:EgressReceipt):void{
    this.#state.checkAdmin(admin);invariant(!this.#state.faulted,'MODEL181_EGRESS_STORE_FAULTED');const b=egressBinding(input),g=this.#state.get<StoredGrant>(KIND,receipt.grant_id);
    invariant(g&&Object.keys(receipt).sort().join(',')==='authorization_ref,body_hash,classification,context_hash,grant_id,sources_hash'&&g.state==='ACTIVE'&&Date.parse(g.expires_at)>Date.now()&&['PUBLIC','SYNTHETIC'].includes(g.classification)&&Object.entries(b).every(([k,v])=>g[k as keyof EgressGrant]===v)&&receipt.authorization_ref===g.authorization_ref&&receipt.classification===g.classification&&receipt.context_hash===g.context_hash&&receipt.body_hash===g.body_hash&&receipt.sources_hash===g.sources_hash,'MODEL181_EGRESS_GRANT_REQUIRED');
    this.#guard.assertSafe(input.context.text,'EGRESS_CONTEXT');this.#guard.assertSafe(input.request.body,'EGRESS_BODY');
  }
  async admit(admin:unknown,input:EgressInput):Promise<EgressReceipt>{
    this.#state.checkAdmin(admin);const b=egressBinding(input);let g:StoredGrant|null=null,reason='NO_REVIEWED_EXACT_BYTES';
    try{this.#guard.assertSafe(input.context.text,'EGRESS_CONTEXT');this.#guard.assertSafe(input.request.body,'EGRESS_BODY');g=this.#find(input);}
    catch{reason='SECRET_SCAN_FAILED';}
    const sources=egressSources(input.context);
    await this.#state.change(input.subject,'MODEL181_EGRESS_DECISION',()=>{},
      {...b,request_id:input.request.headers['x-agentnexus-request-id'],admission:g?'ALLOW':'DENY',classification:g?.classification??'UNCLASSIFIED',
        grant_id:g?.id??null,authorization_ref:g?.authorization_ref??null,sources:sources.map(e=>({event_id:e.source.event_id,record_hash:e.source.record_hash,payload_sha256:e.source.payload_ref.sha256,range_sha256:e.range_sha256})),reason:g?'HOST_REVIEWED_AND_SCANNED':reason},input.request.headers['x-agentnexus-request-id']);
    invariant(g,'MODEL181_EGRESS_DENIED');const receipt={grant_id:g.id,context_hash:b.context_hash,body_hash:b.body_hash,sources_hash:b.sources_hash,classification:g.classification,authorization_ref:g.authorization_ref};
    this.fence(admin,input,receipt);return snapshot(receipt);
  }
}
