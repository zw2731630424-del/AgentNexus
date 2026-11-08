import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openHarness } from '../../src/agentnexus/harness/index.ts';
import type { HarnessOptions } from '../../src/agentnexus/harness/index.ts';
import type { ModelReply } from '../../src/agentnexus/harness/models.ts';
import type { NativeGateInput } from '../../src/agentnexus/harness/gates.ts';
import { GitReviewWatcher } from '../../src/agentnexus/model-runtime/git-reviewer.ts';
import type { GitEvent, GitReviewRecord, ReviewDispatch } from '../../src/agentnexus/model-runtime/git-reviewer.ts';
import { createNativeGitG4Checker, createNativeGitReviewBridge } from '../../src/agentnexus/model-runtime/review-bridge.ts';
import { canonical, sha256 } from '../../src/agentnexus/types.ts';

// Git events/snapshots and model semantics are SIMULATED. Harness, SQLite, Artifact, MessageBus, events and Gates are real local execution.
// No Git command, commit, push, hook, network, existing account, ACL or AppContainer is changed.
const DIFF = 'diff --git a/code.ts b/code.ts\n--- a/code.ts\n+++ b/code.ts\n@@ -1 +1 @@\n-export const answer = 0;\n+export const answer = 1;\n';
const CODE = 'export const answer = 1;\n', RULE = 'Review immutable inputs; models do not authorize tools or Gates.';
const LIMITS = { workers: 4, memory_bytes: 268435456, model_tokens: 1000000, model_requests: 1000, model_cost_micros: 10000000, wall_ms: 3000000 };
type H = Awaited<ReturnType<typeof openHarness>>;
async function fixture(t: test.TestContext, reply: ModelReply = { kind: 'WAIT', text: '{"status":"PASS","note":"Model report only"}' }, eventLoop = true) {
  const base = process.env.AGENTNEXUS_TEST_DATA_ROOT ?? fileURLToPath(new URL('../../../../../.workflow-kit/runtime/AgentNexus-M1.8/review-bridge', import.meta.url));
  await mkdir(base, { recursive: true }); const root = await mkdtemp(join(base, 'case-')); let admin: unknown;
  const options: HarnessOptions = { platform_limits: LIMITS, ...(eventLoop ? { eventLoop: {} } : {}),
    mocks: { 'mock-main': Array.from({ length: 8 }, () => ({ reply })) },
    // Capture a trusted bootstrap token for Watcher administration; the test port never handles a model request.
    modelRuntimeFactory: host => { admin = host.admin; return { handles: () => false, bind: () => ({ complete: async () => { throw Error('UNUSED_TEST_PORT'); } }), recover: async () => {} }; } };
  const f = { root, options, h: await openHarness(root, options), admin: () => admin };
  await f.h.administration.createProject({ id: 'project', rules: [RULE], budget: LIMITS });
  await f.h.administration.createAgent({ id: 'author', task_id: 'author-task', project_id: 'project', type: 'DEVELOPMENT', budget: { ...LIMITS, workers: 1 } });
  await f.h.administration.createTask({ id: 'author-task', agent_id: 'author', goal: 'Implement and review one immutable source candidate.', wall_ms: 300000 });
  const candidate = await f.h.store.artifacts.putBytesQueued(Buffer.from(CODE), { media_type: 'text/plain' });
  const e: GitEvent = { event_id: 'commit-one', kind: 'COMMIT', base: 'a'.repeat(40), head: 'b'.repeat(40),
    project_id: 'project', repository_id: 'repository', author_agent_id: 'author', task_id: 'author-task',
    session_id: f.h.inspectAgent('author').subject.session_id, candidate_sha256: candidate.sha256,
    source_set: [{ path: 'src/code.ts', sha256: candidate.sha256 }], rules: [{ path: 'AGENTS.md', sha256: sha256(RULE) }] };
  t.after(() => f.h.close()); return { f, e, candidate };
}
function watcher(f: { h: H; admin: () => unknown }) {
  return new GitReviewWatcher(f.h.state, f.admin(), { snapshot: async (base, head) => ({ base, head, diff: DIFF, diff_sha256: sha256(DIFF) }),
    createReview: createNativeGitReviewBridge(f.h, { author_agent_id: 'author' }) });
}
async function dispatch(h: H, e: GitEvent): Promise<ReviewDispatch> {
  const diff_ref = await h.store.artifacts.putBytesQueued(Buffer.from(DIFF), { media_type: 'text/x-diff' });
  return { idempotency_key: sha256(canonical({ project_id: e.project_id, event_id: e.event_id })), event: e,
    binding: { project_id: e.project_id, repository_id: e.repository_id, base: e.base, head: e.head, diff_sha256: diff_ref.sha256,
      candidate_sha256: e.candidate_sha256, source_set: e.source_set, rules: e.rules }, diff_ref, role: 'BACKGROUND_REVIEWER', read_only: true, independent_of_agent_id: e.author_agent_id };
}

