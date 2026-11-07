import { readFile } from 'node:fs/promises';
import { createPrivateKey, createPublicKey } from 'node:crypto';
import { openHost } from '../host.ts';
import { KernelStore } from '../storage.ts';
import { adminEvent, initializeControl, metadata } from '../control.ts';
import { canonical, invariant, sha256, uid } from '../types.ts';
import type { Identity, Json, FeatureDefinition } from '../types.ts';
import type { ToolRequest } from '../gateway.ts';
import type { LogicalIdentity, SandboxProfile } from '../runtime/contracts.ts';
import { profileHash, snapshot } from '../runtime/contracts.ts';
import { REQUIRED_FEATURES, authenticated,signed,nonce } from '../production/contracts.ts';
import type { Grant, Signed, Tool } from '../production/contracts.ts';
import { ProductionAudit } from '../production/audit.ts';
import { ProductionGateway } from '../production/authority.ts';
import { ProductionIdentityRegistry } from '../production/identity.ts';
import { ProductionExecutionBroker } from '../production/broker.ts';
import type { OwnerReleaseReceipt } from '../production/broker.ts';
import { ProductionHost } from '../production/host.ts';
import { TrustedEndpoint } from '../production/transport.ts';
import { QualificationGate } from '../production/qualification.ts';
import { ExitProofVerifier } from '../production/exit.ts';
import { FileBroker } from '../production/file-broker.ts';
import type { FileGrant } from '../production/file-broker.ts';
import { WindowsFileOwner, NativeClient } from '../production/native-client.ts';
import { WindowsSupervisor } from '../production/windows-supervisor.ts';
import type { AttestedBootstrap, BootstrapConfig } from './config.ts';
import { attestationPins,attestBootstrap,attestNativeClient } from './config.ts';
import { AuthenticatedSession, LauncherLink, NativePipeChannel } from './session.ts';
import { RemoteSupervisor, WorkerLauncherService } from './supervisor.ts';
import { ExitClosureOwner } from './exit-closure.ts';
import type { ClosureObservation } from './exit-closure.ts';
import { proveLauncher,requireLauncherProof } from './launcher-proof.ts';
import { digestArguments } from './worker.ts';
import type { BrokeredInput } from './worker.ts';
import { BootstrapReservations } from './reservations.ts';

async function helper(c:BootstrapConfig):Promise<NativeClient>{return NativeClient.open({powerShell:c.powershell.path,powerShell_hash:c.powershell.sha256,script:c.native.script,script_hash:c.native.script_hash,native_hash:c.native.native_hash,bootstrap_hash:c.native.bootstrap_hash,temporary_directory:c.role==='HOST'?c.host_root:c.launcher_root});}
function tool(c:BootstrapConfig):Tool{return {id:'nexus.digest',version:'1',feature_id:'runtime.worker.production',policy_ids:['P.COMMAND_RISK'],capability:'PROCESS',profile_hash:profileHash(c.profile),executable_hash:c.node.sha256};}
async function listen(attested:AttestedBootstrap,name:string,peerSid:string,signal:AbortSignal):Promise<NativePipeChannel>{
  const c=attested.config,native=attested.native;
  const endpoint=await native.request('bootstrap.pipe.listen',{name,peer_sid:peerSid,peer_image:c.powershell.path,peer_image_sha256:c.powershell.sha256},{deadline_ms:2000,signal});
  const channel=await native.request('bootstrap.pipe.accept',{endpoint_id:endpoint.endpoint_id},{deadline_ms:30000,signal});return new NativePipeChannel(native,channel.channel_id,channel.peer);
}
export async function startWorkerLauncher(configPath:string,configHash:string,signal:AbortSignal):Promise<void>{
  const attested=await attestBootstrap(configPath,configHash),c=attested.config;invariant(c.role==='LAUNCHER','M15_BOOTSTRAP_ROLE');let supervisor:WindowsSupervisor|undefined;
  try{
    const channel=await attested.native.request('bootstrap.pipe.connect',{name:c.pipe_name,peer_sid:c.host_sid,peer_image:c.powershell.path,peer_image_sha256:c.powershell.sha256},{deadline_ms:30000,signal});
    const pipe=new NativePipeChannel(attested.native,channel.channel_id,channel.peer),enrollmentKey=createPrivateKey(await readFile(c.launcher_key));
    invariant(createPublicKey(enrollmentKey).export({type:'spki',format:'der'}).equals(createPublicKey(await readFile(c.launcher_public_key)).export({type:'spki',format:'der'})),'M15_LAUNCHER_KEY_MISMATCH');
    await proveLauncher(pipe,enrollmentKey,attested.process,{configuration_hash:configHash,source_manifest_hash:sha256(canonical(c.source_files)),helper_hash:attested.helper_hash});
    const session=await AuthenticatedSession.launcher(pipe);
    // Every child helper also pins and watches this trusted Launcher parent; no orphan helper can outlive it.
    supervisor=new WindowsSupervisor(async()=>{const n=await helper(c);try{await attestNativeClient(n,c,attestationPins(c,configPath,configHash),c.worker_sid);return n;}catch(error){n.close();throw error;}},attested.helper_hash,[{...tool(c),executable:c.node.path,cwd:c.code_root,argv:()=>[c.worker_script,'--host-key',c.host_public_key,'--key-sha256',c.host_public_key_hash]}]);
    await new WorkerLauncherService(session,supervisor,c.profile,c.host_sid,createPublicKey(await readFile(c.host_public_key)),()=>c.enable_features).serve(signal);
  }finally{supervisor?.close();attested.close();}
}

