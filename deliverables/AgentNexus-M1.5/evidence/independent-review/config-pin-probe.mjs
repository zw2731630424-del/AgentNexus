import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const moduleUrl=new URL('../../../../deliverables/AgentNexus-M1.5/source/src/agentnexus/bootstrap/config.ts',import.meta.url);
const hash=value=>createHash('sha256').update(value).digest('hex');
const before=hash(await readFile(moduleUrl));const {attestationPins,attestNativeClient}=await import(moduleUrl);
const root='I:\\SIMULATED\\code',path='I:\\SIMULATED\\configuration\\Host.json',expectedHash=hash('external config');
const fixture={code_root:root,pins:[{path,sha256:null,directory:false,sddl:'O:SYG:SYD:P(A;;FA;;;SY)',owner_sid:'S-1-5-18'}]};
const results=[];
for(const attack of ['case-folded-config','wrong-config-path','config-inside-code']){
  let accepted=true,reason=null,correct=false;try{const c=attack==='config-inside-code'?{...fixture,code_root:'I:\\SIMULATED\\configuration'}:fixture;const pins=attestationPins(c,attack==='wrong-config-path'?'I:\\SIMULATED\\configuration\\Other.json':path.toLowerCase(),expectedHash);correct=pins[0].sha256===expectedHash&&fixture.pins[0].sha256===null;}catch(error){accepted=false;reason={code:error.code??null,message:error.message};}
  results.push({attack,accepted,reason,passed:accepted===(attack==='case-folded-config')&&(!accepted||correct)});
}
const sid='S-1-5-21-10-20-30-1002',node={path:'I:\\SIMULATED\\runtime\\node.exe'};
const config={node,profile:{os_version:'SIMULATED-WINDOWS-VERSION'}};
const pins=Array.from({length:70},(_,i)=>({path:i===0?node.path:'I:\\SIMULATED\\code\\source-'+i+'.ts',sha256:hash('source-'+i),directory:false,sddl:'O:SYG:SYD:P(A;;FA;;;SY)',owner_sid:'S-1-5-18'}));
for(const attack of ['consistent-os-two-batches','wrong-os-version','changed-parent-between-batches']){
  const calls=[];const fake={async request(op,params){calls.push(params);return {standard_account_verified:true,process:{os:'windows',principal:sid,pid:process.pid,start_id:attack==='changed-parent-between-batches'&&calls.length===2?'1001':'1000',os_session:'1'},os_version:attack==='wrong-os-version'?'DIFFERENT-VERSION':config.profile.os_version,pin_id:'MODEL-pin-'+calls.length};}};
  let accepted=true,reason=null;try{await attestNativeClient(fake,config,pins,sid);}catch(error){accepted=false;reason={code:error.code??null,message:error.message};}
  const bounded=calls.every(c=>c.pins.length<=64&&c.pins.some(p=>p.path===node.path));
  results.push({attack,accepted,reason,batches:calls.length,passed:accepted===(attack==='consistent-os-two-batches')&&bounded&&(!accepted||calls.length===2)});
}
const after=hash(await readFile(moduleUrl));console.log(JSON.stringify({schema:'agentnexus/config-pin-probe/1',timestamp:new Date().toISOString(),assurance:'SIMULATED',scope:'Pure config-pin mapping and a fake native attestation adapter; no complete deployment config, OS version, account, ACL, process pin or production attestation is exercised.',source_sha256:before,stable_during_probe:before===after,results},null,2));
