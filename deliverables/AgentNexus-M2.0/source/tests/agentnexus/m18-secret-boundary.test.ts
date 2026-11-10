import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { fixture } from './m18-fixture.ts';
import { auditEvent,canonical } from '../../src/agentnexus/types.ts';
import { identityOf } from '../../src/agentnexus/harness/contracts.ts';
const secret='synthetic-test-openai-private-value-abc123';
test('M18 SECRET Prompt/Context, Audit detail and artifact bytes fail before persistent publication',async t=>{
  const f=await fixture(t),a=await f.agent();const count=f.h.store.query('context',{limit:100}).length,parts=await readdir(f.h.store.artifacts.partials);
  await assert.rejects(f.h.context.capture(a.subject,'RAW',Buffer.from(secret)),/KNOWN_SECRET_BLOCKED/);
  assert.equal(f.h.store.query('context',{limit:100}).length,count);
  assert.throws(()=>f.h.store.audit(auditEvent(identityOf(a.subject),{operation_id:'leak',operation_type:'TEST',phase:'SYNTHETIC',detail:{message:secret}})),/KNOWN_SECRET_BLOCKED/);
  await assert.rejects(f.h.store.artifacts.putBytes(Buffer.from(secret)),/KNOWN_SECRET_BLOCKED/);
  assert.deepEqual(await readdir(f.h.store.artifacts.partials),parts);assert.equal(f.vault.list(f.vaultAdmin)[0].state,'QUARANTINED');assert.ok(f.vault.securityEvents(f.vaultAdmin).length>=1);
  assert.equal(canonical(f.h.store.query('audit',{limit:100})).includes(secret),false);
});
test('M18 SECRET cross-chunk and encoded artifact secrets are detected before opening partial files',async t=>{
  const f=await fixture(t);for(const text of [secret,Buffer.from(secret).toString('base64'),secret.split('').map(c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')).join('')]){
    const before=await readdir(f.h.store.artifacts.partials);const bytes=Buffer.from(text);await assert.rejects(f.h.store.artifacts.put((async function*(){for(const byte of bytes)yield Buffer.from([byte]);})()),/KNOWN_SECRET_BLOCKED/);assert.deepEqual(await readdir(f.h.store.artifacts.partials),before);
  }
});
test('M18 SECRET queued mutable byte buffers are owned before inspection and queue waits',async t=>{
  const f=await fixture(t);let release!:()=>void;const gate=new Promise<void>(r=>release=r);const held=()=>f.h.store.artifacts.put((async function*(){yield Buffer.from('held safe');await gate;})());
  const one=held(),two=held(),bytes=Buffer.alloc(Buffer.byteLength(secret),97),queued=f.h.store.artifacts.putBytesQueued(bytes);bytes.set(Buffer.from(secret));release();await Promise.all([one,two]);
  const ref=await queued,chunks:Buffer[]=[];for await(const chunk of f.h.store.artifacts.read(ref))chunks.push(Buffer.from(chunk));assert.equal(Buffer.concat(chunks).toString(),'a'.repeat(bytes.length));
});
test('M18 SECRET guarded large streams have an explicit memory cap and never create partial payloads on overflow',async t=>{
  const f=await fixture(t),before=await readdir(f.h.store.artifacts.partials);await assert.rejects(f.h.store.artifacts.put((async function*(){for(let i=0;i<33;i++)yield Buffer.alloc(65536,97);})()),/SENSITIVE_ARTIFACT_LIMIT/);assert.deepEqual(await readdir(f.h.store.artifacts.partials),before);
});
test('M18 SECRET closing a Vault cannot silently disable guard enforcement on attached Host storage',async t=>{
  const f=await fixture(t),a=await f.agent();f.vault.close();await assert.rejects(f.h.context.capture(a.subject,'RAW',Buffer.from('any later content')),/VAULT_GUARD_CLOSED/);
});
test('M18 SECRET ordinary Worker and child facades expose no Vault, credential or management database',async t=>{
  const f=await fixture(t),a=await f.agent(),b=await f.agent('sub','subwork',{type:'SUBAGENT',parent_id:a.id,read_tasks:['work']});
  for(const facade of [f.h.bindAgent(a.id),f.h.bindAgent(b.id)])for(const field of ['vault','db','admin','model','key','credential','readSecret','withCredential'])assert.equal(field in facade,false);
  const meta=f.vault.list(f.vaultAdmin);assert.equal(canonical(meta).includes(secret),false);assert.throws(()=>f.vault.list({} as never),/VAULT_ADMIN_REQUIRED/);
});