/** Constructible only after the trusted startup path has successfully attested its OS owner. */
export async function startHostRuntime(configPath:string,configHash:string,signal:AbortSignal){
  const attested=await attestBootstrap(configPath,configHash),c=attested.config;invariant(c.role==='HOST','M15_BOOTSTRAP_ROLE');
  let host:Awaited<ReturnType<typeof openHost>>|undefined,brokerStore:KernelStore|undefined,fileNative:NativeClient|undefined,supervisor:RemoteSupervisor|undefined,broker:ProductionExecutionBroker|undefined;
  try{
    // KernelStore's exclusive OS lock prevents duplicate instances; startup recovery never replays work.
    const allowed=[c.host_sid,c.operator_sid,'S-1-5-18','S-1-5-32-544'];
    const storage=[];for(const root of [c.host_root,c.broker_root]){const checked=await attested.native.request('bootstrap.storage.inspect',{root,allowed_principals:allowed},{deadline_ms:30000});invariant(checked.safe===true,'M15_STORAGE_ACL_UNVERIFIED');storage.push({root,manifest_hash:checked.manifest_sha256});}
    const recovery=[await KernelStore.recoverAbandonedLock(c.host_root),await KernelStore.recoverAbandonedLock(c.broker_root)];
    host=await openHost(c.host_root);brokerStore=await KernelStore.open(c.broker_root);initializeControl(brokerStore);
    adminEvent(host.store,'M15_BOOTSTRAP','OS_ATTESTED',{host_process:attested.process,config_hash:configHash,helper_hash:attested.helper_hash,node:process.version,storage,recovery,resources_released:false});await host.store.flush();
    const hostKey=createPrivateKey(await readFile(c.host_key)),hostPublic=createPublicKey(await readFile(c.host_public_key)),brokerKey=createPrivateKey(await readFile(c.broker_key));
    invariant(createPublicKey(hostKey).export({type:'spki',format:'der'}).equals(hostPublic.export({type:'spki',format:'der'})),'M15_HOST_KEY_MISMATCH');
    const pipe=await listen(attested,c.pipe_name,c.worker_sid,signal);await requireLauncherProof(pipe,createPublicKey(await readFile(c.launcher_public_key)),{configuration_hash:c.launcher_config_hash!,source_manifest_hash:sha256(canonical(c.source_files)),helper_hash:attested.helper_hash,worker_sid:c.worker_sid});const session=await AuthenticatedSession.host(pipe);
    const link=new LauncherLink(session);supervisor=new RemoteSupervisor(link,attested.helper_hash,c.profile,hostPublic);
    let reservations:BootstrapReservations;
    const registry=new ProductionIdentityRegistry(host.store,supervisor),authority=new ProductionGateway(host.store,host.features,host.policy,registry,hostKey,[tool(c)],1,g=>reservations.transfer(g));
    const endpoint=new TrustedEndpoint({peer:(_raw,s)=>session.recheck(s),close:()=>{}},id=>registry.inspect(id),new ProductionAudit(brokerStore),()=>session.peer);
    const qualification=new QualificationGate(createPublicKey(await readFile(c.qualification_public_key)),c.qualification_certificates,attested.process);
    broker=new ProductionExecutionBroker({store:brokerStore,host_key:hostPublic,broker_key:brokerKey,endpoint,gate:qualification,supervisor,runtime:id=>registry.inspect(id),epochs:()=>metadata(host!.store),features:()=>REQUIRED_FEATURES.every(f=>host!.features.resolve(f).effective==='ON'),hostFence:async g=>{authority.fence(g);await registry.recheck(g.runtime_id);},tools:[tool(c)],max_workers:1});
    const closure=new ExitClosureOwner(host.store),verifier=new ExitProofVerifier(host.store,createPublicKey(brokerKey),ref=>brokerStore!.artifacts.read(ref),(operation,hash)=>closure.assertRelease(operation,hash),()=>{invariant(REQUIRED_FEATURES.every(f=>host!.features.resolve(f).effective==='ON')&&!host!.store.faulted,'M15_INDEPENDENT_RELEASE_POLICY_DENIED');});
    const connections=new Map<string,Awaited<ReturnType<TrustedEndpoint['admit']>>>();
    const remote=new ProductionHost(authority,{connection:r=>{const channel=connections.get(r.runtime_id);invariant(channel,'M15_CHANNEL_REQUIRED');return channel;},send:async(r,frame)=>{
      // This local trusted bridge never substitutes a self-reported child SID for the actual Launcher peer.
      const raw=JSON.parse(new TextDecoder().decode(frame.subarray(4))) as {envelope:{payload:{grant:Signed<Grant>;arguments:Json}}},packet=raw.envelope.payload.grant,g=packet.body,args=digestArguments(raw.envelope.payload.arguments);let input:BrokeredInput|null=null;
      if('file' in args){invariant(args.file.resource_id===c.resource.id&&args.file.resource_id===g.resource_id,'M15_EXACT_FILE_RESOURCE');const f:FileGrant={schema:'agentnexus/file-permit/1',operation_id:g.operation_id,runtime_id:g.runtime_id,worker_instance_id:g.worker_instance_id,host_boot_id:g.host_boot_id,project_id:g.logical.project_id,task_id:g.logical.task_id,resource_id:g.resource_id,profile_hash:g.profile_hash,path:args.file.path,action:'READ',expected_hash:args.file.expected_hash,content_hash:null,max_bytes:args.file.max_bytes,nonce:nonce(),issued_at:Date.now(),expires_at:Math.min(g.expires_at,Date.now()+5000),policy_epoch:g.policy_epoch,feature_epoch:g.feature_epoch},filePermit=signed(f,hostKey),result=await files.execute(filePermit);
        const chunks:Buffer[]=[];let total=0;for await(const bytes of host!.store.artifacts.read(result.artifact)){total+=bytes.length;invariant(total<=args.file.max_bytes,'M15_FILE_INPUT_LIMIT');chunks.push(Buffer.from(bytes));}input={permit:filePermit,data_base64:Buffer.concat(chunks).toString('base64')};
      }
      supervisor!.registerGrant(packet,input);
      const channel=connections.get(r.runtime_id);invariant(channel,'M15_CHANNEL_REQUIRED');return broker!.dispatch(channel.handle,frame.subarray(4));
    },qualificationEvidence:r=>qualification.admit(r,tool(c),attested.helper_hash).evidence_hash},verifier);
    reservations=new BootstrapReservations(host.store,()=>c.enable_features&&REQUIRED_FEATURES.every(f=>host!.features.resolve(f).effective==='ON'),attested.process,c.resource.id,profileHash(c.profile));
    await registry.recover();await authority.recover();await broker.recover();await reservations.recover();
    const definitions=JSON.parse(await readFile(new URL('../../../config/agentnexus/features.json',import.meta.url),'utf8')).features as FeatureDefinition[];
    const required=new Set<string>();const visit=(id:string)=>{if(required.has(id))return;required.add(id);const d=definitions.find(d=>d.id===id);invariant(d,'M15_FEATURE_CATALOG');for(const dep of d.depends_on)visit(dep);};for(const f of REQUIRED_FEATURES)visit(f);
    for(const f of required)if(definitions.find(d=>d.id===f)?.kind!=='CORE')host.administration.registerModule(f,{preflight:async()=>{invariant(c.qualification_certificates.length>0,'M15_DEPLOYMENT_NOT_QUALIFIED');},stop:async()=>{broker!.close();supervisor!.close();}});
    if(c.enable_features){const changes=[...required].filter(id=>definitions.find(d=>d.id===id)?.kind!=='CORE').map(id=>({id,scope:{},state:'ON' as const}));const p=await host.administration.previewFeatures(changes,host.administration.metadata().feature_revision);await host.administration.commitFeatures(p.challenge_id,p.preview_hash);}
    fileNative=await helper(c);await attestNativeClient(fileNative,c,attestationPins(c,configPath,configHash),c.host_sid);
    const files=new FileBroker(host.store,hostPublic,id=>registry.inspect(id),()=>metadata(host!.store),new WindowsFileOwner(fileNative),[{...c.resource,kind:'PROJECT_READ_ONLY'}],()=>host!.features.resolve('runtime.file_broker').effective==='ON',id=>registry.recheck(id));
    adminEvent(host.store,'M15_BOOTSTRAP','READY',{host_process:attested.process,launcher_peer:session.peer,config_hash:configHash,process_dispatch:c.enable_features?'QUALIFICATION_REQUIRED':'BLOCKED_FEATURE_OFF',production_release:'EXPLICIT_OWNER_AND_POLICY_REQUIRED'});await host.store.flush();
    let closed=false,busy=0,unavailable=false;const bound=new Map<string,ReturnType<ProductionHost['bindAgent']>>();
    const acknowledgeRelease=async(operation:string)=>{
      const row=host!.store.db.prepare("SELECT grant_body FROM m14_host_operations WHERE operation=? AND state='RELEASED'").get(operation) as {grant_body:string}|undefined;invariant(row,'M15_HOST_RELEASE_REQUIRED');const g=JSON.parse(row.grant_body) as Grant;
      const proof=host!.store.db.prepare('SELECT body,signed_packet FROM m14_verified_exit_proofs WHERE operation=?').get(operation) as {body:string;signed_packet:string}|undefined;invariant(proof&&canonical(authenticated(JSON.parse(proof.signed_packet),createPublicKey(brokerKey)))===proof.body,'M15_SIGNED_EXIT_REQUIRED');const p=JSON.parse(proof.body) as {evidence_hash:string};closure.assertRelease(operation,p.evidence_hash);
      const released=host!.store.db.prepare('SELECT resource_versions,proof_hash FROM m14_release_authorizations WHERE operation=? AND consumed=1').get(operation) as {resource_versions:string;proof_hash:string}|undefined;
      invariant(released&&released.proof_hash===p.evidence_hash&&host!.store.db.prepare("SELECT 1 FROM control_reconciliations WHERE operation_id=? AND action='RELEASE_WRITER' AND writer_released=1").get(operation),'M15_HOST_RELEASE_REQUIRED');
      const versions=(JSON.parse(released.resource_versions) as OwnerReleaseReceipt['resource_versions']).map(v=>({...v,state:'RELEASED' as const,revision:v.revision+1}));invariant(versions.length===5,'M15_HOST_RELEASE_REQUIRED');
      const receipt:OwnerReleaseReceipt={schema:'agentnexus/owner-release/1',operation_id:operation,intent_hash:g.intent_hash,proof_hash:p.evidence_hash,host_boot_id:g.host_boot_id,broker_boot_id:g.broker_boot_id,resource_versions:versions,nonce:nonce(),issued_at:Date.now(),expires_at:Date.now()+30000};await broker!.acknowledgeOwnerRelease(signed(receipt,hostKey));return {broker_acknowledged:true};
    };
    const keepAlive=setInterval(()=>{if(closed||busy||link.pending||session.transportBusy)return;void link.call('PING',{},'KEEPALIVE',Date.now()+2000).catch(()=>{broker!.close();supervisor!.close();});},10000);keepAlive.unref();
    return Object.freeze({
      async prepare(logical:LogicalIdentity,args:Json){logical=snapshot(logical);args=snapshot(args);invariant(!closed&&!unavailable&&c.enable_features&&logical.project_id===c.resource.project_id&&logical.task_id===c.resource.task_id,'M15_PREPARE_BLOCKED');busy++;let bootstrapId:string|undefined,runtimeId:string|undefined,invoked=false;try{
        const validated=digestArguments(args);if('file' in validated)invariant(validated.file.resource_id===c.resource.id,'M15_EXACT_FILE_RESOURCE');
        bootstrapId=await reservations.claim(logical,args);reservations.fence();invoked=true;
        const handle=await supervisor!.prepare(logical,args),r=await registry.bind(logical,handle,c.profile,broker!.boot_id);runtimeId=r.runtime_id;supervisor!.attach(r,handle);await reservations.bind(bootstrapId,r);
        const channel=await endpoint.admit(r.runtime_id,Object.freeze({}));connections.set(r.runtime_id,channel);
        const identity:Identity={agent_id:logical.agent_id,project_id:logical.project_id,task_id:logical.task_id,session_id:logical.session_id},agent=remote.bindAgent(identity,r.runtime_id);bound.set(r.runtime_id,agent);
        const request={call_id:uid(),tool_id:'nexus.digest',tool_version:'1',arguments:args,resource_id:c.resource.id};new ProductionAudit(host!.store).record('worker','BOOTSTRAP_BOUND',r,r.runtime_id,{bootstrap_operation_id:bootstrapId,actual_launcher_peer:session.peer,untrusted_code_started:false});await host!.store.flush();return {bootstrap_operation_id:bootstrapId,runtime_id:r.runtime_id,request,preview:agent.preview(request)};
        }catch(error){const id=bootstrapId??(error as {bootstrap_id?:string}).bootstrap_id;if(id)try{await reservations.failed(id,invoked,error instanceof Error?error.name:'BOOTSTRAP_UNCERTAIN');}catch{}if(invoked){unavailable=true;supervisor!.close();broker!.close();if(runtimeId){endpoint.revoke(runtimeId);connections.delete(runtimeId);bound.delete(runtimeId);try{await registry.revoke(runtimeId,'BOOTSTRAP_UNCERTAIN');}catch{}}registry.close();}throw error;}finally{busy--;}
      },
      approve:(hash:string,identity:Identity,reason:string)=>{invariant(!closed,'M15_HOST_CLOSED');return host!.administration.approve(hash,identity,reason);},
      async request(runtimeId:string,request:ToolRequest){invariant(!closed&&!unavailable,'M15_HOST_CLOSED');const agent=bound.get(runtimeId);invariant(agent,'M15_RUNTIME_UNKNOWN');busy++;try{return await agent.request(snapshot(request));}finally{endpoint.revoke(runtimeId);connections.delete(runtimeId);bound.delete(runtimeId);try{if(await reservations.endRuntime(runtimeId)){unavailable=true;supervisor!.close();broker!.close();}await registry.revoke(runtimeId,'ONE_OPERATION_LIFETIME_ENDED');}catch(error){unavailable=true;registry.close();supervisor!.close();throw error;}finally{busy--;}}},
      async closeExit(operation:string,o:ClosureObservation){const row=host!.store.db.prepare('SELECT body FROM m14_verified_exit_proofs WHERE operation=?').get(operation) as {body:string}|undefined;invariant(row,'M15_PROOF_REQUIRED');return closure.close(JSON.parse(row.body),o);},
      // Trusted operator plane only. No Agent receives any administration or file owner object.
      administration:host.administration,files,verifier,
      acknowledgeRelease,
      async commitReconciliation(challenge:string,hash:string){const result=await host!.administration.commitReconciliation(challenge,hash);if(result.writer_released)await acknowledgeRelease(result.operation_id);return result;},
      status:()=>({ready:!closed&&!unavailable,host_process:attested.process,launcher_peer:session.peer,features_enabled:c.enable_features,production:'BLOCKED_UNTIL_REAL_COMBINATION_QUALIFICATION',broker:broker!.stats(),bootstrap_reservations:reservations.stats(),session:session.stats()}),
      async close(){if(closed)return;closed=true;clearInterval(keepAlive);remote.close();broker!.close();supervisor!.close();fileNative!.close();for(const row of host!.store.db.prepare('SELECT operation FROM m14_host_operations WHERE state<>?').all('RELEASED') as {operation:string}[])try{await authority.quarantine(row.operation,'HOST_SHUTDOWN_REQUIRES_EXIT_RECONCILIATION');}catch{}await brokerStore!.close();await host!.close();attested.close();},
    });
  }catch(error){broker?.close();supervisor?.close();fileNative?.close();if(brokerStore)await brokerStore.close().catch(()=>{});if(host)await host.close().catch(()=>{});attested.close();throw error;}
}
