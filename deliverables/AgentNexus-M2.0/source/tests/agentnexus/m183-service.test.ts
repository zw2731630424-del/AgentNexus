import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { CredentialBroker } from '../../src/agentnexus/credential-service/broker.ts';
import { ServiceStore } from '../../src/agentnexus/credential-service/store.ts';
import { openSyntheticCredentialService, connectCredentialService } from '../../src/agentnexus/credential-service/client.ts';
import { hostSubject } from '../../src/agentnexus/harness/contracts.ts';
import { canonical, sha256 } from '../../src/agentnexus/types.ts';
import { DeepSeekAdapter } from '../../src/agentnexus/model-runtime/adapters.ts';
import { createDeepSeekFlashSpec } from '../../src/agentnexus/model-runtime/deepseek.ts';
import { FixtureTransport, wireFixture } from '../../src/agentnexus/model-runtime/transport.ts';
import { CredentialVault, createVaultAdminCapability } from '../../src/agentnexus/model-runtime/vault.ts';
import { DatabaseSync } from 'node:sqlite';
import type { BrokerInput, BrokerBinding } from '../../src/agentnexus/credential-service/contracts.ts';
import type { AssembledContext, ContextSource } from '../../src/agentnexus/harness/context.ts';

const base = fileURLToPath(new URL('../../../../../.workflow-kit/runtime/AgentNexus-M1.8.3-Q3/security-tests/', import.meta.url));
const SECRET = 'synthetic-test-m183-qualification-canary-0192837465';
async function root() { await mkdir(base, { recursive: true }); return mkdtemp(join(base, 'service-')); }
export function input(text = 'Synthetic protocol test. Return FINAL with text OK.', request_id = randomUUID()): BrokerInput {
  const subject = hostSubject('synthetic-runtime'), digest = sha256(text);
  const source = { event_id: 'synthetic-source', record_hash: digest, project_id: subject.project_id, task_id: subject.task_id, kind: 'RAW', payload_ref: { sha256: digest, bytes: Buffer.byteLength(text) }, offset: 0, length: Buffer.byteLength(text) } as ContextSource;
  const context: AssembledContext = { view_id: 'synthetic-view', project_id: subject.project_id, task_id: subject.task_id, agent_id: subject.agent_id, text, bytes: Buffer.byteLength(text), sha256: digest, entries: [{ source, text, section: 'TASK_CONTRACT', required: true, range_sha256: digest }], omitted: [] };
  const model = { ...createDeepSeekFlashSpec('2026-11-08T00:00:00Z', '2027-01-01T00:00:00Z'), price: { ...createDeepSeekFlashSpec('2026-11-08T00:00:00Z', '2027-01-01T00:00:00Z').price, assurance: 'SIMULATED' as const } };
  const adapter = new DeepSeekAdapter();
  const request = adapter.build({ request_id, model, prompt: text, max_output_tokens: 256, stream: true, json: true, reasoning: 'disabled', tools: [] }); adapter.abandon(request_id);
  return { subject, context, context_hash: digest, model, request, input_tokens: 1, output_tokens: 256 };
}
async function setup(t: test.TestContext, fixture?: FixtureTransport) {
  const dir = await root(), broker = await CredentialBroker.open({ synthetic: true, root: dir, fixture });
  t.after(async () => { await broker.close(); });
  const save = async (rotate_id?: string, expires_at?: number) => broker.mutate('credential.save', { provider_id: 'deepseek', name: 'Synthetic Key', notes: '', secret_b64: Buffer.from(SECRET).toString('base64'), max_concurrency: 4, requests_per_minute: 120, models: ['deepseek-flash'], model_wire_ids: { 'deepseek-flash': 'deepseek-flash' }, ...(rotate_id ? { rotate_id } : {}), ...(expires_at === undefined ? {} : { expires_at }) });
  const prepare = (p = input()) => { broker.reviewSynthetic(p); return { input: p, binding: broker.prepare(p) }; };
  return { dir, broker, save, prepare };
}

