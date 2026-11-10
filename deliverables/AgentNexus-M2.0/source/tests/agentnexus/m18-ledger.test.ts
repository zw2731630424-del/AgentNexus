import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { initializeControl } from '../../src/agentnexus/control.ts';
import { FeatureRegistry } from '../../src/agentnexus/features.ts';
import { NativeState } from '../../src/agentnexus/harness/state.ts';
import { ModelUsageLedger,modelTaskBudgetId } from '../../src/agentnexus/model-runtime/ledger.ts';
import type { UsageAssurance, UsageReserveInput, UsageScope } from '../../src/agentnexus/model-runtime/ledger.ts';
import type { Subject } from '../../src/agentnexus/harness/contracts.ts';
import { invariant, sha256, uid } from '../../src/agentnexus/types.ts';

const S: Subject = { agent_id: 'lead', project_id: 'p', task_id: 'work', session_id: 'session', runtime_instance_id: 'runtime',
  agent_type: 'DEVELOPMENT', model_binding: 'main', resource_budget_id: 'worker', policy_scope: 'p' };
const scopes = (s = S): [UsageScope, string][] => [['AGENT', s.agent_id], ['TASK', modelTaskBudgetId(s)], ['PROJECT', s.project_id], ['PLATFORM', 'platform']];
const input = (request_id: string, extra: Partial<UsageReserveInput> = {}): UsageReserveInput => ({ request_id,
  input_tokens: 20, output_tokens: 40, cost_micros: 60, assurance: 'REAL', context_hash: sha256('original context'),
  provider_id: 'provider', model_id: 'model', ...extra });
function bind(store: KernelStore, admin: object) {
  initializeControl(store); const check = (candidate: unknown) => invariant(candidate === admin, 'ADMIN_CAPABILITY_REQUIRED');
  const features = new FeatureRegistry(store, [], check, { busy: false });
  const state = new NativeState(store, features, check, uid()); return { state, ledger: new ModelUsageLedger(state, admin) };
}
async function fixture(t: test.TestContext) {
  const base = process.env.AGENTNEXUS_TEST_DATA_ROOT ?? fileURLToPath(new URL('../../../../../.workflow-kit/runtime/AgentNexus-M1.8/ledger-unit', import.meta.url));
  await mkdir(base, { recursive: true }); const root = await mkdtemp(join(base, 'case-')), admin = Object.freeze({});
  const f = { root, admin, store: await KernelStore.open(root), state: null as unknown as NativeState, ledger: null as unknown as ModelUsageLedger };
  Object.assign(f, bind(f.store, admin)); t.after(() => f.store.close()); return f;
}
async function configure(f: Awaited<ReturnType<typeof fixture>>, kind: UsageAssurance = 'REAL', owner = S,
  limits = { tokens: 100, requests: 3, cost_micros: 100 }) {
  for (const [scope, id] of scopes(owner)) await f.ledger.configure(f.admin, { scope, id, assurance: kind, ...limits });
}
function every(f: Awaited<ReturnType<typeof fixture>>, assertion: (value: ReturnType<ModelUsageLedger['totals']>) => void, kind: UsageAssurance = 'REAL', s = S) {
  for (const [scope, id] of scopes(s)) assertion(f.ledger.totals(f.admin, scope, id, kind));
}
const receipt = { input_tokens: 10, output_tokens: 20, reasoning_tokens: 12, cost_micros: 30,
  usage_source: 'PROVIDER' as const, elapsed_ms: 12, provider_request_id: 'response-1', retries: 0 };

test('M18 LEDGER composite Task budget identities cannot alias through colon-containing IDs',()=>{
  assert.notEqual(modelTaskBudgetId({project_id:'a:b',task_id:'c'}),modelTaskBudgetId({project_id:'a',task_id:'b:c'}));
});

test('M18 LEDGER real SQLite four-level admission is atomic under competing reservations', async t => {
  const f = await fixture(t); await configure(f);
  const results = await Promise.allSettled([f.ledger.reserve(f.admin, S, input('one')), f.ledger.reserve(f.admin, S, input('two'))]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter(r => r.status === 'rejected').length, 1); assert.equal(f.state.count('MODEL18_USAGE'), 1);
  every(f, row => { assert.deepEqual(row.held, { tokens: 60, requests: 1, cost_micros: 60 }); assert.deepEqual(row.used, { tokens: 0, requests: 0, cost_micros: 0 }); });
  await f.store.verify();
});

