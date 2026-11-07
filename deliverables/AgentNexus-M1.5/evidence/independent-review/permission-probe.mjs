import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const moduleUrl=new URL('../../../../deliverables/AgentNexus-M1.5/source/src/agentnexus/bootstrap/permissions.ts',import.meta.url);
const before=createHash('sha256').update(await readFile(moduleUrl)).digest('hex');
const {validatePermissionPin}=await import(moduleUrl);
const c={code_root:'I:\\SIMULATED\\code',host_root:'I:\\SIMULATED\\host',broker_root:'I:\\SIMULATED\\broker',launcher_root:'I:\\SIMULATED\\launcher',resource:{root:'I:\\SIMULATED\\input'},host_sid:'S-1-5-21-10-20-30-1001',worker_sid:'S-1-5-21-10-20-30-1002',operator_sid:'S-1-5-21-10-20-30-1003'};
const cases=[
  {name:'source-directory-delete-child',path:c.code_root,sddl:'O:SYG:SYD:P(A;;0x40;;;'+c.worker_sid+')',expected:'DENY'},
  {name:'source-worker-write-data',path:c.code_root,sddl:'O:SYG:SYD:P(A;;0x2;;;'+c.worker_sid+')',expected:'DENY'},
  {name:'private-everyone-read',path:c.host_root,sddl:'O:SYG:SYD:P(A;;FR;;;WD)',expected:'DENY'},
  {name:'public-runtime-read',path:c.code_root,sddl:'O:SYG:SYD:P(A;;FR;;;AU)',expected:'ALLOW'},
];
const results=cases.map(item=>{let actual='ALLOW',reason=null;try{validatePermissionPin(c,{path:item.path,sha256:null,directory:true,sddl:item.sddl,owner_sid:'S-1-5-18'});}catch(error){actual='DENY';reason=error.code;}return {...item,actual,reason,passed:actual===item.expected};});
const after=createHash('sha256').update(await readFile(moduleUrl)).digest('hex');
console.log(JSON.stringify({schema:'agentnexus/permission-decision-probe/1',timestamp:new Date().toISOString(),assurance:'SIMULATED',scope:'Pure SDDL policy decisions; no actual ACL is read or changed; retained file handles may independently prevent deletion.',source_sha256:before,stable_during_probe:before===after,results},null,2));
