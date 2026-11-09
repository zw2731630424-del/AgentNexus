import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, Script } from 'node:vm';
import { EventEmitter } from 'node:events';
import { openDesktopService } from '../../src/agentnexus/desktop/service.ts';
import { entryIntent, entryResult } from '../../src/agentnexus/desktop/trusted-entry.ts';
import type { TrustedEntryIntent, TrustedEntryPort, TrustedEntryResult } from '../../src/agentnexus/desktop/trusted-entry.ts';
import type { CredentialServicePort, ServiceSnapshot, ServiceKey } from '../../src/agentnexus/credential-service/contracts.ts';

const base = fileURLToPath(new URL('../../../../../.workflow-kit/runtime/AgentNexus-M1.8.3-Q3/desktop-unit/', import.meta.url));
const operation = '12345678-1234-1234-1234-123456789abc';
const target = 'key.12345678-1234-1234-1234-123456789abd';
const caps = { reasoning: false, tools: false, json: true, streaming: true, multimodal: false };
const intent = (extra: Record<string, unknown> = {}): TrustedEntryIntent => entryIntent({ provider_id: 'deepseek', model_ids: ['deepseek-flash'], action: 'ADD', name: 'Fixture Key 01', operation_id: operation, ...extra });
const completed: TrustedEntryResult = { status: 'CREDENTIAL_SAVED', reason: 'HELPER_COMPLETED_REFRESH_REQUIRED' };
const inconclusive: TrustedEntryResult = { status: 'INCONCLUSIVE', reason: 'HELPER_CANCELLED_OR_UNKNOWN' };
function usage() {
  const meter = () => ({ input_tokens: 7, output_tokens: 3, cached_tokens: null, reasoning_tokens: null, requests: 1, failed_requests: 0, estimated_cost_micros: 2, actual_cost_micros: null });
  return { global: { used: 37, held: 2, unknown: 1, limit: 100000000, remaining_tokens: 99999961 }, simulated_budget: { used: { tokens: 0 }, held: { tokens: 0 } }, real: meter(), simulated: { ...meter(), input_tokens: 0, output_tokens: 0 }, by_provider: [], by_model: [], by_agent: [], by_task: [], records: [] };
}
function key(): ServiceKey { return { key_id: target, key_handle_id: 'handle.fixture', provider_id: 'deepseek', models: ['deepseek-flash'], state: 'ACTIVE', classification: 'SECRET', name: 'Fixture Key 01', notes: '', created_at: '2026-11-09T00:00:00Z', tokens: 10, requests: 1, errors: 0, health: 'UNVERIFIED', max_concurrency: 1, requests_per_minute: 120, in_flight: 0, protection: 'SERVICE_ONLY', cost_limit_micros: 100, spent_micros: 2, reserved_micros: 0 }; }
class MetadataPort implements CredentialServicePort {
  readonly assurance = 'REAL' as const;
  readonly guard = { assertSafe() {} };
  readonly calls: string[] = [];
  snapshots = 0; unavailable = false;
  value: ServiceSnapshot = { qualification: { live: 'BLOCKED', credential_service: 'BLOCKED', real_key_entry: false, synthetic_key_entry: false, mode: 'REAL', reason: 'Q2_SYNTHETIC_INTERFACE_FIXTURE_NOT_OS_QUALIFICATION' }, keys: [], usage: usage(), policy_epoch: 1, service_instance: 'interface-fixture' };
  async invoke(method: string): Promise<any> { this.calls.push(method); throw Error('MANAGEMENT_MUST_USE_TRUSTED_ENTRY'); }
  async snapshot() { this.snapshots++; if (this.unavailable) throw Error('fixture unavailable'); return structuredClone(this.value); }
  async execute(): Promise<never> { throw Error('NETWORK_NOT_AUTHORIZED'); }
  async close() {}
}
async function setup(t: test.TestContext, port = new MetadataPort(), trustedEntry?: TrustedEntryPort) {
  await mkdir(base, { recursive: true }); const root = await mkdtemp(join(base, 'host-'));
  const host = await openDesktopService(root, { credentialService: port, ...(trustedEntry ? { trustedEntry } : {}) }), op = host.openOperator();
  t.after(async () => { await host.close(); });
  const invoke = (method: string, value: unknown = {}): Promise<any> => op.invoke(method, value);
  await invoke('provider.save', { id: 'deepseek', name: 'DeepSeek', preset_id: 'deepseek', protocol: 'openai-compatible', base_url: 'https://api.deepseek.com', enabled: true, revision: -1 });
  const model = await invoke('model.save', { provider_id: 'deepseek', model_id: 'deepseek-flash', name: 'DeepSeek Flash', enabled: true, context_tokens: 65536, output_tokens: 4096, capabilities: caps, revision: -1 });
  return { root, port, host, invoke, model };
}

