// Independent, synthetic-only protocol attacks. No native service, UAC, OS ACL,
// account, real Key, network provider, or sensitive system process is touched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CredentialBroker } from '../../source/src/agentnexus/credential-service/broker.ts';
import { DailyGateway } from '../../source/src/agentnexus/credential-service/daily-gateway.ts';
import { connectCredentialService } from '../../source/src/agentnexus/credential-service/client.ts';
import { hostSubject } from '../../source/src/agentnexus/harness/contracts.ts';
import { canonical, sha256 } from '../../source/src/agentnexus/types.ts';
import { DeepSeekAdapter } from '../../source/src/agentnexus/model-runtime/adapters.ts';
import { createDeepSeekFlashSpec } from '../../source/src/agentnexus/model-runtime/deepseek.ts';
import { FixtureTransport, wireFixture } from '../../source/src/agentnexus/model-runtime/transport.ts';

const stateBase = fileURLToPath(new URL('../../../../.workflow-kit/runtime/AgentNexus-M1.8.3-Q2/independent-review-state/', import.meta.url));
const CANARY = 'synthetic-test-independent-q2-canary-6831749025';
function input(text = 'Synthetic independent security fixture. Return FINAL with text OK.') {
  const scope = hostSubject('independent-synthetic-runtime'), digest = sha256(text);
  const source = { event_id: 'independent-synthetic-source', record_hash: digest, project_id: scope.project_id, task_id: scope.task_id,
    kind: 'RAW', payload_ref: { sha256: digest, bytes: Buffer.byteLength(text) }, offset: 0, length: Buffer.byteLength(text) };
  const context = { view_id: 'independent-synthetic-view', project_id: scope.project_id, task_id: scope.task_id, agent_id: scope.agent_id,
    text, bytes: Buffer.byteLength(text), sha256: digest, entries: [{ source, text, section: 'TASK_CONTRACT', required: true, range_sha256: digest }], omitted: [] };
  const baseModel = createDeepSeekFlashSpec('2026-11-08T00:00:00Z', '2027-01-01T00:00:00Z');
  const model = { ...baseModel, price: { ...baseModel.price, assurance: 'SIMULATED' } };
  const adapter = new DeepSeekAdapter(), requestId = randomUUID();
  const request = adapter.build({ request_id: requestId, model, prompt: text, max_output_tokens: 256, stream: true, json: true, reasoning: 'disabled', tools: [] });
  adapter.abandon(requestId);
  return { subject: scope, context, context_hash: digest, model, request, input_tokens: 1, output_tokens: 256 };
}
const clone = value => JSON.parse(JSON.stringify(value));
async function setup(t, transport) {
  await mkdir(stateBase, { recursive: true });
  const root = await mkdtemp(join(stateBase, 'attack-'));
  const fixture = transport ?? new FixtureTransport(() => wireFixture(JSON.stringify({ kind: 'FINAL', text: 'INDEPENDENT SYNTHETIC OK' }), { usage: { prompt_tokens: 20, completion_tokens: 10 } }));
  const broker = await CredentialBroker.open({ synthetic: true, root, fixture });
  let closed = false;
  const close = async () => { if (!closed) { await broker.close(); closed = true; } };
  t.after(close);
  await broker.mutate('credential.save', { provider_id: 'deepseek', name: 'Independent synthetic fixture', notes: '', secret_b64: Buffer.from(CANARY).toString('base64'),
    max_concurrency: 4, requests_per_minute: 120, models: ['deepseek-flash'], model_wire_ids: { 'deepseek-flash': 'deepseek-flash' } });
  const daily = DailyGateway.syntheticFixture(broker), channel = 'independent-inherited-fixture';
  const prepare = (p = input()) => { daily.attachSynthetic(channel, p.subject); broker.reviewSynthetic(p); return { input: p, grant: daily.prepare(channel, { input: p }) }; };
  return { root, fixture, broker, daily, channel, prepare, close };
}

test('INDEPENDENT synthetic: ordinary desktop connector stays BLOCKED without launching UAC/native client', async () => {
  const client = await connectCredentialService();
  try {
    const snapshot = await client.snapshot();
    assert.equal(snapshot.qualification.credential_service, 'BLOCKED');
    assert.equal(snapshot.qualification.real_key_entry, false);
    await assert.rejects(client.execute(input()), /BLOCKED/);
    await assert.rejects(client.invoke('runtime.register', { pid: process.pid, native_verified: true }), /BLOCKED/);
  } finally { await client.close(); }
});

test('INDEPENDENT synthetic: no production Daily factory accepts native_verified JSON', () => {
  assert.throws(() => DailyGateway.syntheticFixture({ synthetic: false, boundary: undefined, native_verified: true }), /PRODUCTION_RUNTIME_BLOCKED/);
});

