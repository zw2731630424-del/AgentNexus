import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

// Run from I:/AI_AgentNexus. Only new synthetic Vaults and local FixtureTransport are used.
const source = resolve('deliverables/AgentNexus-Model-Provider-UI/source');
const base = resolve('.workflow-kit/runtime/AgentNexus-Model-Provider-UI/independent-review');
await mkdir(base, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-'), observations = [], hashes = {};
for (const name of ['src/agentnexus/desktop/service.ts', 'src/agentnexus/desktop/contracts.ts', 'src/agentnexus/model-runtime/vault.ts', 'desktop/main.mjs', 'desktop/sender.mjs', 'desktop/preload.cjs', 'desktop/renderer/app.js']) {
  hashes[name] = createHash('sha256').update(await readFile(join(source, name))).digest('hex');
}
const { openDesktopService } = await import(pathToFileURL(join(source, 'src/agentnexus/desktop/service.ts')).href);
const { SyntheticMemoryProtector, CredentialVault, createVaultAdminCapability } = await import(pathToFileURL(join(source, 'src/agentnexus/model-runtime/vault.ts')).href);
const { FixtureTransport, wireFixture } = await import(pathToFileURL(join(source, 'src/agentnexus/model-runtime/transport.ts')).href);
const { authorizedSender } = await import(pathToFileURL(join(source, 'desktop/sender.mjs')).href);
const caps = { reasoning: false, tools: false, json: true, streaming: true, multimodal: false };
function note(value) { observations.push(value); process.stdout.write(JSON.stringify(value) + '\n'); }
async function setup(transport) {
  const root = await mkdtemp(join(base, 'probe-')), protector = new SyntheticMemoryProtector();
  const service = await openDesktopService(root, { protector, syntheticTransport: transport }), op = service.openOperator();
  return { root, service, protector, invoke: (...a) => op.invoke(...a) };
}
async function add(f, id, rpm = 120, concurrency = 4) {
  await f.invoke('provider.save', { id, name: id, preset_id: 'custom', protocol: 'openai-compatible', base_url: 'https://example.com/v1', enabled: true, revision: -1 });
  const model = await f.invoke('model.save', { provider_id: id, model_id: 'model', name: 'Model ' + id, enabled: true, context_tokens: 65536, output_tokens: 4096, capabilities: caps, revision: -1 });
  await f.invoke('credential.save', { provider_id: id, name: 'Synthetic key', notes: '', secret: Buffer.from('synthetic-test-independent-' + id + '-abcdefghi'), max_concurrency: concurrency, requests_per_minute: rpm });
  return model;
}
async function waitFor(predicate) { for (let n = 0; n < 150 && !predicate(); n++) await new Promise(r => setTimeout(r, 10)); }
const done = () => wireFixture(JSON.stringify({ kind: 'FINAL', text: 'OK' }));

{
  const transport = new FixtureTransport(done), f = await setup(transport), a = await add(f, 'primary', 1), b = await add(f, 'backup');
  await f.invoke('binding.save', { agent_id: 'development', primary: a.ref, fallbacks: [b.ref], auto_route: false, failover: true, budget_tokens: 1000000, revision: -1 });
  const first = await f.invoke('chat.send', { agent_id: 'development', text: 'One' }), second = await f.invoke('chat.send', { agent_id: 'development', text: 'Two' });
  note({ probe: 'pre-send-fallback-rpm', first: { outcome: first.outcome, provider: first.provider_id }, second: { outcome: second.outcome, reason: second.reason, provider: second.provider_id }, send_calls: transport.calls, keys: (await f.invoke('snapshot')).keys.map(k => ({ provider_id: k.provider_id, state: k.state })), root: f.root });
  await f.service.close(); f.protector.destroy();
}
{
  const releases = [], transport = new FixtureTransport(async () => { await new Promise(r => releases.push(r)); return done(); });
  const f = await setup(transport); await add(f, 'concurrent', 120, 16);
  const pending = ['resident', 'development', 'coding', 'research', 'test-agent', 'reviewer'].map(id => f.service.bindAgent(id).complete('Concurrent ' + id).then(r => ({ outcome: r.outcome }), e => ({ error: e.code ?? e.message })));
  await waitFor(() => releases.length >= 6);
  note({ probe: 'shared-gateway-concurrency', in_flight: releases.length, expected_gateway_default: 4, root: f.root });
  releases.forEach(r => r()); note({ probe: 'shared-gateway-concurrency-results', results: await Promise.all(pending) });
  await f.service.close(); f.protector.destroy();
}
{
  const releases = [], transport = new FixtureTransport(async () => { await new Promise(r => releases.push(r)); return done(); });
  const f = await setup(transport); await add(f, 'closing');
  const pending = f.service.bindAgent('development').complete('Delayed request').then(r => ({ outcome: r.outcome }), e => ({ error: e.code ?? e.message }));
  await waitFor(() => releases.length > 0);
  const closing = await f.service.close().then(() => ({ closed: true }), e => ({ close_error: e.code ?? e.message }));
  releases.forEach(r => r()); const completion = await pending;
  const retry = await f.service.close().then(() => ({ resolved: true }), e => ({ error: e.code ?? e.message }));
  note({ probe: 'close-inflight-agent', ...closing, completion, retry_close: retry, root: f.root }); f.protector.destroy();
}
{
  const transport = new FixtureTransport(() => ({ ...done(), status: 403 })), f = await setup(transport), model = await add(f, 'status');
  note({ probe: 'connection-http-403', expected: 'UNAUTHORIZED', actual: await f.invoke('connection.test', { provider_id: 'status', model_ref: model.ref, mode: 'SIMULATED' }), root: f.root });
  await f.service.close(); f.protector.destroy();
}
{
  const transport = new FixtureTransport(() => wireFixture(JSON.stringify({ kind: 'FINAL' }), { done: false })), f = await setup(transport);
  const primary = await add(f, 'unknown-primary'), backup = await add(f, 'unknown-backup');
  await f.invoke('binding.save', { agent_id: 'development', primary: primary.ref, fallbacks: [backup.ref], auto_route: false, failover: true, budget_tokens: 1000000, revision: -1 });
  const result = await f.invoke('chat.send', { agent_id: 'development', text: 'Incomplete synthetic response' });
  await f.service.close();
  const reopened = await openDesktopService(f.root, { protector: f.protector, syntheticTransport: transport }), snapshot = await reopened.openOperator().invoke('snapshot');
  note({ probe: 'unknown-no-failover-reopen', outcome: result.outcome, provider: result.provider_id, send_calls_after_reopen: transport.calls, held_tokens: snapshot.usage.simulated_budget.held.tokens, unknown_records: snapshot.usage.records.filter(r => r.state === 'UNKNOWN').length, key_in_flight: snapshot.keys.filter(k => k.provider_id === 'unknown-primary').map(k => k.in_flight), root: f.root });
  await reopened.close(); f.protector.destroy();
}
{
  const frame = { url: 'agentnexus://desktop/index.html' }, contents = { mainFrame: frame, isDestroyed: () => false };
  note({ probe: 'ipc-source-predicate', legitimate: authorizedSender({ sender: contents, senderFrame: frame }, contents, frame.url), rogue_contents: authorizedSender({ sender: {}, senderFrame: frame }, contents, frame.url), subframe: authorizedSender({ sender: contents, senderFrame: { ...frame } }, contents, frame.url), wrong_url: authorizedSender({ sender: contents, senderFrame: frame }, contents, frame.url + '?forged'), scope: 'PURE_PREDICATE_NOT_ACTUAL_ELECTRON_PROCESS_OR_OS_AUTH' });
}
{
  const root = await mkdtemp(join(base, 'scope-')), protector = new SyntheticMemoryProtector(), admin = createVaultAdminCapability();
  const vault = await CredentialVault.open({ root, admin, mode: 'SYNTHETIC', protector });
  await vault.add(admin, { key_id: 'scope-key', provider_id: 'scope', models: ['old-model'], secret: Buffer.from('synthetic-test-scope-independent-abcdef'), max_concurrency: 1, requests_per_minute: 120 });
  const denied = async action => { try { await action(); return 'ACCEPTED'; } catch (e) { return e.code ?? e.message; } };
  const forged_admin = await denied(() => vault.setModels({}, 'scope-key', ['new-model']));
  const invalid_scope = await denied(() => vault.setModels(admin, 'scope-key', ['invalid/model']));
  vault.setModels(admin, 'scope-key', ['new-model']);
  const old_scope = await denied(() => vault.acquire(admin, { provider_id: 'scope', model_id: 'old-model', request_id: 'old-request', estimated_cost_micros: 0, subject_key: 'synthetic-subject' }));
  const lease = vault.acquire(admin, { provider_id: 'scope', model_id: 'new-model', request_id: 'new-request', estimated_cost_micros: 0, subject_key: 'synthetic-subject' });
  vault.settle(admin, lease.lease_id, { outcome: 'NOT_SENT', cost_micros: 0, usage_source: 'SIMULATED' }, 'synthetic-subject');
  note({ probe: 'vault-setModels', forged_admin, invalid_scope, old_scope, new_scope: 'ACCEPTED', metadata_scope: vault.list(admin)[0].models, root });
  vault.close(); protector.destroy();
}
const artifact = join(base, 'observations-' + stamp + '.json');
await writeFile(artifact, JSON.stringify({ timestamp: stamp, node: process.version, source_hashes: hashes, observations, boundary: 'SYNTHETIC_ONLY_NO_REAL_KEY_NO_NETWORK_PROVIDER_REQUEST_NO_OS_QUALIFICATION' }, null, 2) + '\n');
process.stdout.write('Evidence: ' + artifact + '\n');