test('Q2 strict intent rejects payload expansion, endpoint/method injection and newline identifiers', () => {
  assert.equal(intent().provider_id, 'deepseek');
  for (const extra of [{ secret: new Uint8Array([1]) }, { path: 'other.exe' }, { env: {} }, { stdin: 'x' }, { method: 'credential.save' }, { url: 'https://example.invalid' }, { action: 'RUN' }, { provider_id: 'custom' }, { model_ids: ['untrusted'] }, { model_ids: ['deepseek-flash', 'deepseek-flash'] }, { operation_id: operation + '\n' }, { operation_id: '00000000-0000-0000-0000-000000000000' }, { name: ' Fixture' }, { name: 'Fixture\n' }, { name: '\u{10400}' }, { name: '\u{10400}'.repeat(40) }, { name: '\uD800' }, { name: 'A'.repeat(81) }, { credential_id: target }, { action: 'DELETE', credential_id: target + '\n' }, { action: 'DELETE', credential_id: 'key.00000000-0000-0000-0000-000000000000' }]) assert.throws(() => intent(extra));
  assert.equal(intent({ action: 'DELETE', credential_id: target, model_ids: [] }).action, 'DELETE');
});

test('Q2 REAL Host denies legacy credential.save before reading any payload field', async t => {
  const f = await setup(t); let read = false;
  const payload = new Proxy({}, { ownKeys() { read = true; throw Error('PAYLOAD_WAS_READ'); }, get() { read = true; throw Error('PAYLOAD_WAS_READ'); }, has() { read = true; throw Error('PAYLOAD_WAS_READ'); } });
  await assert.rejects(f.invoke('credential.save', payload), /TRUSTED_ENTRY_REQUIRED/);
  assert.equal(read, false); assert.deepEqual(f.port.calls, []); await assert.rejects(access(join(f.root, 'synthetic-vault')));
  const host = await openDesktopService(join(f.root, 'attempted-downgrade'), { credentialService: f.port, syntheticCredentialFixture: true });
  try { await assert.rejects(host.openOperator().invoke('credential.save', payload), /TRUSTED_ENTRY_REQUIRED/); assert.equal(read, false); } finally { await host.close(); }
});

test('Q2 ADD succeeds only through trusted port and never implies Provider connected', async t => {
  const port = new MetadataPort(), received: TrustedEntryIntent[] = [];
  const f = await setup(t, port, { async open(value) { received.push(value); port.value.keys = [key()]; return { ...completed, injected: 'discard me' } as TrustedEntryResult; } });
  const before = port.snapshots, result = await f.invoke('credential.entry', intent());
  assert.deepEqual(result, completed); assert.ok(port.snapshots > before); assert.deepEqual(received, [intent()]); assert.deepEqual(port.calls, []);
  const snapshot = await f.invoke('snapshot');
  assert.equal(snapshot.credential_statuses[0].status, 'CREDENTIAL_SAVED'); assert.equal(snapshot.connections.length, 0); assert.equal(snapshot.models[0].verified, 'NOT_TESTED');
  assert.deepEqual(snapshot.keys[0].models, [f.model.id]); assert.equal(snapshot.usage.global.used, 37);
});

