import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { FeatureRegistry } from '../../src/agentnexus/features.ts';
import { initializeControl } from '../../src/agentnexus/control.ts';
import { NativeState } from '../../src/agentnexus/harness/state.ts';
import { invariant, sha256, uid } from '../../src/agentnexus/types.ts';
import { GitReviewWatcher, ReadonlyGitReader } from '../../src/agentnexus/model-runtime/git-reviewer.ts';
import type { GitBinding, GitEvent, GitReviewResult, ReviewDispatch, ReviewReceipt } from '../../src/agentnexus/model-runtime/git-reviewer.ts';

// Real SQLite/Artifact/Audit ownership with injected immutable Git snapshots.
// No Git command, commit, push, hook, network, account or ACL mutation is performed.
const base = fileURLToPath(new URL('../../../../../.workflow-kit/runtime/AgentNexus-M1.8/tests/git-reviewer/', import.meta.url));
const DIFF = 'diff --git a/code.ts b/code.ts\n--- a/code.ts\n+++ b/code.ts\n@@ -1 +1 @@\n-old\n+new\n';
const source_set = [{ path: 'src/code.ts', sha256: sha256('new') }];
const rules = [{ path: 'AGENTS.md', sha256: sha256('rules') }];
function event(changes: Partial<GitEvent> = {}): GitEvent {
  return { event_id: uid(), kind: 'COMMIT', base: 'a'.repeat(40), head: 'b'.repeat(40),
    author_agent_id: 'author', project_id: 'project', repository_id: 'repo', task_id: 'author-task',
    session_id: 'host-event', candidate_sha256: sha256('candidate'), source_set, rules, ...changes };
}
function openState(store: KernelStore, token: object, boot = uid()): NativeState {
  initializeControl(store);
  const check = (a: unknown) => invariant(a === token, 'ADMIN_CAPABILITY_REQUIRED');
  return new NativeState(store, new FeatureRegistry(store, [], check, { busy: false }), check, boot);
}
async function fixture(t: test.TestContext, create?: (input: ReviewDispatch) => Promise<ReviewReceipt>) {
  await mkdir(base, { recursive: true }); const root = await mkdtemp(join(base, 'case-'));
  const store = await KernelStore.open(root), token = Object.freeze({}), state = openState(store, token);
  const calls: ReviewDispatch[] = [], reads: string[][] = [];
  const watcher = new GitReviewWatcher(state, token, {
    snapshot: async (a, b) => { reads.push([a, b]); return { base: a, head: b, diff: DIFF, diff_sha256: sha256(DIFF) }; },
    createReview: async input => { calls.push(input); return create ? create(input) : { reviewer_agent_id: 'reviewer', reviewer_task_id: 'review-task', notification_id: uid(), read_only: true }; },
  });
  t.after(() => store.close()); return { root, store, token, state, watcher, calls, reads };
}
async function result(f: Awaited<ReturnType<typeof fixture>>, b: GitBinding): Promise<GitReviewResult> {
  const evidence_ref = await f.store.artifacts.putBytes(Buffer.from('independent exact-snapshot review'), { media_type: 'text/plain' });
  return { ...b, reviewer_agent_id: 'reviewer', reviewer_task_id: 'review-task', status: 'PASS', evidence_ref };
}

test('M18-GIT: fixed reader rejects shell/ref/path injection before any spawn', async () => {
  const reader = new ReadonlyGitReader({ executable: fileURLToPath(new URL('./missing-git.exe', import.meta.url)), repository: base });
  for (const invalid of ['HEAD', '--output=secret', 'a'.repeat(39), 'a'.repeat(41), 'a'.repeat(40) + '; push', '../HEAD', 'A'.repeat(40)]) {
    await assert.rejects(reader.snapshot(invalid, 'b'.repeat(40)), { code: 'GIT18_COMMIT' });
  }
  await assert.rejects(reader.snapshot('a'.repeat(40), 'b'.repeat(64)), { code: 'GIT18_COMMIT' });
  assert.throws(() => new ReadonlyGitReader({ executable: 'git', repository: base }), { code: 'GIT18_ABSOLUTE_PATH' });
  assert.throws(() => new ReadonlyGitReader({ executable: base, repository: base, max_bytes: 1048577 }), { code: 'GIT18_LIMIT' });
});

