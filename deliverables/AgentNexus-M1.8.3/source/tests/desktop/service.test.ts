import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDesktopService } from '../../src/agentnexus/desktop/service.ts';
import { SyntheticMemoryProtector } from '../../src/agentnexus/model-runtime/vault.ts';
import type { CredentialProviderInterface } from '../../src/agentnexus/model-runtime/vault.ts';
import { FixtureTransport, wireFixture } from '../../src/agentnexus/model-runtime/transport.ts';
import type { Transport } from '../../src/agentnexus/model-runtime/protocol.ts';
import { connectionStatus } from '../../src/agentnexus/desktop/contracts.ts';

const base = fileURLToPath(new URL('../../../../../.workflow-kit/runtime/AgentNexus-Model-Provider-UI/unit/', import.meta.url));
const caps = { reasoning: false, tools: false, json: true, streaming: true, multimodal: false };
async function setup(t: test.TestContext, options: { protector?: CredentialProviderInterface; syntheticTransport?: Transport; timeout_ms?: number } = {}) {
  await mkdir(base, { recursive: true }); const root = await mkdtemp(join(base, 'host-'));
  const protector = options.protector ?? new SyntheticMemoryProtector(); let service = await openDesktopService(root, { ...options, protector }), op = service.openOperator();
  const invoke = (method: string, payload: unknown = {}): Promise<any> => op.invoke(method, payload);
  t.after(async () => { await service.close(); if (protector instanceof SyntheticMemoryProtector) protector.destroy(); });
  return { root, invoke, get service() { return service; }, async restart() { op.revoke(); await service.close(); service = await openDesktopService(root, { ...options, protector }); op = service.openOperator(); } };
}
async function provider(f: Awaited<ReturnType<typeof setup>>, id = 'custom') {
  await f.invoke('provider.save', { id, name: 'Test ' + id, preset_id: 'custom', protocol: 'openai-compatible', base_url: 'https://example.com/v1', enabled: true, revision: -1 });
  return f.invoke('model.save', { provider_id: id, model_id: 'org/model-v1', name: 'Test Model', enabled: true, context_tokens: 65536, output_tokens: 4096, capabilities: caps, revision: -1 });
}
async function key(f: Awaited<ReturnType<typeof setup>>, provider_id = 'custom', rotate_id?: string) {
  const secret = Buffer.from('synthetic-test-private-' + Math.random().toString(36).slice(2) + '-abcdefghi');
  const result = await f.invoke('credential.save', { provider_id, name: 'Key 01', notes: 'test only', secret, max_concurrency: 1, requests_per_minute: 120, ...(rotate_id ? { rotate_id } : {}) });
  assert.ok(secret.every(b => b === 0)); return result;
}

test('DESKTOP provider CRUD, strict revision, unsupported protocols and model wire IDs', async t => {
  const f = await setup(t), m = await provider(f); let s = await f.invoke('snapshot');
  assert.equal(s.providers.length, 1); assert.equal(s.models[0].model_id, 'org/model-v1'); assert.equal(s.models[0].origin, 'MANUAL');
  await f.invoke('provider.save', { ...((({ id, name, preset_id, protocol, base_url, enabled, revision }) => ({ id, name, preset_id, protocol, base_url, enabled, revision }))(s.providers[0])), name: 'Edited' });
  await assert.rejects(f.invoke('provider.save', { id: 'custom', name: 'stale', preset_id: 'custom', protocol: 'openai-compatible', base_url: 'https://example.com', enabled: true, revision: 0 }), /REVISION_CONFLICT/);
  await assert.rejects(f.invoke('provider.save', { id: 'anthropic', name: 'A', preset_id: 'custom', protocol: 'anthropic-compatible', base_url: 'https://example.com', enabled: true, revision: -1 }), /UNSUPPORTED_PROTOCOL/);
  await assert.rejects(f.invoke('provider.save', { id: 'bad', name: 'Bad', preset_id: 'custom', protocol: 'openai-compatible', base_url: 'https://u:password@example.com', enabled: true, revision: -1 }), /INVALID_ENDPOINT/);
  await f.invoke('model.default', { provider_id: 'custom', ref: m.ref }); s = await f.invoke('snapshot'); assert.equal(s.providers[0].default_model, m.ref);
  await f.invoke('model.delete', { ref: m.ref, revision: s.models[0].revision }); s = await f.invoke('snapshot'); assert.equal(s.models.length, 0); assert.equal(s.providers[0].default_model, null);
  await f.invoke('provider.delete', { id: 'custom', revision: s.providers[0].revision }); assert.equal((await f.invoke('snapshot')).providers.length, 0);
});

