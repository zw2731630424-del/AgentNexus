// Independent synthetic-only attacks. No deployment, real credentials or network.
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { CredentialBroker } from '../../source/src/agentnexus/credential-service/broker.ts';
import { FixtureTransport, wireFixture } from '../../source/src/agentnexus/model-runtime/transport.ts';
import { DeepSeekAdapter } from '../../source/src/agentnexus/model-runtime/adapters.ts';
import { createDeepSeekFlashSpec } from '../../source/src/agentnexus/model-runtime/deepseek.ts';

const workspace = fileURLToPath(new URL('../../../../', import.meta.url));
const evidence = fileURLToPath(new URL('./', import.meta.url));
const runtime = join(workspace, '.workflow-kit/runtime/AgentNexus-M1.8.3/independent-review');
await mkdir(runtime, { recursive: true });
const run = await mkdtemp(join(runtime, 'probe-'));
const hash = value => createHash('sha256').update(value).digest('hex');
const files = ['credential-service/boundary.ts', 'credential-service/contracts.ts', 'credential-service/store.ts', 'credential-service/broker.ts', 'credential-service/engine.ts', 'credential-service/client.ts', 'model-runtime/vault.ts', 'model-runtime/gateway.ts', 'desktop/service.ts'];
async function hashes() { return Promise.all(files.map(async name => { const b = await readFile(new URL('../../source/src/agentnexus/' + name, import.meta.url)); return { name, bytes: b.length, sha256: hash(b) }; })); }
const before = await hashes();
const observed = [];
function input(id, text = 'Synthetic independent qualification task.') {
  const subject = { agent_id: 'independent-agent', project_id: 'synthetic-project', task_id: 'synthetic-task', session_id: 'synthetic-session', runtime_instance_id: 'synthetic-runtime', agent_type: 'DEVELOPMENT', model_binding: 'deepseek', resource_budget_id: 'synthetic-budget', policy_scope: 'synthetic-project' };
  const source = { event_id: 'synthetic-source', record_hash: hash(text), project_id: subject.project_id, task_id: subject.task_id, kind: 'RAW', payload_ref: { id: 'synthetic-payload', sha256: hash(text), bytes: Buffer.byteLength(text), media_type: 'text/plain' }, offset: 0, length: Buffer.byteLength(text) };
  const context = { view_id: 'synthetic-view', project_id: subject.project_id, task_id: subject.task_id, agent_id: subject.agent_id, text, bytes: Buffer.byteLength(text), sha256: hash(text), entries: [{ source, section: 'TASK_CONTRACT', required: true, text, range_sha256: hash(text) }], omitted: [] };
  const model = createDeepSeekFlashSpec('2026-11-08T00:00:00Z', '2027-01-01T00:00:00Z');
  const adapter = new DeepSeekAdapter(), request = adapter.build({ request_id: id, model, prompt: text, max_output_tokens: 64, stream: true, json: true, reasoning: 'disabled', tools: [] });
  adapter.abandon(id);
  return { subject, request, model, context, context_hash: context.sha256, input_tokens: 5000, output_tokens: 64 };
}
async function add(broker, suffix, extra = {}) {
  const secret = Buffer.from('synthetic-test-independent-key-' + suffix);
  return broker.mutate('credential.save', { provider_id: 'deepseek', name: 'Synthetic ' + suffix, notes: '', secret_b64: secret.toString('base64'), models: ['deepseek-flash'], model_wire_ids: { 'deepseek-flash': 'deepseek-flash' }, max_concurrency: 16, requests_per_minute: 1000, ...extra });
}
function admit(broker, p) { broker.reviewSynthetic(p); return { input: p, binding: broker.prepare(p) }; }
function err(e) { return { code: e?.code ?? e?.message ?? 'ERROR', sent: e?.sent, http_status: e?.http_status }; }
async function waitUntil(predicate, label) {
  const deadline = Date.now() + 15000;
  while (!predicate()) { if (Date.now() > deadline) throw Error('PROBE_TIMEOUT_' + label); await new Promise(r => setTimeout(r, 5)); }
}