test('M18 LEDGER each independently exhausted scope rejects without partial holds', async t => {
  for (const [blockedScope, blockedId] of scopes()) {
    const f = await fixture(t); await configure(f);
    await f.ledger.configure(f.admin, { scope: blockedScope, id: blockedId, assurance: 'REAL', tokens: 59, requests: 3, cost_micros: 100 });
    await assert.rejects(f.ledger.reserve(f.admin, S, input('denied')), /MODEL18_LEDGER_BUDGET_EXHAUSTED/);
    every(f, row => assert.deepEqual(row.held, { tokens: 0, requests: 0, cost_micros: 0 })); assert.equal(f.state.count('MODEL18_USAGE'), 0);
  }
});

test('M18 LEDGER sibling agents share project allowance and separate projects share platform allowance', async t => {
  const f = await fixture(t), sibling = { ...S, agent_id: 'sibling', task_id: 'sibling-work', runtime_instance_id: 'sibling-runtime' },
    foreign = { ...S, agent_id: 'foreign', project_id: 'q', task_id: 'foreign-work', runtime_instance_id: 'foreign-runtime', policy_scope: 'q' };
  for (const owner of [S, sibling, foreign]) await configure(f, 'REAL', owner);
  await f.ledger.reserve(f.admin, S, input('parent'));
  await assert.rejects(f.ledger.reserve(f.admin, sibling, input('sibling')), /MODEL18_LEDGER_BUDGET_EXHAUSTED/);
  assert.equal(f.ledger.totals(f.admin, 'AGENT', sibling.agent_id, 'REAL').held.tokens, 0);
  assert.equal(f.ledger.totals(f.admin, 'TASK', modelTaskBudgetId(sibling), 'REAL').held.tokens, 0);
  await assert.rejects(f.ledger.reserve(f.admin, foreign, input('foreign')), /MODEL18_LEDGER_BUDGET_EXHAUSTED/);
  assert.equal(f.ledger.totals(f.admin, 'PROJECT', 'q', 'REAL').held.tokens, 0);
  await f.ledger.notSent(f.admin, S, 'parent', 'PROVEN_NOT_SENT'); await f.ledger.reserve(f.admin, sibling, input('sibling'));
  await f.ledger.notSent(f.admin, sibling, 'sibling', 'PROVEN_NOT_SENT'); await f.ledger.reserve(f.admin, foreign, input('foreign'));
  assert.equal(f.ledger.totals(f.admin, 'PROJECT', 'p', 'REAL').held.tokens, 0);
  assert.equal(f.ledger.totals(f.admin, 'PROJECT', 'q', 'REAL').held.tokens, 60);
  assert.equal(f.ledger.totals(f.admin, 'PLATFORM', 'platform', 'REAL').held.tokens, 60); await f.store.verify();
});

test('M18 LEDGER a missing level, forged admin, injected fields and static reason violations fail before mutation', async t => {
  const f = await fixture(t);
  for (const [scope, id] of scopes().slice(0, 3)) await f.ledger.configure(f.admin, { scope, id, assurance: 'REAL', tokens: 100, requests: 3, cost_micros: 100 });
  await assert.rejects(f.ledger.reserve(f.admin, S, input('missing')), /MODEL18_LEDGER_BUDGET_REQUIRED/);
  for (const [scope, id] of scopes().slice(0, 3)) assert.equal(f.ledger.totals(f.admin, scope, id, 'REAL').held.tokens, 0);
  await assert.rejects(f.ledger.reserve({}, S, input('forged')), /ADMIN_CAPABILITY_REQUIRED/);
  assert.throws(() => new ModelUsageLedger(f.state, {}), /ADMIN_CAPABILITY_REQUIRED/);
  await configure(f); await assert.rejects(f.ledger.reserve(f.admin, S, { ...input('injected'), secret: 'MUST_NEVER_ARCHIVE' } as UsageReserveInput), /MODEL18_LEDGER_SCHEMA/);
  await assert.rejects(f.ledger.reserve(f.admin, { ...S, secret: 'MUST_NEVER_ARCHIVE' } as Subject, input('subject')), /MODEL18_LEDGER_SCHEMA/);
  await f.ledger.reserve(f.admin, S, input('safe'));
  for (const reason of ['raw error with credentials', 'SECRET_SHAPED_UNKNOWN_CODE', 'X'.repeat(97)]) await assert.rejects(f.ledger.unknown(f.admin, S, 'safe', reason), /MODEL18_LEDGER_REASON/);
  assert.equal(f.ledger.inspect(f.admin, 'safe').state, 'RESERVED');
  assert.equal(JSON.stringify(f.store.query('audit', { limit: 100 })).includes('MUST_NEVER_ARCHIVE'), false);
});

