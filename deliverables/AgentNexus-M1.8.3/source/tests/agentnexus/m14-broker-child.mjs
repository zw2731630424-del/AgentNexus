// Independent OS Broker fixture. Security observations are explicitly SIMULATED.
// The only executable is this package's fixed Node worker fixture; no shell or supplied path.
import { createPublicKey,generateKeyPairSync } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { initializeControl,clockFor } from '../../src/agentnexus/control.ts';
import { canonical,invariant,uid } from '../../src/agentnexus/types.ts';
import { ProductionAudit } from '../../src/agentnexus/production/audit.ts';
import { TrustedEndpoint } from '../../src/agentnexus/production/transport.ts';
import { QualificationGate } from '../../src/agentnexus/production/qualification.ts';
import { ProductionExecutionBroker } from '../../src/agentnexus/production/broker.ts';
import { serveBroker } from '../../src/agentnexus/production/service.ts';

let store,broker,connection,runtime,endpoint,tool,hostKey,qualification,helperHash,starts=0;
const keys=generateKeyPairSync('ed25519'),raw=Object.freeze({}),cancel=new AbortController();
let queue=[],waiter=null;
const send=message=>new Promise((resolve,reject)=>process.send(message,error=>error?reject(error):resolve()));
const transport={
  async receive(){if(queue.length)return queue.shift();return new Promise(resolve=>{waiter=resolve;});},
  close(){if(waiter){waiter(null);waiter=null;}queue=[];},
};
function deliver(delivery){invariant(queue.length<16,'FIXTURE_BACKPRESSURE');if(waiter){const next=waiter;waiter=null;next(delivery);}else queue.push(delivery);}
async function onMessage(m){
  invariant(Buffer.byteLength(JSON.stringify(m))<=98304,'FIXTURE_FRAME_LIMIT');
  if(m.action==='INIT'){
    store=await KernelStore.open(m.root);initializeControl(store);hostKey=createPublicKey(m.host_key);tool=m.tool;helperHash=m.helper_hash;qualification=m.qualification;
    await send({id:m.id,status:'BOOT',boot_id:clockFor(store).boot_id,public_key:keys.publicKey.export({type:'spki',format:'pem'}),pid:process.pid,security:'SIMULATED'});
  }else if(m.action==='BIND'){
    runtime=m.runtime;invariant(runtime.assurance==='SIMULATED','FIXTURE_SIMULATION_ONLY');
    endpoint=new TrustedEndpoint({peer:async()=>runtime.process,close(){}},()=>runtime,new ProductionAudit(store));
    connection=await endpoint.admit(runtime.runtime_id,raw);
    const gate=new QualificationGate(createPublicKey(qualification.key),[qualification.packet]);
    const supervisor={helper_hash:helperHash,ready:async()=>{},start(_runtime,g){
      starts++;
      const child=spawn(process.execPath,[fileURLToPath(new URL('./m14-native-worker.mjs',import.meta.url)),'normal'],{shell:false,windowsHide:true,env:{SystemRoot:process.env.SystemRoot??'C:\\Windows'},stdio:['ignore','pipe','pipe']});
      const exit=once(child,'close').then(([code])=>({source:'SIMULATED',observation_id:uid(),process:g.process,parent:g.parent,job_id:'SIMULATED_JOB_REAL_OS_PROCESS',job_membership_verified:true,job_empty:true,membership_complete:true,unknown_members:false,
        members:[{process:g.process,parent:g.parent,exited:true,exit_code:code,handle_signaled:true}],root_exited:true,handles_closed:true,termination_requested_at:null,observed_at:new Date().toISOString(),sandbox:{profile_hash:g.profile_hash,token_verified:true,network_verified:true,filesystem_verified:true,limits_verified:true,settled:true},outputs:{stdout:{eof:true,producer_closed:true,producer_id:'real-stdio-sim-owner-stdout'},stderr:{eof:true,producer_closed:true,producer_id:'real-stdio-sim-owner-stderr'}}}));
      return {stdout:child.stdout,stderr:child.stderr,exit,terminate(){child.kill();}};
    }};
    broker=new ProductionExecutionBroker({store,host_key:hostKey,broker_key:keys.privateKey,endpoint,gate,supervisor,runtime:()=>runtime,epochs:()=>m.epochs,features:()=>true,hostFence:async()=>{},tools:[tool]});
    await send({id:m.id,status:'BOUND',connection_id:connection.connection_id,secret:connection.secret.toString('hex')});
    void serveBroker(broker,transport,cancel.signal).catch(async error=>{await send({status:'FATAL',reason:error.code??error.message});process.exitCode=1;});
  }else if(m.action==='DISPATCH'){
    deliver({channel:connection.handle,body:Buffer.from(m.body,'base64'),disconnected:new Promise(()=>{}),respond:async result=>send({id:m.id,status:'RESULT',result,starts,consumed:Number(store.db.prepare('SELECT COUNT(*) n FROM m14_broker_operations').get().n),security:'SIMULATED'})});
  }else if(m.action==='CLOSE'){
    cancel.abort();transport.close();broker?.close();await store?.close();await send({id:m.id,status:'CLOSED'});process.disconnect();
  }else invariant(false,'FIXTURE_UNKNOWN_ACTION');
}
process.on('message',m=>{void onMessage(m).catch(async error=>{await send({id:m.id,status:'ERROR',reason:error.code??error.message});});});
process.on('disconnect',()=>{cancel.abort();broker?.close();transport.close();});
