// Independent review fixture. All OS/process/clock observations are SIMULATED.
// Real writes are confined to a fresh directory below this review runtime path.
import { generateKeyPairSync } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
const root=process.cwd(),base=resolve('.workflow-kit/runtime/AgentNexus-M1.4/independent-review');
await mkdir(base,{recursive:true});const dir=await mkdtemp(join(base,'node-review-'));
const prefix=join(root,'deliverables/AgentNexus-M1.4/source/src/agentnexus');
const mod=name=>import(pathToFileURL(join(prefix,name)).href);
const {KernelStore}=await mod('storage.ts'),{initializeControl}=await mod('control.ts');
const {canonical,sha256,uid}=await mod('types.ts'),{profileHash}=await mod('runtime/contracts.ts');
const watched=['contracts.ts','authority.ts','transport.ts','qualification.ts','exit.ts','broker.ts','file-broker.ts','identity.ts','audit.ts'];
const before={};for(const name of watched)before[name]=sha256(await readFile(join(prefix,'production',name)));
const {FileBroker}=await mod('production/file-broker.ts'),{signed,nonce}=await mod('production/contracts.ts');
const {buildExitProof}=await mod('production/exit.ts'),{ProductionAudit}=await mod('production/audit.ts');
const {privateKey}=generateKeyPairSync('ed25519'),store=await KernelStore.open(join(dir,'state'));initializeControl(store);
const logical={agent_id:'agent',project_id:'project',task_id:'task',session_id:'session',role:'worker'};
const proc={os:'windows',principal:'S-1-5-21-123-456-789-1001',pid:12,start_id:'123456789',os_session:'1'},parent={...proc,pid:11,start_id:'123456788'};
const profile={id:'review-model',version:1,os:'windows',os_version:'model',principal:proc.principal,accessible:['workspace'],read_only:[],writable:['workspace'],network:'DENY',limits:{memory_bytes:1048576,cpu_ms:1000,wall_ms:2000,file_bytes:1048576,processes:4,output_bytes:65536},lifetime:'ONE_OPERATION',exit_requirement:'COMPLETE_PROCESS_TREE'};
const r={runtime_id:uid(),logical,process:proc,parent,worker_instance_id:uid(),host_boot_id:uid(),broker_boot_id:uid(),generation:1,profile,profile_hash:profileHash(profile),state:'ACTIVE',assurance:'SIMULATED'};
const resources=[{id:'project:output',project_id:'project',task_id:'task',root:dir,kind:'OUTPUT',quota_bytes:1048576}];
const grant=(action,path,bytes=null,life=30000)=>({schema:'agentnexus/file-permit/1',operation_id:uid(),runtime_id:r.runtime_id,worker_instance_id:r.worker_instance_id,host_boot_id:r.host_boot_id,project_id:'project',task_id:'task',resource_id:'project:output',profile_hash:r.profile_hash,path,action,expected_hash:null,content_hash:bytes?sha256(bytes):null,max_bytes:32,nonce:nonce(),issued_at:Date.now(),expires_at:Date.now()+life,policy_epoch:0,feature_epoch:0});
const native=data=>({data:Buffer.from(data),file_id:'model-id',sha256:sha256(data),bytes:data.length,links:1,assurance:'SIMULATED'});
const result={scope:'SIMULATED ownership/clock/OS evidence; REAL local SQLite/artifact/filesystem only',directory:dir,source_sha256:before,findings:[]};
const run=async(id,fn)=>{try{result.findings.push({id,...await fn()});}catch(error){result.findings.push({id,error:error.code??error.name,message:error.message});}};
let auditReady=true;
try{
  await run('audit-logical-role',async()=>{try{new ProductionAudit(store).record('file','TEST',r,uid());await store.flush();return {valid_logical_identity_audited:true};}catch(error){auditReady=false;throw error;}});
  if(auditReady){
    let written;
    const owner={read:async()=>native(Buffer.from('read')),create:async(_root,_path,bytes)=>{written=Buffer.from(bytes);await writeFile(join(dir,'actual-create.txt'),written,{flag:'wx'});return native(written);}};
    const broker=new FileBroker(store,privateKey,()=>r,()=>({policy_epoch:0,feature_epoch:0}),owner,resources,()=>true);
    await run('content-mutation',async()=>{
      let entered,release;const paused=new Promise(x=>release=x),atBarrier=new Promise(x=>entered=x),originalFlush=store.flush.bind(store);let once=true;
      store.flush=async()=>{await originalFlush();if(once){once=false;entered();await paused;}};
      try{
        const bytes=Buffer.from('GOOD'),packet=signed(grant('CREATE','content.txt',bytes),privateKey),pending=broker.execute(packet,bytes);
        void pending.catch(()=>{});await Promise.race([atBarrier,pending]);bytes.set(Buffer.from('EVIL'));release();const created=await pending;
        return {authorized_hash:packet.body.content_hash,actual_hash:created.sha256,actual_bytes:written.toString(),signature_content_bypassed:created.sha256!==packet.body.content_hash};
      }finally{release?.();store.flush=originalFlush;}
    });
    await run('wall-clock-rollback',async()=>{
      const packet=signed(grant('READ','clock.txt',null,25),privateKey),realNow=Date.now;await delay(45);let initialRejection;
      try{await broker.execute(packet);}catch(error){initialRejection=error.code;}
      Date.now=()=>packet.body.issued_at+1;let revived;
      try{revived=await broker.execute(packet);}finally{Date.now=realNow;}
      return {initial_rejection:initialRejection,revived_result:revived.assurance,revived_expired_grant:true};
    });
    await run('unbounded-native-file',async()=>{
      let enteredCount=0;const releases=[];
      const owner2={create:owner.create,read:()=>new Promise(resolveRead=>{enteredCount++;releases.push(()=>resolveRead(native(Buffer.from('read'))));})};
      const stalled=new FileBroker(store,privateKey,()=>r,()=>({policy_epoch:0,feature_epoch:0}),owner2,resources,()=>true);
      const jobs=Array.from({length:8},(_,i)=>stalled.execute(signed(grant('READ','stall-'+i+'.txt',null,500),privateKey)));
      jobs.forEach(p=>void p.catch(()=>{}));
      try{
        const limit=performance.now()+2000;while(enteredCount<8&&performance.now()<limit)await delay(5);
        await delay(525);let ninthRejection;try{await stalled.execute(signed(grant('READ','ninth.txt'),privateKey));}catch(error){ninthRejection=error.code;}
        return {observed_native_pending:enteredCount,after_grant_expiry:true,ninth_rejection:ninthRejection};
      }finally{releases.forEach(f=>f());await Promise.allSettled(jobs);}
    });
  }
  await run('cyclic-parent-graph',async()=>{
    const out=await store.artifacts.putBytes(Buffer.from(''));
    const g={schema:'agentnexus/remote-permit/1',permit_id:uid(),approval_id:uid(),operation_id:uid(),intent_hash:'a'.repeat(64),logical,runtime_id:r.runtime_id,worker_instance_id:r.worker_instance_id,host_boot_id:r.host_boot_id,broker_boot_id:r.broker_boot_id,generation:1,process:proc,parent,tool_id:'tool',tool_version:'1',resource_id:'project:output',profile_hash:r.profile_hash,policy_epoch:0,feature_epoch:0,issued_at:Date.now()-5,expires_at:Date.now()+1000,nonce:nonce(),arguments_hash:'b'.repeat(64)};
    const a={...proc,pid:13,start_id:'123456790'},b={...proc,pid:14,start_id:'123456791'},member=(process,parent)=>({process,parent,exited:true,exit_code:0,handle_signaled:true});
    const evidence={source:'REAL_WINDOWS',observation_id:'model-observation',process:proc,parent,job_id:'model-job',job_membership_verified:true,job_empty:true,membership_complete:true,unknown_members:false,members:[member(proc,parent),member(a,b),member(b,a)],root_exited:true,handles_closed:true,termination_requested_at:null,observed_at:new Date().toISOString(),sandbox:{profile_hash:r.profile_hash,token_verified:true,network_verified:true,filesystem_verified:true,limits_verified:true,settled:true},outputs:{stdout:{eof:true,producer_closed:true,producer_id:'out'},stderr:{eof:true,producer_closed:true,producer_id:'err'}}};
    const p=buildExitProof(g,evidence,out,out,'c'.repeat(64));return {state:p.state,production_release_authority:p.production_release_authority,graph:'root; A parent B; B parent A',os_observation:'SIMULATED injection, no actual process evidence'};
  });
}finally{await store.close();}
const after={};for(const name of watched)after[name]=sha256(await readFile(join(prefix,'production',name)));
result.source_unchanged=canonical(before)===canonical(after);await writeFile(join(dir,'probe-results.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result,null,2));