test('Q2 state, scope and delete management use helper intents and preserve service metadata', async t => {
  const port = new MetadataPort(), seen: TrustedEntryIntent[] = [];
  const f = await setup(t, port, { async open(value) { seen.push(value); if (value.action === 'DELETE') port.value.keys = []; else if (value.action === 'DISABLE') port.value.keys[0].state = 'DISABLED'; else if (value.action === 'ENABLE') port.value.keys[0].state = 'ACTIVE'; else if (value.action === 'MODELS') port.value.keys[0].models = value.model_ids; return completed; } });
  port.value.keys = [key()];
  await f.invoke('credential.state', { key_id: target, enabled: false }); await f.invoke('credential.state', { key_id: target, enabled: true });
  await f.invoke('model.save', { provider_id: 'deepseek', model_id: 'deepseek-v4-pro', name: 'DeepSeek Pro', enabled: true, context_tokens: 65536, output_tokens: 4096, capabilities: caps, revision: -1 });
  const deleted = await f.invoke('credential.delete', { key_id: target });
  assert.equal(deleted.status, 'REVOKED'); assert.deepEqual(seen.map(v => v.action), ['DISABLE', 'ENABLE', 'MODELS', 'DELETE']);
  assert.deepEqual(seen[2].model_ids, ['deepseek-flash', 'deepseek-v4-pro']); assert.ok(seen.every(v => v.credential_id === target)); assert.deepEqual(port.calls, []);
  assert.equal((await f.invoke('snapshot')).usage.global.used, 37);
});

test('Q2 unavailable service still permits ADD intent and missing port is IPC_BLOCKED', async t => {
  const port = new MetadataPort(); port.unavailable = true; let opens = 0;
  const f = await setup(t, port, { async open() { opens++; return completed; } });
  const snapshot = await f.invoke('snapshot'); assert.equal(snapshot.credential_entry.trusted, true); assert.equal(snapshot.service_status, 'SERVICE_UNAVAILABLE'); assert.equal(snapshot.usage.global.used, null); assert.equal(snapshot.usage.available, false);
  assert.equal((await f.invoke('credential.entry', intent())).status, 'INCONCLUSIVE'); assert.equal(opens, 1);
  const noPort = await setup(t); assert.equal((await noPort.invoke('credential.entry', intent())).status, 'IPC_BLOCKED'); assert.deepEqual(noPort.port.calls, []);
});

test('Q2 legacy labels and empty scope do not prevent revoke management', async t => {
  const port = new MetadataPort(), received: TrustedEntryIntent[] = [];
  const f = await setup(t, port, { async open(value) { received.push(value); if (value.action === 'DELETE') port.value.keys = []; return completed; } });
  port.value.keys = [{ ...key(), name: 'Legacy: label 🔑', models: [] }];
  const snapshot = await f.invoke('snapshot');
  await f.invoke('model.delete', { ref: f.model.ref, revision: snapshot.models[0].revision });
  await f.invoke('credential.state', { key_id: target, enabled: false }); await f.invoke('credential.delete', { key_id: target });
  assert.deepEqual(received.map(v => v.action), ['MODELS', 'DISABLE', 'DELETE']); assert.ok(received.every(v => v.model_ids.length === 0 && v.name === 'Manage DeepSeek Credential')); assert.deepEqual(port.calls, []);
});

test('Q2 ordinary requests cannot configure service budgets or reach dispatch', async t => {
  const f = await setup(t); await assert.rejects(f.host.bindAgent('development').complete('PUBLIC synthetic test'), /IPC_BLOCKED|QUALIFICATION_BLOCKED/); assert.deepEqual(f.port.calls, []);
});

test('Q2 cancellation and untrusted exit output remain INCONCLUSIVE even if metadata changes', async t => {
  const port = new MetadataPort(); const f = await setup(t, port, { async open() { port.value.keys = [key()]; return inconclusive; } });
  assert.equal((await f.invoke('credential.entry', intent())).status, 'INCONCLUSIVE'); assert.equal((await f.invoke('snapshot')).credential_statuses[0].status, 'INCONCLUSIVE');
  assert.deepEqual(entryResult({ status: 'CONNECTED', secret: 'must not return', reason: 'arbitrary' }, 'ADD'), inconclusive);
  assert.deepEqual(entryResult({ status: 'CREDENTIAL_SAVED', secret: 'must not return', reason: 'arbitrary' }, 'ADD'), completed);
});

