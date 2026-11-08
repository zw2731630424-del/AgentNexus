// Read-only evidence decoding. No workspace engine or candidate imports.
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {zstdDecompressSync} from 'node:zlib';
import {readFileSync,writeFileSync,openSync,writeSync,closeSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const root='I:/AI_AgentNexus';
const run=join(root,'.workflow-kit/runtime/AgentNexus-M1.7/v/r-cc1c68b6fcfb/data/native-pilot/2026-11-08T03-36-35-394Z-2120');
const output=join(root,'deliverables/AgentNexus-M1.7/evidence/native');mkdirSync(output,{recursive:true});
const db=new DatabaseSync(join(run,'host/kernel.sqlite'),{readOnly:true});
const sha=x=>createHash('sha256').update(x).digest('hex');
function canonical(value){if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';}
const refs=new Map(), previous={audit:'0'.repeat(64),context:'0'.repeat(64),decision:'0'.repeat(64)};
function collect(value){if(!value||typeof value!=='object')return;if(typeof value.artifact_id==='string'&&value.codec==='zstd'&&typeof value.sha256==='string'){
  assert.match(value.artifact_id,/^[a-f0-9-]{36}$/);assert(value.bytes<=1048576&&value.stored_bytes<=1048576);const seen=refs.get(value.artifact_id);if(seen)assert.equal(canonical(value),canonical(seen));else refs.set(value.artifact_id,value);return;}
  for(const v of Object.values(value))collect(v);}
let count=0;const contexts=[];
for(const row of db.prepare('SELECT * FROM anx_records ORDER BY seq').iterate()){
  const body=JSON.parse(row.body);assert.equal(canonical(body),row.body);assert.equal(row.seq,++count);assert.equal(row.previous_hash,previous[row.domain]);
  const record={seq:row.seq,domain:row.domain,event_id:row.event_id,operation_id:row.operation_id,project_id:row.project_id,task_id:row.task_id,previous_hash:row.previous_hash,body};
  assert.equal(sha(canonical(record)),row.hash);previous[row.domain]=row.hash;collect(body);
  if(row.domain==='context')contexts.push({...record,hash:row.hash});
}
assert.equal(db.prepare('PRAGMA quick_check').get().quick_check,'ok');
assert.equal(db.prepare('select count(*) n from anx_outbox').get().n,0);
assert.equal(db.prepare('select count(*) n from anx_exports').get().n,count);
const decoded=new Map();let storedBytes=0,rawBytes=0;
for(const [id,ref] of refs){const bytes=readFileSync(join(run,'host/artifacts/objects',id+'.zst'));assert.equal(bytes.length,ref.stored_bytes);assert.equal(sha(bytes),ref.stored_sha256);
 const raw=zstdDecompressSync(bytes,{maxOutputLength:1048576});assert.equal(raw.length,ref.bytes);assert.equal(sha(raw),ref.sha256);decoded.set(id,raw);storedBytes+=bytes.length;rawBytes+=raw.length;}
const path=join(output,'context-transcript.jsonl'),fd=openSync(path,'w');
try{for(const r of contexts){const raw=decoded.get(r.body.payload_ref.artifact_id);assert(raw);const text=new TextDecoder('utf-8',{fatal:true}).decode(raw);
 writeSync(fd,JSON.stringify({derived_view:true,seq:r.seq,task_id:r.task_id,event_id:r.event_id,kind:r.body.kind,record_hash:r.hash,payload_ref:r.body.payload_ref,exact_utf8_text:text})+'\n');}}
finally{closeSync(fd);db.close();}
const report={schema:'agentnexus/m17/independent-decoding/1',status:'PASS',method:'Only Node built-in fs/crypto/sqlite/zlib/assert; no engine/candidate imports or execution.',original_run:run,
 records:count,all_record_hashes_and_domain_chains_verified:true,sqlite_quick_check:'ok',outbox_pending:0,export_receipts:count,
 unique_referenced_artifacts:refs.size,stored_bytes_verified:storedBytes,raw_bytes_verified:rawBytes,all_stored_and_raw_sha256_verified:true,
 transcript:{path:'context-transcript.jsonl',records:contexts.length,sha256:sha(readFileSync(path)),semantics:'Derived read-only view of exact original Context payloads. Original SQLite, segments and compressed objects remain authoritative.'},
 scope_limit:'This decoding verifies database record hashes/chains and referenced Artifact bytes, not every segment framing or OS security qualification. Native store.verify also ran before Pilot PASS.'};
writeFileSync(join(output,'evidence-decoding.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
