import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { Script, createContext } from 'node:vm';
import { openDesktopService } from '../../src/agentnexus/desktop/service.ts';
import type { BrokerInput, BrokerResult, CredentialServicePort, ServiceSnapshot, ServiceKey } from '../../src/agentnexus/credential-service/contracts.ts';
import type { TrustedEntryPort } from '../../src/agentnexus/desktop/trusted-entry.ts';

const base = fileURLToPath(new URL('../../../../../.workflow-kit/runtime/AgentNexus-M1.8.3-Q3/desktop-isolated-unit/', import.meta.url));
const caps = { reasoning: false, tools: false, json: true, streaming: true, multimodal: false };
function emptyUsage() {
  const meter = () => ({ input_tokens: 0, output_tokens: 0, cached_tokens: null, reasoning_tokens: null, requests: 0, failed_requests: 0, estimated_cost_micros: 0, actual_cost_micros: null });
  return { global: { used: 19, held: 0, unknown: 0, limit: 100000000, remaining_tokens: 99999981 }, simulated_budget: { held: { tokens: 0 }, used: { tokens: 0 } }, real: meter(), simulated: meter(), by_provider: [], by_model: [], by_agent: [], by_task: [], records: [] };
}

/** Interface fixture only. The independent subprocess is exercised separately below. */
class FixtureService implements CredentialServicePort {
  readonly assurance = 'SIMULATED' as const;
  readonly guard = { assertSafe: (value: string | Uint8Array) => { const text = typeof value === 'string' ? value : Buffer.from(value).toString(); assert.ok(!text.includes('synthetic-test-isolated-secret-')); } };
  readonly calls: { method: string; params: any }[] = [];
  readonly executions: BrokerInput[] = [];
  failure?: { http_status?: number; timed_out?: boolean };
  closed = false;
  value: ServiceSnapshot;
  constructor(synthetic = true) {
    this.value = { qualification: { live: 'BLOCKED', credential_service: 'BLOCKED', real_key_entry: false, synthetic_key_entry: synthetic, mode: 'SIMULATED', reason: synthetic ? 'SYNTHETIC_FIXTURE_NO_OS_ISOLATION' : 'CREDENTIAL_SERVICE_NOT_INSTALLED' }, keys: [], usage: emptyUsage(), policy_epoch: 1, service_instance: 'fixture-service' };
  }
  async invoke(method: string, params: any = {}) {
    const { secret, ...safe } = params; this.calls.push({ method, params: structuredClone(safe) });
    if (method === 'budget.configure') { assert.equal(params.project_tokens, 100000000); return { saved: true, counter_reset: false }; }
    if (method === 'credential.save') {
      assert.ok(secret instanceof Uint8Array); assert.ok(Buffer.from(secret).toString().startsWith('synthetic-test-')); secret.fill(0);
      const key_id = 'key.' + (this.value.keys.length + 1);
      if (params.rotate_id) this.value.keys.find(k => k.key_id === params.rotate_id)!.state = 'ROTATING';
      const key: ServiceKey = { key_id, key_handle_id: 'handle.' + key_id, provider_id: params.provider_id, models: params.models, state: 'ACTIVE', max_concurrency: params.max_concurrency, requests_per_minute: params.requests_per_minute, cost_limit_micros: 1000000, spent_micros: 0, reserved_micros: 0, in_flight: 0, protection: 'TEST_INTERFACE_ONLY', classification: 'SYNTHETIC', name: params.name, notes: params.notes, created_at: '2026-11-08T00:00:00Z', tokens: 0, requests: 0, errors: 0, health: 'UNVERIFIED' };
      this.value.keys.push(key); return { stored: true, key_id, classification: 'SYNTHETIC' };
    }
    const key = this.value.keys.find(k => k.key_id === params.key_id); assert.ok(key);
    if (method === 'credential.models') key.models = params.models;
    else if (method === 'credential.state') key.state = params.enabled ? 'ACTIVE' : 'DISABLED';
    else if (method === 'credential.delete') this.value.keys = this.value.keys.filter(k => k !== key);
    else throw Error('UNEXPECTED_SERVICE_METHOD');
    return { saved: true, deleted: true };
  }
  async snapshot() { return structuredClone(this.value); }
  async execute(input: BrokerInput): Promise<BrokerResult> {
    this.executions.push(input);
    const body = JSON.parse(input.request.body);
    assert.equal(input.request.url, 'https://api.deepseek.com/chat/completions');
    assert.equal(body.stream_options.include_usage, true); assert.equal(body.thinking.type, 'disabled'); assert.equal(body.response_format.type, 'json_object');
    assert.equal('authorization' in input.request.headers, false);
    if (this.failure) throw Object.assign(Error('SERVICE_TEST_RESPONSE'), { code: 'SERVICE_TEST_RESPONSE', sent: true, ...this.failure });
    const key = this.value.keys.find(k => k.state === 'ACTIVE' && k.models.includes(input.model.model_id))!; assert.ok(key);
    key.tokens += 30; key.requests++;
    this.value.usage.simulated.input_tokens += 20; this.value.usage.simulated.output_tokens += 10; this.value.usage.simulated.requests++;
    this.value.usage.simulated_budget.used.tokens += 30;
    return { response: { provider_request_id: 'fixture-response', response_model: body.model, reply: { kind: 'FINAL', text: 'SIMULATED service response' }, usage: { input_tokens: 20, output_tokens: 10, reasoning_tokens: null }, finish_reason: 'stop' }, key_handle_id: key.key_handle_id, cost_micros: 0, reservation_id: input.request.headers['x-agentnexus-request-id'], assurance: 'SIMULATED' };
  }
  async close() { this.closed = true; }
}

