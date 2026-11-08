/** Read-only engineering exporter. Only explicit final-run wire-* fixtures, never user credential discovery. */
import { DatabaseSync } from 'node:sqlite';
import { readdir,lstat,readFile,open,mkdir } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { createHash } from 'node:crypto';
import { zstdDecompressSync } from 'node:zlib';
const [dataArg,outArg]=process.argv.slice(2);if(!dataArg||!outArg)throw Error('Use <final verification data> <new output directory>');
const data=resolve(dataArg),out=resolve(outArg),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
await mkdir(out,{recursive:true});const raw=await open(join(out,'model-traces.jsonl'),'wx'),requests=[];let traces=0;
try{
  for(const name of (await readdir(data)).filter(name=>/^wire-[A-Za-z0-9_-]+$/.test(name)).sort()){
    const root=join(data,name,'host'),dbPath=join(root,'kernel.sqlite');const stat=await lstat(dbPath);if(!stat.isFile()||stat.isSymbolicLink())throw Error('UNSAFE_FIXTURE_DATABASE');
    const db=new DatabaseSync(dbPath,{readOnly:true});
    try{
      for(const row of db.prepare("SELECT body FROM m16_entities WHERE kind='MODEL18_REQUEST' ORDER BY id").all()){
        const value=JSON.parse(String(row.body));if(value.assurance!=='SIMULATED')throw Error('UNEXPECTED_REAL_REQUEST_IN_ENGINEERING_FIXTURE');
        const usage=db.prepare("SELECT body FROM m16_entities WHERE kind='MODEL18_USAGE' AND id=?").get(value.request_id);
        requests.push({fixture:name,request:value,usage:usage?JSON.parse(String(usage.body)):null,environment:'ENGINEERING_FIXTURE_ONLY'});
      }
      for(const row of db.prepare("SELECT r.body,r.hash,r.event_id,e.seq AS acknowledged FROM anx_records r LEFT JOIN anx_exports e USING(seq) WHERE r.domain='context' ORDER BY r.seq").all()){
        const record=JSON.parse(String(row.body)),ref=record.payload_ref;if(!ref||ref.bytes>1048576||!/^[a-f0-9-]{36}$/.test(ref.artifact_id))continue;
        const stored=await readFile(join(root,'artifacts/objects',ref.artifact_id+'.zst'));
        if(stored.length!==ref.stored_bytes||hash(stored)!==ref.stored_sha256)throw Error('STORED_ARTIFACT_HASH');
        const bytes=zstdDecompressSync(stored,{maxOutputLength:Math.max(1,ref.bytes)});if(bytes.length!==ref.bytes||hash(bytes)!==ref.sha256)throw Error('RAW_ARTIFACT_HASH');
        let body;try{body=JSON.parse(bytes.toString('utf8'));}catch{continue;}
        if(!['MODEL18_REQUEST','MODEL18_RESPONSE'].includes(body?.kind))continue;
        if(body.kind==='MODEL18_REQUEST'&&body.assurance!=='SIMULATED')throw Error('REAL_REQUEST_EXPORT_BLOCKED');
        await raw.writeFile(JSON.stringify({fixture:name,event_id:row.event_id,record_hash:row.hash,acknowledged:row.acknowledged!==null,payload_ref:ref,body,assurance:'SIMULATED',raw_reasoning_deltas:'NOT_ARCHIVED'})+'\n');traces++;
      }
    }finally{db.close();}
  }
}finally{await raw.close();}
const index={schema:'agentnexus/m1.8/model-evidence/1',environment:'ENGINEERING_FIXTURES_ONLY',requests,traces,real_provider_requests:0,actual_cost_micros:0,notes:'SIMULATED wire fixtures only. REAL ledger arithmetic tests and artificial authorization fixtures are not real Provider metering.'};
const file=await open(join(out,'request-index.json'),'wx');await file.writeFile(JSON.stringify(index,null,2)+'\n');await file.close();
console.log(JSON.stringify({requests:requests.length,traces,real_provider_requests:0,actual_cost_micros:0,out}));
