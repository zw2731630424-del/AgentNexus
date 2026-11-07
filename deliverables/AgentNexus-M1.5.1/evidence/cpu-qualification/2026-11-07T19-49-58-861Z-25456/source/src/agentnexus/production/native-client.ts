import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname,isAbsolute,join } from 'node:path';
import { canonical,invariant,NexusError,sha256,uid } from '../types.ts';
import type { Json } from '../types.ts';
import type { NativeFileOwner } from './file-broker.ts';

export type NativeEvent={id:string;event:'stdout'|'stderr';data_base64:string};
type Pending={id:string;resolve:(x:any)=>void;reject:(e:unknown)=>void;event?:(e:NativeEvent)=>Promise<void>;timer:ReturnType<typeof setTimeout>;cancel:()=>void};
/** Private inherited stdio only. No listener, argv key, environment credential or shell. */
export class NativeClient {
  #child:ChildProcessWithoutNullStreams;#pending:Pending|null=null;#buffer=Buffer.alloc(0);#closed=false;#stderrBytes=0;
  readonly helper_hash:string;readonly pid:number;
  private constructor(powerShell:string,script:string,helperHash:string,temporaryDirectory:string){
    this.helper_hash=helperHash;
    const win=process.env.SystemRoot??'C:\\Windows';
    this.#child=spawn(powerShell,['-NoProfile','-NonInteractive','-File',script],{shell:false,windowsHide:true,stdio:'pipe',cwd:dirname(script),env:{SystemRoot:win,WINDIR:win,TEMP:temporaryDirectory,TMP:temporaryDirectory,PSModulePath:''}});
    this.pid=this.#child.pid??0;
    this.#child.stdout.on('data',(chunk:Buffer)=>{
      this.#child.stdout.pause();void this.#consume(chunk).then(()=>{if(!this.#closed)this.#child.stdout.resume();},error=>this.#fail(error));
    });
    this.#child.stderr.on('data',(chunk:Buffer)=>{this.#stderrBytes+=chunk.length;if(this.#stderrBytes>65536)this.#fail(new NexusError('M14_NATIVE_STDERR_LIMIT'));});
    this.#child.on('error',error=>this.#fail(error));
    this.#child.on('exit',()=>this.#fail(new NexusError('M14_NATIVE_EXIT')));
  }
  static async open(options:{powerShell:string;script:string;script_hash:string;native_hash:string;bootstrap_hash?:string;powerShell_hash?:string;temporary_directory:string}):Promise<NativeClient>{
    for(const path of [options.powerShell,options.script,options.temporary_directory])invariant(isAbsolute(path),'M14_NATIVE_ABSOLUTE_PATH_REQUIRED');
    invariant(sha256(await readFile(options.script))===options.script_hash&&sha256(await readFile(join(dirname(options.script),'NativeRuntime.cs')))===options.native_hash,'M14_NATIVE_HASH_CHANGED');
    if(options.bootstrap_hash!==undefined)invariant(sha256(await readFile(join(dirname(options.script),'BootstrapNative.cs')))===options.bootstrap_hash,'M15_BOOTSTRAP_HASH_CHANGED');
    if(options.powerShell_hash!==undefined)invariant(sha256(await readFile(options.powerShell))===options.powerShell_hash,'M15_POWERSHELL_HASH_CHANGED');
    // Production code-directory ACL and pinned executable qualification remain separate required deployment evidence.
    return new NativeClient(options.powerShell,options.script,sha256(canonical({script:options.script_hash,native:options.native_hash,...(options.bootstrap_hash===undefined?{}:{bootstrap:options.bootstrap_hash})})),options.temporary_directory);
  }
  async #consume(chunk:Buffer):Promise<void>{
    invariant(chunk.length<=65536,'M14_NATIVE_FRAME_LIMIT');let offset=0;
    while(offset<chunk.length){
      const end=chunk.indexOf(10,offset),part=chunk.subarray(offset,end<0?chunk.length:end);
      invariant(this.#buffer.length+part.length+1<=65536,'M14_NATIVE_FRAME_LIMIT');this.#buffer=Buffer.concat([this.#buffer,part]);
      offset=end<0?chunk.length:end+1;if(end<0)break;
      const raw=new TextDecoder('utf-8',{fatal:true}).decode(this.#buffer);this.#buffer=Buffer.alloc(0);
      const packet=JSON.parse(raw),pending=this.#pending;invariant(pending&&packet.id===pending.id,'M14_NATIVE_UNEXPECTED_FRAME');
      if(packet.event){
        invariant(['stdout','stderr'].includes(packet.event)&&typeof packet.data_base64==='string'&&packet.data_base64.length<=8192&&/^[A-Za-z0-9+/]*={0,2}$/.test(packet.data_base64),'M14_NATIVE_EVENT');
        invariant(pending.event,'M14_NATIVE_UNEXPECTED_OUTPUT');await pending.event(packet);continue;
      }
      invariant(typeof packet.ok==='boolean','M14_NATIVE_RESPONSE');
      clearTimeout(pending.timer);pending.cancel();this.#pending=null;
      if(packet.ok)pending.resolve(packet.result);else pending.reject(new NexusError('M14_NATIVE_'+String(packet.error?.code??'FAILURE')));
    }
  }
  request(op:string,params:Json={},options:{deadline_ms?:number;signal?:AbortSignal;onEvent?:(e:NativeEvent)=>Promise<void>}={}):Promise<any>{
    invariant(!this.#closed&&!this.#pending,'M14_NATIVE_BACKPRESSURE');const deadline=options.deadline_ms??5000;
    invariant(Number.isSafeInteger(deadline)&&deadline>0&&deadline<=30000,'M14_NATIVE_DEADLINE');options.signal?.throwIfAborted();
    const id=uid(),bytes=Buffer.from(canonical({id,op,deadline_ms:deadline,params})+'\n');invariant(bytes.length<=65536,'M14_NATIVE_FRAME_LIMIT');
    return new Promise((resolve,reject)=>{
      const abort=()=>this.#fail(options.signal?.reason??new NexusError('M14_NATIVE_CANCELLED'));
      const timer=setTimeout(()=>this.#fail(new NexusError('M14_NATIVE_TRANSPORT_DEADLINE')),deadline+10000);
      this.#pending={id,resolve,reject,event:options.onEvent,timer,cancel:()=>options.signal?.removeEventListener('abort',abort)};
      options.signal?.addEventListener('abort',abort,{once:true});
      this.#child.stdin.write(bytes,error=>{if(error)this.#fail(error);});
    });
  }
  #fail(error:unknown):void{
    const pending=this.#pending;this.#pending=null;if(pending){clearTimeout(pending.timer);pending.cancel();pending.reject(error);}
    if(this.#closed)return;this.#closed=true;this.#child.stdin.destroy();this.#child.kill();this.#buffer=Buffer.alloc(0);
  }
  close():void{this.#fail(new NexusError('M14_NATIVE_CLOSED'));}
  get busy():boolean{return this.#pending!==null;}
}

/** Bounded RPC adapter to the native root-relative file owner (24KiB per operation). */
export class WindowsFileOwner implements NativeFileOwner {
  #native:NativeClient;
  constructor(native:NativeClient){this.#native=native;}
  async read(root:string,path:string,maxBytes:number,signal?:AbortSignal){
    invariant(maxBytes<=24576,'M14_NATIVE_FILE_LIMIT');const r=await this.#native.request('file.read',{root,relative_path:path.replaceAll('/','\\'),max_bytes:maxBytes},{signal});
    const data=Buffer.from(r.content_base64,'base64');return {data,file_id:r.file_id,sha256:r.sha256,bytes:r.bytes,links:r.link_count,assurance:'REAL_WINDOWS' as const};
  }
  async create(root:string,path:string,bytes:Uint8Array,signal?:AbortSignal){
    invariant(bytes.length<=24576,'M14_NATIVE_FILE_LIMIT');const data=Buffer.from(bytes);
    const r=await this.#native.request('file.create',{root,relative_path:path.replaceAll('/','\\'),max_bytes:data.length,content_base64:data.toString('base64')},{signal});
    return {data,file_id:r.file_id,sha256:r.sha256,bytes:r.bytes,links:r.link_count,assurance:'REAL_WINDOWS' as const};
  }
}