test('M18-GIT: reader actually supplies fixed diff argv, transport denial and a minimal environment', async t => {
  const child = Object.assign(new EventEmitter(), { stdout: new PassThrough(), stderr: new PassThrough(), kill: () => true });
  let launch: any[] = [];
  const mocked = t.mock.method(childProcess, 'spawn', ((...args: any[]) => {
    launch = args; setImmediate(() => { child.stdout.emit('data', Buffer.from(DIFF)); child.emit('close', 0, null); }); return child;
  }) as any); syncBuiltinESMExports();
  try {
    const executable = fileURLToPath(new URL('./trusted-git.exe', import.meta.url));
    const reader = new ReadonlyGitReader({ executable, repository: base });
    const value = await reader.snapshot('a'.repeat(40), 'b'.repeat(40));
    assert.equal(value.diff, DIFF); assert.equal(value.diff_sha256, sha256(DIFF));
    assert.equal(launch[0], executable); assert.equal(launch[2].cwd, base);
    assert.equal(launch[2].shell, false); assert.equal(launch[2].windowsHide, true);
    assert.deepEqual(launch[2].stdio, ['ignore', 'pipe', 'pipe']);
    assert.deepEqual(launch[1].slice(-13), ['diff', '--no-color', '--no-ext-diff', '--no-textconv', '--binary',
      '--full-index', '--no-renames', '--no-relative', '--ignore-submodules=none', '--submodule=short',
      'a'.repeat(40), 'b'.repeat(40), '--']);
    for (const value of ['credential.helper=', 'diff.external=', 'core.fsmonitor=false', 'protocol.allow=never', 'protocol.file.allow=never']) assert.ok(launch[1].includes(value));
    assert.equal(launch[2].env.GIT_TERMINAL_PROMPT, '0'); assert.equal(launch[2].env.GIT_NO_LAZY_FETCH, '1');
    assert.equal(launch[2].env.GIT_CONFIG_NOSYSTEM, '1'); assert.equal(launch[2].env.PATH, '');
    assert.deepEqual(Object.keys(launch[2].env).sort(), ['PATH', 'GIT_CONFIG_NOSYSTEM', 'GIT_CONFIG_GLOBAL', 'GIT_CONFIG_SYSTEM',
      'GIT_CONFIG_COUNT', 'GIT_ATTR_NOSYSTEM', 'GIT_OPTIONAL_LOCKS', 'GIT_TERMINAL_PROMPT', 'GCM_INTERACTIVE',
      'GIT_NO_LAZY_FETCH', 'GIT_PROTOCOL_FROM_USER', ...(process.platform === 'win32' ? ['SystemRoot', 'WINDIR'] : [])].sort());
  } finally { mocked.mock.restore(); syncBuiltinESMExports(); child.stdout.destroy(); child.stderr.destroy(); }
});

test('M18-GIT: combined output cap and timeout terminate the owned reader with stable error codes', async t => {
  for (const mode of ['output', 'timeout', 'error'] as const) {
    let killed = 0;
    const child = Object.assign(new EventEmitter(), { stdout: new PassThrough(), stderr: new PassThrough(),
      kill() { killed++; setImmediate(() => child.emit('close', null, 'SIGTERM')); return true; } });
    const mocked = t.mock.method(childProcess, 'spawn', (() => {
      if (mode === 'output') setImmediate(() => { child.stdout.emit('data', Buffer.alloc(5)); child.stderr.emit('data', Buffer.alloc(4)); });
      if (mode === 'error') setImmediate(() => { child.emit('error', Error('private process details')); child.emit('close', -1, null); });
      return child;
    }) as any); syncBuiltinESMExports();
    try {
      const reader = new ReadonlyGitReader({ executable: base, repository: base, timeout_ms: 10, max_bytes: 8 });
      await assert.rejects(reader.snapshot('a'.repeat(40), 'b'.repeat(40)), { code: mode === 'output' ? 'GIT18_OUTPUT_LIMIT' : mode === 'timeout' ? 'GIT18_TIMEOUT' : 'GIT18_START_FAILED' });
      assert.equal(killed, mode === 'error' ? 0 : 1);
    } finally { mocked.mock.restore(); syncBuiltinESMExports(); child.stdout.destroy(); child.stderr.destroy(); }
  }
});

