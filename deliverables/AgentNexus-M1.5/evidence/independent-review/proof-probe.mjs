import {generateKeyPairSync,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const moduleUrl=new URL('../../../../deliverables/AgentNexus-M1.5/source/src/agentnexus/bootstrap/launcher-proof.ts',import.meta.url);
const before=createHash('sha256').update(await readFile(moduleUrl)).digest('hex');
const {requireLauncherProof,proveLauncher}=await import(moduleUrl);
const hash=s=>createHash('sha256').update(s).digest('hex');
const host={os:'windows',principal:'S-1-5-21-10-20-30-1001',pid:101,start_id:'1000',os_session:'1'};
const launcher={...host,principal:'S-1-5-21-10-20-30-1002',pid:202,start_id:'2000'};
const owner={...launcher,pid:201,start_id:'1900'};
class Channel {
  constructor(self){this.self=self;this.queue=[];this.closed=false;this.writes=[];}
  get peer(){return this.other.self;}
  async local(){return this.self;}
  async recheck(){if(this.closed)throw Error('Closed model channel');return this.peer;}
  inject(bytes){if(this.waiter){const w=this.waiter;this.waiter=null;clearTimeout(w.timer);w.resolve(Buffer.from(bytes));}else this.queue.push(Buffer.from(bytes));}
  async read(deadline){if(this.queue.length)return this.queue.shift();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.waiter=null;reject(Error('MODEL_DEADLINE'));},Math.max(1,deadline-Date.now()));this.waiter={resolve,reject,timer};});}
  async write(bytes){this.writes.push(Buffer.from(bytes));this.other.inject(this.transform?this.transform(bytes):bytes);}
  close(){this.closed=true;if(this.waiter){clearTimeout(this.waiter.timer);this.waiter.reject(Error('MODEL_CLOSED'));this.waiter=null;}}
}
function pair(){const a=new Channel(host),b=new Channel(launcher);a.other=b;b.other=a;return {a,b};}
const keys=generateKeyPairSync('ed25519'),otherKeys=generateKeyPairSync('ed25519');
const binding={configuration_hash:hash('config'),source_manifest_hash:hash('source'),helper_hash:hash('helper')};
const expected={...binding,worker_sid:launcher.principal};
const results=[];let oldProof;
for(const attack of ['valid','wrong-key','wrong-config','old-proof-replay','wrong-owner-sid']){
  const {a,b}=pair();if(attack==='old-proof-replay')b.transform=()=>oldProof;
  const hostWork=requireLauncherProof(a,keys.publicKey,expected);
  const launcherWork=proveLauncher(b,attack==='wrong-key'?otherKeys.privateKey:keys.privateKey,attack==='wrong-owner-sid'?host:owner,attack==='wrong-config'?{...binding,configuration_hash:hash('different-config')}:binding);
  const settled=await Promise.allSettled([hostWork,launcherWork]);
  const accepted=settled[0].status==='fulfilled';const reason=accepted?null:{code:settled[0].reason.code??null,message:settled[0].reason.message};
  if(attack==='valid')oldProof=b.writes.at(-1);
  results.push({attack,accepted,reason,passed:accepted===(attack==='valid')});a.close();b.close();
}
const after=createHash('sha256').update(await readFile(moduleUrl)).digest('hex');
console.log(JSON.stringify({schema:'agentnexus/launcher-proof-probe/1',timestamp:new Date().toISOString(),assurance:'SIMULATED',scope:'Real ephemeral Ed25519 and in-memory channel identities; no OS peer, ACL, account or deployment evidence.',source_sha256:before,stable_during_probe:before===after,results},null,2));
