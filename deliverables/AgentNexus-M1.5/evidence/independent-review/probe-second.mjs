import { generateKeyPairSync, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const base = new URL('../../../../deliverables/AgentNexus-M1.5/source/', import.meta.url);
const { NativePipeChannel } = await import(new URL('src/agentnexus/bootstrap/session.ts', base));
const { RemoteSupervisor } = await import(new URL('src/agentnexus/bootstrap/supervisor.ts', base));
const { canonical, sha256 } = await import(new URL('src/agentnexus/types.ts', base));
const { profileHash } = await import(new URL('src/agentnexus/runtime/contracts.ts', base));
const { signed } = await import(new URL('src/agentnexus/production/contracts.ts', base));
const pid = {os:'windows',principal:'S-1-5-21-10-20-30-1002',pid:12345,start_id:'100000',os_session:'1'};
const parent = {...pid,pid:12344,start_id:'90000'};
const logical={agent_id:'probe-agent',project_id:'probe-project',task_id:'probe-task',session_id:'probe-session',role:'worker'};
const profile={id:'AgentNexus.M15.Probe',version:1,os:'windows',os_version:'SIMULATED',principal:pid.principal,accessible:['task'],read_only:['runtime'],writable:[],network:'DENY',limits:{memory_bytes:67108864,cpu_ms:1000,wall_ms:1000,file_bytes:24576,processes:1,output_bytes:65536},lifetime:'ONE_OPERATION',exit_requirement:'COMPLETE_PROCESS_TREE'};
const results=[];
// Model only: one-in-flight native contract; interleave the exact START monitor
// recheck/output write. No native Windows process or account is created.
{
  let release;let busy=false;let closed=false;
  const native={get busy(){return busy;},close(){closed=true;},request(op){
    if(busy){const error=Error('M14_NATIVE_BACKPRESSURE');error.code='M14_NATIVE_BACKPRESSURE';throw error;}
    busy=true;
    if(op==='bootstrap.pipe.peer')return new Promise(resolve=>{release=()=>{busy=false;resolve({peer:pid});};});
    busy=false;return Promise.resolve({written:true});
  }};
  const channel=new NativePipeChannel(native,'SIMULATED-channel',pid);
  const monitoring=channel.recheck();await Promise.resolve();
  const timer=setTimeout(()=>release(),30);
  let failure=null;try{await channel.write(Buffer.from('SIMULATED-output'),Date.now()+1000);}catch(error){failure={code:error.code,message:error.message};}
  await monitoring;clearTimeout(timer);
  results.push({id:'RECHECK_OUTPUT_INTERLEAVE',assurance:'SIMULATED',defect_reproduced:failure?.code==='M14_NATIVE_BACKPRESSURE'&&closed,failure,closed,serial_rpc_fix_observed:failure===null&&!closed});
}
// Model only: real ephemeral Ed25519, synthetic identity/OS evidence fields. The
// REAL_WINDOWS string below deliberately models an adapter claim, not evidence.
{
  const kp=generateKeyPairSync('ed25519');let count=0;const args={data_base64:'eA=='};
  const fakeLink={close(){},async call(method){if(method==='PREPARE'){count++;return {id:'prep-'+count,process:{...pid,pid:pid.pid+count},parent,profile_hash:profileHash(profile),arguments_hash:sha256(canonical(args)),logical,runtime:null};}
    if(method==='START')return {source:'REAL_WINDOWS',process:{...pid,pid:pid.pid+count},parent};
    throw Error('Unexpected model method '+method);
  }};
  const supervisor=new RemoteSupervisor(fakeLink,sha256('probe-helper'),profile,kp.publicKey);
  let completed=0,failure=null;
  for(let i=1;i<=5;i++){
    try{
      const handle=await supervisor.prepare(logical,args),process={...pid,pid:pid.pid+i};
      const runtime={runtime_id:'runtime-'+i,logical,process,parent,worker_instance_id:'worker-'+i,host_boot_id:'host-boot',broker_boot_id:'broker-boot',generation:i,profile,profile_hash:profileHash(profile),state:'ACTIVE',assurance:'REAL_WINDOWS'};
      supervisor.attach(runtime,handle);
      const now=Date.now(),grant={schema:'agentnexus/remote-permit/1',permit_id:'permit-'+i,approval_id:'approval-'+i,operation_id:'operation-'+i,intent_hash:sha256('intent-'+i),logical,runtime_id:runtime.runtime_id,worker_instance_id:runtime.worker_instance_id,host_boot_id:runtime.host_boot_id,broker_boot_id:runtime.broker_boot_id,generation:i,process,parent,tool_id:'nexus.digest',tool_version:'1',resource_id:'probe-project:input',profile_hash:profileHash(profile),policy_epoch:1,feature_epoch:1,issued_at:now,expires_at:now+10000,nonce:sha256('nonce-'+i),arguments_hash:sha256(canonical(args))};
      supervisor.registerGrant(signed(grant,kp.privateKey));
      await supervisor.start(runtime,grant,args).exit;completed++;
    }catch(error){failure={iteration:i,code:error.code,message:error.message};break;}
  }
  supervisor.close();
  results.push({id:'COMPLETED_PREPARES_NOT_RETIRED',assurance:'SIMULATED',defect_reproduced:completed===4&&failure?.code==='M15_PREPARE_LIMIT',completed,failure,scope:'RemoteSupervisor object lifecycle only; no deployment or resource-release claim'});
}
const files=['src/agentnexus/bootstrap/session.ts','src/agentnexus/bootstrap/supervisor.ts','src/agentnexus/production/native-client.ts','src/agentnexus/production/windows-supervisor.ts'];
const hashes=Object.fromEntries(await Promise.all(files.map(async path=>[path,createHash('sha256').update(await readFile(new URL(path,base))).digest('hex')])));
console.log(JSON.stringify({schema:'agentnexus/independent-probe/1',timestamp:new Date().toISOString(),assurance:'SIMULATED',node:process.version,source_sha256:hashes,results},null,2));