test('M18-GIT: acknowledged event durably precedes one independent read-only review and notification receipt', async t => {
  let f!: Awaited<ReturnType<typeof fixture>>;
  f = await fixture(t, async input => {
    const row = f.watcher.inspect(f.token, input.idempotency_key);
    assert.equal(row.state, 'CREATING'); assert.equal(row.binding?.diff_sha256, sha256(DIFF));
    assert.equal((await f.store.verify()).pending, 0);
    assert.equal(input.read_only, true); assert.equal(input.role, 'BACKGROUND_REVIEWER');
    assert.equal(input.independent_of_agent_id, 'author'); assert.ok(Object.isFrozen(input.binding.source_set));
    let diff = ''; for await (const chunk of f.store.artifacts.read(input.diff_ref)) diff += Buffer.from(chunk).toString();
    assert.equal(diff, DIFF);
    return { reviewer_agent_id: 'reviewer', reviewer_task_id: 'review-task', notification_id: 'message-1', read_only: true };
  });
  const row = await f.watcher.observe(f.token, event());
  assert.equal(row.state, 'CREATED'); assert.equal(f.calls.length, 1); assert.equal(f.reads.length, 1);
  const phases = f.store.query('audit', { limit: 100 }).map(r => (r.body as any).phase);
  assert.deepEqual(phases.filter(p => p.startsWith('GIT_REVIEW')), ['GIT_REVIEW_OBSERVED', 'GIT_REVIEW_CREATING', 'GIT_REVIEW_CREATED']);
});

test('M18-GIT: duplicate events, concurrent observation and changed replay never duplicate a reviewer', async t => {
  const f = await fixture(t), input = event();
  await Promise.all(Array.from({ length: 8 }, () => f.watcher.observe(f.token, input)));
  const row = await f.watcher.observe(f.token, input);
  assert.equal(row.state, 'CREATED'); assert.equal(f.calls.length, 1);
  await assert.rejects(f.watcher.observe(f.token, { ...input, candidate_sha256: sha256('changed') }), { code: 'GIT18_EVENT_REPLAY_CHANGED' });
  assert.equal(f.calls.length, 1);
});

test('M18-GIT: ordinary Agent/forged JSON has no event, result or Git-reader authority', async t => {
  const f = await fixture(t);
  assert.throws(() => new GitReviewWatcher(f.state, {}, { snapshot: async () => { throw Error('unused'); }, createReview: async () => { throw Error('unused'); } }), { code: 'ADMIN_CAPABILITY_REQUIRED' });
  await assert.rejects(f.watcher.observe({ admin: true }, event()), { code: 'ADMIN_CAPABILITY_REQUIRED' });
  await assert.rejects(f.watcher.observe(f.token, { ...event(), execute: 'git push' } as any), { code: 'GIT18_FIELDS' });
  assert.equal(f.reads.length, 0); assert.equal(f.calls.length, 0);
});

test('M18-GIT: PUSH requires an explicit Host-local event source and performs no push or polling', async t => {
  const f = await fixture(t);
  await assert.rejects(f.watcher.observe(f.token, event({ kind: 'PUSH' })), { code: 'GIT18_PUSH_SOURCE_REQUIRED' });
  const row = await f.watcher.observe(f.token, event({ kind: 'PUSH', push_source: { kind: 'HOST_LOCAL_PUSH_EVENT', event_ref: 'local-push-receipt' } }));
  assert.equal(row.state, 'CREATED'); assert.equal(f.reads.length, 1); assert.equal(f.calls.length, 1);
});

test('M18-GIT: forged snapshot hash cannot create a task; explicitly pending work can continue once', async t => {
  const f = await fixture(t); let valid = false, creations = 0;
  const watcher = new GitReviewWatcher(f.state, f.token, {
    snapshot: async (a, b) => ({ base: a, head: b, diff: DIFF, diff_sha256: valid ? sha256(DIFF) : sha256('forged') }),
    createReview: async () => { creations++; return { reviewer_agent_id: 'reviewer', reviewer_task_id: 'review-task', notification_id: uid(), read_only: true }; },
  });
  const input = event(); await assert.rejects(watcher.observe(f.token, input), { code: 'GIT18_SNAPSHOT_BINDING' });
  const id = sha256(JSON.stringify({ event_id: input.event_id, project_id: input.project_id }));
  assert.equal(watcher.inspect(f.token, id).state, 'PENDING'); assert.equal(creations, 0);
  valid = true; await watcher.dispatchPending(f.token, id); assert.equal(creations, 1);
  await assert.rejects(watcher.dispatchPending(f.token, id), { code: 'GIT18_NOT_PENDING' });
});

