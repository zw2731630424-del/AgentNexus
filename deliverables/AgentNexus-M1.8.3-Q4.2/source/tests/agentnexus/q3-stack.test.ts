import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { openSyntheticRuntimeStack } from '../../src/agentnexus/credential-service/client.ts';
import { hostSubject } from '../../src/agentnexus/harness/contracts.ts';
import { sha256 } from '../../src/agentnexus/types.ts';
import { DeepSeekAdapter } from '../../src/agentnexus/model-runtime/adapters.ts';
import { createDeepSeekFlashSpec } from '../../src/agentnexus/model-runtime/deepseek.ts';
import type { BrokerInput } from '../../src/agentnexus/credential-service/contracts.ts';
import type { ContextSource } from '../../src/agentnexus/harness/context.ts';

const base = fileURLToPath(new URL('../../../../../.workflow-kit/runtime/AgentNexus-M1.8.3-Q3/stack-tests/', import.meta.url));
const secret = 'synthetic-test-q3-ui-boundary-canary-0192837465';
async function newRoot() { await mkdir(base, { recursive: true }); return mkdtemp(join(base, 'run-')); }
function input(role: 'DEVELOPMENT' | 'SUBAGENT' | 'BACKGROUND_REVIEWER' = 'DEVELOPMENT', text = 'Synthetic Q3 end-to-end request.'): BrokerInput {
  const subject = { ...hostSubject('q3-harness'), agent_id: role.toLowerCase(), agent_type: role }, hash = sha256(text);
  const source = { event_id: 'q3-source', record_hash: hash, project_id: subject.project_id, task_id: subject.task_id, kind: 'RAW', payload_ref: { sha256: hash, bytes: Buffer.byteLength(text) }, offset: 0, length: Buffer.byteLength(text) } as ContextSource;
  const context = { view_id: 'q3-view', project_id: subject.project_id, task_id: subject.task_id, agent_id: subject.agent_id, text, bytes: Buffer.byteLength(text), sha256: hash, entries: [{ source, text, section: 'TASK_CONTRACT' as const, required: true, range_sha256: hash }], omitted: [] };
  const model = createDeepSeekFlashSpec('2026-11-08T00:00:00Z', '2026-11-15T00:00:00Z'), adapter = new DeepSeekAdapter(), id = randomUUID();
  const request = adapter.build({ request_id: id, model, prompt: text, max_output_tokens: 256, stream: true, json: true, reasoning: 'disabled', tools: [] }); adapter.abandon(id);
  return { subject, context, context_hash: hash, model, request, input_tokens: 0, output_tokens: 256 };
}
async function seeded(root = '') {
  const stack = await openSyntheticRuntimeStack(root || await newRoot());
  if (!(await stack.control.snapshot()).keys.length) await stack.control.invoke('credential.save', { provider_id: 'deepseek', name: 'Q3 Synthetic UI Canary', notes: '', max_concurrency: 1, requests_per_minute: 120, models: ['deepseek-flash'], model_wire_ids: { 'deepseek-flash': 'deepseek-flash' }, secret: Buffer.from(secret) });
  return stack;
}
async function until(action: () => Promise<boolean>) {
  const deadline = Date.now() + 10000;
  while (!await action()) { assert.ok(Date.now() < deadline, 'condition timeout'); await new Promise(r => setTimeout(r, 30)); }
}
async function wire(pipe: string) {
  const socket = net.createConnection(pipe), pending = new Map<string, { resolve: (v: any) => void; reject: (e: any) => void }>();
  await new Promise<void>((res, rej) => { socket.once('connect', res); socket.once('error', rej); });
  let buffer = '';
  socket.on('data', b => {
    buffer += b.toString('utf8');
    for (;;) {
      const end = buffer.indexOf('\n'); if (end < 0) break;
      const value = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1);
      if (value.event === 'delta') { socket.write(JSON.stringify({ id: randomUUID(), method: 'stream.ack', params: { request_id: value.id, seq: value.seq } }) + '\n'); continue; }
      const p = pending.get(value.id); if (!p) continue; pending.delete(value.id);
      if (value.ok) p.resolve(value.value); else p.reject(Object.assign(Error(value.error), { sent: value.sent }));
    }
  });
  socket.on('close', () => { for (const p of pending.values()) p.reject(Error('PIPE_DISCONNECTED')); pending.clear(); });
  return { close: () => socket.destroy(), call(method: string, params: unknown = {}): Promise<any> {
    const id = randomUUID(); return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); socket.write(JSON.stringify({ id, method, params }) + '\n'); });
  } };
}

test('Q3 service-created real Runtime + daily pipe stream all roles with shared ledger', async t => {
  const s = await seeded(); t.after(() => s.close());
  assert.notEqual(s.service_pid, process.pid); assert.notEqual(s.runtime_pid, process.pid); assert.notEqual(s.runtime_pid, s.service_pid);
  assert.equal((await s.daily.snapshot()).daily_gateway?.status, 'AVAILABLE');
  await s.control.invoke('synthetic.scenario', { name: 'stream' });
  for (const role of ['DEVELOPMENT', 'SUBAGENT', 'BACKGROUND_REVIEWER'] as const) {
    const deltas: string[] = [], result = await s.daily.execute(input(role), undefined, async text => { deltas.push(text); });
    assert.equal(result.assurance, 'SIMULATED'); assert.ok(deltas.length > 1); assert.ok(deltas.join('').includes('abcdefgh'));
  }
  const snapshot = await s.daily.snapshot(); assert.equal(snapshot.usage.global.used, 90); assert.equal(snapshot.usage.global.held, 0);
  assert.equal(snapshot.usage.global.owner, 'CREDENTIAL_SERVICE'); assert.equal(JSON.stringify(snapshot).includes(secret), false);
});