async function setup(t: test.TestContext, port: CredentialServicePort = new FixtureService(), trustedEntry?: TrustedEntryPort) {
  await mkdir(base, { recursive: true }); const root = await mkdtemp(join(base, 'host-'));
  const service = await openDesktopService(root, { credentialService: port, syntheticCredentialFixture: true, ...(trustedEntry ? { trustedEntry } : {}) }), op = service.openOperator();
  t.after(async () => { await service.close(); });
  return { root, port, service, invoke: (method: string, params: unknown = {}): Promise<any> => op.invoke(method, params) };
}
async function provider(f: Awaited<ReturnType<typeof setup>>, id = 'deepseek-ui', url = 'https://api.deepseek.com', model_id = 'deepseek-flash') {
  await f.invoke('provider.save', { id, name: id, preset_id: 'custom', protocol: 'openai-compatible', base_url: url, enabled: true, revision: -1 });
  return f.invoke('model.save', { provider_id: id, model_id, name: model_id, enabled: true, context_tokens: 65536, output_tokens: 4096, capabilities: caps, revision: -1 });
}
async function saveKey(f: Awaited<ReturnType<typeof setup>>, provider_id = 'deepseek-ui', rotate_id?: string) {
  const secret = Buffer.from('synthetic-test-isolated-secret-1234567890');
  const payload = { provider_id, name: 'Service key', notes: 'fixture', secret, max_concurrency: 2, requests_per_minute: 120, ...(rotate_id ? { rotate_id } : {}) };
  const stored = await f.invoke('credential.save', payload);
  assert.ok(secret.every(b => b === 0)); assert.equal(payload.secret, undefined); return stored;
}
function hostCredentialRows(root: string) {
  const db = new DatabaseSync(join(root, 'host/kernel.sqlite'), { readOnly: true });
  try { return db.prepare("SELECT kind FROM m16_entities WHERE kind IN ('MODEL181_CAMPAIGN','MODEL181_CAMPAIGN_REQUEST','MODEL18_BUDGET','MODEL18_USAGE','DESKTOP_KEY')").all(); }
  finally { db.close(); }
}

