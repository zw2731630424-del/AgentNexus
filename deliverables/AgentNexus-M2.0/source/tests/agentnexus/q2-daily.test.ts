import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { CredentialBroker } from '../../src/agentnexus/credential-service/broker.ts';
import { DailyGateway } from '../../src/agentnexus/credential-service/daily-gateway.ts';
import { connectCredentialService, openSyntheticCredentialService } from '../../src/agentnexus/credential-service/client.ts';
import { hostSubject } from '../../src/agentnexus/harness/contracts.ts';
import { canonical, sha256 } from '../../src/agentnexus/types.ts';
import { DeepSeekAdapter } from '../../src/agentnexus/model-runtime/adapters.ts';
import { createDeepSeekFlashSpec } from '../../src/agentnexus/model-runtime/deepseek.ts';
import { FixtureTransport, wireFixture } from '../../src/agentnexus/model-runtime/transport.ts';
import type { BrokerInput } from '../../src/agentnexus/credential-service/contracts.ts';
import type { AssembledContext, ContextSource } from '../../src/agentnexus/harness/context.ts';

const base = fileURLToPath(new URL('../../../../../.workflow-kit/runtime/AgentNexus-M1.8.3-Q3/daily-tests/', import.meta.url));
const SECRET = 'synthetic-test-q2-daily-boundary-canary-0192837465';
const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));
async function root() { await mkdir(base, { recursive: true }); return mkdtemp(join(base, 'fixture-')); }
function input(type: 'DEVELOPMENT' | 'SUBAGENT' | 'BACKGROUND_REVIEWER' = 'DEVELOPMENT', text = 'Synthetic Q2 protocol task.') : BrokerInput {
  const subject = { ...hostSubject('fixture-harness'), agent_id: type.toLowerCase(), agent_type: type }, digest = sha256(text);
  const source = { event_id: 'synthetic-source', record_hash: digest, project_id: subject.project_id, task_id: subject.task_id, kind: 'RAW', payload_ref: { sha256: digest, bytes: Buffer.byteLength(text) }, offset: 0, length: Buffer.byteLength(text) } as ContextSource;
  const context: AssembledContext = { view_id: 'synthetic-view', project_id: subject.project_id, task_id: subject.task_id, agent_id: subject.agent_id, text, bytes: Buffer.byteLength(text), sha256: digest,
    entries: [{ source, text, section: 'TASK_CONTRACT', required: true, range_sha256: digest }], omitted: [] };
  const model = createDeepSeekFlashSpec('2026-11-08T00:00:00Z', '2026-11-15T00:00:00Z');
  const request_id = randomUUID(), adapter = new DeepSeekAdapter(), request = adapter.build({ request_id, model, prompt: text, max_output_tokens: 256, stream: true, json: true, reasoning: 'disabled', tools: [] }); adapter.abandon(request_id);
  return { subject, context, context_hash: digest, model, request, input_tokens: 0, output_tokens: 256 };
}
const metadata = () => ({ provider_id: 'deepseek', name: 'Synthetic Q2', notes: '', max_concurrency: 4, requests_per_minute: 120, models: ['deepseek-flash'], model_wire_ids: { 'deepseek-flash': 'deepseek-flash' } });
async function setup(t: test.TestContext, fixture?: FixtureTransport) {
  const dir = await root(), broker = await CredentialBroker.open({ synthetic: true, root: dir, fixture }), daily = DailyGateway.syntheticFixture(broker);
  t.after(async () => broker.close());
  await broker.mutate('credential.save', { ...metadata(), secret_b64: Buffer.from(SECRET).toString('base64') });
  const prepare = (p = input(), channel = 'fixture-channel') => { daily.authorizeSynthetic(channel, p); return { input: p, grant: daily.prepare(channel, { input: p }) }; };
  return { dir, broker, daily, prepare };
}

