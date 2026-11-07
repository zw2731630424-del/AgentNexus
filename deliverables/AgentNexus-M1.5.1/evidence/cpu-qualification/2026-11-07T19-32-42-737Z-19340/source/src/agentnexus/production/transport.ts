import { randomBytes } from 'node:crypto';
import { canonical, invariant, NexusError, uid } from '../types.ts';
import { decodeFrame } from '../runtime/ipc.ts';
import { sameProcess, snapshot, validateProcess } from '../runtime/contracts.ts';
import type { Envelope, ProcessIdentity } from '../runtime/contracts.ts';
import { performance } from 'node:perf_hooks';
import type { Runtime } from './contracts.ts';
import { json } from './contracts.ts';
import { ProductionAudit } from './audit.ts';

export interface PeerObserver { peer(channel:object,signal:AbortSignal):Promise<ProcessIdentity>; close(channel:object):void; }
type Channel={raw:object;runtime:Runtime;peer:ProcessIdentity;id:string;key:Buffer;cancel:AbortController;open:boolean};
export class TrustedEndpoint {
  #channels=new Map<object,Channel>();#pending=new Set<Promise<unknown>>();#closed=false;
  #observer:PeerObserver;#current:(id:string)=>Runtime;#audit:ProductionAudit;
  #expectedPeer:(runtime:Runtime)=>ProcessIdentity;
  constructor(observer:PeerObserver,current:(id:string)=>Runtime,audit:ProductionAudit,expectedPeer:(runtime:Runtime)=>ProcessIdentity=r=>r.process){this.#observer=observer;this.#current=current;this.#audit=audit;this.#expectedPeer=expectedPeer;}
  async #observe(c:Channel,deadline:number):Promise<ProcessIdentity> {
    invariant(deadline>Date.now(),'M14_PEER_DEADLINE');const monotonic=performance.now()+Math.min(2000,deadline-Date.now());
    invariant(!this.#closed&&c.open&&!c.cancel.signal.aborted,'M14_CONNECTION_CLOSED');
    invariant(this.#pending.size<32,'M14_NATIVE_OBSERVER_LIMIT');
    const controller=new AbortController();const cancel=()=>controller.abort(new NexusError('M14_CONNECTION_CLOSED'));
    c.cancel.signal.addEventListener('abort',cancel,{once:true});
    const native=Promise.resolve().then(()=>{controller.signal.throwIfAborted();invariant(deadline>Date.now()&&performance.now()<monotonic,'M14_PEER_DEADLINE');return this.#observer.peer(c.raw,controller.signal);});
    this.#pending.add(native);void native.then(()=>this.#pending.delete(native),()=>this.#pending.delete(native));
    let timer:ReturnType<typeof setTimeout>|undefined;
    const expiry=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new NexusError('M14_PEER_DEADLINE'));},Math.max(1,Math.min(2000,deadline-Date.now())));});
    const revoked=new Promise<never>((_,reject)=>{controller.signal.addEventListener('abort',()=>reject(new NexusError('M14_CONNECTION_CLOSED')),{once:true});});
    try{const peer=snapshot(await Promise.race([native,expiry,revoked]));invariant(deadline>Date.now()&&performance.now()<monotonic,'M14_PEER_DEADLINE');validateProcess(peer);invariant(sameProcess(peer,c.peer),'M14_PEER_MISMATCH');return peer;}
    finally{clearTimeout(timer);c.cancel.signal.removeEventListener('abort',cancel);}
  }
  #live(c:Channel):Runtime {
    invariant(c.open&&!this.#closed,'M14_CONNECTION_CLOSED');const r=this.#current(c.runtime.runtime_id);
    invariant(r.state==='ACTIVE'&&canonical(r)===canonical(c.runtime)&&sameProcess(this.#expectedPeer(r),c.peer),'M14_IDENTITY_REVOKED');return r;
  }
  async admit(runtimeId:string,raw:object,deadline=Date.now()+2000) {
    invariant(!this.#closed&&this.#channels.size<32,'M14_CONNECTION_LIMIT');
    const runtime=snapshot(this.#current(runtimeId));invariant(runtime.state==='ACTIVE','M14_IDENTITY_REVOKED');
    const peer=snapshot(this.#expectedPeer(runtime));validateProcess(peer);
    const c:Channel={raw,runtime,peer,id:uid(),key:randomBytes(32),cancel:new AbortController(),open:true};
    const handle=Object.freeze({});this.#channels.set(handle,c); // Count pending admissions before awaiting an untrusted peer.
    try{
      await this.#observe(c,deadline);this.#live(c);
      this.#audit.record('ipc','PEER_AUTHENTICATED',runtime,runtimeId,json({connection_id:c.id,peer:c.peer,worker_process:runtime.process,payload_identity_used:false}));await this.#audit.barrier();this.#live(c);
      // Private bootstrap return, never a network key-exchange response.
      return Object.freeze({handle,connection_id:c.id,secret:Buffer.from(c.key)});
    }catch(error){this.#dispose(handle,c);try{this.#audit.record('ipc','PEER_REJECTED',runtime,runtimeId,json({reason:(error as any).code??'PEER_FAILED'}));await this.#audit.barrier();}catch{}throw error;}
  }
  async receive(handle:object,body:Uint8Array):Promise<{envelope:Envelope;runtime:Runtime}> {
    const c=this.#channels.get(handle);invariant(c,'M14_UNAUTHENTICATED');
    try{
      const e=snapshot(decodeFrame(body,c.key));this.#live(c);
      invariant(e.connection_id===c.id&&e.runtime_id===c.runtime.runtime_id&&e.worker_instance_id===c.runtime.worker_instance_id&&e.runtime_session_id===c.runtime.worker_instance_id&&e.profile_hash===c.runtime.profile_hash,'M14_IPC_BINDING');
      for(const k of ['agent_id','project_id','task_id','session_id'] as const)invariant(e[k]===c.runtime.logical[k],'M14_IPC_LOGICAL');
      invariant(e.deadline>Date.now(),'M14_IPC_EXPIRED');await this.#observe(c,e.deadline);this.#live(c);
      this.#audit.record('ipc','FRAME_AUTHENTICATED',c.runtime,e.operation_id,json({request_id:e.request_id,connection_id:c.id,payload_hash:e.payload_hash}),e.resource_id);await this.#audit.barrier();this.#live(c);
      return {envelope:e,runtime:c.runtime};
    }catch(error){try{this.#audit.record('ipc','FRAME_REJECTED',c.runtime,c.runtime.runtime_id,json({reason:(error as any).code??'INVALID_FRAME'}));await this.#audit.barrier();}catch{}throw error;}
  }
  async recheck(handle:object,deadline:number):Promise<void>{const c=this.#channels.get(handle);invariant(c,'M14_UNAUTHENTICATED');this.#live(c);await this.#observe(c,deadline);this.#live(c);}
  #dispose(handle:object,c:Channel){c.open=false;c.cancel.abort();c.key.fill(0);this.#channels.delete(handle);this.#observer.close(c.raw);}
  disconnect(handle:object):void {const c=this.#channels.get(handle);if(c)this.#dispose(handle,c);}
  revoke(runtimeId:string):void{for(const [h,c] of this.#channels)if(c.runtime.runtime_id===runtimeId)this.#dispose(h,c);}
  close():void{this.#closed=true;for(const [h,c] of this.#channels)this.#dispose(h,c);}
  stats(){return {connections:this.#channels.size,unsettled_observations:this.#pending.size};}
}