test('ISOLATED desktop keeps metadata and BLOCKED entry without opening a Host Vault', async t => {
  const port = new FixtureService(false), f = await setup(t, port), m = await provider(f);
  const s = await f.invoke('snapshot');
  assert.equal(s.credential_entry.synthetic, false); assert.equal(s.credential_entry.real, false); assert.equal(s.credential_entry.trusted, true); assert.deepEqual(s.usage, port.value.usage);
  const result = await f.invoke('connection.test', { provider_id: 'deepseek-ui', model_ref: m.ref, mode: 'LIVE' });
  assert.equal(result.status, 'BLOCKED'); assert.equal(result.request_id, null); assert.equal(port.executions.length, 0); assert.equal(port.calls.length, 0);
  const secret = Buffer.from('synthetic-test-isolated-secret-1234567890');
  await assert.rejects(f.invoke('credential.save', { provider_id: 'deepseek-ui', name: 'Denied', notes: '', secret, max_concurrency: 1, requests_per_minute: 120 }), /TRUSTED_ENTRY_REQUIRED/);
  // Production denial does not inspect or mutate the payload. The fixture caller owns it.
  secret.fill(0); await assert.rejects(access(join(f.root, 'synthetic-vault')));
  assert.deepEqual(hostCredentialRows(f.root), []);
});

test('ISOLATED existing credential UI payloads forward save, scope, rotation, state and deletion', async t => {
  const port = new FixtureService(), f = await setup(t, port), m = await provider(f), first = await saveKey(f);
  assert.deepEqual(port.calls[0].params.models, [m.id]); assert.deepEqual(port.calls[0].params.model_wire_ids, { [m.id]: 'deepseek-flash' });
  const second = await f.invoke('model.save', { provider_id: 'deepseek-ui', model_id: 'deepseek-v4-pro', name: 'Pro', enabled: true, context_tokens: 65536, output_tokens: 4096, capabilities: caps, revision: -1 });
  assert.ok(port.calls.some(c => c.method === 'credential.models' && c.params.models.includes(second.id) && c.params.model_wire_ids[second.id] === 'deepseek-v4-pro'));
  const rotated = await saveKey(f, 'deepseek-ui', first.key_id);
  assert.equal((await f.invoke('snapshot')).keys.find((k: any) => k.key_id === first.key_id).state, 'ROTATING');
  await f.invoke('credential.state', { key_id: rotated.key_id, enabled: false }); await f.invoke('credential.state', { key_id: rotated.key_id, enabled: true });
  await f.invoke('credential.delete', { key_id: first.key_id });
  const s = await f.invoke('snapshot'); assert.equal(s.keys.length, 1); assert.equal(s.keys[0].name, 'Service key'); assert.equal(s.keys[0].created_at, '2026-11-08T00:00:00Z');
  assert.deepEqual(s.usage, port.value.usage); await assert.rejects(f.invoke('credential.read', { key_id: rotated.key_id }), /METHOD_DENIED/);
  assert.equal(JSON.stringify(s).includes('synthetic-test-isolated-secret-'), false); assert.deepEqual(hostCredentialRows(f.root), []);
});

