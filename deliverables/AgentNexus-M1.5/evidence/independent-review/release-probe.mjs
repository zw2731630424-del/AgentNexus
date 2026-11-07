import {generateKeyPairSync,createHash} from 'node:crypto';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const base=new URL('../../../../deliverables/AgentNexus-M1.5/source/',import.meta.url);
const file='src/agentnexus/production/broker.ts';const before=createHash('sha256').update(await readFile(new URL(file,base))).digest('hex');
const {KernelStore}=await import(new URL('src/agentnexus/storage.ts',base));
const {initializeControl}=await import(new URL('src/agentnexus/control.ts',base));
const {ProductionExecutionBroker}=await import(new URL(file,base));
const {buildExitProof}=await import(new URL('src/agentnexus/production/exit.ts',base));
const {signed,RESOURCE_KINDS}=await import(new URL('src/agentnexus/production/contracts.ts',base));
const {canonical,sha256,uid}=await import(new URL('src/agentnexus/types.ts',base));
const data=join(dirname(fileURLToPath(import.meta.url)),'release-probe-data');await mkdir(data,{recursive:true});const root=await mkdtemp(join(data,'model-'));
const store=await KernelStore.open(root);initializeControl(store);
const keys=generateKeyPairSync('ed25519'),otherKeys=generateKeyPairSync('ed25519');
const broker=new ProductionExecutionBroker({store,host_key:keys.publicKey,broker_key:keys.privateKey,endpoint:{close(){}},gate:{},supervisor:{},runtime(){throw Error('Not used in release-only model');},epochs(){throw Error('Not used');},features(){return false;},hostFence:async()=>{},tools:[],max_workers:1});
const processId={os:'windows',principal:'S-1-5-21-10-20-30-1002',pid:303,start_id:'3000',os_session:'1'};const parent={...processId,pid:302,start_id:'2900'};
const logical={agent_id:'release-model',project_id:'model-project',task_id:'model-task',session_id:'model-session',role:'worker'};
const artifact=await store.artifacts.putBytes(Buffer.alloc(0),{maxBytes:1,media_type:'application/octet-stream'});
function fixture(complete){
  const now=Date.now(),g={schema:'agentnexus/remote-permit/1',permit_id:uid(),approval_id:uid(),operation_id:uid(),intent_hash:sha256(uid()),logical,runtime_id:uid(),worker_instance_id:uid(),host_boot_id:uid(),broker_boot_id:broker.boot_id,generation:1,process:processId,parent,tool_id:'nexus.digest',tool_version:'1',resource_id:'model-project:input',profile_hash:sha256('profile'),policy_epoch:1,feature_epoch:1,issued_at:now-1,expires_at:now+10000,nonce:sha256(uid()),arguments_hash:sha256('{}')};
  const evidence={source:'REAL_WINDOWS',observation_id:uid(),process:g.process,parent:g.parent,job_id:'SYNTHETIC-JOB',job_membership_verified:true,job_empty:true,membership_complete:true,unknown_members:false,members:[{process:g.process,parent:g.parent,exited:true,exit_code:0,handle_signaled:true}],root_exited:true,handles_closed:true,termination_requested_at:null,observed_at:new Date().toISOString(),sandbox:{profile_hash:g.profile_hash,token_verified:true,network_verified:complete,filesystem_verified:complete,limits_verified:complete,settled:true},outputs:{stdout:{eof:true,producer_closed:true,producer_id:'model-out'},stderr:{eof:true,producer_closed:true,producer_id:'model-err'}}};
  const p=buildExitProof(g,evidence,artifact,artifact,sha256('SYNTHETIC-QUALIFICATION'));
  store.db.prepare('INSERT INTO m14_broker_operations VALUES(?,?,?,?,?,?,?)').run(g.operation_id,g.permit_id,g.nonce,g.runtime_id,broker.boot_id,p.state,canonical(g));
  store.db.prepare('INSERT INTO m14_broker_proofs VALUES(?,?,?,?)').run(p.proof_id,g.operation_id,canonical(p),p.evidence_hash);
  const receipt={schema:'agentnexus/owner-release/1',operation_id:g.operation_id,intent_hash:g.intent_hash,proof_hash:p.evidence_hash,host_boot_id:g.host_boot_id,broker_boot_id:g.broker_boot_id,resource_versions:RESOURCE_KINDS.map(kind=>({kind,resource:kind==='WRITER'||kind==='WORKSPACE_LOCK'?g.resource_id:g.worker_instance_id,state:'RELEASED',revision:1})),nonce:sha256(uid()),issued_at:Date.now()-1,expires_at:Date.now()+10000};
  return {g,p,receipt};
}
const complete=fixture(true),incomplete=fixture(false),results=[];
for(const attack of ['incomplete-proof','wrong-key','wrong-intent','wrong-resource','valid','idempotent-replay']){
  const f=attack==='incomplete-proof'?incomplete:complete;let body=structuredClone(f.receipt);
  if(attack==='wrong-intent')body.intent_hash=sha256('other-intent');
  if(attack==='wrong-resource')body.resource_versions[0].resource='foreign:resource';
  const key=attack==='wrong-key'?otherKeys.privateKey:keys.privateKey;
  let accepted=true,reason=null;try{await broker.acknowledgeOwnerRelease(signed(body,key));}catch(error){accepted=false;reason={code:error.code??null,message:error.message};}
  const state=store.db.prepare('SELECT state FROM m14_broker_operations WHERE operation=?').get(f.g.operation_id).state;
  results.push({attack,accepted,reason,state,passed:accepted===['valid','idempotent-replay'].includes(attack)});
}
const receiptRows=store.db.prepare('SELECT count(*) n FROM m15_broker_releases').get().n;
broker.close();await store.close();const after=createHash('sha256').update(await readFile(new URL(file,base))).digest('hex');
console.log(JSON.stringify({schema:'agentnexus/owner-release-probe/1',timestamp:new Date().toISOString(),assurance:'SIMULATED',scope:'Synthetic operation/proof/OS/qualification rows in an isolated reviewer test store. REAL_WINDOWS strings model adapter claims only and establish no production proof. Real Ed25519, SQLite and zero-byte artifact storage are exercised.',source_sha256:before,stable_during_probe:before===after,root,receiptRows,results},null,2));
