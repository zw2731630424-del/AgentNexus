import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { canonical, invariant, sha256, uid } from '../types.ts';
import type { Json } from '../types.ts';
import { keys, snapshot, validateProcess } from '../runtime/contracts.ts';
import type { ProcessIdentity } from '../runtime/contracts.ts';
import { DeadlineGuard } from '../production/contracts.ts';
import { NativeClient } from '../production/native-client.ts';

export interface PrivateChannel {
  readonly peer:ProcessIdentity;
  read(deadline:number,signal?:AbortSignal):Promise<Uint8Array>;
  write(bytes:Uint8Array,deadline:number,signal?:AbortSignal):Promise<void>;
  recheck(signal?:AbortSignal):Promise<ProcessIdentity>;
  close():void;
}
export class NativePipeChannel implements PrivateChannel {
  readonly peer:ProcessIdentity;readonly id:string;#native:NativeClient;#closed=false;
  #tail:Promise<void>=Promise.resolve();#queued=0;
  constructor(native:NativeClient,id:string,peer:ProcessIdentity){this.#native=native;this.id=id;this.peer=snapshot(peer);validateProcess(this.peer);}
  #deadline(deadline:number):number{invariant(!this.#closed&&Number.isSafeInteger(deadline)&&deadline>Date.now(),'M15_PIPE_DEADLINE');return Math.min(30000,Math.max(1,deadline-Date.now()));}
  async #rpc<T>(work:()=>Promise<T>):Promise<T>{
    invariant(!this.#closed&&this.#queued<4,'M15_PIPE_RPC_BACKPRESSURE');this.#queued++;const previous=this.#tail;let release!:()=>void;this.#tail=new Promise<void>(resolve=>{release=resolve;});
    try{await previous;invariant(!this.#closed,'M15_CHANNEL_CLOSED');return await work();}finally{this.#queued--;release();}
  }
  async read(deadline:number,signal?:AbortSignal):Promise<Uint8Array>{
    try{const r=await this.#rpc(()=>this.#native.request('bootstrap.pipe.read',{channel_id:this.id},{deadline_ms:this.#deadline(deadline),signal}));
      invariant(typeof r.payload_base64==='string'&&r.payload_base64.length<=32768,'M15_PIPE_FRAME_LIMIT');const bytes=Buffer.from(r.payload_base64,'base64');invariant(bytes.length>0&&bytes.length<=24576,'M15_PIPE_FRAME_LIMIT');return bytes;
    }catch(error){this.close();throw error;}
  }
  async write(bytes:Uint8Array,deadline:number,signal?:AbortSignal):Promise<void>{
    invariant(bytes.length>0&&bytes.length<=24576,'M15_PIPE_FRAME_LIMIT');const owned=Buffer.from(bytes);try{await this.#rpc(()=>this.#native.request('bootstrap.pipe.write',{channel_id:this.id,payload_base64:owned.toString('base64')},{deadline_ms:this.#deadline(deadline),signal}));}catch(error){this.close();throw error;}
  }
  async recheck(signal?:AbortSignal):Promise<ProcessIdentity>{
    invariant(!this.#closed,'M15_CHANNEL_CLOSED');try{const r=await this.#rpc(()=>this.#native.request('bootstrap.pipe.peer',{channel_id:this.id},{deadline_ms:1000,signal}));
      validateProcess(r.peer);invariant(canonical(r.peer)===canonical(this.peer),'M15_PEER_CHANGED');return this.peer;
    }catch(error){this.close();throw error;}
  }
  async local():Promise<ProcessIdentity>{const r=await this.#rpc(()=>this.#native.request('bootstrap.pipe.peer',{channel_id:this.id},{deadline_ms:1000}));validateProcess(r.self);return snapshot(r.self);}
  get busy():boolean{return this.#native.busy;}
  close():void{if(this.#closed)return;this.#closed=true;this.#native.close();}
}
export type SessionMessage={schema:'agentnexus/bootstrap-message/1';session:string;direction:'HOST'|'LAUNCHER';seq:number;nonce:string;issued:number;expires:number;request_id:string;operation_id:string;kind:string;payload:Json};
type Packet={body:SessionMessage;mac:string};
export class AuthenticatedSession {
  #channel:PrivateChannel;#key:Buffer;#session:string;#role:'HOST'|'LAUNCHER';#out=0;#in=0;#closed=false;#sending=false;#receiving=false;
  #seen=new Set<string>();#deadlines=new DeadlineGuard();
  private constructor(channel:PrivateChannel,key:Buffer,session:string,role:'HOST'|'LAUNCHER'){this.#channel=channel;this.#key=key;this.#session=session;this.#role=role;}
  static async host(channel:PrivateChannel,deadline=Date.now()+3000):Promise<AuthenticatedSession>{
    const key=randomBytes(32),session=uid(),challenge=randomBytes(32).toString('hex');await channel.recheck();
    try{await channel.write(Buffer.from(canonical({schema:'agentnexus/private-bootstrap/1',session,key:key.toString('base64'),challenge})),deadline);
      const ready=new AuthenticatedSession(channel,key,session,'HOST'),ack=await ready.receive(deadline);invariant(ack.kind==='READY'&&canonical(ack.payload)===canonical({challenge}),'M15_BOOTSTRAP_ACK');return ready;
    }catch(error){key.fill(0);channel.close();throw error;}
  }
  static async launcher(channel:PrivateChannel,deadline=Date.now()+3000):Promise<AuthenticatedSession>{
    await channel.recheck();try{const bytes=await channel.read(deadline),raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes),b=JSON.parse(raw) as {schema:string;session:string;key:string;challenge:string};
      keys(b,['schema','session','key','challenge']);invariant(canonical(b)===raw&&b.schema==='agentnexus/private-bootstrap/1'&&/^[a-f0-9-]{36}$/.test(b.session)&&/^[a-f0-9]{64}$/.test(b.challenge),'M15_BOOTSTRAP');
      const key=Buffer.from(b.key,'base64');invariant(key.length===32&&key.toString('base64')===b.key,'M15_BOOTSTRAP_KEY');
      const ready=new AuthenticatedSession(channel,key,b.session,'LAUNCHER');await ready.send('READY',{challenge:b.challenge},uid(),'BOOTSTRAP',deadline);return ready;
    }catch(error){channel.close();throw error;}
  }
  get peer():ProcessIdentity{return this.#channel.peer;}
  get transportBusy():boolean{return this.#channel instanceof NativePipeChannel&&this.#channel.busy;}
  async recheck(signal?:AbortSignal):Promise<ProcessIdentity>{invariant(!this.#closed,'M15_SESSION_CLOSED');return this.#channel.recheck(signal);}
  async send(kind:string,payload:Json,requestId:string,operationId:string,deadline:number,signal?:AbortSignal):Promise<void>{
    invariant(!this.#closed&&!this.#sending&&this.#out<4096,'M15_SESSION_BACKPRESSURE');this.#sending=true;
    try{invariant(/^[A-Z_]{1,32}$/.test(kind)&&/^[A-Za-z0-9_.:-]{1,128}$/.test(requestId)&&/^[A-Za-z0-9_.:-]{1,128}$/.test(operationId),'M15_MESSAGE_ID');
      const now=Date.now();invariant(deadline>now&&deadline-now<=30000,'M15_MESSAGE_DEADLINE');
      const body:SessionMessage={schema:'agentnexus/bootstrap-message/1',session:this.#session,direction:this.#role,seq:++this.#out,nonce:randomBytes(32).toString('hex'),issued:now,expires:deadline,request_id:requestId,operation_id:operationId,kind,payload:snapshot(payload,16384)};
      const mac=createHmac('sha256',this.#key).update(canonical(body)).digest('hex');await this.#channel.write(Buffer.from(canonical({body,mac})),deadline,signal);
    }catch(error){this.close();throw error;}finally{this.#sending=false;}
  }
  async receive(deadline:number,signal?:AbortSignal):Promise<SessionMessage>{
    invariant(!this.#closed&&!this.#receiving&&this.#in<4096,'M15_SESSION_BACKPRESSURE');this.#receiving=true;
    try{const bytes=await this.#channel.read(deadline,signal),raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes),packet=JSON.parse(raw) as Packet;keys(packet,['body','mac']);
      invariant(canonical(packet)===raw&&typeof packet.mac==='string'&&/^[a-f0-9]{64}$/.test(packet.mac),'M15_MESSAGE_ENCODING');
      const expected=createHmac('sha256',this.#key).update(canonical(packet.body)).digest();invariant(timingSafeEqual(expected,Buffer.from(packet.mac,'hex')),'M15_MESSAGE_MAC');
      const b=snapshot(packet.body);keys(b,['schema','session','direction','seq','nonce','issued','expires','request_id','operation_id','kind','payload']);
      invariant(b.schema==='agentnexus/bootstrap-message/1'&&b.session===this.#session&&b.direction!==(this.#role)&&['HOST','LAUNCHER'].includes(b.direction)&&b.seq===this.#in+1,'M15_MESSAGE_SESSION');
      invariant(typeof b.nonce==='string'&&/^[a-f0-9]{64}$/.test(b.nonce)&&!this.#seen.has(b.nonce),'M15_MESSAGE_REPLAY');
      invariant(Number.isSafeInteger(b.issued)&&Number.isSafeInteger(b.expires)&&b.expires>b.issued&&b.expires-b.issued<=30000&&Date.now()<deadline,'M15_MESSAGE_DEADLINE');this.#deadlines.check(b.issued,b.expires);
      invariant(/^[A-Z_]{1,32}$/.test(b.kind)&&/^[A-Za-z0-9_.:-]{1,128}$/.test(b.request_id)&&/^[A-Za-z0-9_.:-]{1,128}$/.test(b.operation_id),'M15_MESSAGE_ID');
      snapshot(b.payload,16384);this.#seen.add(b.nonce);this.#in++;return b;
    }catch(error){this.close();throw error;}finally{this.#receiving=false;}
  }
  close():void{if(this.#closed)return;this.#closed=true;this.#key.fill(0);this.#channel.close();}
  stats(){return {received:this.#in,sent:this.#out,closed:this.#closed,nonces:this.#seen.size,peer_hash:sha256(canonical(this.peer))};}
}

/** One outstanding operation; consumed work is never retransmitted after a disconnect. */
export class LauncherLink {
  readonly session:AuthenticatedSession;#pending=false;#closed=false;
  constructor(session:AuthenticatedSession){this.session=session;}
  get pending():boolean{return this.#pending;}
  async call(method:string,payload:Json,operation:string,deadline:number,signal?:AbortSignal,onEvent?:(payload:Json)=>Promise<void>):Promise<Json>{
    invariant(!this.#closed&&!this.#pending,'M15_LAUNCHER_BUSY');this.#pending=true;const request=uid();
    try{await this.session.send(method,payload,request,operation,deadline,signal);
      for(;;){const response=await this.session.receive(deadline,signal);invariant(response.request_id===request&&response.operation_id===operation,'M15_RPC_CORRELATION');
        if(response.kind==='EVENT'){invariant(onEvent,'M15_RPC_UNEXPECTED_EVENT');await onEvent(response.payload);continue;}
        invariant(response.kind==='RESULT'||response.kind==='ERROR','M15_RPC_KIND');invariant(response.kind==='RESULT','M15_LAUNCHER_REJECTED');return response.payload;}
    }catch(error){this.close();throw error;}finally{this.#pending=false;}
  }
  close():void{this.#closed=true;this.session.close();}
}