test('M18 LEDGER request idempotency binds the complete subject, context, model, assurance and estimates', async t => {
  const f = await fixture(t); await configure(f);
  const p = input('stable'); assert.equal(await f.ledger.reserve(f.admin, S, p), 'stable');
  assert.equal(await f.ledger.reserve(f.admin, S, { ...p, requests: 1 }), 'stable');
  for (const changed of [{ context_hash: sha256('other') }, { provider_id: 'other' }, { model_id: 'other' }, { assurance: 'SIMULATED' as const }, { requests: 2 }, { cost_micros: 61 }])
    await assert.rejects(f.ledger.reserve(f.admin, S, { ...p, ...changed }), /MODEL18_LEDGER_REQUEST_CONFLICT/);
  await assert.rejects(f.ledger.reserve(f.admin, { ...S, session_id: 'replacement' }, p), /MODEL18_LEDGER_REQUEST_CONFLICT/);
  await assert.rejects(f.ledger.markSent(f.admin, { ...S, project_id: 'foreign' }, 'stable', { key_handle_id: 'opaque-1' }), /MODEL18_LEDGER_SUBJECT/);
  assert.equal(f.state.count('MODEL18_USAGE'), 1); every(f, row => assert.equal(row.held.tokens, 60));
});

test('M18 LEDGER proven-not-sent releases once; durable SENT and UNKNOWN cannot be replayed or released', async t => {
  const f = await fixture(t); await configure(f);
  await f.ledger.reserve(f.admin, S, input('not-sent')); await f.ledger.notSent(f.admin, S, 'not-sent', 'PROVEN_NOT_SENT');
  await f.ledger.notSent(f.admin, S, 'not-sent', 'PROVEN_NOT_SENT'); every(f, row => assert.equal(row.held.tokens, 0));
  await f.ledger.reserve(f.admin, S, input('sent')); await f.ledger.markSent(f.admin, S, 'sent', { key_handle_id: 'opaque-1' });
  assert.ok(f.store.db.prepare("SELECT 1 FROM anx_records r JOIN anx_exports e USING(seq) WHERE r.operation_id='sent' AND json_extract(r.body,'$.phase')='MODEL18_USAGE_SENT'").get());
  await f.ledger.markSent(f.admin, S, 'sent', { key_handle_id: 'opaque-1' });
  await assert.rejects(f.ledger.markSent(f.admin, S, 'sent', { key_handle_id: 'opaque-2' }), /MODEL18_LEDGER_REQUEST_CONFLICT/);
  await assert.rejects(f.ledger.notSent(f.admin, S, 'sent', 'KNOWN_NOT_SENT'), /MODEL18_LEDGER_ALREADY_SENT/);
  await f.ledger.unknown(f.admin, S, 'sent', 'TRANSPORT_UNKNOWN');
  await assert.rejects(f.ledger.markSent(f.admin, S, 'sent', { key_handle_id: 'opaque-1' }), /MODEL18_LEDGER_STATE/);
  await assert.rejects(f.ledger.notSent(f.admin, S, 'sent', 'PROVEN_NOT_SENT'), /MODEL18_LEDGER_ALREADY_SENT/);
  every(f, row => assert.equal(row.held.tokens, 60));
});