test('ISOLATED routing and synthetic connection execute only the broker and show authoritative usage', async t => {
  const port = new FixtureService(), f = await setup(t, port), m = await provider(f); await saveKey(f);
  await f.invoke('binding.save', { agent_id: 'development', primary: m.ref, fallbacks: [], auto_route: false, failover: false, budget_tokens: 1, revision: -1 });
  const r = await f.invoke('connection.test', { provider_id: 'deepseek-ui', model_ref: m.ref, mode: 'SIMULATED' });
  assert.equal(r.status, 'INCONCLUSIVE'); assert.equal(r.simulation_passed, true); assert.equal(port.executions.length, 1);
  assert.equal(port.executions[0].subject.agent_id, 'development'); assert.ok(port.executions[0].context.entries.length > 0);
  let s = await f.invoke('snapshot'); assert.equal(s.usage.simulated_budget.used.tokens, 30); assert.equal(s.usage.global.used, 19); assert.equal(s.keys[0].tokens, 30); assert.deepEqual(s.usage, port.value.usage);
  const live = await f.invoke('connection.test', { provider_id: 'deepseek-ui', model_ref: m.ref, mode: 'LIVE' }); assert.equal(live.status, 'BLOCKED'); assert.equal(port.executions.length, 1);
  const other = await provider(f, 'other', 'https://example.com/v1', 'org/model'); await saveKey(f, 'other'); await f.invoke('selection.save', { agent_id: 'development', ref: other.ref });
  await assert.rejects(f.invoke('chat.send', { agent_id: 'development', text: 'SYNTHETIC other endpoint test' }), /NO_AVAILABLE_MODEL/); assert.equal(port.executions.length, 1);
  s = await f.invoke('snapshot'); assert.equal(s.models.length, 2); assert.deepEqual(hostCredentialRows(f.root), []);
});

test('ISOLATED explicit legacy bootstrap refuses the no-port implicit Vault path', async () => {
  await mkdir(base, { recursive: true }); const root = await mkdtemp(join(base, 'no-port-'));
  await assert.rejects(openDesktopService(root,{security:false}), /CREDENTIAL_SERVICE_REQUIRED/); await assert.rejects(access(join(root, 'synthetic-vault')));
});

test('ISOLATED connection taxonomy uses trusted broker status and timeout evidence', async t => {
  for (const [failure, status] of [[{ http_status: 401 }, 'INVALID_KEY'], [{ http_status: 403 }, 'UNAUTHORIZED'], [{ http_status: 429 }, 'RATE_LIMITED'], [{ http_status: 503 }, 'PROVIDER_UNAVAILABLE'], [{ timed_out: true }, 'TIMEOUT']] as const) {
    const port = new FixtureService(); port.failure = failure;
    const f = await setup(t, port), m = await provider(f); await saveKey(f);
    const result = await f.invoke('connection.test', { provider_id: 'deepseek-ui', model_ref: m.ref, mode: 'SIMULATED' });
    assert.equal(result.status, status); assert.equal(result.simulation_passed, false); assert.equal(port.executions.length, 1);
    assert.deepEqual(hostCredentialRows(f.root), []);
  }
});

test('ISOLATED original renderer keeps Provider layout and opens metadata-only intent when status service is unavailable', async t => {
  const f = await setup(t, new FixtureService(false)); await provider(f, 'deepseek');
  const snapshot = await f.invoke('snapshot'), elements = new Map<string, any>(), listeners = new Map<string, any>();
  for (const name of ['#app', '#modal-root', '#toast']) elements.set(name, { innerHTML: '', style: {}, replaceChildren() { this.innerHTML = ''; } });
  const document = { querySelector: (name: string) => elements.get(name) ?? null, addEventListener: (name: string, handler: unknown) => listeners.set(name, handler) };
  // This VM fixture exercises the inherited Hardened form; actual ES module loading is verified in Electron E2E.
  const source = (await readFile(new URL('../../desktop/renderer/app.js', import.meta.url), 'utf8')).replace(/^import .* from '.\/security\.js';\r?\n/m,'');
  const context = createContext({ document, window: { agentnexus: {} }, Intl, Map, setTimeout: () => 0, clearTimeout() {} });
  new Script(source.slice(0, source.lastIndexOf('try { if (!window.agentnexus)')) + '\n;globalThis.ui = { setSnapshot(s) { data = s; providerId = s.providers[0].id; }, providersPage, keyPool, keyDialog, notice };').runInContext(context);
  context.ui.setSnapshot(snapshot);
  const html = context.ui.providersPage(); assert.match(html, /providers-layout/); assert.match(html, /API Key Pool/); assert.match(html, /LIVE BLOCKED/);
  assert.match(context.ui.keyPool(snapshot.providers[0]), /data-action="add-key">/);
  context.ui.keyDialog(); const form = elements.get('#modal-root').innerHTML;
  assert.match(form, /Open Trusted Window/); assert.match(form, /Key Name/); assert.doesNotMatch(form, /type="password"|id="secret"/);
  assert.equal(/localStorage|sessionStorage|indexedDB/.test(source), false);
});