test('M18 REVIEW BRIDGE SIMULATED_GIT_REAL_HARNESS creates an independent read-only Reviewer and delivers exact immutable inputs', async t => {
  const { f, e } = await fixture(t), w = watcher(f), row = await w.observe(f.admin(), e); assert.equal(row.state, 'CREATED');
  await f.h.administration.idleEvents(); const receipt = row.receipt!, agent = f.h.inspectAgent(receipt.reviewer_agent_id), task = f.h.inspectTask(receipt.reviewer_task_id);
  assert.equal(agent.subject.agent_type, 'BACKGROUND_REVIEWER'); assert.notEqual(agent.id, 'author'); assert.notEqual(agent.subject.runtime_instance_id, f.h.inspectAgent('author').subject.runtime_instance_id);
  assert.deepEqual(agent.tools, []); assert.deepEqual(agent.file_scope, []); assert.equal(agent.work_role, 'REVIEWER'); assert.deepEqual(agent.read_tasks, ['author-task']);
  assert.equal(task.state, 'WAITING'); assert.equal(task.turns, 1); assert.deepEqual(task.received_message_ids, [receipt.notification_id]);
  assert.deepEqual(task.review_binding, { commit: e.head, diff_sha256: sha256(DIFF), candidate_sha256: e.candidate_sha256, author_agent_id: 'author' });
  const view = f.h.state.list<{ view_id: string }>('CONTEXT_VIEW', { task_id: task.id, limit: 1 })[0]!;
  const actual = await f.h.context.reconstruct(agent.subject, view.view_id); const diff = actual.context.entries.find(entry => entry.binding?.reference === 'git-diff:repository');
  assert.equal(diff?.text, DIFF); assert.equal(diff?.binding?.version, e.head); assert.equal(diff?.range_sha256, sha256(DIFF));
  assert(actual.context.entries.some(entry => entry.source.event_id === f.h.inspectTask('author-task').contract_ref.event_id));
  const message = f.h.state.get<{ payload: { event_id: string } }>('MESSAGE', receipt.notification_id)!;
  assert(actual.context.entries.some(entry => entry.source.event_id === message.payload.event_id && entry.text.includes('agentnexus/git-review-request/1')));
  const handoff = f.h.state.get<{ state: string }>('MESSAGE_HANDOFF', receipt.notification_id); assert.equal(handoff?.state, 'PROCESSED');
  assert.equal(f.h.state.count('STORAGE_WRITE'), 0); assert.equal(f.h.state.count('NATIVE_GATE'), 0); await f.h.store.verify();
});

test('M18 REVIEW BRIDGE duplicate callbacks reuse one Task/message and never wake a terminal Reviewer', async t => {
  const { f, e } = await fixture(t, { kind: 'FINAL', text: 'Read-only report complete.' }), d = await dispatch(f.h, e);
  const bridge = createNativeGitReviewBridge(f.h, { author_agent_id: 'author' });
  const [one, two] = await Promise.all([bridge(d), bridge(d)]); assert.deepEqual(two, one); await f.h.administration.idleEvents();
  assert.equal(f.h.inspectTask(one.reviewer_task_id).state, 'SUCCEEDED'); assert.equal(f.h.inspectAgent(one.reviewer_agent_id).lifecycle, 'STOPPED');
  const requests = f.h.state.count('MODEL_REQUEST'), events = f.h.administration.listEvents().length;
  assert.deepEqual(await bridge(d), one); await f.h.administration.idleEvents();
  assert.equal(f.h.state.count('AGENT'), 2); assert.equal(f.h.state.count('TASK'), 2); assert.equal(f.h.state.count('MESSAGE'), 1);
  assert.equal(f.h.state.count('MODEL_REQUEST'), requests); assert.equal(f.h.administration.listEvents().length, events);
  await assert.rejects(bridge({ ...d, binding: { ...d.binding, candidate_sha256: sha256('changed') } }), /GIT18_BRIDGE_BINDING/);
  await assert.rejects(bridge({ ...d, event: { ...d.event, head: 'c'.repeat(40) }, binding: { ...d.binding, head: 'c'.repeat(40) } }), /GIT18_BRIDGE_REQUEST_CONFLICT/);
});