test('M18 LEDGER provider actual usage settles all scopes once and reasoning remains inside output tokens', async t => {
  const f = await fixture(t); await configure(f);
  await f.ledger.reserve(f.admin, S, input('actual', { requests: 3 })); await f.ledger.markSent(f.admin, S, 'actual', { key_handle_id: 'opaque-1' });
  const settled = await f.ledger.settle(f.admin, S, 'actual', { ...receipt, requests: 2, retries: 1 });
  assert.equal(settled.state, 'SETTLED'); assert.equal(settled.usage?.estimated, false);
  await f.ledger.settle(f.admin, S, 'actual', { ...receipt, requests: 2, retries: 1 });
  every(f, row => { assert.deepEqual(row.used, { tokens: 30, requests: 2, cost_micros: 30 }); assert.deepEqual(row.held, { tokens: 0, requests: 0, cost_micros: 0 }); });
  await assert.rejects(f.ledger.settle(f.admin, S, 'actual', { ...receipt, output_tokens: 21, requests: 2, retries: 1 }), /MODEL18_LEDGER_USAGE_CONFLICT/);
  await assert.rejects(f.ledger.configure(f.admin, { scope: 'AGENT', id: S.agent_id, assurance: 'REAL', tokens: 29, requests: 3, cost_micros: 100 }), /MODEL18_LEDGER_BUDGET_BELOW_COMMITTED/);
});

test('M18 LEDGER REAL and SIMULATED limits and receipts are isolated, including HTTP rejection estimates', async t => {
  const f = await fixture(t); await configure(f); await configure(f, 'SIMULATED');
  await f.ledger.reserve(f.admin, S, input('real')); await f.ledger.reserve(f.admin, S, input('sim', { assurance: 'SIMULATED' }));
  await f.ledger.markSent(f.admin, S, 'real', { key_handle_id: 'opaque-real' }); await f.ledger.markSent(f.admin, S, 'sim', { key_handle_id: 'opaque-sim' });
  await assert.rejects(f.ledger.settle(f.admin, S, 'real', { ...receipt, usage_source: 'SIMULATED' }), /MODEL18_LEDGER_USAGE_SOURCE/);
  await assert.rejects(f.ledger.settle(f.admin, S, 'sim', receipt), /MODEL18_LEDGER_USAGE_SOURCE/);
  await f.ledger.settle(f.admin, S, 'sim', { ...receipt, usage_source: 'SIMULATED' });
  every(f, row => assert.equal(row.used.tokens, 30), 'SIMULATED'); every(f, row => assert.equal(row.used.tokens, 0));
  const estimate = await f.ledger.settle(f.admin, S, 'real', { ...receipt, input_tokens: 0, output_tokens: 0, reasoning_tokens: null, cost_micros: 0, usage_source: 'ESTIMATED' });
  assert.equal(estimate.state, 'UNKNOWN'); assert.equal(estimate.usage?.estimated, true); assert.equal(estimate.usage?.usage_source, 'ESTIMATED');
  every(f, row => { assert.equal(row.used.tokens, 0); assert.equal(row.used.cost_micros, 0); assert.equal(row.used.requests, 1); assert.equal(row.held.tokens, 60); assert.equal(row.held.cost_micros, 60); });
});

test('M18 LEDGER estimated tokens and fees remain separate from actual usage and retain uncertain allowance', async t => {
  const f = await fixture(t); await configure(f); await f.ledger.reserve(f.admin, S, input('estimated'));
  await f.ledger.markSent(f.admin, S, 'estimated', { key_handle_id: 'opaque-1' }); await f.ledger.settle(f.admin, S, 'estimated', { ...receipt, usage_source: 'ESTIMATED' });
  every(f, row => { assert.equal(row.used.tokens, 0); assert.equal(row.used.cost_micros, 0); assert.equal(row.estimated.tokens, 30); assert.equal(row.estimated.cost_micros, 30); assert.equal(row.held.tokens, 60); });
});

test('M18 LEDGER actual overshoot is retained as UNKNOWN with all observed usage and no accounting rollback', async t => {
  const f = await fixture(t); await configure(f, 'REAL', S, { tokens: 200, requests: 3, cost_micros: 200 });
  await f.ledger.reserve(f.admin, S, input('overrun')); await f.ledger.markSent(f.admin, S, 'overrun', { key_handle_id: 'opaque-1' });
  const actual = { ...receipt, input_tokens: 30, output_tokens: 50, cost_micros: 90 };
  const row = await f.ledger.settle(f.admin, S, 'overrun', actual); assert.equal(row.state, 'UNKNOWN');
  assert.equal(row.usage?.input_tokens, 30); assert.equal(row.usage?.output_tokens, 50); assert.deepEqual(row.overrun, { tokens: 20, requests: 0, cost_micros: 30 });
  await f.ledger.settle(f.admin, S, 'overrun', actual);
  every(f, total => { assert.equal(total.used.tokens, 80); assert.equal(total.used.cost_micros, 90); assert.equal(total.held.tokens, 60); assert.equal(total.overdrawn, true); });
  await configure(f, 'REAL', S, {tokens:200,requests:3,cost_micros:200});
  every(f,total=>assert.equal(total.overdrawn,true));
  await assert.rejects(f.ledger.reserve(f.admin, S, input('blocked', { input_tokens: 0, output_tokens: 0, cost_micros: 0 })), /MODEL18_LEDGER_BUDGET_EXHAUSTED/);
  await assert.rejects(f.ledger.configure(f.admin, { scope: 'PROJECT', id: S.project_id, assurance: 'REAL', tokens: 139, requests: 3, cost_micros: 200 }), /MODEL18_LEDGER_BUDGET_BELOW_COMMITTED/);
});