test('INDEPENDENT synthetic: fake same-subject channel and extra native claims cannot prepare a grant', async t => {
  const f = await setup(t), p = input();
  await writeFile(new URL('./protocol-compatibility-snapshot.json', import.meta.url), JSON.stringify(f.broker.snapshot()), 'utf8');
  f.daily.attachSynthetic(f.channel, p.subject); f.broker.reviewSynthetic(p);
  assert.throws(() => f.daily.prepare('fake-channel', { input: p }), /UNAUTHENTICATED/);
  assert.throws(() => f.daily.prepare('fake-channel', { input: p, peer: { native_verified: true, pid: process.pid, sid: 'claimed-same-sid' } }), /SCHEMA/);
  assert.equal(f.fixture.calls, 0);
});

test('INDEPENDENT synthetic: stolen grant on another registered channel fails without burning the genuine grant', async t => {
  const f = await setup(t), prepared = f.prepare();
  f.daily.attachSynthetic('other-registered-channel', prepared.input.subject);
  await assert.rejects(f.daily.execute('other-registered-channel', prepared, async () => {}), /BINDING/);
  assert.equal(f.fixture.calls, 0);
  await f.daily.execute(f.channel, prepared, async () => {});
  assert.equal(f.fixture.calls, 1);
});

test('INDEPENDENT synthetic: all major grant mutations reject before send and leave the exact original usable', async t => {
  const f = await setup(t), prepared = f.prepare();
  const patches = [
    g => { g.service_instance = 'other-service'; }, g => { g.runtime_identity = 'other-runtime'; }, g => { g.channel_binding = sha256('other-channel'); },
    g => { g.subject_hash = sha256('other-subject'); }, g => { g.input_hash = sha256('other-input'); }, g => { g.token_budget.total += 1; },
    g => { g.token_budget.input_limit = 1; }, g => { g.binding.operation_id = randomUUID(); }, g => { g.binding.nonce = randomUUID(); },
    g => { g.binding.policy_epoch += 1; }, g => { g.binding.deadline = Date.now() - 1; }, g => { g.binding.credential_handle_id = randomUUID(); },
    g => { g.binding.token_reservation_id = randomUUID(); }, g => { g.unreviewed = 'extra-field'; },
  ];
  for (const mutate of patches) {
    const changed = clone(prepared); mutate(changed.grant);
    await assert.rejects(f.daily.execute(f.channel, changed, async () => {}));
    assert.equal(f.fixture.calls, 0);
  }
  await f.daily.execute(f.channel, prepared, async () => {});
  assert.equal(f.fixture.calls, 1);
});

test('INDEPENDENT synthetic: exact grant blocks subject, headers, URL, body, context, and token-plan tampering', async t => {
  const f = await setup(t), prepared = f.prepare();
  const patches = [
    p => { p.subject.agent_id = 'other-agent'; }, p => { p.subject.task_id = 'other-task'; }, p => { p.subject.project_id = 'other-project'; },
    p => { p.request.url = 'https://invalid.example/'; }, p => { p.request.headers.authorization = 'injected-auth'; },
    p => { const body = JSON.parse(p.request.body); body.messages.push({ role: 'system', content: 'unreviewed bytes' }); p.request.body = JSON.stringify(body); },
    p => { p.context.text += 'unreviewed'; }, p => { p.context_hash = sha256('other-context'); }, p => { p.output_tokens += 1; }, p => { p.model.price.input_micros_per_million = 0; },
  ];
  for (const mutate of patches) {
    const changed = clone(prepared); mutate(changed.input);
    await assert.rejects(f.daily.execute(f.channel, changed, async () => {}));
    assert.equal(f.fixture.calls, 0);
  }
});

test('INDEPENDENT synthetic: raw legacy broker execute cannot bypass an issued Daily grant', async t => {
  const f = await setup(t), prepared = f.prepare();
  await assert.rejects(f.broker.execute({ input: prepared.input, binding: prepared.grant.binding }, async () => {}), /DAILY_GRANT_REQUIRED/);
  assert.equal(f.fixture.calls, 0);
  await f.daily.execute(f.channel, prepared, async () => {});
  assert.equal(f.fixture.calls, 1);
});