test('DESKTOP credential add, zeroization, no read API, rotation, disable, revoke and audit safety', async t => {
  const f = await setup(t); await provider(f); const a = await key(f), b = await key(f); let s = await f.invoke('snapshot');
  assert.equal(s.keys.length, 2); assert.equal(s.keys[0].classification, 'SYNTHETIC'); assert.equal(JSON.stringify(s).includes('synthetic-test-private-'), false);
  await assert.rejects(f.invoke('credential.read', { key_id: a.key_id }), /METHOD_DENIED/);
  await assert.rejects(f.invoke('credential.save', { provider_id: 'custom', name: 'real', notes: '', secret: Buffer.from('sk-not-a-real-key-used-for-denial-000'), max_concurrency: 1, requests_per_minute: 120 }), /SYNTHETIC_KEY_REQUIRED/);
  const rotated = await key(f, 'custom', a.key_id); s = await f.invoke('snapshot'); assert.equal(s.keys.find((k: any) => k.key_id === a.key_id).state, 'ROTATING');
  await f.invoke('credential.state', { key_id: rotated.key_id, enabled: false }); await f.invoke('credential.state', { key_id: rotated.key_id, enabled: true });
  await f.invoke('credential.delete', { key_id: a.key_id }); await f.invoke('credential.delete', { key_id: b.key_id });
  assert.equal((await f.invoke('snapshot')).keys.length, 1);
  await f.invoke('credential.state', { key_id: rotated.key_id, enabled: false });
  await assert.rejects(f.service.bindAgent('development').complete('Synthetic test'), /NO_AVAILABLE_MODEL/);
  for (const filename of ['host/kernel.sqlite', 'host/kernel.sqlite-wal', 'synthetic-vault/vault.sqlite', 'synthetic-vault/vault.sqlite-wal']) {
    const bytes = await readFile(join(f.root, filename)).catch(() => Buffer.alloc(0)); assert.equal(bytes.includes(Buffer.from('synthetic-test-private-')), false);
  }
});

test('DESKTOP credential protector failure never reports success and clears submitted bytes', async t => {
  const protector: CredentialProviderInterface = { id: 'failure-fixture', protection: 'SYNTHETIC_FAILURE', async protect() { throw Error('synthetic-test-secret-in-error-do-not-publish'); }, async unprotect() { throw Error('denied'); } };
  const f = await setup(t, { protector }); await provider(f);
  const payload = { provider_id: 'custom', name: 'failure', notes: '', secret: Buffer.from('synthetic-test-protection-failure-abcdef'), max_concurrency: 1, requests_per_minute: 60 };
  await assert.rejects(f.invoke('credential.save', payload), /CREDENTIAL_SAVE_FAILED/); assert.equal(payload.secret, undefined); assert.equal((await f.invoke('snapshot')).keys.length, 0);
});