test('M18 LEDGER invalid reasoning, attempt counts, numeric overflow and non-provider real usage never settle', async t => {
  const f = await fixture(t); await configure(f); await f.ledger.reserve(f.admin, S, input('bounds'));
  await f.ledger.markSent(f.admin, S, 'bounds', { key_handle_id: 'opaque-1' });
  for (const change of [{ reasoning_tokens: 21 }, { requests: 2 }, { input_tokens: -1 }, { cost_micros: Number.MAX_SAFE_INTEGER + 1 }])
    await assert.rejects(f.ledger.settle(f.admin, S, 'bounds', { ...receipt, ...change }), /MODEL18_LEDGER_/);
  await assert.rejects(f.ledger.reserve(f.admin, S, input('sum', { input_tokens: Number.MAX_SAFE_INTEGER, output_tokens: 1 })), /MODEL18_LEDGER_AMOUNT/);
  assert.equal(f.ledger.inspect(f.admin, 'bounds').state, 'SENT'); every(f, row => assert.equal(row.held.tokens, 60));
});

test('M18 LEDGER SQLite close/reopen recovery quarantines every unresolved request without calls or released holds', async t => {
  const f = await fixture(t); await configure(f, 'REAL', S, { tokens: 300, requests: 4, cost_micros: 300 });
  for (const id of ['reserved', 'sent', 'done']) await f.ledger.reserve(f.admin, S, input(id));
  await f.ledger.markSent(f.admin, S, 'sent', { key_handle_id: 'opaque-1' }); await f.ledger.markSent(f.admin, S, 'done', { key_handle_id: 'opaque-1' });
  await f.ledger.settle(f.admin, S, 'done', receipt); const before = f.ledger.totals(f.admin, 'PLATFORM', 'platform', 'REAL');
  await f.store.close(); f.store = await KernelStore.open(f.root); Object.assign(f, bind(f.store, f.admin));
  assert.equal(await f.ledger.recover(f.admin), 2); assert.equal(await f.ledger.recover(f.admin), 0);
  for (const id of ['reserved', 'sent']) assert.equal(f.ledger.inspect(f.admin, id).state, 'UNKNOWN'); assert.equal(f.ledger.inspect(f.admin, 'done').state, 'SETTLED');
  const after = f.ledger.totals(f.admin, 'PLATFORM', 'platform', 'REAL'); assert.deepEqual(after.used, before.used); assert.deepEqual(after.held, before.held);
  await assert.rejects(f.ledger.notSent(f.admin, S, 'reserved', 'PROVEN_NOT_SENT'), /MODEL18_LEDGER_ALREADY_SENT/);
  await f.store.verify();
});

test('M18 LEDGER failed durable reservation ACK performs zero send transitions and keeps all committed holds', async t => {
  const f = await fixture(t); await configure(f); const flush = f.store.flush.bind(f.store); let sendTransitions = 0;
  f.store.flush = async () => { throw Error('INJECTED_ACK_FAILURE'); };
  try { await assert.rejects((async () => { await f.ledger.reserve(f.admin, S, input('ack-loss')); sendTransitions++; await f.ledger.markSent(f.admin, S, 'ack-loss', { key_handle_id: 'opaque-1' }); })()); }
  finally { f.store.flush = flush; }
  assert.equal(sendTransitions, 0); assert.equal(f.state.faulted, true); assert.equal(f.ledger.inspect(f.admin, 'ack-loss').state, 'RESERVED');
  every(f, row => assert.equal(row.held.tokens, 60)); await flush();
});