test('M18-GIT: an uncertain creator is durable UNKNOWN and repeated events never automatically retry', async t => {
  const f = await fixture(t, async () => { throw Error('possibly created task before transport failed'); }), input = event();
  const row = await f.watcher.observe(f.token, input); assert.equal(row.state, 'UNKNOWN');
  assert.equal((await f.watcher.observe(f.token, input)).state, 'UNKNOWN'); assert.equal(f.calls.length, 1);
  await assert.rejects(f.watcher.dispatchPending(f.token, row.id), { code: 'GIT18_NOT_PENDING' });
});

test('M18-GIT: creator cannot bind the author, author task or a writable reviewer', async t => {
  for (const receipt of [
    { reviewer_agent_id: 'author', reviewer_task_id: 'review-task', notification_id: 'message', read_only: true },
    { reviewer_agent_id: 'reviewer', reviewer_task_id: 'author-task', notification_id: 'message', read_only: true },
    { reviewer_agent_id: 'reviewer', reviewer_task_id: 'review-task', notification_id: 'message', read_only: false },
  ]) {
    const f = await fixture(t, async () => receipt as ReviewReceipt);
    assert.equal((await f.watcher.observe(f.token, event())).state, 'UNKNOWN');
  }
});

test('M18-GIT: exact result binds commit/diff/candidate/source/rules/reviewer and remains only Gate evidence', async t => {
  const f = await fixture(t), row = await f.watcher.observe(f.token, event()), original = await result(f, row.binding!);
  for (const change of [{ head: 'c'.repeat(40) }, { base: 'd'.repeat(40) }, { diff_sha256: sha256('other') },
    { candidate_sha256: sha256('other') }, { source_set: [{ path: 'other', sha256: sha256('other') }] },
    { rules: [{ path: 'AGENTS.md', sha256: sha256('changed rule') }] }, { repository_id: 'foreign' }]) {
    await assert.rejects(f.watcher.acceptResult(f.token, row.id, { ...original, ...change }), { code: 'GIT18_RESULT_BINDING' });
  }
  await assert.rejects(f.watcher.acceptResult(f.token, row.id, { ...original, reviewer_agent_id: 'forged' }), { code: 'GIT18_RESULT_REVIEWER' });
  await assert.rejects(f.watcher.acceptResult({}, row.id, original), { code: 'ADMIN_CAPABILITY_REQUIRED' });
  assert.equal((await f.watcher.acceptResult(f.token, row.id, original)).state, 'ACCEPTED');
  assert.equal(f.watcher.readForGate(f.token, row.id, row.binding!).status, 'PASS');
  assert.throws(() => f.watcher.readForGate(f.token, row.id, { ...row.binding!, candidate_sha256: sha256('new') }), { code: 'GIT18_GATE_BINDING' });
  assert.throws(() => f.watcher.readForGate({}, row.id, row.binding!), { code: 'ADMIN_CAPABILITY_REQUIRED' });
  const records = f.store.query('audit', { limit: 100 }).filter(r => (r.body as any).phase === 'GIT_REVIEW_RESULT_ACCEPTED');
  assert.equal(records.length, 1); assert.equal((records[0].body as any).detail.gate_authority, false);
});

test('M18-GIT: changing a commit invalidates old review acceptance while other repositories remain current', async t => {
  const f = await fixture(t), old = await f.watcher.observe(f.token, event()), original = await result(f, old.binding!);
  await f.watcher.acceptResult(f.token, old.id, original);
  await f.watcher.observe(f.token, event({ repository_id: 'other-repo', head: 'c'.repeat(40) }));
  assert.equal(f.watcher.inspect(f.token, old.id).state, 'ACCEPTED');
  const fresh = await f.watcher.observe(f.token, event({ head: 'd'.repeat(40) }));
  assert.equal(fresh.state, 'CREATED'); assert.equal(f.watcher.inspect(f.token, old.id).state, 'STALE');
  assert.throws(() => f.watcher.readForGate(f.token, old.id, old.binding!), { code: 'GIT18_GATE_BINDING' });
});