// Replay must not erase another operation's active slot or cancel owner.
{
  const gates = [], signals = [];
  const fixture = new FixtureTransport(async (_r, _n, signal) => {
    signals.push(signal);
    await new Promise((resolve, reject) => { gates.push(resolve); signal.addEventListener('abort', () => reject(Error('SYNTHETIC_ABORT')), { once: true }); });
    return wireFixture(JSON.stringify({ kind: 'FINAL', text: 'Synthetic success.' }), { usage: { prompt_tokens: 20, completion_tokens: 10 } });
  });
  const broker = await CredentialBroker.open({ synthetic: true, root: join(run, 'replay-active'), fixture });
  await add(broker, 'replay-active');
  const pending = [], attempts = [];
  for (let n = 0; n < 6; n++) {
    const params = admit(broker, input('active-' + n));
    pending.push(broker.execute(params, async () => {}).then(() => ({ outcome: 'SUCCEEDED' }), e => ({ outcome: 'REJECTED', ...err(e) })));
    await waitUntil(() => signals.length === n + 1, 'active-' + n);
    try { await broker.execute(params, async () => {}); attempts.push({ n, replay: 'ACCEPTED' }); }
    catch (e) { attempts.push({ n, replay: err(e) }); }
  }
  broker.disconnect(['active-0']);
  const result = { id: 'IR-M183-001', concurrentTransportCalls: fixture.calls, expectedMaximum: 4, cancelOriginalObserved: signals[0].aborted, replayResults: attempts };
  for (const release of gates) release();
  result.completions = await Promise.all(pending); result.usage = broker.snapshot().usage.global;
  observed.push(result); await broker.close();
}

// A binding returned for one key must not be nullified to use a replacement key.
{
  const fixture = new FixtureTransport(() => wireFixture(JSON.stringify({ kind: 'FINAL', text: 'Synthetic response.' })));
  const broker = await CredentialBroker.open({ synthetic: true, root: join(run, 'handle-null'), fixture });
  const key1 = await add(broker, 'handle-old');
  const params = admit(broker, input('handle-null'));
  await broker.mutate('credential.state', { key_id: key1.key_id, enabled: false });
  await add(broker, 'handle-new');
  const pinned = params.binding.credential_handle_id;
  params.binding.credential_handle_id = null;
  let result;
  try { const value = await broker.execute(params, async () => {}); result = { outcome: 'ACCEPTED', old_handle: pinned, actual_handle: value.key_handle_id, calls: fixture.calls }; }
  catch (e) { result = { outcome: 'REJECTED', ...err(e), calls: fixture.calls }; }
  observed.push({ id: 'IR-M183-002', ...result }); await broker.close();
}

// Check fixed endpoint and full raw JSON review, with no provider sends.
{
  const fixture = new FixtureTransport(() => wireFixture(JSON.stringify({ kind: 'FINAL', text: 'Synthetic response.' })));
  const broker = await CredentialBroker.open({ synthetic: true, root: join(run, 'admission-denials'), fixture });
  await add(broker, 'admission-denials'); const cases = [];
  for (const variant of ['unreviewed', 'endpoint', 'duplicate-json', 'subject', 'revoked-grant']) {
    const p = input('deny-' + variant); let b;
    if (variant !== 'unreviewed' && variant !== 'endpoint' && variant !== 'duplicate-json') b = admit(broker, p);
    if (variant === 'endpoint') p.request.url = 'https://invalid.example/chat/completions';
    if (variant === 'duplicate-json') p.request.body = '{"model":"unreviewed",' + p.request.body.slice(1);
    if (variant === 'subject') b.input = { ...p, subject: { ...p.subject, agent_id: 'different-agent' } };
    if (variant === 'revoked-grant') broker.store.grantRevoke(b.binding.data_egress_decision);
    try { if (b) await broker.execute(b, async () => {}); else broker.prepare(p); cases.push({ variant, outcome: 'ACCEPTED' }); }
    catch (e) { cases.push({ variant, outcome: 'REJECTED', ...err(e) }); }
  }
  observed.push({ id: 'ADMISSION_DENIALS', cases, calls: fixture.calls }); await broker.close();
}

const after = await hashes();
const report = { schema: 'agentnexus/m183/independent-attacks/1', at: new Date().toISOString(), synthetic_only: true, runtime: run, real_credentials: 0, provider_requests: 0, source_before: before, source_after: after, unchanged: JSON.stringify(before) === JSON.stringify(after), observed };
const target = join(evidence, 'observations-' + report.at.replace(/[:.]/g, '-') + '.json');
await writeFile(target, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
process.stdout.write(JSON.stringify({ evidence: target, unchanged: report.unchanged, observed }, null, 2) + '\n');