test('DESKTOP synthetic connection uses Gateway and ledger but never marks CONNECTED; LIVE never sends', async t => {
  const transport = new FixtureTransport(() => wireFixture(JSON.stringify({ kind: 'FINAL', text: 'OK' }), { usage: { prompt_tokens: 20, completion_tokens: 10 } })), f = await setup(t, { syntheticTransport: transport }), m = await provider(f); await key(f);
  const live = await f.invoke('connection.test', { provider_id: 'custom', model_ref: m.ref, mode: 'LIVE' }); assert.equal(live.status, 'INCONCLUSIVE'); assert.equal(transport.calls, 0);
  const result = await f.invoke('connection.test', { provider_id: 'custom', model_ref: m.ref, mode: 'SIMULATED' }); assert.equal(result.status, 'INCONCLUSIVE'); assert.equal(result.simulation_passed, true); assert.equal(transport.calls, 1);
  const s = await f.invoke('snapshot'); assert.equal(s.models[0].verified, 'SIMULATED'); assert.equal(s.usage.simulated.input_tokens, 20); assert.equal(s.usage.simulated.output_tokens, 10); assert.equal(s.usage.global.used, 0); assert.equal(s.usage.global.limit, 100000000); assert.equal(s.usage.global.remaining_tokens, 100000000); assert.equal(s.usage.simulated_budget.used.tokens, 30); assert.equal(s.usage.real.actual_cost_micros, null);
  await f.restart(); const reopened = await f.invoke('snapshot'); assert.equal(reopened.connections[0].simulation_passed, true); assert.equal(reopened.usage.simulated_budget.used.tokens, 30); assert.equal(reopened.keys.length, 1);
});

test('DESKTOP Agent bindings, task override, reset, favorites/defaults and pre-send failover execute Model Router', async t => {
  const seen: string[] = [], transport = new FixtureTransport(r => { seen.push(JSON.parse(r.body).model); return wireFixture(JSON.stringify({ kind: 'FINAL', text: 'OK' })); });
  const f = await setup(t, { syntheticTransport: transport }), m1 = await provider(f); await key(f);
  const m2 = await f.invoke('model.save', { provider_id: 'custom', model_id: 'org/strong', name: 'Strong', enabled: true, context_tokens: 65536, output_tokens: 4096, capabilities: caps, revision: -1 });
  let s = await f.invoke('snapshot'); assert.ok(s.keys[0].models.includes(m2.id));
  await f.invoke('binding.save', { agent_id: 'development', primary: m1.ref, fallbacks: [m2.ref], auto_route: false, failover: true, budget_tokens: 1000000, revision: -1 });
  await f.invoke('selection.save', { agent_id: 'development', ref: m2.ref }); await f.invoke('chat.send', { agent_id: 'development', text: 'Test' }); assert.equal(seen.at(-1), 'org/strong');
  await f.invoke('selection.save', { agent_id: 'development', ref: null }); await f.invoke('chat.send', { agent_id: 'development', text: 'Test' }); assert.equal(seen.at(-1), 'org/model-v1');
  s = await f.invoke('snapshot'); const m = s.models.find((m: any) => m.id === m1.id);
  await f.invoke('model.save', { provider_id: 'custom', model_id: m.model_id, name: m.name, enabled: false, context_tokens: m.context_tokens, output_tokens: m.output_tokens, capabilities: m.capabilities, revision: m.revision });
  await f.invoke('chat.send', { agent_id: 'development', text: 'Test' }); assert.equal(seen.at(-1), 'org/strong');
  await f.invoke('preference.save', { favorites: [m2.ref], default_model: m2.ref, revision: (await f.invoke('snapshot')).preferences.revision });
  await f.restart(); s = await f.invoke('snapshot'); assert.deepEqual(s.preferences.favorites, [m2.ref]); assert.equal(s.agents.find((a: any) => a.id === 'development').binding.primary, m1.ref);
  assert.deepEqual(Object.keys(f.service.bindAgent('coding')), ['complete']); assert.deepEqual(Object.keys(f.service.bindAgent('development')), ['complete']);
});

test('DESKTOP all Keys and Providers share platform usage; per-Agent budget cannot be expanded by adding Keys', async t => {
  const f = await setup(t); const a = await provider(f, 'one'), b = await provider(f, 'two'); await key(f, 'one'); await key(f, 'two');
  await f.invoke('selection.save', { agent_id: 'development', ref: a.ref }); await f.invoke('chat.send', { agent_id: 'development', text: 'Test' });
  await f.invoke('selection.save', { agent_id: 'development', ref: b.ref }); await f.invoke('chat.send', { agent_id: 'development', text: 'Test' });
  let s = await f.invoke('snapshot'); assert.equal(s.usage.simulated_budget.used.tokens, 60); assert.equal(s.usage.by_provider.length, 2);
  await f.invoke('binding.save', { agent_id: 'development', primary: b.ref, fallbacks: [], auto_route: false, failover: false, budget_tokens: 61, revision: -1 }); await key(f, 'two');
  const r = await f.invoke('chat.send', { agent_id: 'development', text: 'Test' }); assert.equal(r.outcome, 'FAILED'); s = await f.invoke('snapshot'); assert.equal(s.usage.simulated_budget.used.tokens, 60);
});