test('M18 REVIEW BRIDGE explicit TASK_READY fallback dispatches through events when MessageBus auto-event option is absent', async t => {
  const { f, e } = await fixture(t, { kind: 'WAIT', text: 'Reviewed immutable data.' }, false), w = watcher(f), row = await w.observe(f.admin(), e);
  await f.h.administration.idleEvents(); assert.equal(f.h.inspectTask(row.receipt!.reviewer_task_id).turns, 1);
  const events = f.h.administration.listEvents(); assert(events.some(event => event.input.kind === 'TASK_READY' && event.input.target.task_id === row.receipt!.reviewer_task_id));
  assert.equal(f.h.state.get<{ state: string }>('MESSAGE_HANDOFF', row.receipt!.notification_id)?.state, 'PROCESSED');
});

test('M18 REVIEW BRIDGE rejects author/project/session/Diff spoofing before creating any Reviewer', async t => {
  const { f, e } = await fixture(t), d = await dispatch(f.h, e), bridge = createNativeGitReviewBridge(f.h, { author_agent_id: 'author' });
  for (const changed of [
    { ...d, independent_of_agent_id: 'other' }, { ...d, diff_ref: { ...d.diff_ref, sha256: sha256('wrong') } },
    { ...d, event: { ...e, project_id: 'foreign' }, binding: { ...d.binding, project_id: 'foreign' } },
    { ...d, event: { ...e, task_id: 'other-task' } }, { ...d, event: { ...e, session_id: 'stale-session' } },
  ]) await assert.rejects(async () => bridge(changed), /GIT18_BRIDGE_/);
  assert.equal(f.h.state.count('AGENT'), 1); assert.equal(f.h.state.count('TASK'), 1); assert.equal(f.h.state.count('MODEL18_REVIEW_BRIDGE'), 0);
});

test('M18 REVIEW BRIDGE a model tool proposal cannot give its Reviewer a write or PROCESS capability', async t => {
  const { f, e } = await fixture(t, { kind: 'TOOL_CALL', tool_name: 'native.storage.write', resource_id: 'project:files', arguments: {} });
  const row = await watcher(f).observe(f.admin(), e); await f.h.administration.idleEvents();
  assert.equal(f.h.inspectTask(row.receipt!.reviewer_task_id).state, 'FAILED'); assert.equal(f.h.state.count('STORAGE_WRITE'), 0);
  assert.equal(f.h.store.db.prepare('SELECT COUNT(*) AS n FROM control_permits').get()!.n, 0);
  assert.deepEqual(f.h.inspectAgent(row.receipt!.reviewer_agent_id).tools, []);
});

test('M18 REVIEW BRIDGE reconciles a durable Task after lost ACK and Host reopen without duplicate objects or implicit model calls', async t => {
  const { f, e } = await fixture(t), d = await dispatch(f.h, e), flush = f.h.store.flush.bind(f.h.store); let injected = false;
  f.h.store.flush = async () => { await flush(); const last = f.h.store.db.prepare("SELECT json_extract(body,'$.phase') AS phase,json_extract(body,'$.agent_id') AS agent FROM anx_records WHERE domain='audit' ORDER BY seq DESC LIMIT 1").get();
    if (!injected && last?.phase === 'TASK_CREATED' && String(last.agent).startsWith('git-review.')) { injected = true; throw Error('INJECTED_TASK_ACK_LOSS'); } };
  await assert.rejects(createNativeGitReviewBridge(f.h, { author_agent_id: 'author' })(d), /INJECTED_TASK_ACK_LOSS/); f.h.store.flush = flush;
  assert.equal(f.h.state.count('AGENT'), 2); assert.equal(f.h.state.count('TASK'), 2); assert.equal(f.h.state.count('MODEL_REQUEST'), 0);
  await f.h.close(); f.h = await openHarness(f.root, f.options); assert.equal(f.h.state.count('MODEL_REQUEST'), 0);
  const receipt = await createNativeGitReviewBridge(f.h, { author_agent_id: 'author' })(d); await f.h.administration.idleEvents();
  assert.equal(f.h.state.count('AGENT'), 2); assert.equal(f.h.state.count('TASK'), 2); assert.equal(f.h.state.count('MESSAGE'), 1);
  assert.equal(f.h.inspectTask(receipt.reviewer_task_id).turns, 1); await f.h.store.verify();
});