test('INDEPENDENT synthetic: concurrent copies of a grant cause one send and one durable consumption', async t => {
  const f = await setup(t), prepared = f.prepare();
  const results = await Promise.allSettled([
    f.daily.execute(f.channel, prepared, async () => {}),
    f.daily.execute(f.channel, clone(prepared), async () => {}),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter(r => r.status === 'rejected').length, 1);
  assert.equal(f.fixture.calls, 1);
  assert.equal(f.broker.store.dailyGrant(prepared.grant.grant_id).state, 'CONSUMED');
  assert.equal(f.broker.snapshot().usage.global.used, 30);
});

test('INDEPENDENT synthetic: disconnect and same-channel Runtime replacement revoke old grants', async t => {
  const f = await setup(t), prepared = f.prepare();
  f.daily.disconnect(f.channel);
  f.daily.attachSynthetic(f.channel, prepared.input.subject);
  await assert.rejects(f.daily.execute(f.channel, prepared, async () => {}), /BINDING/);
  assert.equal(f.broker.store.dailyGrant(prepared.grant.grant_id).state, 'REVOKED');
  assert.equal(f.fixture.calls, 0);
});

test('INDEPENDENT synthetic: store recovery revokes issued grants; a new Runtime cannot revive them', async t => {
  const f = await setup(t), prepared = f.prepare(); await f.close();
  const recovered = await CredentialBroker.open({ synthetic: true, root: f.root, fixture: f.fixture });
  t.after(() => recovered.close());
  assert.equal(recovered.store.dailyGrant(prepared.grant.grant_id).state, 'REVOKED');
  const gateway = DailyGateway.syntheticFixture(recovered); gateway.attachSynthetic(f.channel, prepared.input.subject);
  await assert.rejects(gateway.execute(f.channel, prepared, async () => {}), /BINDING/);
  assert.equal(f.fixture.calls, 0);
});

test('INDEPENDENT synthetic: Daily and legacy share the same committed task and global budget', async t => {
  const f = await setup(t), prepared = f.prepare();
  const total = prepared.grant.token_budget.total;
  await f.broker.mutate('budget.configure', { subject: prepared.input.subject, agent_tokens: total + 29, task_tokens: total + 29, project_tokens: total + 29 });
  await f.daily.execute(f.channel, prepared, async () => {});
  const legacyInput = input(); f.broker.reviewSynthetic(legacyInput); const binding = f.broker.prepare(legacyInput);
  await assert.rejects(f.broker.execute({ input: legacyInput, binding }, async () => {}), /BUDGET_EXHAUSTED/);
  assert.equal(f.fixture.calls, 1);
  assert.equal(f.broker.snapshot().usage.global.used, 30);
  assert.equal(f.broker.snapshot().usage.global.held, 0);
});

test('INDEPENDENT synthetic: missing provider usage preserves UNKNOWN and blocks both Daily and legacy retry', async t => {
  const fixture = new FixtureTransport(() => wireFixture(JSON.stringify({ kind: 'FINAL', text: 'USAGE OMITTED' }), { usage: null }));
  const f = await setup(t, fixture), prepared = f.prepare();
  await assert.rejects(f.daily.execute(f.channel, prepared, async () => {}), /SENT_OUTCOME_UNKNOWN/);
  assert.equal(f.broker.store.dailyGrant(prepared.grant.grant_id).state, 'CONSUMED');
  assert.ok(f.broker.snapshot().usage.global.held > 0);
  assert.equal(f.broker.snapshot().usage.global.unknown, 1);
  const next = input(); f.broker.reviewSynthetic(next); const legacyBinding = f.broker.prepare(next);
  await assert.rejects(f.broker.execute({ input: next, binding: legacyBinding }, async () => {}), /RECONCILIATION/);
  const nextDaily = f.prepare(); await assert.rejects(f.daily.execute(f.channel, nextDaily, async () => {}), /RECONCILIATION/);
  assert.equal(f.fixture.calls, 1);
  assert.ok(f.broker.snapshot().usage.global.held > 0);
});

test('INDEPENDENT synthetic: cancel an issued, not-yet-sent grant prevents later send', async t => {
  const f = await setup(t), prepared = f.prepare();
  f.daily.cancel(f.channel, prepared.grant.binding.request_id);
  await assert.rejects(f.daily.execute(f.channel, prepared, async () => {}));
  assert.equal(f.fixture.calls, 0);
  assert.equal(f.broker.store.dailyGrant(prepared.grant.grant_id).state, 'REVOKED');
});

test('INDEPENDENT synthetic: expired import ticket never saves a key, and expiry is not an OS isolation result', async t => {
  const f = await setup(t), metadata = { provider_id: 'deepseek', name: 'Expired synthetic import', notes: '', max_concurrency: 1, requests_per_minute: 120,
    models: ['deepseek-flash'], model_wire_ids: { 'deepseek-flash': 'deepseek-flash' } };
  const before = f.broker.snapshot().keys.length;
  const ticket = f.broker.prepareImport(f.channel, { operation_id: randomUUID(), metadata_hash: sha256(canonical(metadata)), secret_sha256: sha256(CANARY) });
  const originalNow = Date.now;
  Date.now = () => ticket.expires_at + 1;
  try {
    await assert.rejects(f.broker.mutate('credential.save', { ...metadata, secret_b64: Buffer.from(CANARY).toString('base64'), import_ticket: ticket.ticket_id, import_operation_id: ticket.operation_id }, f.channel), /TICKET/);
  } finally { Date.now = originalNow; }
  assert.equal(f.broker.snapshot().keys.length, before);
  assert.equal(f.fixture.calls, 0);
});