test('DESKTOP UNKNOWN holds survive rotation and Host reopen and never auto-replay', async t => {
  const transport = new FixtureTransport(() => wireFixture(JSON.stringify({ kind: 'FINAL' }), { done: false })), f = await setup(t, { syntheticTransport: transport }), m = await provider(f), k = await key(f);
  const r = await f.invoke('connection.test', { provider_id: 'custom', model_ref: m.ref, mode: 'SIMULATED' }); assert.equal(r.simulation_passed, false); assert.equal(transport.calls, 1);
  await key(f, 'custom', k.key_id); await assert.rejects(f.invoke('credential.delete', { key_id: k.key_id }), /VAULT_KEY_IN_USE/);
  await f.restart(); const s = await f.invoke('snapshot'); assert.equal(transport.calls, 1); assert.ok(s.usage.simulated_budget.held.tokens > 0); assert.equal(s.keys.find((key: any) => key.key_id === k.key_id).in_flight, 1); assert.equal(s.usage.records[0].state, 'UNKNOWN');
});

test('DESKTOP multiple scoped Agent requests occupy separate pool Keys concurrently', async t => {
  let releases: (() => void)[] = [];
  const transport = new FixtureTransport(async () => { await new Promise<void>(r => releases.push(r)); return wireFixture(JSON.stringify({ kind: 'FINAL', text: 'OK' })); });
  const f = await setup(t, { syntheticTransport: transport }); await provider(f); await key(f); await key(f);
  const a = f.service.bindAgent('development').complete('One'), b = f.service.bindAgent('reviewer').complete('Two');
  for (let n = 0; n < 100 && releases.length < 2; n++) await new Promise(r => setTimeout(r, 10));
  assert.equal(releases.length, 2); const s = await f.invoke('snapshot'); assert.deepEqual(s.keys.map((k: any) => k.in_flight), [1, 1]); releases.forEach(r => r());
  assert.equal((await a).outcome, 'SUCCEEDED'); assert.equal((await b).outcome, 'SUCCEEDED');
});

test('DESKTOP IPC contract denies claimed roles, unknown fields, revoked sessions, real Transport and secret metadata', async t => {
  const f = await setup(t); await provider(f);
  await assert.rejects(f.invoke('snapshot', { role: 'operator', identity: 'admin' }), /INVALID_INPUT/);
  const op = f.service.openOperator(); op.revoke(); await assert.rejects(op.invoke('snapshot'), /SESSION_REVOKED/);
  const sentinel = 'synthetic-test-no-metadata-secret-abcdef';
  await assert.rejects(f.invoke('credential.save', { provider_id: 'custom', name: sentinel, notes: '', secret: Buffer.from(sentinel), max_concurrency: 1, requests_per_minute: 60 }), /CREDENTIAL_SAVE_FAILED/);
  assert.equal(JSON.stringify(await f.invoke('snapshot')).includes(sentinel), false);
});

test('DESKTOP connection error taxonomy does not infer success from configuration', () => {
  const cases = [[401, 'INVALID_KEY'], [403, 'UNAUTHORIZED'], [429, 'RATE_LIMITED'], [503, 'PROVIDER_UNAVAILABLE'], [404, 'MODEL_UNAVAILABLE']] as const;
  for (const [status, expected] of cases) assert.equal(connectionStatus({ status }), expected);
  assert.equal(connectionStatus({ timeout: true }), 'TIMEOUT'); assert.equal(connectionStatus({ reason: 'INVALID_ENDPOINT' }), 'INVALID_ENDPOINT'); assert.equal(connectionStatus({}), 'INCONCLUSIVE'); assert.equal(connectionStatus({ status: 200, complete: true }), 'CONNECTED');
});