test('M18-GIT: an accepted projection without an acknowledged audit barrier cannot supply Gate evidence', async t => {
  const f = await fixture(t), row = await f.watcher.observe(f.token, event()), value = await result(f, row.binding!);
  const flush = f.store.flush.bind(f.store);
  f.store.flush = async () => { throw Error('synthetic accepted-result audit failure'); };
  try {
    await assert.rejects(f.watcher.acceptResult(f.token, row.id, value));
    assert.equal(f.watcher.inspect(f.token, row.id).state, 'ACCEPTED');
    assert.throws(() => f.watcher.readForGate(f.token, row.id, row.binding!), { code: 'GIT18_STATE_UNAVAILABLE' });
  } finally { f.store.flush = flush; }
});

test('M18-GIT: a commit change while a creator is pending cannot revive the stale review', async t => {
  let finish!: (r: ReviewReceipt) => void, entered!: () => void;
  const started = new Promise<void>(r => { entered = r; });
  const f = await fixture(t, async input => input.event.head === 'b'.repeat(40)
    ? (entered(), new Promise<ReviewReceipt>(r => { finish = r; }))
    : { reviewer_agent_id: 'reviewer', reviewer_task_id: 'review-task', notification_id: uid(), read_only: true });
  const first = f.watcher.observe(f.token, event()); await started;
  await f.watcher.observe(f.token, event({ head: 'c'.repeat(40) }));
  finish({ reviewer_agent_id: 'reviewer', reviewer_task_id: 'review-task', notification_id: uid(), read_only: true });
  const stale = await first; assert.equal(stale.state, 'STALE'); assert.equal(stale.creation_state, 'CREATED');
  await assert.rejects(f.watcher.acceptResult(f.token, stale.id, await result(f, stale.binding!)), { code: 'GIT18_RESULT_STATE' });
});

test('M18-GIT: actual store reopen quarantines CREATING without invoking either callback again', async t => {
  const f = await fixture(t); let entered!: () => void;
  const started = new Promise<void>(r => { entered = r; }); let creations = 0;
  const options = { snapshot: async (a: string, b: string) => ({ base: a, head: b, diff: DIFF, diff_sha256: sha256(DIFF) }),
    createReview: async (): Promise<ReviewReceipt> => { creations++; entered(); return new Promise(() => {}); } };
  const watcher = new GitReviewWatcher(f.state, f.token, options), input = event(); void watcher.observe(f.token, input); await started;
  await f.store.close(); const reopened = await KernelStore.open(f.root); t.after(() => reopened.close());
  const restored = new GitReviewWatcher(openState(reopened, f.token), f.token, options);
  assert.equal(await restored.recover(f.token), 1);
  const row = await restored.observe(f.token, input); assert.equal(row.state, 'UNKNOWN'); assert.equal(creations, 1);
  await assert.rejects(restored.dispatchPending(f.token, row.id), { code: 'GIT18_NOT_PENDING' });
  assert.equal(await restored.recover(f.token), 0);
});

test('M18-GIT: failed durable creation barrier invokes no callback and preserves the claim', async t => {
  const f = await fixture(t), flush = f.store.flush.bind(f.store); let calls = 0;
  f.store.flush = async () => { calls++; if (calls === 2) throw Error('synthetic durable barrier failure'); await flush(); };
  try { await assert.rejects(f.watcher.observe(f.token, event())); assert.equal(f.calls.length, 0);
    assert.equal(f.state.list<any>('m18_git_review', { limit: 100 })[0].state, 'CREATING'); }
  finally { f.store.flush = flush; }
});

test('M18-GIT: retained event capacity is 128 including stale and uncertain work', async t => {
  const f = await fixture(t);
  for (let i = 0; i < 128; i++) await f.watcher.observe(f.token, event({ event_id: 'bounded-' + i }));
  await assert.rejects(f.watcher.observe(f.token, event({ event_id: 'overflow' })), { code: 'GIT18_EVENT_CAPACITY' });
  assert.equal(f.calls.length, 128); assert.equal(f.state.count('m18_git_review'), 128);
});
