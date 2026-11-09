import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { link, mkdir, mkdtemp, readFile, symlink, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { DatabaseSync } from 'node:sqlite';
import { CredentialVault, SyntheticMemoryProtector, WindowsCurrentUserDpapiProtector, VaultError, createVaultAdminCapability } from '../../src/agentnexus/model-runtime/vault.ts';
import type { CredentialSpec, CredentialState, CredentialSettlement, CredentialProviderInterface } from '../../src/agentnexus/model-runtime/vault.ts';

// All values in this suite are fabricated SYNTHETIC fixtures. No provider or network.
const BASE = process.env.AGENTNEXUS_TEST_DATA_ROOT??fileURLToPath(new URL('../../../../../.workflow-kit/runtime/AgentNexus-M1.8/vault-tests/', import.meta.url));
const secret = Buffer.from('synthetic-test-vault-only-fixture-7"/+=');
const subject = 'canonical-complete-host-subject-fixture';
const success: CredentialSettlement = { outcome: 'SUCCESS', cost_micros: 2, usage_source: 'SIMULATED' };

test('M18 VAULT rotation never extends the old credential expiry before or during asynchronous decrypt',async t=>{
  const clock=Date.now,started=clock();let current=started;t.mock.method(Date,'now',()=>current);
  const f=await fixture(t);await f.vault.add(f.admin,spec('old',{expires_at:started+1000}));const lease=f.vault.acquire(f.admin,request('expired-rotating'));await f.vault.rotate(f.admin,'old',spec('replacement'));current=started+1001;let calls=0;
  await assert.rejects(f.vault.withCredential(f.admin,lease.lease_id,async()=>{calls++;return 'safe';},subject),code('VAULT_KEY_NOT_SENDABLE'));assert.equal(calls,0);
  current=started;await f.vault.add(f.admin,spec('during',{expires_at:started+1000,models:['expiry-model']}));const during=f.vault.acquire(f.admin,request('during-expiry',{model_id:'expiry-model'}));await f.vault.rotate(f.admin,'during',spec('during-replacement',{models:['expiry-model']}));
  const unprotect=f.protector.unprotect.bind(f.protector);f.protector.unprotect=async bytes=>{const result=await unprotect(bytes);current=started+1001;return result;};
  await assert.rejects(f.vault.withCredential(f.admin,during.lease_id,async()=>{calls++;return 'safe';},subject),code('VAULT_KEY_NOT_SENDABLE'));assert.equal(calls,0);
  t.mock.restoreAll();
});

test('M18 VAULT rotating a rate-limited key prevents automatic cooldown resurrection',async t=>{
  let now=Date.now();t.mock.method(Date,'now',()=>now);const f=await fixture(t);await f.vault.add(f.admin,spec('old-rate'));const lease=f.vault.acquire(f.admin,request('rate-old'));
  f.vault.settle(f.admin,lease.lease_id,{outcome:'RATE_LIMIT',cost_micros:0,usage_source:'SIMULATED',retry_after_ms:100},subject);await f.vault.rotate(f.admin,'old-rate',spec('new-rate'));f.vault.setState(f.admin,'new-rate','DISABLED');now+=200;
  assert.throws(()=>f.vault.acquire(f.admin,request('after-cooldown')),code('VAULT_NO_ELIGIBLE_KEY'));assert.equal(f.vault.list(f.admin).find(k=>k.key_id==='old-rate')!.state,'DISABLED');t.mock.restoreAll();
});
function spec(key_id = 'key-a', extra: Partial<CredentialSpec> = {}): CredentialSpec {
  return { key_id, provider_id: 'synthetic-provider', models: ['model-a'], secret, max_concurrency: 1, requests_per_minute: 100, ...extra };
}
function request(request_id = 'request-a', extra: Partial<Parameters<CredentialVault['acquire']>[1]> = {}) {
  return { provider_id: 'synthetic-provider', model_id: 'model-a', request_id, estimated_cost_micros: 3, subject_key: subject, ...extra };
}
function code(expected: string) { return (error: unknown) => error instanceof VaultError && error.code === expected && error.message === expected; }
async function root() { await mkdir(BASE, { recursive: true }); return mkdtemp(join(BASE, 'vault-')); }
async function fixture(t: test.TestContext) {
  const location = await root(), admin = createVaultAdminCapability(), protector = new SyntheticMemoryProtector();
  const vault = await CredentialVault.open({ root: location, admin, protector, mode: 'SYNTHETIC' });
  t.after(() => vault.close()); return { location, admin, protector, vault };
}

test('M18 VAULT accepts only fabricated secrets and identity-bound host authority; LIVE is BLOCKED', async t => {
  const f = await fixture(t), foreign = createVaultAdminCapability();
  await assert.rejects(CredentialVault.open({ root: f.location, admin: f.admin, protector: f.protector, mode: 'LIVE' }), code('VAULT_LIVE_IMPORT_BLOCKED'));
  await assert.rejects(f.vault.add(f.admin, spec('unsafe', { secret: Buffer.from('not-a-live-key-either') })), code('VAULT_SYNTHETIC_SECRET_REQUIRED'));
  await f.vault.add(f.admin, spec());
  assert.throws(() => f.vault.list(foreign), code('VAULT_ADMIN_REQUIRED'));
  assert.throws(() => f.vault.acquire(foreign, request()), code('VAULT_ADMIN_REQUIRED'));
  await assert.rejects(f.vault.add(foreign, spec('other')), code('VAULT_ADMIN_REQUIRED'));
  assert.ok(!('db' in f.vault) && !('protector' in f.vault) && !('root' in f.vault), 'host internals must remain private');
  assert.ok(!JSON.stringify(f.vault.list(f.admin)).includes(secret.toString()), 'metadata must not contain a credential');
});

test('M18 VAULT encrypts actual persisted bytes and reloads only its own fabricated entries', async t => {
  const f = await fixture(t); await f.vault.add(f.admin, spec());
  for (const name of ['vault.sqlite', 'vault.sqlite-wal', 'vault.sqlite-shm']) if (existsSync(join(f.location, name))) {
    assert.ok(!(await readFile(join(f.location, name))).includes(secret), 'credential plaintext must not occur on disk');
  }
  const db = new DatabaseSync(join(f.location, 'vault.sqlite'), { readOnly: true });
  const row = db.prepare('SELECT ciphertext FROM credentials').get()!; db.close();
  assert.ok(row.ciphertext instanceof Uint8Array && !Buffer.from(row.ciphertext).equals(secret), 'stored credential must be encrypted');
  f.vault.close();
  const reopened = await CredentialVault.open({ root: f.location, admin: f.admin, protector: f.protector, mode: 'SYNTHETIC' });
  t.after(() => reopened.close());
  assert.equal(reopened.list(f.admin).length, 1);
  assert.throws(() => reopened.guard.assertSafe(secret, 'fixture'), code('VAULT_KNOWN_SECRET_BLOCKED'));
  assert.equal(reopened.list(f.admin)[0].state, 'QUARANTINED');
});

test('M18 VAULT inactive states, model eligibility, and expiration prevent acquisition', async t => {
  const f = await fixture(t); await f.vault.add(f.admin, spec());
  for (const state of ['DISABLED', 'INVALID', 'RATE_LIMITED', 'EXPIRED', 'ROTATING', 'QUARANTINED'] as CredentialState[]) {
    f.vault.setState(f.admin, 'key-a', state);
    assert.throws(() => f.vault.acquire(f.admin, request()), code('VAULT_NO_ELIGIBLE_KEY'));
    f.vault.setState(f.admin, 'key-a', 'ACTIVE');
  }
  assert.throws(() => f.vault.acquire(f.admin, request('unsupported', { model_id: 'model-b' })), code('VAULT_NO_ELIGIBLE_KEY'));
  f.vault.setState(f.admin, 'key-a', 'DISABLED');
  await f.vault.add(f.admin, spec('expired', { expires_at: Date.now() - 1 }));
  assert.throws(() => f.vault.setState(f.admin, 'expired', 'ACTIVE'), code('VAULT_KEY_EXPIRED'));
  assert.throws(() => f.vault.acquire(f.admin, request()), code('VAULT_NO_ELIGIBLE_KEY'));
});

test('M18 VAULT two SQLite connections atomically reserve concurrency and cost before sending', async t => {
  const f = await fixture(t);
  const second = await CredentialVault.open({ root: f.location, admin: f.admin, protector: f.protector, mode: 'SYNTHETIC' });
  t.after(() => second.close());
  await f.vault.add(f.admin, spec('key-a', { max_concurrency: 2, cost_limit_micros: 10 }));
  await second.refreshGuard(f.admin);
  const outcomes = await Promise.allSettled([
    Promise.resolve().then(() => f.vault.acquire(f.admin, request('parallel-a', { estimated_cost_micros: 6 }))),
    Promise.resolve().then(() => second.acquire(f.admin, request('parallel-b', { estimated_cost_micros: 6 }))),
  ]);
  assert.equal(outcomes.filter(outcome => outcome.status === 'fulfilled').length, 1);
  assert.equal(f.vault.list(f.admin)[0].reserved_micros, 6);
  const lease = outcomes.find(outcome => outcome.status === 'fulfilled')!;
  assert.ok(lease.status === 'fulfilled'); f.vault.settle(f.admin, lease.value.lease_id, success, subject);
  const available = second.acquire(f.admin, request('parallel-c', { estimated_cost_micros: 8 }));
  assert.throws(() => f.vault.acquire(f.admin, request('parallel-d', { estimated_cost_micros: 1 })), code('VAULT_NO_ELIGIBLE_KEY'));
  second.settle(f.admin, available.lease_id, { ...success, outcome: 'NOT_SENT', cost_micros: 0 }, subject);
  f.vault.setState(f.admin, 'key-a', 'DISABLED');
  await f.vault.add(f.admin, spec('one-at-a-time', { max_concurrency: 1 }));
  await second.refreshGuard(f.admin);
  f.vault.acquire(f.admin, request('single-a'));
  assert.throws(() => second.acquire(f.admin, request('single-b')), code('VAULT_NO_ELIGIBLE_KEY'));
});

test('M18 VAULT subject binding, request conflicts, and once-only send prevent lease reuse', async t => {
  const f = await fixture(t); await f.vault.add(f.admin, spec('key-a', { models: ['model-a', 'model-b'] }));
  const lease = f.vault.acquire(f.admin, request());
  assert.deepEqual(Object.keys(lease).sort(), ['key_handle_id', 'lease_id']);
  assert.deepEqual(f.vault.acquire(f.admin, request()), lease);
  assert.throws(() => f.vault.acquire(f.admin, request('request-a', { model_id: 'model-b' })), code('VAULT_REQUEST_CONFLICT'));
  assert.throws(() => f.vault.acquire(f.admin, request('request-a', { subject_key: 'different-subject' })), code('VAULT_SUBJECT_MISMATCH'));
  let sent = 0;
  await assert.rejects(f.vault.withCredential(f.admin, lease.lease_id, async () => { sent++; return 'ok'; }, 'different-subject'), code('VAULT_SUBJECT_MISMATCH'));
  assert.throws(() => f.vault.settle(f.admin, lease.lease_id, success, 'different-subject'), code('VAULT_SUBJECT_MISMATCH'));
  const reply = await f.vault.withCredential(f.admin, lease.lease_id, async authorization => {
    assert.ok(authorization === 'Bearer ' + secret.toString(), 'only host callback receives authorization'); sent++; return 'safe-response';
  }, subject);
  assert.equal(reply, 'safe-response');
  await assert.rejects(f.vault.withCredential(f.admin, lease.lease_id, async () => 'duplicate', subject), code('VAULT_LEASE_NOT_SENDABLE'));
  assert.equal(sent, 1); f.vault.settle(f.admin, lease.lease_id, success, subject);
  f.vault.settle(f.admin, lease.lease_id, success, subject);
  assert.throws(() => f.vault.settle(f.admin, lease.lease_id, { ...success, cost_micros: 3 }, subject), code('VAULT_SETTLEMENT_CONFLICT'));
});

test('M18 VAULT rate windows, AUTH and RATE_LIMIT alter future eligibility', async t => {
  const f = await fixture(t); await f.vault.add(f.admin, spec('key-a', { requests_per_minute: 1 }));
  const unsent = f.vault.acquire(f.admin, request('unsent'));
  f.vault.settle(f.admin, unsent.lease_id, { ...success, outcome: 'NOT_SENT', cost_micros: 0 }, subject);
  const sent = f.vault.acquire(f.admin, request('sent')); f.vault.settle(f.admin, sent.lease_id, success, subject);
  assert.throws(() => f.vault.acquire(f.admin, request('too-soon')), code('VAULT_NO_ELIGIBLE_KEY'));
  f.vault.setState(f.admin, 'key-a', 'DISABLED');
  await f.vault.add(f.admin, spec('key-b'));
  const auth = f.vault.acquire(f.admin, request('auth')); f.vault.settle(f.admin, auth.lease_id, { ...success, outcome: 'AUTH' }, subject);
  assert.equal(f.vault.list(f.admin).find(key => key.key_id === 'key-b')!.state, 'INVALID');
  await f.vault.add(f.admin, spec('key-c'));
  const rate = f.vault.acquire(f.admin, request('rate'));
  f.vault.settle(f.admin, rate.lease_id, { ...success, outcome: 'RATE_LIMIT', retry_after_ms: 60_000 }, subject);
  assert.equal(f.vault.list(f.admin).find(key => key.key_id === 'key-c')!.state, 'RATE_LIMITED');
  assert.throws(() => f.vault.acquire(f.admin, request('rate-next')), code('VAULT_NO_ELIGIBLE_KEY'));
});

test('M18 VAULT deterministic health/cost/concurrency selection and rotation preserve old inflight', async t => {
  const f = await fixture(t); await f.vault.add(f.admin, spec('key-a')); await f.vault.add(f.admin, spec('key-b'));
  const first = f.vault.acquire(f.admin, request('first')), next = f.vault.acquire(f.admin, request('next'));
  assert.ok(first.key_handle_id !== next.key_handle_id, 'pool must use an eligible second key');
  await f.vault.rotate(f.admin, 'key-a', spec('key-new', { secret: Buffer.from('synthetic-test-rotated-fixture') }));
  assert.equal(f.vault.list(f.admin).find(key => key.key_id === 'key-a')!.state, 'ROTATING');
  assert.throws(() => f.vault.remove(f.admin, 'key-a'), code('VAULT_KEY_IN_USE'));
  await f.vault.withCredential(f.admin, first.lease_id, async authorization => {
    assert.ok(authorization === 'Bearer ' + secret.toString(), 'rotation preserves old inflight credential'); return 'safe';
  }, subject);
  const after = f.vault.acquire(f.admin, request('after-rotation'));
  assert.ok(after.key_handle_id !== first.key_handle_id && after.key_handle_id !== next.key_handle_id, 'rotation selects replacement');
  f.vault.settle(f.admin, first.lease_id, success, subject); f.vault.remove(f.admin, 'key-a');
});

test('M18 VAULT UNKNOWN and close/reopen retain reservations and never automatically resend', async t => {
  const f = await fixture(t); await f.vault.add(f.admin, spec());
  const lease = f.vault.acquire(f.admin, request());
  await f.vault.withCredential(f.admin, lease.lease_id, async () => 'safe', subject);
  f.vault.settle(f.admin, lease.lease_id, { ...success, outcome: 'UNKNOWN', cost_micros: 0 }, subject);
  assert.throws(() => f.vault.remove(f.admin, 'key-a'), code('VAULT_KEY_IN_USE')); f.vault.close();
  const reopened = await CredentialVault.open({ root: f.location, admin: f.admin, protector: f.protector, mode: 'SYNTHETIC' });
  t.after(() => reopened.close());
  assert.equal(reopened.list(f.admin)[0].in_flight, 1); assert.equal(reopened.list(f.admin)[0].reserved_micros, 3);
  assert.throws(() => reopened.acquire(f.admin, request()), code('VAULT_UNKNOWN_OUTCOME'));
  assert.throws(() => reopened.acquire(f.admin, request('new-request')), code('VAULT_NO_ELIGIBLE_KEY'));
  await assert.rejects(reopened.withCredential(f.admin, lease.lease_id, async () => 'duplicate', subject), code('VAULT_LEASE_NOT_SENDABLE'));
  assert.throws(()=>reopened.settle(f.admin, lease.lease_id, success, subject),code('VAULT_RECONCILIATION_REQUIRED'));
  assert.throws(()=>reopened.settle(f.admin, lease.lease_id, {...success,outcome:'NOT_SENT',cost_micros:0}, subject),code('VAULT_SENT_RELEASE_BLOCKED'));
  assert.equal(reopened.list(f.admin)[0].in_flight, 1); assert.equal(reopened.list(f.admin)[0].reserved_micros, 3);
  await reopened.add(f.admin,spec('key-b'));
  // An un-settled acquisition is also conservatively UNKNOWN on close.
  reopened.acquire(f.admin, request('unsettled')); reopened.close();
  const third = await CredentialVault.open({ root: f.location, admin: f.admin, protector: f.protector, mode: 'SYNTHETIC' });
  t.after(() => third.close()); assert.throws(() => third.acquire(f.admin, request('unsettled')), code('VAULT_UNKNOWN_OUTCOME'));
});

test('M18 VAULT guard blocks raw/JSON/URL/base64 known secrets and emits static events', async t => {
  const f = await fixture(t); await f.vault.add(f.admin, spec());
  const raw = secret.toString(), unicode = raw.replace(/./g, char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'));
  for (const form of [raw, JSON.stringify(raw), unicode, encodeURIComponent(raw), encodeURIComponent(encodeURIComponent(raw)), secret.toString('base64'), secret.toString('base64url')]) {
    assert.throws(() => f.vault.guard.assertSafe('envelope:' + form, raw), code('VAULT_KNOWN_SECRET_BLOCKED'));
    assert.equal(f.vault.list(f.admin)[0].state, 'QUARANTINED');
  }
  const events = f.vault.securityEvents(f.admin); assert.equal(events.length, 7);
  assert.ok(!JSON.stringify(events).includes(raw), 'events must never echo channel or payload');
  assert.ok(events.every(event => event.code === 'KNOWN_SECRET_BLOCKED' && event.channel === 'VAULT_GUARD'));
});

test('M18 VAULT callback errors and returned credentials are sanitized and quarantined', async t => {
  const f = await fixture(t); await f.vault.add(f.admin, spec());
  const lease = f.vault.acquire(f.admin, request());
  await assert.rejects(f.vault.withCredential(f.admin, lease.lease_id, async authorization => { throw new Error(authorization); }, subject), code('VAULT_KNOWN_SECRET_BLOCKED'));
  assert.equal(f.vault.list(f.admin)[0].state, 'QUARANTINED');
  await f.vault.add(f.admin, spec('safe-second', { secret: Buffer.from('synthetic-test-second-fixture') }));
  const next = f.vault.acquire(f.admin, request('next'));
  await assert.rejects(f.vault.withCredential(f.admin, next.lease_id, async () => { throw new Error('arbitrary native detail'); }, subject), code('VAULT_CREDENTIAL_OPERATION_FAILED'));
  await f.vault.add(f.admin, spec('third', { secret: Buffer.from('synthetic-test-third-fixture') }));
  const third = f.vault.acquire(f.admin, request('third'));
  await assert.rejects(f.vault.withCredential(f.admin, third.lease_id, async authorization => ({ nested: { authorization } }), subject), code('VAULT_KNOWN_SECRET_BLOCKED'));
});

test('M18 VAULT import snapshot survives caller mutation while encryption awaits', async t => {
  const admin = createVaultAdminCapability(), base = new SyntheticMemoryProtector(), location = await root();
  let release!: () => void; const gate = new Promise<void>(accept => { release = accept; });
  const protector: CredentialProviderInterface = { id: 'delayed-encryption-fixture', protection: base.protection,
    protect: async bytes => { await gate; return base.protect(bytes); }, unprotect: bytes => base.unprotect(bytes) };
  const vault = await CredentialVault.open({ root: location, admin, protector, mode: 'SYNTHETIC' }); t.after(() => vault.close());
  const caller = spec('original', { secret: Buffer.from(secret) }), pending = vault.add(admin, caller);
  caller.key_id = 'mutated'; caller.provider_id = 'mutated'; caller.models[0] = 'mutated'; caller.secret.fill(0); release();
  const info = await pending; assert.equal(info.key_id, 'original'); assert.deepEqual(info.models, ['model-a']);
  const lease = vault.acquire(admin, request());
  await vault.withCredential(admin, lease.lease_id, async authorization => { assert.ok(authorization === 'Bearer ' + secret.toString(), 'import must use its captured secret'); return 'safe'; }, subject);
});

test('M18 VAULT revocation during asynchronous unprotect blocks the host callback', async t => {
  const admin = createVaultAdminCapability(), base = new SyntheticMemoryProtector(), location = await root();
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>(accept => { release = accept; }), started = new Promise<void>(accept => { entered = accept; });
  const protector: CredentialProviderInterface = { id: 'delayed-decryption-fixture', protection: base.protection,
    protect: bytes => base.protect(bytes), unprotect: async bytes => { entered(); await gate; return base.unprotect(bytes); } };
  const vault = await CredentialVault.open({ root: location, admin, protector, mode: 'SYNTHETIC' }); t.after(() => vault.close());
  await vault.add(admin, spec()); const lease = vault.acquire(admin, request()); let called = false;
  const pending = vault.withCredential(admin, lease.lease_id, async () => { called = true; return 'safe'; }, subject);
  await started; vault.setState(admin, 'key-a', 'DISABLED'); release();
  await assert.rejects(pending, code('VAULT_KEY_NOT_SENDABLE')); assert.equal(called, false);
});

test('M18 VAULT removing a settled key preserves request replay tombstones', async t => {
  const f = await fixture(t); await f.vault.add(f.admin, spec()); const lease = f.vault.acquire(f.admin, request());
  f.vault.settle(f.admin, lease.lease_id, success, subject); f.vault.remove(f.admin, 'key-a');
  await f.vault.add(f.admin, spec('new-key'));
  assert.throws(() => f.vault.acquire(f.admin, request()), code('VAULT_REQUEST_ALREADY_SETTLED'));
  assert.throws(() => f.vault.acquire(f.admin, request('request-a', { subject_key: 'other-subject' })), code('VAULT_SUBJECT_MISMATCH'));
});

test('M18 VAULT failed duplicate import never forgets the existing known secret', async t => {
  const f = await fixture(t); await f.vault.add(f.admin, spec());
  await assert.rejects(f.vault.add(f.admin, spec('key-a', { secret: Buffer.from('synthetic-test-rejected-duplicate') })), code('VAULT_KEY_EXISTS'));
  assert.throws(() => f.vault.guard.assertSafe(secret, 'fixture'), code('VAULT_KNOWN_SECRET_BLOCKED'));
});

test('M18 VAULT independent connection guards reject stale imports/rotation until owner refresh', async t => {
  const f = await fixture(t), second = await CredentialVault.open({ root: f.location, admin: f.admin, protector: f.protector, mode: 'SYNTHETIC' });
  t.after(() => second.close()); const borrowedGuard = second.guard;
  await f.vault.add(f.admin, spec());
  assert.throws(() => borrowedGuard.assertSafe('benign output', 'HOSTSTORE'), code('VAULT_GUARD_STALE'));
  assert.throws(() => second.list(f.admin), code('VAULT_GUARD_STALE'));
  await second.refreshGuard(f.admin);
  assert.throws(() => borrowedGuard.assertSafe(secret, 'HOSTSTORE'), code('VAULT_KNOWN_SECRET_BLOCKED'));
  const rotated = Buffer.from('synthetic-test-new-generation-fixture');
  await f.vault.rotate(f.admin, 'key-a', spec('new-key', { secret: rotated }));
  assert.throws(() => borrowedGuard.assertSafe(rotated, 'HOSTSTORE'), code('VAULT_GUARD_STALE'));
  await second.refreshGuard(f.admin);
  assert.throws(() => borrowedGuard.assertSafe(rotated.toString('base64'), 'HOSTSTORE'), code('VAULT_KNOWN_SECRET_BLOCKED'));
  f.vault.remove(f.admin, 'key-a'); await second.refreshGuard(f.admin);
  assert.throws(() => borrowedGuard.assertSafe(secret, 'HOSTSTORE'), code('VAULT_KNOWN_SECRET_BLOCKED'));
  second.close(); assert.throws(() => borrowedGuard.assertSafe('benign output', 'HOSTSTORE'), code('VAULT_GUARD_CLOSED'));
});

test('M18 VAULT open rejects a generation changed while its own encrypted entries load', async t => {
  const f = await fixture(t); await f.vault.add(f.admin, spec());
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>(accept => { release = accept; }), started = new Promise<void>(accept => { entered = accept; });
  const delayed: CredentialProviderInterface = { id: f.protector.id, protection: f.protector.protection, protect: bytes => f.protector.protect(bytes),
    unprotect: async bytes => { entered(); await gate; return f.protector.unprotect(bytes); } };
  const opening = CredentialVault.open({ root: f.location, admin: f.admin, protector: delayed, mode: 'SYNTHETIC' });
  await started; await f.vault.add(f.admin, spec('key-b', { secret: Buffer.from('synthetic-test-open-race-fixture') })); release();
  await assert.rejects(opening, code('VAULT_GUARD_STALE'));
});

test('M18 VAULT security events retain only 256 entries and preserve a lifetime count', async t => {
  const f = await fixture(t); await f.vault.add(f.admin, spec());
  for (let index = 0; index < 270; index++) assert.throws(() => f.vault.guard.assertSafe(secret, 'fixture'), code('VAULT_KNOWN_SECRET_BLOCKED'));
  assert.equal(f.vault.securityEvents(f.admin).length, 256); assert.equal(f.vault.securityEventCount(f.admin), 270);
});

test('M18 VAULT key/import and request evidence capacities fail closed without evicting leases', async t => {
  const keys = await fixture(t); await keys.vault.add(keys.admin, spec());
  const keyDb = new DatabaseSync(join(keys.location, 'vault.sqlite'));
  keyDb.exec(`WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<127)
    INSERT INTO credentials(key_id,key_handle_id,provider_id,models_json,ciphertext,state,max_concurrency,requests_per_minute,expires_at,cost_limit_micros)
    SELECT 'fixture-'||i,'handle-'||i,c.provider_id,c.models_json,c.ciphertext,c.state,c.max_concurrency,c.requests_per_minute,c.expires_at,c.cost_limit_micros
    FROM n CROSS JOIN credentials c WHERE c.key_id='key-a'; UPDATE metadata SET value='128' WHERE key='generation';`);
  keyDb.close(); await keys.vault.refreshGuard(keys.admin);
  await assert.rejects(keys.vault.add(keys.admin, spec('over-key-cap')), code('VAULT_KEY_CAPACITY'));
  assert.equal(keys.vault.list(keys.admin).length, 128);

  const imports = await fixture(t); await imports.vault.add(imports.admin, spec());
  const importDb = new DatabaseSync(join(imports.location, 'vault.sqlite')); importDb.prepare("UPDATE metadata SET value='1023' WHERE key='generation'").run(); importDb.close();
  await imports.vault.refreshGuard(imports.admin); await imports.vault.add(imports.admin, spec('last-import'));
  await assert.rejects(imports.vault.add(imports.admin, spec('over-import-cap')), code('VAULT_IMPORT_CAPACITY'));
  assert.throws(() => imports.vault.guard.assertSafe(secret, 'fixture'), code('VAULT_KNOWN_SECRET_BLOCKED'));

  const evidence = await fixture(t); await evidence.vault.add(evidence.admin, spec());
  const outstanding = evidence.vault.acquire(evidence.admin, request());
  const evidenceDb = new DatabaseSync(join(evidence.location, 'vault.sqlite'));
  evidenceDb.exec(`WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<4095)
    INSERT INTO request_tombstones(request_id,subject_key) SELECT 'past-request-'||i,'past-subject' FROM n;`); evidenceDb.close();
  assert.throws(() => evidence.vault.acquire(evidence.admin, request('over-record-cap')), code('VAULT_REQUEST_CAPACITY'));
  evidence.vault.settle(evidence.admin, outstanding.lease_id, { ...success, outcome: 'UNKNOWN', cost_micros: 0 }, subject);
  assert.throws(() => evidence.vault.remove(evidence.admin, 'key-a'), code('VAULT_KEY_IN_USE'));
  assert.equal(evidence.vault.list(evidence.admin)[0].in_flight, 1);
});

function fakeHelper(confirmClose: boolean) {
  const emitter = new EventEmitter();
  const child = Object.assign(emitter, { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), killed: false, detached: false,
    kill() { child.killed = true; if (confirmClose) queueMicrotask(() => child.emit('close', 1)); return confirmClose; },
    unref() { child.detached = true; } });
  return child;
}
test('M18 VAULT DPAPI all child/pipe errors converge on static failure after confirmed close', { skip: process.platform !== 'win32' }, async t => {
  let current = fakeHelper(true);
  t.mock.method(childProcess, 'spawn', () => current); syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  const protector = new WindowsCurrentUserDpapiProtector();
  for (const surface of ['stdin', 'stdout', 'stderr', 'child'] as const) {
    current = fakeHelper(true); const active = current, pending = protector.protect(secret);
    const rejection = assert.rejects(pending, code('VAULT_DPAPI_FAILED'));
    (surface === 'child' ? active : active[surface]).emit('error', new Error('fabricated native detail'));
    await rejection; assert.equal(active.killed, true);
    active.stdout.emit('error', new Error('fabricated delayed pipe detail')); active.stderr.emit('error', new Error('fabricated delayed pipe detail'));
  }
});
test('M18 VAULT DPAPI helper capacity and unconfirmed close permanently poison the protector', { skip: process.platform !== 'win32' }, async t => {
  let current = fakeHelper(false);
  t.mock.method(childProcess, 'spawn', () => current); syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  const protector = new WindowsCurrentUserDpapiProtector(), first = current, pending = protector.protect(secret);
  const rejection = assert.rejects(pending, code('VAULT_DPAPI_TERMINATION_UNCONFIRMED'));
  current = fakeHelper(false); const second = current, other = protector.protect(secret);
  const otherRejection = assert.rejects(other, code('VAULT_DPAPI_FAILED'));
  await assert.rejects(protector.protect(secret), code('VAULT_DPAPI_BUSY'));
  second.emit('close', 1); await otherRejection;
  first.stdout.emit('error', new Error('fabricated native detail')); await rejection;
  assert.equal(first.killed, true); assert.equal(first.detached, true);
  first.emit('close', 1);
  await assert.rejects(protector.protect(secret), code('VAULT_DPAPI_REQUALIFICATION_REQUIRED'));
  await assert.rejects(protector.unprotect(secret), code('VAULT_DPAPI_REQUALIFICATION_REQUIRED'));
});
test('M18 VAULT native DPAPI failed spawn is a static rejection without unhandled pipe error', { skip: process.platform !== 'win32' }, async () => {
  const protector = new WindowsCurrentUserDpapiProtector({ powershell: 'C:\\AgentNexus-no-such-fixture\\pwsh.exe' });
  await assert.rejects(protector.protect(secret), code('VAULT_DPAPI_FAILED'));
});

test('M18 VAULT refuses wrong DB content, foreign SQLite, hardlinks, symlinks, and protector mismatch', async t => {
  const admin = createVaultAdminCapability(), protector = new SyntheticMemoryProtector();
  const wrong = await root(); await writeFile(join(wrong, 'vault.sqlite'), 'wrong content', { mode: 0o600 });
  await assert.rejects(CredentialVault.open({ root: wrong, admin, protector, mode: 'SYNTHETIC' }), code('VAULT_INVALID_DATABASE'));
  const foreign = await root(), db = new DatabaseSync(join(foreign, 'vault.sqlite')); db.exec('CREATE TABLE foreign_table(id TEXT)'); db.close();
  await assert.rejects(CredentialVault.open({ root: foreign, admin, protector, mode: 'SYNTHETIC' }), error => error instanceof VaultError);
  const f = await fixture(t); await f.vault.add(f.admin, spec()); f.vault.close();
  await assert.rejects(CredentialVault.open({ root: f.location, admin: f.admin, protector: new SyntheticMemoryProtector(), mode: 'SYNTHETIC' }), code('VAULT_UNPROTECT_FAILED'));
  await t.test('hardlink fixture is rejected where host permits creating it', async child => {
    const linked = await root();
    try { await link(join(f.location, 'vault.sqlite'), join(linked, 'vault.sqlite')); }
    catch (error) { if (['EPERM', 'EACCES', 'ENOTSUP'].includes((error as NodeJS.ErrnoException).code ?? '')) { child.skip('Host denies hardlink fixture creation; no ACL/account changes attempted.'); return; } throw error; }
    await assert.rejects(CredentialVault.open({ root: linked, admin, protector, mode: 'SYNTHETIC' }), code('VAULT_UNSAFE_PATH'));
  });
  await t.test('junction/symlink fixture is rejected where host permits creating it', async child => {
    const junctionRoot = await root(), junction = join(junctionRoot, 'linked-root');
    try { await symlink(f.location, junction, process.platform === 'win32' ? 'junction' : 'dir'); }
    catch (error) { if (['EPERM', 'EACCES', 'ENOTSUP'].includes((error as NodeJS.ErrnoException).code ?? '')) { child.skip('Host denies junction/symlink fixture creation; no ACL/account changes attempted.'); return; } throw error; }
    child.after(async () => { await unlink(junction); });
    await assert.rejects(CredentialVault.open({ root: junction, admin, protector, mode: 'SYNTHETIC' }), code('VAULT_UNSAFE_PATH'));
  });
});

const powershell = ['C:\\Program Files\\PowerShell\\7\\pwsh.exe', 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'].find(existsSync);
test('M18 VAULT actual CurrentUser DPAPI anonymous-pipe synthetic smoke and persistent reopen', { skip: process.platform !== 'win32' || !powershell }, async t => {
  const protector = new WindowsCurrentUserDpapiProtector({ powershell }), encrypted = await protector.protect(secret);
  assert.ok(!Buffer.from(encrypted).includes(secret), 'DPAPI ciphertext must not expose fixture');
  const decrypted = await protector.unprotect(encrypted); assert.ok(Buffer.from(decrypted).equals(secret), 'CurrentUser DPAPI roundtrip'); decrypted.fill(0);
  const admin = createVaultAdminCapability(), location = await root();
  const vault = await CredentialVault.open({ root: location, admin, protector, mode: 'SYNTHETIC' });
  await vault.add(admin, spec()); vault.close();
  const reopened = await CredentialVault.open({ root: location, admin, protector: new WindowsCurrentUserDpapiProtector({ powershell }), mode: 'SYNTHETIC' });
  t.after(() => reopened.close()); assert.equal(reopened.list(admin)[0].protection, 'WINDOWS_DPAPI_CURRENT_USER');
});