test('M183 SIMULATED service owns encrypted storage and exposes no secret read/decrypt/export API', async t => {
  const f = await setup(t); await f.save(); const s = f.broker.snapshot();
  assert.equal(s.qualification.credential_service, 'BLOCKED'); assert.equal(s.qualification.real_key_entry, false); assert.equal(s.usage.global.limit, 100000000);
  assert.equal(JSON.stringify(s).includes(SECRET), false);
  for (const method of ['credential.read', 'credential.export', 'vault.decrypt', 'http.proxy']) await assert.rejects(f.broker.mutate(method, {}), /METHOD_DENIED/);
  const disk = await readFile(join(f.dir, 'credentials/vault.sqlite')); assert.equal(disk.includes(Buffer.from(SECRET)), false);
});
test('M183 LIVE Vault rejects a forged service permit before opening any real credential store', async () => {
  await assert.rejects(CredentialVault.open({ mode: 'LIVE', root: await root(), admin: createVaultAdminCapability(), serviceBoundary: { service_sid: 'S-1-5-80-1-2-3-4-5', evidence_sha256: 'a'.repeat(64), policy_epoch: 1, real_import_enabled: true, live_enabled: true } }), /BOUNDARY_REQUIRED/);
});
test('M183 credential import tickets bind channel, metadata and secret hash, and cannot replay', async t => {
  const f = await setup(t);
  const metadata = { provider_id: 'deepseek', name: 'Ticket Key', notes: '', max_concurrency: 1, requests_per_minute: 120, models: ['deepseek-flash'], model_wire_ids: { 'deepseek-flash': 'deepseek-flash' } };
  const ticket = f.broker.prepareImport('trusted-qualification-channel', { operation_id: randomUUID(), metadata_hash: sha256(canonical(metadata)), secret_sha256: sha256(SECRET) });
  const payload = () => ({ ...metadata, secret_b64: Buffer.from(SECRET).toString('base64'), import_ticket: ticket.ticket_id, import_operation_id: ticket.operation_id });
  await assert.rejects(f.broker.mutate('credential.save', payload(), 'forged-channel'), /TICKET_INVALID/);
  await assert.rejects(f.broker.mutate('credential.save', { ...payload(), name: 'changed metadata' }, 'trusted-qualification-channel'), /TICKET_INVALID/);
  await f.broker.mutate('credential.save', payload(), 'trusted-qualification-channel');
  await assert.rejects(f.broker.mutate('credential.save', payload(), 'trusted-qualification-channel'), /TICKET_INVALID/);
  assert.equal(f.broker.snapshot().keys.length, 1);
});
test('M183 disconnect revokes queued import and rechecks authorization before encrypted commit', async t => {
  const f = await setup(t), channel = 'disconnect-qualification-channel';
  const metadata = { provider_id: 'deepseek', name: 'Disconnected Key', notes: '', max_concurrency: 1, requests_per_minute: 120, models: ['deepseek-flash'], model_wire_ids: { 'deepseek-flash': 'deepseek-flash' } };
  const ticket = f.broker.prepareImport(channel, { operation_id: randomUUID(), metadata_hash: sha256(canonical(metadata)), secret_sha256: sha256(SECRET) });
  const pending = f.broker.mutate('credential.save', { ...metadata, secret_b64: Buffer.from(SECRET).toString('base64'), import_ticket: ticket.ticket_id, import_operation_id: ticket.operation_id }, channel);
  f.broker.disconnectImports(channel); await assert.rejects(pending, /TICKET_INVALID/); assert.equal(f.broker.snapshot().keys.length, 0);
});
test('M183 credential import audit never persists a known secret supplied as operation identity', async t => {
  const f = await setup(t); await f.save();
  assert.throws(() => f.broker.prepareImport('qualification-channel', { operation_id: SECRET, metadata_hash: sha256('metadata'), secret_sha256: sha256(SECRET) }), /KNOWN_SECRET_BLOCKED/);
  assert.equal(JSON.stringify(f.broker.store.auditRows()).includes(SECRET), false);
});
test('M183 a newly submitted secret is scanned before any metadata save-intent can persist it', async t => {
  const f = await setup(t), metadata = { provider_id: 'deepseek', name: 'New Key', notes: '', secret_b64: Buffer.from(SECRET).toString('base64'), max_concurrency: 1, requests_per_minute: 120, models: ['deepseek-flash'], model_wire_ids: { 'deepseek-flash': 'deepseek-flash' } };
  for (const patch of [{ provider_id: SECRET }, { name: SECRET }, { notes: Buffer.from(SECRET).toString('base64') }]) await assert.rejects(f.broker.mutate('credential.save', { ...metadata, ...patch }), /KNOWN_SECRET_BLOCKED/);
  const audit = f.broker.store.auditRows(); assert.equal(audit.length, 0); assert.equal(JSON.stringify(audit).includes(SECRET), false); assert.equal(f.broker.snapshot().keys.length, 0);
});
test('M183 exact reviewed bytes bind subject/body/context and unreviewed PUBLIC claims grant nothing', async t => {
  const f = await setup(t); await f.save(); const p = input();
  assert.throws(() => f.broker.prepare(p), /EGRESS_DENIED/);
  const approved = f.prepare(p);
  for (const patch of [{ context_hash: sha256('other') }, { subject: { ...p.subject, runtime_instance_id: 'forged-worker' } }]) await assert.rejects(f.broker.execute({ ...approved, input: { ...p, ...patch } }, async () => {}), /HASH|BINDING|EGRESS/);
  const modified = JSON.parse(p.request.body); modified.messages.push({ role: 'developer', content: 'unreviewed' });
  await assert.rejects(f.broker.execute({ ...approved, input: { ...p, request: { ...p.request, body: JSON.stringify(modified) } } }, async () => {}), /BINDING|EGRESS/);
  assert.equal(f.broker.snapshot().usage.global.held, 0);
});
test('M183 endpoint/method/model/header allowlists reject generic HTTP proxy and auth injection', async t => {
  const f = await setup(t); const p = input();
  for (const url of ['http://api.deepseek.com/chat/completions', 'https://evil.example/chat/completions', 'https://api.deepseek.com:444/chat/completions', 'https://api.deepseek.com/chat/completions?url=evil']) assert.throws(() => f.broker.reviewSynthetic({ ...p, request: { ...p.request, url } }), /ALLOWLIST/);
  assert.throws(() => f.broker.reviewSynthetic({ ...p, request: { ...p.request, method: 'GET' as any } }), /ALLOWLIST/);
  assert.throws(() => f.broker.reviewSynthetic({ ...p, request: { ...p.request, headers: { ...p.request.headers, authorization: 'fake' } } }), /HEADERS/);
});
test('M183 duplicate JSON, hidden source, INTERNAL and self-declared PUBLIC decisions fail closed', async t => {
  const f = await setup(t), p = input();
  assert.throws(() => f.broker.reviewSynthetic({ ...p, request: { ...p.request, body: p.request.body.replace('{', '{"model":"hidden",') } }), /ALLOWLIST/);
  assert.throws(() => f.broker.reviewSynthetic(input('Internal file C:\\private\\rules.txt')), /SENSITIVE/);
  for (const classification of ['INTERNAL', 'CONFIDENTIAL', 'SECRET']) assert.throws(() => f.broker.reviewSynthetic(p, { sources: p.context.entries.map(e => ({ source: e.source, range_sha256: e.range_sha256, classification: classification as any, origin: 'SYNTHETIC_QUALIFICATION', review_ref: 'agent-label' })) }), /CLASSIFICATION/);
  assert.throws(() => f.broker.reviewSynthetic(p, { sources: [] }), /SOURCE_COVERAGE/);
});
test('M183 request/operation/nonce replay and forged runtime/deadline/policy epoch are denied', async t => {
  const f = await setup(t); await f.save(); const p = f.prepare();
  for (const patch of [{ runtime_identity: 'forged' }, { deadline: Date.now() - 1 }, { policy_epoch: 999 }, { operation_id: 'x'.repeat(129) }, { token_reservation_id: 'other' }]) await assert.rejects(f.broker.execute({ ...p, binding: { ...p.binding, ...patch } }, async () => {}));
  await f.broker.execute(p, async () => {});
  await assert.rejects(f.broker.execute(p, async () => {}), /REPLAY/); assert.equal(f.broker.snapshot().usage.global.used, 30);
});
test('M183 key revoke invalidates old handle immediately without resetting the shared budget', async t => {
  const f = await setup(t); const key = await f.save(), p = f.prepare();
  await f.broker.mutate('credential.delete', { key_id: key.key_id }); await f.save();
  await assert.rejects(f.broker.execute(p, async () => {}), /HANDLE_REVOKED/);
  assert.equal(f.broker.snapshot().usage.global.held, 0); assert.equal(f.broker.snapshot().usage.global.limit, 100000000);
  await f.broker.execute(f.prepare(), async () => {}); assert.equal(f.broker.snapshot().usage.global.used, 30);
  await assert.rejects(f.broker.mutate('credential.state', { key_id: key.key_id, enabled: true }), /REVOKED/);
});
test('M183 expired credentials and rotated handles are denied on all new requests', async t => {
  const f = await setup(t); await f.save(undefined, Date.now() - 1); const p = input(); f.broker.reviewSynthetic(p); assert.throws(() => f.broker.prepare(p), /CREDENTIAL_REQUIRED/);
  const key = await f.save(), before = f.prepare(); await f.save(key.key_id);
  await assert.rejects(f.broker.execute(before, async () => {}), /HANDLE_REVOKED/);
  const next = f.prepare(); assert.notEqual(next.binding.credential_handle_id, before.binding.credential_handle_id);
  await f.broker.execute(next, async () => {}); assert.equal(f.broker.snapshot().usage.global.used, 30);
});
test('M183 in-flight revoke and rotation retain the original sent operation and do not resend', async t => {
  let release!: () => void, started!: () => void; const gate = new Promise<void>(r => { release = r; }), arrived = new Promise<void>(r => { started = r; });
  const fixture = new FixtureTransport(async () => { started(); await gate; return wireFixture(JSON.stringify({ kind: 'FINAL', text: 'OK' })); });
  const f = await setup(t, fixture), key = await f.save(), original = f.prepare();
  const pending = f.broker.execute(original, async () => {}); await arrived;
  await f.save(key.key_id); await f.broker.mutate('credential.delete', { key_id: key.key_id }); release();
  const result = await pending; assert.equal(result.key_handle_id, original.binding.credential_handle_id); assert.equal(fixture.calls, 1); assert.equal(f.broker.snapshot().usage.global.used, 30);
});
test('M183 UNKNOWN and partial provider usage hold reservations and forbid automatic retry', async t => {
  const fixture = new FixtureTransport(() => wireFixture(JSON.stringify({ kind: 'FINAL', text: 'partial' }), { done: false }));
  const f = await setup(t, fixture); await f.save(); await assert.rejects(f.broker.execute(f.prepare(), async () => {}), /SENT_OUTCOME_UNKNOWN/);
  const before = f.broker.snapshot(); assert.equal(before.usage.global.used, 30); assert.ok(before.usage.global.held > 0); assert.equal(before.usage.global.unknown, 1);
  await assert.rejects(f.broker.execute(f.prepare(), async () => {}), /RECONCILIATION/); assert.equal(fixture.calls, 1);
});
test('M183 missing Usage never releases the reservation after a complete stream', async t => {
  const f = await setup(t, new FixtureTransport(() => wireFixture(JSON.stringify({ kind: 'FINAL', text: 'no usage' }), { usage: null }))); await f.save();
  await assert.rejects(f.broker.execute(f.prepare(), async () => {}), /SENT_OUTCOME_UNKNOWN/);
  const s = f.broker.snapshot(); assert.equal(s.usage.global.used, 0); assert.ok(s.usage.global.held > 0); assert.equal(s.usage.global.unknown, 1);
});
test('M183 provider timeout/cancel preserves unknown outcome, bounded slots and no automatic resend', async t => {
  let started!: () => void; const arrived = new Promise<void>(r => { started = r; });
  const f = await setup(t, new FixtureTransport(async (_r, _n, signal) => { started(); await new Promise<void>((_, reject) => signal.addEventListener('abort', () => reject(Error('TIMEOUT')), { once: true })); throw Error('UNREACHABLE'); })); await f.save();
  const original = input(); f.broker.reviewSynthetic(original); const p = { input: original, binding: f.broker.prepare(original, 2000) };
  const result = f.broker.execute(p, async () => {}); await arrived; await assert.rejects(result, (e: any) => e.sent && e.timed_out);
  assert.ok(f.broker.snapshot().usage.global.held > 0);
});
test('M183 service streaming respects consumer backpressure and UTF-8 with bounded guard holdback', async t => {
  let reads = 0, consumer!: () => void, observed!: () => void; const pause = new Promise<void>(r => { consumer = r; }), arrived = new Promise<void>(r => { observed = r; });
  const text = '你好🌏'.repeat(300);
  const f = await setup(t, new FixtureTransport(() => { const response = wireFixture(JSON.stringify({ kind: 'FINAL', text }), { chunk_bytes: 17 }); const body = response.body; return { ...response, body: (async function* () { for await (const chunk of body) { reads++; yield chunk; } })() }; })); await f.save();
  let output = '', first = true;
  const result = f.broker.execute(f.prepare(), async delta => { output += delta; if (first) { first = false; observed(); await pause; } });
  await arrived; const before = reads; await new Promise(r => setTimeout(r, 30)); assert.equal(reads, before); consumer();
  await result; assert.equal(JSON.parse(output).text, text); assert.ok(reads > before);
});
test('M183 encoded and fragmented known secrets cannot leave service deltas, context or audit', async t => {
  const encoded = Buffer.from(SECRET).toString('base64'), split = Math.floor(encoded.length / 2);
  const fixture = new FixtureTransport(() => {
    const event = (content: string, finish: string | null) => 'data: ' + JSON.stringify({ id: 'synthetic-fragments', choices: [{ index: 0, delta: { content }, finish_reason: finish }] }) + '\n\n';
    const body = Buffer.from(event('{"kind":"FINAL","text":"' + encoded.slice(0, split), null) + event(encoded.slice(split) + '"}', 'stop') + 'data: [DONE]\n\n');
    return { status: 200, headers: { 'content-type': 'text/event-stream' }, body: (async function* () { for (let n = 0; n < body.length; n++) yield body.subarray(n, n + 1); })() };
  }); const f = await setup(t, fixture); await f.save(); let published = '';
  await assert.rejects(f.broker.execute(f.prepare(), async text => { published += text; }), /SENT_OUTCOME_UNKNOWN/);
  assert.equal(published.includes(SECRET), false); assert.equal(published.includes(encoded), false); assert.equal(JSON.stringify(f.broker.store.auditRows()).includes(SECRET), false);
});
test('M183 prepare-issued full binding rejects null or substituted handles and concurrent duplicate IDs', async t => {
  let arrived!: () => void, release!: () => void; const started = new Promise<void>(r => { arrived = r; }), gate = new Promise<void>(r => { release = r; });
  const fixture = new FixtureTransport(async () => { arrived(); await gate; return wireFixture(JSON.stringify({ kind: 'FINAL', text: 'OK' })); });
  const f = await setup(t, fixture); await f.save(); await f.save(); const p = f.prepare();
  await assert.rejects(f.broker.execute({ ...p, binding: { ...p.binding, credential_handle_id: null } }, async () => {}), /HANDLE_REQUIRED/);
  const other = f.broker.snapshot().keys.find(k => k.key_handle_id !== p.binding.credential_handle_id)!;
  await assert.rejects(f.broker.execute({ ...p, binding: { ...p.binding, credential_handle_id: other.key_handle_id } }, async () => {}), /PREPARED_BINDING/);
  const pending = f.broker.execute(p, async () => {}); await started;
  await assert.rejects(f.broker.execute(p, async () => {}), /INFLIGHT/); await assert.rejects(f.broker.close(), /SERVICE_BUSY/);
  release(); await pending; assert.equal(fixture.calls, 1);
});
test('M183 ledger atomically reserves global/agent/task/project and recovers UNKNOWN without resetting', async () => {
  const dir = await root(), store = new ServiceStore(dir, true), subject = hostSubject('runtime');
  function binding(): BrokerBinding { const id = randomUUID(); return { request_id: id, operation_id: randomUUID(), agent_id: subject.agent_id, runtime_identity: sha256(canonical(subject)), task_id: subject.task_id, project_id: subject.project_id, provider_id: 'deepseek', model_id: 'deepseek-flash', credential_handle_id: null, request_body_hash: 'a'.repeat(64), context_hash: 'b'.repeat(64), data_egress_decision: 'fixture', data_classification: 'SYNTHETIC', token_reservation_id: id, deadline: Date.now() + 1000, nonce: randomUUID(), policy_epoch: 1 }; }
  const accepted = await Promise.allSettled(Array.from({ length: 8 }, () => Promise.resolve().then(() => { const b = binding(); store.prepared(b); store.reserve(b, subject, 600000, 100); })));
  assert.equal(accepted.filter(x => x.status === 'fulfilled').length, 1); assert.equal(store.usage().global.held, 600100); store.close();
  const recovered = new ServiceStore(dir, true); assert.equal(recovered.usage().global.held, 600100); assert.equal(recovered.usage().global.unknown, 1); const b = binding(); recovered.prepared(b); assert.throws(() => recovered.reserve(b, { ...subject, session_id: 'new-session' }, 1, 1), /RECONCILIATION/); recovered.close();
});
test('M183 service owns configured Agent/Task limits and changing scope never resets global spend', async t => {
  const f = await setup(t); await f.save(); const p = input();
  await f.broker.mutate('budget.configure', { subject: p.subject, agent_tokens: 100, task_tokens: 100, project_tokens: 100000000 });
  await assert.rejects(f.broker.execute(f.prepare(p), async () => {}), /BUDGET_EXHAUSTED/); assert.equal(f.broker.snapshot().usage.global.held, 0);
  await f.broker.mutate('budget.configure', { subject: p.subject, agent_tokens: 1000000, task_tokens: 1000000, project_tokens: 100000000 });
  await f.broker.execute(f.prepare(), async () => {});
  await f.broker.mutate('budget.configure', { subject: { ...p.subject, session_id: 'new-session' }, agent_tokens: 1000000, task_tokens: 1000000, project_tokens: 100000000 });
  assert.equal(f.broker.snapshot().usage.global.used, 30); await assert.rejects(f.broker.mutate('budget.configure', { subject: p.subject, agent_tokens: 10, task_tokens: 10, project_tokens: 100000000 }), /BELOW_COMMITTED/);
});
test('M183 misspelled or duplicate GLOBAL ledger identity never creates a replacement quota', async () => {
  for (const duplicate of [false, true]) {
    const dir = await root(), initial = new ServiceStore(dir, true); initial.close();
    const file = join(dir, 'ledger.sqlite'), db = new DatabaseSync(file);
    if (duplicate) db.prepare("INSERT INTO budgets(scope,id,lim) VALUES ('GLOBAL','duplicate-owner',100000000)").run();
    else db.prepare("UPDATE budgets SET id='misspelled-owner' WHERE scope='GLOBAL'").run(); db.close();
    assert.throws(() => new ServiceStore(dir, true), /LEDGER_IDENTITY/);
    const view = new DatabaseSync(file, { readOnly: true }); const ids = view.prepare("SELECT id FROM budgets WHERE scope='GLOBAL' ORDER BY id").all().map(r => r.id);
    assert.deepEqual(ids, duplicate ? ['duplicate-owner', 'm181-deepseek'] : ['misspelled-owner']); view.close();
  }
});
test('M183 actual synthetic IPC duplicate execution preserves cancellation ownership', async t => {
  const port = await openSyntheticCredentialService(await root()); t.after(async () => { await port.close(); });
  await port.invoke('credential.save', { provider_id: 'deepseek', name: 'IPC Key', notes: '', secret: Buffer.from(SECRET), models: ['deepseek-flash'], model_wire_ids: { 'deepseek-flash': 'deepseek-flash' }, max_concurrency: 4, requests_per_minute: 120 });
  await port.invoke('synthetic.scenario', { name: 'timeout' }); const p = input(); await port.invoke('synthetic.review', { input: p }); const binding = await port.invoke('broker.prepare', { input: p });
  const pending = port.invoke('broker.execute', { input: p, binding }); const rejected = assert.rejects(pending, /SENT_OUTCOME_UNKNOWN/);
  for (let n = 0; n < 50 && (await port.snapshot()).usage.global.requests === 0; n++) await new Promise(r => setTimeout(r, 10));
  await assert.rejects(port.invoke('broker.execute', { input: p, binding }), /INFLIGHT/);
  const cancelled = await port.invoke('request.cancel', { request_id: binding.request_id }); assert.equal(cancelled.cancelled, true); await rejected;
  assert.equal((await port.snapshot()).usage.global.unknown, 1);
});
test('M183 management request identifiers cannot be replayed after state changes', async t => {
  const f = await setup(t); f.broker.claimManagement('same-management-id', 'credential.state');
  assert.throws(() => f.broker.claimManagement('same-management-id', 'credential.delete'), /MANAGEMENT_REPLAY/);
});
test('M183 actual same-SID subprocess RPC rejects forged methods/identity, preserves usage across service restart', async t => {
  const dir = await root(); let port = await openSyntheticCredentialService(dir); t.after(async () => { await port.close(); });
  const secret = Buffer.from(SECRET); await port.invoke('credential.save', { provider_id: 'deepseek', name: 'Process Key', notes: '', secret, models: ['deepseek-flash'], model_wire_ids: { 'deepseek-flash': 'deepseek-flash' }, max_concurrency: 4, requests_per_minute: 120 }); assert.ok(secret.every(b => b === 0));
  for (const method of ['credential.read', 'credential.export', 'vault.decrypt', 'host.register', 'http.proxy']) await assert.rejects(port.invoke(method, { pid: process.pid, start_id: 'forged', role: 'host' }));
  const p = input(); await port.execute(p); assert.equal((await port.snapshot()).usage.global.used, 30);
  await port.close(); port = await openSyntheticCredentialService(dir); assert.equal((await port.snapshot()).usage.global.used, 30); await assert.rejects(port.execute(p), /REPLAY/);
});
test('M183 actual synthetic service crash retains sent hold and never replays on restart', async t => {
  const dir = await root(); let port = await openSyntheticCredentialService(dir); t.after(async () => { await port.close(); });
  await port.invoke('credential.save', { provider_id: 'deepseek', name: 'Crash Key', notes: '', secret: Buffer.from(SECRET), models: ['deepseek-flash'], model_wire_ids: { 'deepseek-flash': 'deepseek-flash' }, max_concurrency: 4, requests_per_minute: 120 });
  await port.invoke('synthetic.scenario', { name: 'timeout' }); const pending = port.execute(input()); const rejected = assert.rejects(pending, /DISCONNECTED/);
  for (let n = 0; n < 50 && (await port.snapshot()).usage.global.requests === 0; n++) await new Promise(r => setTimeout(r, 10));
  assert.ok((await port.snapshot()).usage.global.held > 0); (port as any).child.kill(); await rejected;
  port = await openSyntheticCredentialService(dir); const s = await port.snapshot(); assert.equal(s.usage.global.unknown, 1); assert.ok(s.usage.global.held > 0); assert.equal(s.usage.global.requests, 1);
});
