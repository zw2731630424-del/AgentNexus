/** Explicit new-run fixtures only. Never discovers credentials or touches historical evidence. */
import { DatabaseSync } from 'node:sqlite';
import { readdir,lstat,readFile,open,mkdir } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { createHash } from 'node:crypto';
import { zstdDecompressSync } from 'node:zlib';
const [dataArg,outArg]=process.argv.slice(2);if(!dataArg||!outArg)throw Error('Use <verification data> <new output directory>');
const data=resolve(dataArg),out=resolve(outArg),hash=b=>createHash('sha256').update(b).digest('hex');
if(!data.includes('AgentNexus-M1.8.1')||!out.includes('AgentNexus-M1.8.1'))throw Error('M181_EXPLICIT_PATH_REQUIRED');
await mkdir(out,{recursive:true});const raw=await open(join(out,'model-traces.jsonl'),'wx'),audit=await open(join(out,'audit.jsonl'),'wx');
const requests=[],campaigns=[];let traces=0,audits=0;
function safe(value){const text=JSON.stringify(value);if(/synthetic-test-(openai|deepseek|glm)-private-value-abc123/.test(text))throw Error('KNOWN_FIXTURE_SECRET_EXPORT_DENIED');return text+'\n';}
try{
  for(const name of (await readdir(data)).filter(n=>/^(wire|campaign)-[A-Za-z0-9_-]+$/.test(n)).sort()){
    const root=name.startsWith('wire-')?join(data,name,'host'):join(data,name),dbPath=join(root,'kernel.sqlite');
    const stat=await lstat(dbPath);if(!stat.isFile()||stat.isSymbolicLink())throw Error('UNSAFE_FIXTURE_DATABASE');const db=new DatabaseSync(dbPath,{readOnly:true});
    try{
      for(const row of db.prepare("SELECT body FROM m16_entities WHERE kind='MODEL18_REQUEST' ORDER BY id").all()){
        const r=JSON.parse(String(row.body));if(r.assurance!=='SIMULATED')throw Error('REAL_REQUEST_EXPORT_BLOCKED');const u=db.prepare("SELECT body FROM m16_entities WHERE kind='MODEL18_USAGE' AND id=?").get(r.request_id);
        requests.push({fixture:name,request:r,usage:u?JSON.parse(String(u.body)):null,assurance:'SIMULATED'});
      }
      for(const row of db.prepare("SELECT body FROM m16_entities WHERE kind='MODEL181_CAMPAIGN' ORDER BY id").all())campaigns.push({fixture:name,accounting_only:true,no_network:true,body:JSON.parse(String(row.body))});
      for(const row of db.prepare("SELECT seq,body,hash,event_id FROM anx_records WHERE domain='audit' ORDER BY seq").all()){
        await audit.writeFile(safe({fixture:name,assurance:'SYNTHETIC_TEST_EXECUTION',seq:row.seq,record_hash:row.hash,event_id:row.event_id,body:JSON.parse(String(row.body))}));audits++;
      }
      if(!name.startsWith('wire-'))continue;
      for(const row of db.prepare("SELECT r.body,r.hash,r.event_id,e.seq AS acknowledged FROM anx_records r LEFT JOIN anx_exports e USING(seq) WHERE r.domain='context' ORDER BY r.seq").all()){
        const record=JSON.parse(String(row.body)),ref=record.payload_ref;if(!ref||ref.bytes>1048576||!/^[a-f0-9-]{36}$/.test(ref.artifact_id))continue;
        const compressed=await readFile(join(root,'artifacts/objects',ref.artifact_id+'.zst'));
        if(hash(compressed)!==ref.stored_sha256||compressed.length!==ref.stored_bytes)throw Error('STORED_ARTIFACT_HASH');
        const bytes=zstdDecompressSync(compressed,{maxOutputLength:Math.max(1,ref.bytes)});if(hash(bytes)!==ref.sha256||bytes.length!==ref.bytes)throw Error('ARTIFACT_HASH');
        let body;try{body=JSON.parse(bytes.toString('utf8'));}catch{continue;}
        if(!['MODEL18_REQUEST','MODEL18_RESPONSE'].includes(body?.kind))continue;
        await raw.writeFile(safe({fixture:name,assurance:'SIMULATED',event_id:row.event_id,record_hash:row.hash,acknowledged:row.acknowledged!==null,payload_ref:ref,body}));traces++;
      }
    }finally{db.close();}
  }
}finally{await raw.close();await audit.close();}
const file=await open(join(out,'request-index.json'),'wx');await file.writeFile(safe({schema:'agentnexus/m1.8.1/fixture-evidence/1',requests,campaigns,traces,audits,real_provider_requests:0,actual_provider_usage:null,actual_cost_micros:0,notes:'All wire requests are FixtureTransport SIMULATED. REAL assurance in pure accounting tests is not provider evidence.'}));await file.close();
console.log(JSON.stringify({requests:requests.length,traces,audits,real_provider_requests:0,out}));