test('DESKTOP provider permission denial remains UNAUTHORIZED through actual Gateway path', async t => {
  const transport = new FixtureTransport(() => wireFixture('', { status: 403 }));
  const f = await setup(t, { syntheticTransport: transport }), m = await provider(f); await key(f);
  const r = await f.invoke('connection.test', { provider_id: 'custom', model_ref: m.ref, mode: 'SIMULATED' });
  assert.equal(r.status, 'UNAUTHORIZED'); assert.equal(r.simulation_passed, false); assert.equal(transport.calls, 1);
  assert.ok((await f.invoke('snapshot')).usage.simulated_budget.held.tokens > 0);
});

test('DESKTOP runtime shares four slots across all facades and close cannot partially close an active Vault', async t => {
  const release: (() => void)[] = [];
  const transport = new FixtureTransport(async () => { await new Promise<void>(r => release.push(r)); return wireFixture(JSON.stringify({ kind: 'FINAL' })); });
  const f = await setup(t, { syntheticTransport: transport }); await provider(f);
  await f.invoke('credential.save', { provider_id: 'custom', name: 'Concurrent', notes: '', secret: Buffer.from('synthetic-test-shared-four-slots-abcdef'), max_concurrency: 16, requests_per_minute: 120 });
  const calls = ['development', 'coding', 'research', 'test-agent', 'reviewer', 'math-reviewer'].map(id => f.service.bindAgent(id).complete('Test').then(r => ({ ok: true, r }), error => ({ ok: false, error })));
  for (let n = 0; n < 150 && release.length < 4; n++) await new Promise(r => setTimeout(r, 10));
  assert.equal(release.length, 4); await assert.rejects(f.service.close(), /HOST_BUSY/); assert.equal((await f.invoke('snapshot')).keys.length, 1);
  release.forEach(r => r()); const results = await Promise.all(calls);
  assert.equal(results.filter(r => r.ok).length, 4); assert.equal(results.filter(r => !r.ok).length, 2); assert.equal(transport.calls, 4);
  await f.restart(); assert.equal((await f.invoke('snapshot')).usage.simulated_budget.used.tokens, 120);
});

test('DESKTOP acknowledged not-sent primary RPM failure uses fallback without replaying a sent request', async t => {
  const providers: string[] = [], transport = new FixtureTransport(r => { providers.push(r.url); return wireFixture(JSON.stringify({ kind: 'FINAL' })); });
  const f = await setup(t, { syntheticTransport: transport }), primary = await provider(f, 'primary'), fallback = await provider(f, 'fallback');
  for (const id of ['primary', 'fallback']) await f.invoke('credential.save', { provider_id: id, name: id, notes: '', secret: Buffer.from('synthetic-test-rpm-' + id + '-abcdefghi'), max_concurrency: 4, requests_per_minute: id === 'primary' ? 1 : 120 });
  await f.invoke('binding.save', { agent_id: 'development', primary: primary.ref, fallbacks: [fallback.ref], auto_route: false, failover: true, budget_tokens: 1000000, revision: -1 });
  assert.equal((await f.invoke('chat.send', { agent_id: 'development', text: 'One' })).provider_id, 'primary');
  assert.equal((await f.invoke('chat.send', { agent_id: 'development', text: 'Two' })).provider_id, 'fallback');
  const s = await f.invoke('snapshot'); assert.equal(transport.calls, 2); assert.equal(s.usage.simulated_budget.used.tokens, 60); assert.equal(s.usage.records.filter((r: any) => r.state === 'NOT_SENT').length, 1);
});

test('DESKTOP deadline is displayed as TIMEOUT while retaining unknown usage and no replay', async t => {
  const transport = new FixtureTransport(() => new Promise(() => {})), f = await setup(t, { syntheticTransport: transport, timeout_ms: 30 }), m = await provider(f); await key(f);
  const r = await f.invoke('connection.test', { provider_id: 'custom', model_ref: m.ref, mode: 'SIMULATED' });
  assert.equal(r.status, 'TIMEOUT'); assert.equal(r.simulation_passed, false); assert.equal(transport.calls, 1); assert.ok((await f.invoke('snapshot')).usage.simulated_budget.held.tokens > 0);
});
