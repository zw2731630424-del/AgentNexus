// Controlled Host crash fixture. Observation provider is explicitly a protocol model.
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { initializeControl } from '../../src/agentnexus/control.ts';
import { RuntimeControl } from '../../src/agentnexus/runtime/control.ts';
import { invariant, uid } from '../../src/agentnexus/types.ts';
const [root,mode]=process.argv.slice(2),token={},store=await KernelStore.open(root);initializeControl(store);
const logical={agent_id:'crash',project_id:'crash-project',task_id:'task',session_id:'session',role:'worker'};
const processIdentity={os:'windows',principal:'S-1-5-21-1-2-3-1001',pid:process.pid,start_id:'100',os_session:'1'},parent={...processIdentity,pid:1,start_id:'1'};
const profile={id:'crash-model',version:1,os:'windows',os_version:'MODEL',principal:processIdentity.principal,accessible:[],read_only:[],writable:[],network:'DENY',limits:{memory_bytes:1048576,cpu_ms:1000,wall_ms:1000,file_bytes:1024,processes:1,output_bytes:1024},lifetime:'ONE_OPERATION',exit_requirement:'COMPLETE_PROCESS_TREE'};
const provider={assurance:'MODEL',peer:async()=>processIdentity,exit:async()=>({process:processIdentity,parent,container_id:'model-job',members:[{process:processIdentity,exited:true,exit_code:0}],termination_requested_at:null,root_exited:true,tree_empty:true,membership_complete:false,unknown_members:true,handles_closed:false,outputs_closed:false,observed_at:new Date().toISOString(),source:'MODEL'})};
const control=new RuntimeControl(store,a=>invariant(a===token,'ADMIN_CAPABILITY_REQUIRED'),provider,()=>true);
const binding=await control.create(token,logical,processIdentity,parent,profile),c=await control.authenticate(token,binding.runtime_id,{});await control.activate(token,c.handle);
const operation=uid();await control.reserve(token,binding.runtime_id,operation,['WRITER','WORKSPACE_LOCK','WORKER_QUOTA','PROCESS_SLOT','SANDBOX_RESERVATION'].map(kind=>({kind,resource:'crash-project:'+kind})));
let proof=null;
if(mode!=='resources-held')proof=await control.observeExit(token,binding.runtime_id,operation);
const ready=()=>process.send?.({runtime_id:binding.runtime_id,operation_id:operation,proof_id:proof?.proof_id??null,mode});
if(mode==='release-barrier'){
  const flush=store.flush.bind(store);store.flush=async()=>{await flush();ready();await new Promise(()=>{});};
  await control.release(token,binding.runtime_id,operation,proof.proof_id);
}else{ready();setInterval(()=>{},1000);}