test('ISOLATED actual renderer submits only the finite intent and reloads metadata', async t => {
  const port = new FixtureService(false), intents: any[] = [];
  const f = await setup(t, port, { async open(value) { intents.push(value); return { status: 'CREDENTIAL_SAVED', reason: 'HELPER_COMPLETED_REFRESH_REQUIRED' }; } }); await provider(f, 'deepseek');
  const elements = new Map<string, any>(), listeners = new Map<string, any>();
  for (const name of ['#app', '#modal-root', '#toast']) elements.set(name, { innerHTML: '', style: {}, replaceChildren() { this.innerHTML = ''; } });
  const button = { disabled: false }; elements.set('button[form="key-form"][type="submit"]', button);
  const document = { querySelector: (name: string) => elements.get(name) ?? null, addEventListener: (name: string, handler: unknown) => listeners.set(name, handler) };
  class FixtureFormData {
    values: Map<string, unknown>; constructor(form: any) { this.values = new Map(form.fields); }
    get(name: string) { return this.values.get(name) ?? null; } has(name: string) { return this.values.has(name); }
  }
  const calls: string[] = [];
  const context = createContext({ document, window: { agentnexus: { invoke: async (method: string, params: unknown) => { calls.push(method); try { return { ok: true, value: await f.invoke(method, params) }; } catch (error) { return { ok: false, error: (error as Error).message }; } } } }, crypto: { randomUUID: () => '12345678-1234-1234-1234-123456789abc' }, FormData: FixtureFormData, Intl, Map, setTimeout: () => 0, clearTimeout() {} });
  // This VM fixture exercises the inherited Hardened form; actual ES module loading is verified in Electron E2E.
  const source = (await readFile(new URL('../../desktop/renderer/app.js', import.meta.url), 'utf8')).replace(/^import .* from '.\/security\.js';\r?\n/m,'');
  new Script(source.slice(0, source.lastIndexOf('try { if (!window.agentnexus)')) + '\n;globalThis.ui = { setSnapshot(s) { data = s; providerId = s.providers[0].id; }, keyDialog };').runInContext(context);
  context.ui.setSnapshot(await f.invoke('snapshot')); context.ui.keyDialog();
  assert.doesNotMatch(elements.get('#modal-root').innerHTML, /type="password"|id="secret"/);
  const form: any = { id: 'key-form', dataset: { form: 'key' }, fields: [['name', 'Renderer key']], closest() { return this; } };
  await listeners.get('submit')({ target: form, preventDefault() {} });
  assert.equal(button.disabled, false); assert.deepEqual(calls, ['credential.entry', 'snapshot']); assert.deepEqual(port.calls, []);
  assert.deepEqual(intents, [{ provider_id: 'deepseek', model_ids: ['deepseek-flash'], action: 'ADD', name: 'Renderer key', operation_id: '12345678-1234-1234-1234-123456789abc' }]);
  assert.match(elements.get('#toast').textContent, /CREDENTIAL_SAVED/); assert.match(elements.get('#toast').textContent, /连接尚未验证/);
  assert.equal(elements.get('#modal-root').innerHTML, '');
});
test('ISOLATED desktop integration uses the real synthetic credential subprocess', async t => {
  const { openSyntheticCredentialService } = await import('../../src/agentnexus/credential-service/client.ts');
  await mkdir(base, { recursive: true }); const root = await mkdtemp(join(base, 'subprocess-'));
  const port = await openSyntheticCredentialService(join(root, 'credential-service'));
  const service = await openDesktopService(join(root, 'desktop'), { credentialService: port, syntheticCredentialFixture: true }), op = service.openOperator();
  t.after(async () => { await service.close(); });
  const f = { root: join(root, 'desktop'), port, service, invoke: (method: string, params: unknown = {}): Promise<any> => op.invoke(method, params) };
  const m = await provider(f); const stored = await saveKey(f);
  const before = await f.invoke('snapshot'); assert.equal(before.keys.length, 1); assert.equal(before.keys[0].key_id, stored.key_id); assert.equal(before.qualification.real_key_entry, false);
  await f.invoke('credential.state', { key_id: stored.key_id, enabled: false });
  assert.equal((await f.invoke('snapshot')).keys[0].state, 'DISABLED');
  await assert.rejects(f.invoke('connection.test', { provider_id: 'deepseek-ui', model_ref: m.ref, mode: 'SIMULATED' }), /CREDENTIAL_REQUIRED/);
  await f.invoke('credential.state', { key_id: stored.key_id, enabled: true });
  assert.equal((await f.invoke('snapshot')).keys[0].state, 'ACTIVE');
  const rotated = await saveKey(f, 'deepseek-ui', stored.key_id);
  let current = await f.invoke('snapshot');
  assert.equal(current.keys.find((k: any) => k.key_id === stored.key_id).state, 'ROTATING');
  assert.equal(current.keys.find((k: any) => k.key_id === rotated.key_id).state, 'ACTIVE');
  const extra = await f.invoke('model.save', { provider_id: 'deepseek-ui', model_id: 'deepseek-v4-pro', name: 'Pro', enabled: true, context_tokens: 65536, output_tokens: 4096, capabilities: caps, revision: -1 });
  current = await f.invoke('snapshot');
  for (const key of current.keys) assert.deepEqual([...key.models].sort(), [m.id, extra.id].sort());
  const live = await f.invoke('connection.test', { provider_id: 'deepseek-ui', model_ref: m.ref, mode: 'LIVE' }); assert.equal(live.status, 'BLOCKED');
  await assert.rejects(f.invoke('connection.test', { provider_id: 'deepseek-ui', model_ref: extra.ref, mode: 'SIMULATED' }), /NO_AVAILABLE_MODEL/);
  const simulated = await f.invoke('connection.test', { provider_id: 'deepseek-ui', model_ref: m.ref, mode: 'SIMULATED' }); assert.equal(simulated.status, 'INCONCLUSIVE'); assert.equal(simulated.simulation_passed, true);
  const after = await f.invoke('snapshot'); assert.ok(after.usage.simulated.input_tokens > 0); assert.ok(after.keys.find((k: any) => k.key_id === rotated.key_id).requests > 0); assert.equal(after.keys.find((k: any) => k.key_id === stored.key_id).requests, 0); assert.equal(JSON.stringify(after).includes('synthetic-test-isolated-secret-'), false);
  await f.invoke('model.delete', { ref: extra.ref, revision: after.models.find((model: any) => model.id === extra.id).revision });
  current = await f.invoke('snapshot'); for (const key of current.keys) assert.deepEqual(key.models, [m.id]);
  assert.equal((await f.invoke('connection.test', { provider_id: 'deepseek-ui', model_ref: m.ref, mode: 'SIMULATED' })).simulation_passed, true);
  await f.invoke('credential.delete', { key_id: stored.key_id });
  assert.deepEqual((await f.invoke('snapshot')).keys.map((k: any) => k.key_id), [rotated.key_id]);
  await f.invoke('credential.delete', { key_id: rotated.key_id });
  current = await f.invoke('snapshot'); assert.equal(current.keys.length, 0); assert.ok(current.usage.simulated.input_tokens >= after.usage.simulated.input_tokens);
  await assert.rejects(f.invoke('connection.test', { provider_id: 'deepseek-ui', model_ref: m.ref, mode: 'SIMULATED' }), /CREDENTIAL_REQUIRED/);
  await assert.rejects(access(join(f.root, 'synthetic-vault'))); assert.deepEqual(hostCredentialRows(f.root), []);
});