test('Q3 actual daily listener denies management, proxy, lifecycle and fabricated native authority', async t => {
  const s = await seeded(); t.after(() => s.close()); const w = await wire(s.pipe); t.after(() => w.close());
  for (const method of ['credential.save', 'credential.read', 'vault.decrypt', 'http.proxy', 'shell.run', 'file.read', 'budget.configure', 'synthetic.daily.authorize', 'session.disconnect', 'runtime.register']) await assert.rejects(w.call(method), /DAILY_METHOD_DENIED/);
  await assert.rejects(w.call('daily.prepare', { input: input(), native_verified: true }), /SCHEMA/);
  assert.equal((await s.daily.snapshot()).usage.global.used, 0);
});

test('Q3 pipe grants cannot replay, change context or transfer to another connection', async t => {
  const s = await seeded(); t.after(() => s.close()); const a = await wire(s.pipe), b = await wire(s.pipe); t.after(() => { a.close(); b.close(); });
  const p = input(), grant = await a.call('daily.prepare', { input: p });
  await assert.rejects(b.call('daily.execute', { input: p, grant }), /UNAUTHENTICATED|BINDING/);
  await assert.rejects(a.call('daily.execute', { input: { ...p, context_hash: '0'.repeat(64) }, grant }), /BINDING/);
  await a.call('daily.execute', { input: p, grant });
  await assert.rejects(a.call('daily.execute', { input: p, grant }), /CONSUMED|REPLAY/);
  assert.equal((await s.daily.snapshot()).usage.global.used, 30);
});

test('Q3 actual service rejects egress, budget shortage and revoked key before send', async t => {
  const s = await seeded(); t.after(() => s.close());
  await assert.rejects(s.daily.execute(input('DEVELOPMENT', 'Read internal file C:\\private\\secrets.txt')), /SENSITIVE/);
  const p = input(); await s.control.invoke('budget.configure', { subject: p.subject, agent_tokens: 1, task_tokens: 1, project_tokens: 1 });
  await assert.rejects(s.daily.execute(p), /BUDGET_EXHAUSTED/);
  assert.equal((await s.daily.snapshot()).usage.global.held, 0);
  const key = (await s.control.snapshot()).keys[0]; await s.control.invoke('credential.state', { key_id: key.key_id, enabled: false });
  await assert.rejects(s.daily.execute(input('SUBAGENT')), /CREDENTIAL|KEY/);
  assert.equal((await s.daily.snapshot()).usage.global.used, 0);
});

test('Q3 Runtime crash closes IPC, retains UNKNOWN and restart does not resend or reset budget', async () => {
  const root = await newRoot(), s = await seeded(root); let recovered: Awaited<ReturnType<typeof seeded>> | undefined;
  try {
    await s.daily.execute(input()); await s.control.invoke('synthetic.scenario', { name: 'timeout' });
    const pending = s.daily.execute(input()); const rejection = assert.rejects(pending, /DISCONNECTED|UNKNOWN/);
    await until(async () => (await s.control.snapshot()).usage.records.some((r: any) => r.state === 'SENT'));
    process.kill(s.runtime_pid); await rejection;
    await until(async () => (await s.control.snapshot()).usage.global.unknown === 1);
    const before = (await s.control.snapshot()).usage.global; assert.ok(before.held > 0); assert.equal(before.used, 30);
    await s.close(); recovered = await seeded(root);
    const after = (await recovered.daily.snapshot()).usage.global; assert.equal(after.held, before.held); assert.equal(after.used, before.used);
    await assert.rejects(recovered.daily.execute(input()), /RECONCILIATION_REQUIRED|CREDENTIAL_REQUIRED/);
  } finally { await recovered?.close(); await s.close(); }
});

test('Q3 Service termination revokes channels and restart preserves sent UNKNOWN', async () => {
  const root = await newRoot(), s = await seeded(root); let recovered: Awaited<ReturnType<typeof seeded>> | undefined;
  try {
    await s.control.invoke('synthetic.scenario', { name: 'timeout' }); const pending = s.daily.execute(input()); const rejection = assert.rejects(pending, /DISCONNECTED/);
    await until(async () => (await s.control.snapshot()).usage.records.some((r: any) => r.state === 'SENT'));
    process.kill(s.service_pid!); await rejection; await s.close();
    recovered = await seeded(root); const snapshot = await recovered.daily.snapshot(); assert.equal(snapshot.usage.global.unknown, 1); assert.ok(snapshot.usage.global.held > 0);
    await assert.rejects(recovered.daily.execute(input()), /RECONCILIATION_REQUIRED|CREDENTIAL_REQUIRED/);
  } finally { await recovered?.close(); await s.close(); }
});