test('M18 REVIEW BRIDGE uncertain partial Agent initialization is never recreated by an exact retry', async t => {
  const { f, e } = await fixture(t), d = await dispatch(f.h, e), capture = f.h.context.capture.bind(f.h.context); let fail = true;
  f.h.context.capture = async (...args: Parameters<typeof capture>) => { if (fail && args[0].agent_type === 'BACKGROUND_REVIEWER') { fail = false; throw Error('INJECTED_PARTIAL_AGENT'); } return capture(...args); };
  const bridge = createNativeGitReviewBridge(f.h, { author_agent_id: 'author' }); await assert.rejects(bridge(d), /INJECTED_PARTIAL_AGENT/); f.h.context.capture = capture;
  await assert.rejects(bridge(d), /GIT18_BRIDGE_AGENT_UNCERTAIN/); assert.equal(f.h.state.count('AGENT'), 2); assert.equal(f.h.state.count('TASK'), 1);
  assert.equal(f.h.state.count('MODEL_REQUEST'), 0); assert.equal(f.h.state.get<{ state: string }>('MODEL18_REVIEW_BRIDGE', d.idempotency_key)?.state, 'UNKNOWN');
});

test('M18 REVIEW BRIDGE trusted G4 checks exact Watcher evidence; model PASS alone does not certify and a changed commit invalidates the old result', async t => {
  const { f, e, candidate } = await fixture(t), w = watcher(f), row = await w.observe(f.admin(), e); await f.h.administration.idleEvents();
  const task = f.h.inspectTask(row.receipt!.reviewer_task_id), evidence = task.history.at(-1)!.payload_ref;
  await w.acceptResult(f.admin(), row.id, { ...row.binding!, reviewer_agent_id: row.receipt!.reviewer_agent_id, reviewer_task_id: task.id, status: 'PASS', evidence_ref: evidence });
  const baseline = await f.h.store.artifacts.putBytesQueued(Buffer.from(canonical({ commit: e.base })));
  async function gate(id: string, trusted: boolean) {
    const profile = await f.h.store.artifacts.putBytesQueued(Buffer.from(canonical({ schema: 'agentnexus/gate-profile/1', required_checkers: { g4: [id] }, manual_gates: [], qualification: 'LOCAL_TRUSTED_LIBRARY' })));
    await f.h.administration.registerGateChecker(createNativeGitG4Checker(f.h, { id, watcher: w, watcher_admin: f.admin(), review_id: row.id,
      expected: row.binding!, baseline_sha256: baseline.sha256, test_profile_sha256: profile.sha256,
      ...(trusted ? { verify: async (context: Parameters<NonNullable<Parameters<typeof createNativeGitG4Checker>[1]['verify']>>[0]) => {
        const chunks: Uint8Array[] = []; for await (const chunk of context.readArtifact(context.candidate_ref)) chunks.push(chunk);
        return { status: Buffer.concat(chunks).toString() === CODE ? 'PASS' as const : 'FAIL' as const, reason: 'FIXED_HOST_CONTENT_CHECK_EXECUTED', evidence_refs: [candidate] };
      } } : {}) }));
    const input: NativeGateInput = { gate_id: 'g4', binding: f.h.inspectTask('author-task').rules_binding, candidate_ref: candidate, baseline_ref: baseline,
      test_profile_ref: profile, evidence: [{ kind: 'git-diff', ref: row.diff_ref! }, { kind: 'git-review', ref: evidence }], author_id: 'author' };
    return { input, result: await f.h.administration.nativeGate('author', input) };
  }
  const untrusted = await gate('report-only', false); assert.equal(untrusted.result.status, 'NOT_RUN'); assert.equal(untrusted.result.allows_protected, false);
  const actual = await gate('trusted-check', true); assert.equal(actual.result.status, 'PASS'); assert.equal(actual.result.allows_protected, true);
  const mismatched = await f.h.administration.nativeGate('author', { ...actual.input, evidence: [{ kind: 'git-diff', ref: candidate }, { kind: 'git-review', ref: evidence }] });
  assert.equal(mismatched.status, 'BLOCKED'); assert.equal(mismatched.allows_protected, false);
  const changed: GitReviewRecord = await w.observe(f.admin(), { ...e, event_id: 'commit-two', head: 'c'.repeat(40) }); assert.equal(changed.state, 'CREATED'); await f.h.administration.idleEvents();
  assert.equal(w.inspect(f.admin(), row.id).state, 'STALE'); const stale = await f.h.administration.nativeGate('author', actual.input);
  assert.equal(stale.status, 'BLOCKED'); assert.equal(stale.allows_protected, false); await f.h.store.verify();
});