test('Q3 absent deployment blocks Daily without UAC or a High management client', async () => {
  const port = await connectCredentialService(), s = await port.snapshot();
  assert.equal(s.daily_gateway?.status, 'BLOCKED'); assert.equal(s.daily_gateway?.medium_listener_created, false); assert.equal(s.daily_gateway?.uac_required, false);
  assert.equal('child' in port, false);
  await assert.rejects(port.execute(input()), /BLOCKED/);
  for (const method of ['budget.configure', 'credential.save', 'credential.read', 'http.proxy']) await assert.rejects(port.invoke(method, {}), /BLOCKED|DENIED/);
});
test('Q2 forged production boundary cannot enable fixture runtime authority', () => {
  assert.throws(() => DailyGateway.syntheticFixture({ synthetic: true, boundary: { mode: 'QUALIFICATION_ONLY' } } as any), /PRODUCTION_RUNTIME_BLOCKED/);
  assert.throws(() => DailyGateway.syntheticFixture({ synthetic: false } as any), /PRODUCTION_RUNTIME_BLOCKED/);
});
test('Q2 caller IDs and labels create no runtime authority or egress consent', async t => {
  const f = await setup(t), p = input();
  assert.throws(() => f.daily.prepare('same-sid-caller', { input: p }), /UNAUTHENTICATED/);
  f.daily.attachSynthetic('fixture-channel', p.subject);
  assert.throws(() => f.daily.prepare('fixture-channel', { input: p }), /EGRESS_DENIED/);
  assert.throws(() => f.daily.prepare('fixture-channel', { input: p, native_verified: true }), /SCHEMA/);
});
test('Q2 exact service grant completes once and all roles use one ledger owner', async t => {
  const f = await setup(t);
  for (const type of ['DEVELOPMENT', 'SUBAGENT', 'BACKGROUND_REVIEWER'] as const) {
    const p = f.prepare(input(type));
    const result = await f.daily.execute('fixture-channel', p, async () => {});
    assert.equal(result.assurance, 'SIMULATED'); assert.equal(f.broker.store.dailyGrant(p.grant.grant_id).state, 'CONSUMED');
    await assert.rejects(f.daily.execute('fixture-channel', p, async () => {}), /INVALID_OR_CONSUMED/);
  }
  const s = f.broker.snapshot(); assert.equal(s.usage.global.owner, 'CREDENTIAL_SERVICE'); assert.equal(s.usage.global.used, 90); assert.equal(s.usage.global.held, 0);
  assert.equal(JSON.stringify(s).includes(SECRET), false);
});
test('Q2 grant captured from another channel or runtime is unusable', async t => {
  const f = await setup(t), p = f.prepare();
  f.daily.attachSynthetic('other-channel', p.input.subject);
  await assert.rejects(f.daily.execute('other-channel', p, async () => {}), /BINDING/);
  f.daily.attachSynthetic('fixture-channel', p.input.subject);
  await assert.rejects(f.daily.execute('fixture-channel', p, async () => {}), /BINDING/);
  assert.equal(f.broker.store.dailyGrant(p.grant.grant_id).state, 'REVOKED');
});
test('Q2 exact grant rejects forged task, agent, project and runtime Subject', async t => {
  const f = await setup(t), p = f.prepare();
  for (const field of ['agent_id', 'task_id', 'project_id', 'runtime_instance_id', 'session_id']) {
    const forged = copy(p); (forged.input.subject as any)[field] = 'forged';
    await assert.rejects(f.daily.execute('fixture-channel', forged, async () => {}), /UNAUTHENTICATED/);
  }
  await f.daily.execute('fixture-channel', p, async () => {});
});
test('Q2 grant cannot change operation, nonce, epoch, token reservation or quota', async t => {
  const f = await setup(t), p = f.prepare();
  for (const field of ['operation_id', 'nonce', 'token_reservation_id', 'context_hash', 'request_body_hash', 'data_egress_decision', 'provider_id', 'model_id', 'runtime_identity']) {
    const forged = copy(p); (forged.grant.binding as any)[field] = 'forged';
    await assert.rejects(f.daily.execute('fixture-channel', forged, async () => {}));
  }
  for (const change of [{ ...p.grant, grant_id: randomUUID() }, { ...p.grant, binding: { ...p.grant.binding, policy_epoch: 99 } }, { ...p.grant, token_budget: { ...p.grant.token_budget, total: 1 } }])
    await assert.rejects(f.daily.execute('fixture-channel', { input: p.input, grant: change }, async () => {}));
  await f.daily.execute('fixture-channel', p, async () => {});
});
test('Q2 body, context, arbitrary URL/method/header/provider/model changes never reach Transport', async t => {
  const fixture = new FixtureTransport(() => wireFixture(JSON.stringify({ kind: 'FINAL', text: 'OK' }))), f = await setup(t, fixture), p = f.prepare();
  const changes = [
    { request: { ...p.input.request, url: 'https://example.invalid/' } }, { request: { ...p.input.request, method: 'GET' } },
    { request: { ...p.input.request, headers: { ...p.input.request.headers, authorization: 'forged' } } },
    { request: { ...p.input.request, body: p.input.request.body + ' ' } }, { context_hash: '0'.repeat(64) },
    { model: { ...p.input.model, provider_id: 'other' } }, { model: { ...p.input.model, model_id: 'other' } },
  ];
  for (const change of changes) await assert.rejects(f.daily.execute('fixture-channel', { input: { ...p.input, ...change } as BrokerInput, grant: p.grant }, async () => {}));
  assert.equal(fixture.calls, 0); assert.equal(f.broker.snapshot().usage.global.held, 0);
});
test('Q2 self labelled PUBLIC and unreviewed complete request content fail final egress', async t => {
  const f = await setup(t), p = input('DEVELOPMENT', 'Internal file C:\\private\\secret.txt');
  assert.throws(() => f.daily.authorizeSynthetic('fixture-channel', p), /SENSITIVE/);
  const clean = input();
  assert.throws(() => f.daily.authorizeSynthetic('fixture-channel', clean, { sources: clean.context.entries.map(e => ({ source: e.source, range_sha256: e.range_sha256, classification: 'SECRET', origin: 'SYNTHETIC_QUALIFICATION', review_ref: 'fake-public' })) }), /CLASSIFICATION/);
});
test('Q2 revoked egress decision fences the original daily grant before send', async t => {
  const f = await setup(t), p = f.prepare(); f.broker.store.grantRevoke(p.grant.binding.data_egress_decision);
  await assert.rejects(f.daily.execute('fixture-channel', p, async () => {}), /EGRESS_DENIED/); assert.equal(f.broker.snapshot().usage.global.held, 0);
});
test('Q2 expired grant and too short runtime lifetime are denied', async t => {
  const f = await setup(t), p = f.prepare(), now = Date.now;
  Date.now = () => p.grant.binding.deadline + 1;
  try { await assert.rejects(f.daily.execute('fixture-channel', p, async () => {}), /BINDING/); } finally { Date.now = now; }
  const next = input(); f.daily.attachSynthetic('short-channel', next.subject, 1); f.broker.reviewSynthetic(next);
  assert.throws(() => f.daily.prepare('short-channel', { input: next }), /EXPIRES|UNAUTHENTICATED/);
});
test('Q2 grant consumption rolls back together with insufficient four level budget', async t => {
  const f = await setup(t), p = f.prepare();
  f.broker.store.configure(p.input.subject, { agent_tokens: 1, task_tokens: 1, project_tokens: 1 });
  await assert.rejects(f.daily.execute('fixture-channel', p, async () => {}), /BUDGET_EXHAUSTED/);
  assert.equal(f.broker.store.dailyGrant(p.grant.grant_id).state, 'ISSUED'); assert.equal(f.broker.store.request(p.grant.binding.request_id), undefined);
  assert.equal(f.broker.snapshot().usage.global.held, 0);
  f.broker.store.configure(p.input.subject, { agent_tokens: 1000000, task_tokens: 1000000, project_tokens: 1000000 });
  await f.daily.execute('fixture-channel', p, async () => {});
});
test('Q2 legacy broker cannot bypass a daily grant on the same request', async t => {
  const f = await setup(t), p = f.prepare();
  await assert.rejects(f.broker.execute({ input: p.input, binding: p.grant.binding }, async () => {}), /GRANT_REQUIRED/);
  await f.daily.execute('fixture-channel', p, async () => {});
});
test('Q2 duplicate in flight grant cannot replace original cancellation ownership', async t => {
  let started!: () => void; const arrived = new Promise<void>(r => { started = r; });
  const fixture = new FixtureTransport(async (_r, _n, signal) => { started(); await new Promise((_, reject) => signal.addEventListener('abort', () => reject(Error('SYNTHETIC_CANCEL')), { once: true })); throw Error('UNREACHABLE'); });
  const f = await setup(t, fixture), p = f.prepare(), pending = f.daily.execute('fixture-channel', p, async () => {});
  await arrived;
  await assert.rejects(f.daily.execute('fixture-channel', p, async () => {}), /INFLIGHT/);
  assert.throws(() => f.daily.cancel('forged-channel', p.grant.binding.request_id), /OWNER/);
  f.daily.cancel('fixture-channel', p.grant.binding.request_id); await assert.rejects(pending, /UNKNOWN/);
  assert.equal(fixture.calls, 1); assert.ok(f.broker.snapshot().usage.global.held > 0);
});
test('Q2 disconnect revokes unsent grants and never restores spent quota', async t => {
  const f = await setup(t), first = f.prepare(); await f.daily.execute('fixture-channel', first, async () => {});
  const next = f.prepare(); f.daily.disconnect('fixture-channel');
  assert.equal(f.broker.store.dailyGrant(next.grant.grant_id).state, 'REVOKED');
  await assert.rejects(f.daily.execute('fixture-channel', next, async () => {}), /UNAUTHENTICATED/);
  assert.equal(f.broker.snapshot().usage.global.used, 30);
});
test('Q2 explicit cancellation revokes a prepared unsent grant on its own channel', async t => {
  const f = await setup(t), p = f.prepare();
  assert.throws(() => f.daily.cancel('forged-channel', p.grant.binding.request_id), /OWNER/);
  assert.equal(f.broker.store.dailyGrant(p.grant.grant_id).state, 'ISSUED');
  f.daily.cancel('fixture-channel', p.grant.binding.request_id);
  assert.equal(f.broker.store.dailyGrant(p.grant.grant_id).state, 'REVOKED');
  await assert.rejects(f.daily.execute('fixture-channel', p, async () => {}), /INVALID_OR_CONSUMED/);
  assert.equal(f.broker.snapshot().usage.global.held, 0);
});
test('Q2 restart revokes outstanding grants and preserves consumed grants and ledger', async () => {
  const dir = await root(); let broker = await CredentialBroker.open({ synthetic: true, root: dir }), daily = DailyGateway.syntheticFixture(broker);
  await broker.mutate('credential.save', { ...metadata(), secret_b64: Buffer.from(SECRET).toString('base64') });
  const first = input(); daily.authorizeSynthetic('fixture-channel', first); const used = daily.prepare('fixture-channel', { input: first });
  await daily.execute('fixture-channel', { input: first, grant: used }, async () => {});
  const next = input(); daily.authorizeSynthetic('fixture-channel', next); const outstanding = daily.prepare('fixture-channel', { input: next });
  await broker.close(); broker = await CredentialBroker.open({ synthetic: true, root: dir }); daily = DailyGateway.syntheticFixture(broker);
  try {
    daily.attachSynthetic('fixture-channel', next.subject);
    await assert.rejects(daily.execute('fixture-channel', { input: next, grant: outstanding }, async () => {}), /BINDING/);
    assert.equal(broker.store.dailyGrant(outstanding.grant_id).state, 'REVOKED'); assert.equal(broker.store.dailyGrant(used.grant_id).state, 'CONSUMED'); assert.equal(broker.snapshot().usage.global.used, 30);
  } finally { await broker.close(); }
});
test('Q2 credential ticket cancel has channel/operation ownership and no save fallback', async t => {
  const f = await setup(t), op = randomUUID(), meta = metadata();
  const ticket = f.broker.prepareImport('helper-channel', { operation_id: op, metadata_hash: sha256(canonical(meta)), secret_sha256: sha256(SECRET) });
  assert.throws(() => f.broker.cancelImport('other-channel', { ticket_id: ticket.ticket_id, operation_id: op }), /TICKET_INVALID/);
  assert.throws(() => f.broker.cancelImport('helper-channel', { ticket_id: ticket.ticket_id, operation_id: randomUUID() }), /TICKET_INVALID/);
  f.broker.cancelImport('helper-channel', { ticket_id: ticket.ticket_id, operation_id: op });
  await assert.rejects(f.broker.mutate('credential.save', { ...meta, secret_b64: Buffer.from(SECRET).toString('base64'), import_ticket: ticket.ticket_id, import_operation_id: op }, 'helper-channel'), /TICKET_INVALID/);
});
test('Q2 ticket expiry and cancellation during encryption prevent credential commit', async t => {
  const f = await setup(t), meta = metadata(), op = randomUUID();
  const issue = () => f.broker.prepareImport('helper-channel', { operation_id: randomUUID(), metadata_hash: sha256(canonical(meta)), secret_sha256: sha256(SECRET) });
  const expired = issue(), now = Date.now;
  Date.now = () => expired.expires_at + 1;
  try { await assert.rejects(f.broker.mutate('credential.save', { ...meta, secret_b64: Buffer.from(SECRET).toString('base64'), import_ticket: expired.ticket_id, import_operation_id: expired.operation_id }, 'helper-channel'), /TICKET_INVALID/); }
  finally { Date.now = now; }
  const ticket = f.broker.prepareImport('helper-channel', { operation_id: op, metadata_hash: sha256(canonical(meta)), secret_sha256: sha256(SECRET) });
  const pending = f.broker.mutate('credential.save', { ...meta, secret_b64: Buffer.from(SECRET).toString('base64'), import_ticket: ticket.ticket_id, import_operation_id: op }, 'helper-channel');
  f.broker.cancelImport('helper-channel', { ticket_id: ticket.ticket_id, operation_id: op });
  await assert.rejects(pending, /TICKET_INVALID/); assert.equal(f.broker.snapshot().keys.length, 1);
});
test('Q2 a second rotation of the same superseded key is rejected without replacing its pool', async t => {
  const f = await setup(t), old = f.broker.snapshot().keys[0];
  const rotated = await f.broker.mutate('credential.save', { ...metadata(), rotate_id: old.key_id, secret_b64: Buffer.from(SECRET + '-rotation').toString('base64') });
  await assert.rejects(f.broker.mutate('credential.save', { ...metadata(), rotate_id: old.key_id, secret_b64: Buffer.from(SECRET + '-conflict').toString('base64') }), /ROTATION_CONFLICT/);
  assert.equal(f.broker.snapshot().keys.length, 2); assert.equal(f.broker.snapshot().keys.find(k => k.key_id === rotated.key_id)?.state, 'ACTIVE');
});
test('Q2 inherited process daily streaming is SIMULATED and cannot expose secrets or arbitrary methods', async () => {
  const dir = await root(), port = await openSyntheticCredentialService(dir);
  try {
    await port.invoke('credential.save', { ...metadata(), secret: Buffer.from(SECRET) });
    let chunks = ''; const response = await port.execute(input('SUBAGENT'), undefined, async text => { chunks += text; });
    assert.equal(response.assurance, 'SIMULATED'); assert.equal(JSON.parse(chunks).kind, 'FINAL');
    for (const method of ['credential.read', 'http.proxy', 'daily.register', 'daily.grant.issue']) await assert.rejects(port.invoke(method, {}), /DENIED/);
    const s = await port.snapshot(); assert.equal(s.usage.global.used, 30); assert.equal(s.qualification.credential_service, 'BLOCKED'); assert.equal(JSON.stringify(s).includes(SECRET), false);
  } finally { await port.close(); }
});
test('Q2 independent synthetic service process crash retains UNKNOWN and rejects retry', async () => {
  const dir = await root(), port = await openSyntheticCredentialService(dir);
  await port.invoke('credential.save', { ...metadata(), secret: Buffer.from(SECRET) }); await port.invoke('synthetic.scenario', { name: 'timeout' });
  const p = input(); const pending = port.execute(p).catch((e: Error) => e);
  let sent = false;
  for (let n = 0; n < 200; n++) { const s = await port.snapshot(); if (s.usage.records.some((r: any) => r.state === 'SENT')) { sent = true; break; } await new Promise(r => setTimeout(r, 20)); }
  assert.equal(sent, true);
  const child = (port as any).child; const closed = once(child, 'exit'); child.kill(); await closed; await pending;
  const reopened = await openSyntheticCredentialService(dir);
  try {
    const s = await reopened.snapshot(); assert.equal(s.usage.global.unknown, 1); assert.ok(s.usage.global.held > 0); assert.equal(s.usage.global.limit, 100000000);
    await assert.rejects(reopened.execute(input()), /RECONCILIATION/);
    const bytes = await readFile(join(dir, 'ledger.sqlite')); assert.equal(bytes.includes(Buffer.from(SECRET)), false);
  } finally { await reopened.close(); }
});