async function launcherFixture(installed: boolean) {
  const source = (await readFile(new URL('../../desktop/trusted-entry.mjs', import.meta.url), 'utf8')).replace(/^import .*;\r?$/gm, '').replace(/\bexport /g, '');
  const spawns: { path: string; args: string[]; options: any; child: EventEmitter }[] = [];
  const context = createContext({ entryIntent, process: { platform: 'win32' }, existsSync: () => installed, spawn(path: string, args: string[], options: unknown) { const child = new EventEmitter(); spawns.push({ path, args, options, child }); return child; } });
  new Script(source + '\n;globalThis.fixture = { launcherArguments, helperExitResult, fixedTrustedEntryPort, FIXED_LAUNCHER, FIXED_HELPER };').runInContext(context);
  return { fixture: context.fixture, spawns };
}
test('Q2 Electron launch adapter uses fixed exe and finite argv, no stdin or process output', async () => {
  const { fixture, spawns } = await launcherFixture(true), pending = fixture.fixedTrustedEntryPort().open(intent());
  assert.equal(spawns.length, 1); assert.equal(spawns[0].path, 'C:\\Program Files\\AgentNexus\\credential-launcher.exe'); assert.equal(spawns[0].options.shell, false); assert.equal(spawns[0].options.stdio, 'ignore'); assert.equal(spawns[0].options.windowsHide, true);
  assert.deepEqual(Object.keys(spawns[0].options.env).sort(), ['SystemRoot', 'WINDIR']); assert.equal(spawns[0].options.env.SystemRoot, 'C:\\Windows'); assert.equal(spawns[0].options.env.WINDIR, 'C:\\Windows');
  assert.deepEqual([...spawns[0].args], ['--action', 'ADD', '--provider-id', 'deepseek', '--operation-id', operation, '--name', 'Fixture Key 01', '--model-ids', 'deepseek-flash']);
  spawns[0].child.emit('exit', 20, null); assert.equal((await pending).status, 'INCONCLUSIVE');
  assert.equal(fixture.helperExitResult(0, 'ADD').status, 'CREDENTIAL_SAVED'); assert.equal(fixture.helperExitResult(0, 'DELETE').status, 'REVOKED'); assert.equal(fixture.helperExitResult(21, 'ADD').status, 'IPC_BLOCKED');
  const missing = await launcherFixture(false); assert.equal((await missing.fixture.fixedTrustedEntryPort().open(intent())).status, 'IPC_BLOCKED'); assert.equal(missing.spawns.length, 0);
});

test('Q2 production Renderer and Host contain no credential input or ordinary service secret structure', async () => {
  const [renderer, preload, main, service] = await Promise.all(['../../desktop/renderer/app.js', '../../desktop/preload.cjs', '../../desktop/main.mjs', '../../src/agentnexus/desktop/service.ts'].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
  assert.doesNotMatch(renderer, /type="password"|id="secret"|TextEncoder|credential\.save|localStorage|sessionStorage|indexedDB/); assert.doesNotMatch(preload, /credential\.save|\.secret/); assert.doesNotMatch(service, /\.secret\b|secret\s*:/);
  assert.match(main, /join\(app\.getPath\('appData'\), 'AgentNexus'\)/); assert.doesNotMatch(main, /ProgramData/);
  for (const state of ['NOT_CONFIGURED', 'CREDENTIAL_SAVED', 'PROVIDER_CONNECTED', 'INVALID_KEY', 'REVOKED', 'SERVICE_UNAVAILABLE', 'IPC_BLOCKED', 'DATA_EGRESS_BLOCKED', 'BUDGET_EXCEEDED', 'INCONCLUSIVE']) assert.match(renderer, new RegExp(state));
});
