import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdirSync, appendFileSync } from 'node:fs';
import { resolve, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import assert from 'node:assert/strict';

export type Packet={id:string;ok:boolean;result?:unknown;error?:{code:string;message:string};event?:string};
export class EvidenceRpc {
  readonly child:ChildProcessWithoutNullStreams;
  readonly log:string;
  #serial=0;#buffer=Buffer.alloc(0);#bytes=0;
  #pending=new Map<string,{resolve:(r:Packet)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
  constructor(directory:string){
    const ps=process.env.AGENTNEXUS_TEST_POWERSHELL_PATH;assert.ok(ps&&isAbsolute(ps));
    mkdirSync(directory,{recursive:true});this.log=join(directory,randomUUID()+'.jsonl');
    const runtime=fileURLToPath(new URL('../../src/agentnexus/production/windows/runtime.ps1',import.meta.url));
    this.child=spawn(ps,['-NoProfile','-NonInteractive','-File',runtime],{shell:false,windowsHide:true,stdio:'pipe'});
    this.child.stdout.on('data',(chunk:Buffer)=>{
      let offset=0;
      while(offset<chunk.length){const end=chunk.indexOf(10,offset),part=chunk.subarray(offset,end<0?chunk.length:end);assert.ok(this.#buffer.length+part.length<65536);this.#buffer=Buffer.concat([this.#buffer,part]);offset=end<0?chunk.length:end+1;if(end<0)break;
        const raw=this.#buffer.toString('utf8');this.#buffer=Buffer.alloc(0);const p=JSON.parse(raw) as Packet;this.record({at:new Date().toISOString(),direction:'RECEIVED',raw_jsonl:raw+'\n'});if(p.event)continue;const w=this.#pending.get(p.id);if(w){clearTimeout(w.timer);this.#pending.delete(p.id);w.resolve(p);}}
    });
    this.child.stderr.on('data',(b:Buffer)=>this.record({at:new Date().toISOString(),direction:'STDERR',base64:b.toString('base64')}));
    const fail=(e:Error)=>{for(const p of this.#pending.values()){clearTimeout(p.timer);p.reject(e);}this.#pending.clear();};
    this.child.on('error',fail);this.child.on('exit',(code,signal)=>{this.record({direction:'HELPER_EXIT',code,signal});fail(Error(`Native helper exited ${code}/${signal}`));});
  }
  record(value:unknown):void{const line=JSON.stringify(value)+'\n';this.#bytes+=Buffer.byteLength(line);if(this.#bytes>4*1024*1024){this.child.kill();throw Error('Evidence bound');}appendFileSync(this.log,line);}
  call(op:string,params:Record<string,unknown>,deadline=3000):Promise<Packet>{
    assert.equal(this.#pending.size,0);const id='m151-'+ ++this.#serial,request={id,op,params,deadline_ms:deadline};this.record({direction:'SENT',request});
    return new Promise((resolveResult,reject)=>{const timer=setTimeout(()=>{this.#pending.delete(id);this.child.kill();reject(Error('Native deadline'));},deadline+12000);this.#pending.set(id,{resolve:resolveResult,reject,timer});this.child.stdin.write(JSON.stringify(request)+'\n');});
  }
  async good<T>(op:string,params:Record<string,unknown>,deadline=3000):Promise<T>{const p=await this.call(op,params,deadline);assert.equal(p.ok,true,JSON.stringify(p.error));return p.result as T;}
  async close():Promise<void>{if(this.child.exitCode!==null||this.child.signalCode!==null)return;const closed=once(this.child,'close');this.child.stdin.end();const timer=setTimeout(()=>this.child.kill(),1000);try{await closed;}finally{clearTimeout(timer);}}
}
export const testRoot=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT??'.workflow-kit/runtime/m151-data','m151');
