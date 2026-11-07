import {generateKeyPairSync,createHash} from 'node:crypto';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const base=new URL('../../../../deliverables/AgentNexus-M1.5/source/',import.meta.url);
const files=['src/agentnexus/bootstrap/worker.ts','src/agentnexus/production/file-broker.ts'];
const digest=async()=>Object.fromEntries(await Promise.all(files.map(async path=>[path,createHash('sha256').update(await readFile(new URL(path,base))).digest('hex')])));
const before=await digest();
const {executeFiniteWorker}=await import(new URL(files[0],base));
const {FileBroker}=await import(new URL(files[1],base));
const {KernelStore}=await import(new URL('src/agentnexus/storage.ts',base));
const {initializeControl,clockFor,metadata}=await import(new URL('src/agentnexus/control.ts',base));
const {signed}=await import(new URL('src/agentnexus/production/contracts.ts',base));
const {canonical,sha256,uid,NexusError}=await import(new URL('src/agentnexus/types.ts',base));
const keys=generateKeyPairSync('ed25519'),otherKeys=generateKeyPairSync('ed25519');
const publicKey=keys.publicKey.export({type:'spki',format:'pem'}).toString();
const processId={os:'windows',principal:'S-1-5-21-10-20-30-1002',pid:505,start_id:'5000',os_session:'1'},parent={...processId,pid:504,start_id:'4900'};
const logical={agent_id:'file-model',project_id:'file-project',task_id:'file-task',session_id:'file-session',role:'worker'};
const bytes=Buffer.from('independent exact file bytes');const args={file:{resource_id:'file-project:input',path:'dataset/input.bin',expected_hash:sha256(bytes),max_bytes:4096}};
function grants(){const now=Date.now(),g={schema:'agentnexus/remote-permit/1',permit_id:uid(),approval_id:uid(),operation_id:uid(),intent_hash:sha256(uid()),logical,runtime_id:uid(),worker_instance_id:uid(),host_boot_id:uid(),broker_boot_id:uid(),generation:1,process:processId,parent,tool_id:'nexus.digest',tool_version:'1',resource_id:args.file.resource_id,profile_hash:sha256('model-profile'),policy_epoch:1,feature_epoch:1,issued_at:now-1,expires_at:now+10000,nonce:sha256(uid()),arguments_hash:sha256(canonical(args))};
  const f={schema:'agentnexus/file-permit/1',operation_id:g.operation_id,runtime_id:g.runtime_id,worker_instance_id:g.worker_instance_id,host_boot_id:g.host_boot_id,project_id:logical.project_id,task_id:logical.task_id,resource_id:g.resource_id,profile_hash:g.profile_hash,path:args.file.path,action:'READ',expected_hash:args.file.expected_hash,content_hash:null,max_bytes:4096,nonce:sha256(uid()),issued_at:now-1,expires_at:now+5000,policy_epoch:1,feature_epoch:1};return {g,f};}
const results=[];
for(const attack of ['valid','missing-input','wrong-file-key','cross-operation','cross-resource','wrong-path','stale-epoch','expired-file-permit','changed-bytes','changed-unsigned-arguments']){
  const {g,f}=grants();let fileKey=keys.privateKey,argumentsValue=structuredClone(args),data=bytes;
  if(attack==='wrong-file-key')fileKey=otherKeys.privateKey;
  if(attack==='cross-operation')f.operation_id=uid();if(attack==='cross-resource')f.resource_id='foreign:input';if(attack==='wrong-path')f.path='other.bin';if(attack==='stale-epoch')f.policy_epoch=0;
  if(attack==='expired-file-permit'){f.issued_at=Date.now()-100;f.expires_at=Date.now()-1;}
  if(attack==='changed-bytes')data=Buffer.from('unapproved bytes');if(attack==='changed-unsigned-arguments')argumentsValue.file.path='changed.bin';
  const packet={schema:'agentnexus/worker-bootstrap/1',permit:signed(g,keys.privateKey),arguments:argumentsValue,...(attack==='missing-input'?{}:{input:{permit:signed(f,fileKey),data_base64:data.toString('base64')}})};
  let accepted=true,reason=null,result=null;try{result=executeFiniteWorker(packet,publicKey,processId.pid);}catch(error){accepted=false;reason={code:error.code??null,message:error.message};}
  results.push({attack,accepted,reason,passed:accepted===(attack==='valid')&&(!accepted||result.sha256===sha256(bytes))});
}
const folder=join(dirname(fileURLToPath(import.meta.url)),'file-input-probe-data');await mkdir(folder,{recursive:true});const root=await mkdtemp(join(folder,'model-'));const store=await KernelStore.open(root);initializeControl(store);
const {g,f}=grants();g.host_boot_id=clockFor(store).boot_id;f.host_boot_id=g.host_boot_id;const epoch=metadata(store);f.feature_epoch=epoch.feature_epoch;f.policy_epoch=epoch.policy_epoch;
const runtime={runtime_id:g.runtime_id,worker_instance_id:g.worker_instance_id,host_boot_id:g.host_boot_id,broker_boot_id:g.broker_boot_id,generation:1,process:processId,parent,logical,profile:{},profile_hash:g.profile_hash,state:'ACTIVE',assurance:'SIMULATED'};
let nativeReads=0,liveChecks=0;const owner={async read(){nativeReads++;throw Error('Native reader must not be called after revocation');},async create(){throw Error('Not used');}};
const broker=new FileBroker(store,keys.publicKey,()=>runtime,()=>metadata(store),owner,[{id:f.resource_id,project_id:f.project_id,task_id:f.task_id,root,kind:'PROJECT_READ_ONLY',quota_bytes:4096}],()=>true,async()=>{liveChecks++;if(liveChecks===2)throw new NexusError('SIMULATED_IDENTITY_REVOKED_AFTER_AUDIT');});
let liveFailure=null;try{await broker.execute(signed(f,keys.privateKey));}catch(error){liveFailure={code:error.code??null,message:error.message};}
const row=store.db.prepare('SELECT state FROM m14_file_requests WHERE nonce=?').get(f.nonce);results.push({attack:'identity-revoked-after-audit-before-read',accepted:false,reason:liveFailure,nativeReads,liveChecks,persisted_state:row?.state,passed:liveFailure?.code==='SIMULATED_IDENTITY_REVOKED_AFTER_AUDIT'&&nativeReads===0&&liveChecks===2&&row?.state==='UNKNOWN_QUARANTINED'});await store.close();
const after=await digest();console.log(JSON.stringify({schema:'agentnexus/file-input-probe/1',timestamp:new Date().toISOString(),assurance:'SIMULATED',scope:'Ephemeral real signatures, pure worker validation and a reviewer SQLite fixture with an injected liveness failure. No real file broker OS read, SID, ACL, AppContainer or qualification is exercised.',source_sha256:before,stable_during_probe:canonical(before)===canonical(after),root,results},null,2));
