import { canonical, invariant, NexusError, sha256 } from '../types.ts';
import type { ArtifactRef } from '../types.ts';
import { validateArtifactRef } from '../records.ts';
import { identifier, snapshot } from '../harness/contracts.ts';
import type { Subject } from '../harness/contracts.ts';
import type { openHarness } from '../harness/index.ts';
import type { AgentInput, AgentRecord } from '../harness/agents.ts';
import type { TaskInput, TaskRecord } from '../harness/scheduler.ts';
import type { ContextSource } from '../harness/context.ts';
import type { CheckerResult, GateCheckerContext, GateCheckerDefinition } from '../harness/gates.ts';
import type { RuleTaskBinding } from '../harness/rules.ts';
import type { ResourceAmounts } from '../resources/index.ts';
import type { GitBinding, GitReviewResult, GitReviewWatcher, ReviewDispatch, ReviewReceipt } from './git-reviewer.ts';

type Harness = Awaited<ReturnType<typeof openHarness>>;
export type NativeGitReviewOptions = { author_agent_id: string; reviewer_model_binding?: string; reviewer_budget?: ResourceAmounts };
type Phase = 'ADMITTED' | 'CAPTURING_DIFF' | 'CAPTURING_BINDING' | 'CREATING_AGENT' | 'CREATING_TASK' | 'NOTIFYING' | 'NOTIFIED' | 'READY';
type BridgeRecord = {
  id: string; revision: number; state: 'PENDING' | 'UNKNOWN' | 'READY'; phase: Phase; request_hash: string;
  dispatch: ReviewDispatch; author_task_id: string; author_contract: ContextSource; rules_binding: RuleTaskBinding;
  reviewer_agent_id: string; reviewer_task_id: string; model_binding: string; budget: ResourceAmounts;
  diff_source: ContextSource | null; binding_source: ContextSource | null; task_input: TaskInput | null; receipt: ReviewReceipt | null;
  binding_attempted: boolean; agent_attempted: boolean; task_attempted: boolean;
};
const ENTITY = 'MODEL18_REVIEW_BRIDGE', LIMIT = 128;
const DEFAULT_BUDGET: ResourceAmounts = Object.freeze({ workers: 1, memory_bytes: 67108864, model_tokens: 100000,
  model_requests: 32, model_cost_micros: 1000000, wall_ms: 300000 });
const active = new WeakMap<Harness, Map<string, { hash: string; work: Promise<ReviewReceipt> }>>();
const unavailable = ['STOPPED', 'FAILED', 'UNKNOWN_QUARANTINED'];

function same(a: unknown, b: unknown): boolean { return canonical(a) === canonical(b); }
function fields(value: object, names: string[]): void {
  invariant(value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === [...names].sort().join(','), 'GIT18_BRIDGE_FIELDS');
}
function get(h: Harness, id: string): BridgeRecord | null { return h.state.get<BridgeRecord>(ENTITY, id); }
async function update(h: Harness, s: Subject, id: string, changes: Partial<BridgeRecord>): Promise<BridgeRecord> {
  return h.state.change(s, 'MODEL18_REVIEW_BRIDGE_PROGRESS', () => {
    const old = get(h, id); invariant(old, 'GIT18_BRIDGE_UNKNOWN');
    const next = { ...old, ...changes, revision: old.revision + 1 };
    h.state.update(ENTITY, id, old.revision, next.state, next); return snapshot(next);
  }, { bridge_id: id, phase: changes.phase ?? null, state: changes.state ?? null, gate_authority: false }, id);
}
function assertDispatch(p: ReviewDispatch): void {
  fields(p, ['idempotency_key', 'event', 'binding', 'diff_ref', 'role', 'read_only', 'independent_of_agent_id']);
  identifier(p.idempotency_key); const e = p.event, b = p.binding;
  fields(e, ['event_id', 'kind', 'base', 'head', 'author_agent_id', 'project_id', 'repository_id', 'task_id', 'session_id',
    'candidate_sha256', 'source_set', 'rules', ...(e.push_source === undefined ? [] : ['push_source'])]);
  identifier(e.event_id); invariant(e.kind === 'COMMIT' || e.kind === 'PUSH', 'GIT18_BRIDGE_EVENT');
  if (e.kind === 'PUSH') { invariant(e.push_source, 'GIT18_BRIDGE_EVENT'); fields(e.push_source, ['kind', 'event_ref']);
    invariant(e.push_source.kind === 'HOST_LOCAL_PUSH_EVENT', 'GIT18_BRIDGE_EVENT'); identifier(e.push_source.event_ref); }
  else invariant(e.push_source === undefined, 'GIT18_BRIDGE_EVENT');
  invariant(p.role === 'BACKGROUND_REVIEWER' && p.read_only === true && p.independent_of_agent_id === e.author_agent_id, 'GIT18_BRIDGE_ROLE');
  for (const id of [e.author_agent_id, e.project_id, e.repository_id, e.task_id, e.session_id]) identifier(id);
  invariant(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(e.base) && e.base.length === e.head.length &&
    /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(e.head), 'GIT18_BRIDGE_COMMIT');
  const expected: GitBinding = { project_id: e.project_id, repository_id: e.repository_id, base: e.base, head: e.head,
    diff_sha256: b.diff_sha256, candidate_sha256: e.candidate_sha256, source_set: e.source_set, rules: e.rules };
  invariant(same(b, expected) && /^[a-f0-9]{64}$/.test(b.candidate_sha256), 'GIT18_BRIDGE_BINDING');
  for (const entries of [b.source_set, b.rules]) {
    invariant(Array.isArray(entries) && entries.length > 0 && entries.length <= 64 && Buffer.byteLength(canonical(entries)) <= 5000, 'GIT18_BRIDGE_SOURCES');
    const seen = new Set<string>();
    for (const source of entries) {
      fields(source, ['path', 'sha256']); invariant(typeof source.path === 'string' && source.path.length > 0 && source.path.length <= 240 &&
        !/[\\\x00-\x1f\x7f:]/.test(source.path) && !source.path.startsWith('/') &&
        source.path.split('/').every(part => part && !['.', '..'].includes(part) && !/[. ]$/.test(part)) &&
        /^[a-f0-9]{64}$/.test(source.sha256) && !seen.has(source.path.toLowerCase()), 'GIT18_BRIDGE_SOURCES');
      seen.add(source.path.toLowerCase());
    }
  }
  validateArtifactRef(p.diff_ref); invariant(p.diff_ref.bytes > 0 && p.diff_ref.bytes <= 1048576 && p.diff_ref.sha256 === b.diff_sha256, 'GIT18_BRIDGE_DIFF_BINDING');
}
function assertAgent(a: AgentRecord, row: BridgeRecord): void {
  invariant(a.id === row.reviewer_agent_id && a.subject.task_id === row.reviewer_task_id &&
    a.subject.project_id === row.dispatch.event.project_id && a.subject.agent_type === 'BACKGROUND_REVIEWER' &&
    a.subject.model_binding === row.model_binding && a.parent_id === null && a.work_role === 'REVIEWER' &&
    a.tools.length === 0 && a.file_scope.length === 0 && same(a.worker_limits, row.budget) &&
    same(a.read_tasks, [...new Set([row.author_task_id, row.dispatch.event.task_id])]), 'GIT18_BRIDGE_AGENT_CONTRACT');
}
function assertTask(t: TaskRecord, row: BridgeRecord): void {
  invariant(row.task_input && t.id === row.reviewer_task_id && t.subject.agent_id === row.reviewer_agent_id &&
    t.creation_hash === sha256(canonical(row.task_input)) && same(t.rules_binding, row.rules_binding) &&
    same(t.review_binding, row.task_input.review_binding) && same(t.inputs, row.task_input.inputs), 'GIT18_BRIDGE_TASK_CONTRACT');
}
function notification(row: BridgeRecord): string {
  return canonical({ schema: 'agentnexus/git-review-request/1', idempotency_key: row.id,
    binding: row.dispatch.binding, diff_ref: row.dispatch.diff_ref, binding_source: row.binding_source,
    reviewer_task_id: row.reviewer_task_id, read_only: true, model_report_is_gate_authority: false });
}
function messageId(row: BridgeRecord): string {
  const e = row.dispatch.event; return sha256(canonical({ sender: { agent_id: e.author_agent_id, project_id: e.project_id, task_id: row.author_task_id }, dedup_key: 'git-review.' + row.id }));
}
async function captured(h: Harness, s: Subject, operation: string, expected: string): Promise<ContextSource | null> {
  const rows = h.store.db.prepare("SELECT event_id FROM anx_records WHERE domain='context' AND operation_id=?").all(operation) as { event_id: string }[];
  invariant(rows.length <= 1, 'GIT18_BRIDGE_CAPTURE_UNCERTAIN'); if (!rows.length) return null;
  const source = h.context.source(s, rows[0]!.event_id); invariant(source.payload_ref.sha256 === expected, 'GIT18_BRIDGE_CAPTURE_BINDING');
  for await (const _chunk of h.store.artifacts.read(source.payload_ref)) { /* Full immutable original hash barrier. */ } return source;
}

/** Host-only callback for GitReviewWatcher. Each event owns a new logical Reviewer; duplicates reuse exact durable objects. */
export function createNativeGitReviewBridge(h: Harness, options: NativeGitReviewOptions): (input: ReviewDispatch) => Promise<ReviewReceipt> {
  const settings = snapshot(options); identifier(settings.author_agent_id);
  invariant(Object.keys(settings).every(key => ['author_agent_id', 'reviewer_model_binding', 'reviewer_budget'].includes(key)), 'GIT18_BRIDGE_OPTIONS');
  const model = settings.reviewer_model_binding ?? 'mock'; identifier(model); const budget = snapshot(settings.reviewer_budget ?? DEFAULT_BUDGET);
  let map = active.get(h); if (!map) { map = new Map(); active.set(h, map); }
  return async input => {
    const p = snapshot(input, 24000); assertDispatch(p);
    invariant(p.event.author_agent_id === settings.author_agent_id, 'GIT18_BRIDGE_AUTHOR');
    const hash = sha256(canonical({ dispatch: p, model_binding: model, budget })), key = p.idempotency_key;
    const pending = map!.get(key); if (pending) { invariant(pending.hash === hash, 'GIT18_BRIDGE_REQUEST_CONFLICT'); return pending.work; }
    const work = run(p, hash); map!.set(key, { hash, work });
    void work.finally(() => map!.delete(key)).catch(() => {}); return work;
  };
  async function run(p: ReviewDispatch, hash: string): Promise<ReviewReceipt> {
    const author = h.inspectAgent(settings.author_agent_id), s = author.subject, e = p.event;
    invariant(s.project_id === e.project_id && s.task_id === e.task_id && ['DEVELOPMENT', 'SUBAGENT'].includes(s.agent_type), 'GIT18_BRIDGE_AUTHOR_SCOPE');
    const authorTask = h.inspectTask(s.task_id); invariant(authorTask.subject.agent_id === s.agent_id && authorTask.subject.project_id === s.project_id, 'GIT18_BRIDGE_AUTHOR_SCOPE');
    let row = get(h, p.idempotency_key);
    if (row) invariant(row.request_hash === hash, 'GIT18_BRIDGE_REQUEST_CONFLICT');
    else {
      invariant(s.session_id === e.session_id && !unavailable.includes(author.lifecycle), 'GIT18_BRIDGE_AUTHOR_STALE'); h.bindAgent(author.id).status();
      const reviewer = 'git-review.' + sha256(canonical({ project_id: e.project_id, key: p.idempotency_key }));
      invariant(reviewer !== author.id && reviewer !== authorTask.id, 'GIT18_BRIDGE_INDEPENDENCE');
      row = await h.state.change(s, 'MODEL18_REVIEW_BRIDGE_ADMITTED', () => {
        invariant(!get(h, p.idempotency_key) && h.state.count(ENTITY) < LIMIT, 'GIT18_BRIDGE_CAPACITY');
        const value: BridgeRecord = { id: p.idempotency_key, revision: 0, state: 'PENDING', phase: 'ADMITTED', request_hash: hash, dispatch: p,
          author_task_id: authorTask.id, author_contract: authorTask.contract_ref, rules_binding: authorTask.rules_binding,
          reviewer_agent_id: reviewer, reviewer_task_id: reviewer, model_binding: model, budget,
          diff_source: null, binding_source: null, task_input: null, receipt: null,
          binding_attempted: false, agent_attempted: false, task_attempted: false };
        h.state.insert(ENTITY, value.id, s, value.state, value); return snapshot(value);
      }, { bridge_id: p.idempotency_key, binding: p.binding, read_only: true, gate_authority: false }, p.idempotency_key);
    }
    invariant(same(row.author_contract, authorTask.contract_ref) && same(row.rules_binding, authorTask.rules_binding), 'GIT18_BRIDGE_AUTHOR_BINDING');
    try {
      if (row.state === 'READY') { await validateReady(row); return row.receipt!; }
      if (!row.diff_source) {
        const op = 'review-diff.' + sha256(row.id), prior = await captured(h, s, op, p.diff_ref.sha256);
        invariant(prior || row.phase === 'ADMITTED', 'GIT18_BRIDGE_CAPTURE_UNCERTAIN');
        if (!prior) row = await update(h, s, row.id, { phase: 'CAPTURING_DIFF' });
        const source = prior ?? await h.context.capture(s, 'RAW', h.store.artifacts.read(p.diff_ref), { operation_id: op, maxBytes: 1048576 });
        invariant(source.payload_ref.sha256 === p.diff_ref.sha256 && source.length === p.diff_ref.bytes, 'GIT18_BRIDGE_DIFF_BINDING'); row = await update(h, s, row.id, { diff_source: source, phase: 'CAPTURING_BINDING' });
      }
      if (!row.binding_source) {
        const bytes = Buffer.from(canonical({ schema: 'agentnexus/git-review-binding/1', binding: p.binding, author_contract: row.author_contract, rules_binding: row.rules_binding }));
        const op = 'review-binding.' + sha256(row.id), prior = await captured(h, s, op, sha256(bytes));
        // Binding capture is immutable internal data. A missing receipt after entry requires explicit owner reconciliation.
        invariant(prior || !row.binding_attempted, 'GIT18_BRIDGE_CAPTURE_UNCERTAIN');
        if (!prior) row = await update(h, s, row.id, { binding_attempted: true });
        const source = prior ?? await h.context.capture(s, 'RAW', bytes, { operation_id: op, maxBytes: 20000 });
        row = await update(h, s, row.id, { binding_source: source, phase: 'CREATING_AGENT' });
      }
      const agentInput: AgentInput = { id: row.reviewer_agent_id, project_id: e.project_id, task_id: row.reviewer_task_id,
        type: 'BACKGROUND_REVIEWER', model_binding: model, budget, tools: [], file_scope: [], read_tasks: [...new Set([row.author_task_id, e.task_id])], work_role: 'REVIEWER' };
      let reviewer = h.state.get<AgentRecord>('AGENT', row.reviewer_agent_id);
      if (!reviewer) {
        invariant(!row.agent_attempted && row.phase === 'CREATING_AGENT', 'GIT18_BRIDGE_AGENT_UNCERTAIN');
        row = await update(h, s, row.id, { agent_attempted: true });
        reviewer = await h.administration.createAgent(agentInput);
      }
      assertAgent(reviewer, row);
      invariant(['READY', 'WAITING'].includes(reviewer.lifecycle) || row.receipt !== null, 'GIT18_BRIDGE_AGENT_UNCERTAIN');
      if (!row.task_input) {
        const taskInput: TaskInput = { id: row.reviewer_task_id, agent_id: row.reviewer_agent_id,
          goal: 'Review the exact immutable Git candidate and original author contract. Report findings with evidence. Model text cannot certify a Gate or authorize a tool.',
          max_turns: 4, wall_ms: 300000, contract: { acceptance: ['Read the exact Diff and source bindings; report evidence without code writes or Gate authority.'], allowed_scope: [] },
          rules_binding: row.rules_binding, review_binding: { commit: e.head, diff_sha256: p.binding.diff_sha256, candidate_sha256: p.binding.candidate_sha256, author_agent_id: author.id },
          inputs: [{ source: row.diff_source!, section: 'FILE_CONTENT', required: true, binding: { reference: 'git-diff:' + e.repository_id, version: e.head, sha256: p.binding.diff_sha256 } },
            { source: row.binding_source!, section: 'ARTIFACT', required: true, binding: { reference: 'git-binding:' + e.repository_id, version: e.head, sha256: row.binding_source!.payload_ref.sha256 } },
            { source: row.author_contract, section: 'TASK_CONTRACT', required: true }] };
        row = await update(h, s, row.id, { phase: 'CREATING_TASK', task_input: taskInput });
      }
      let task = h.state.get<TaskRecord>('TASK', row.reviewer_task_id);
      if (!task) { invariant(!row.task_attempted, 'GIT18_BRIDGE_TASK_UNCERTAIN'); row = await update(h, s, row.id, { task_attempted: true }); task = await h.administration.createTask(row.task_input!); }
      assertTask(task, row);
      const id = messageId(row); let message = h.state.get<{ message_id: string; receiver: Subject; sender: Subject; message_type: string; payload: ContextSource }>('MESSAGE', id);
      if (!message) {
        invariant(!unavailable.includes(reviewer.lifecycle) && !['SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT', 'UNKNOWN_QUARANTINED'].includes(task.state), 'GIT18_BRIDGE_TERMINAL_REVIEWER');
        row = await update(h, s, row.id, { phase: 'NOTIFYING' });
        message = await h.bindAgent(author.id).sendText({ receiver_agent_id: row.reviewer_agent_id, message_type: 'REVIEW_REQUEST', text: notification(row), dedup_key: 'git-review.' + row.id });
      }
      invariant(message.receiver.agent_id === row.reviewer_agent_id && message.receiver.task_id === row.reviewer_task_id && message.sender.agent_id === author.id && message.message_type === 'REVIEW_REQUEST', 'GIT18_BRIDGE_MESSAGE_BINDING');
      invariant((await h.context.readRange(s, message.payload)).text === notification(row), 'GIT18_BRIDGE_MESSAGE_BINDING');
      const receipt: ReviewReceipt = { reviewer_agent_id: row.reviewer_agent_id, reviewer_task_id: row.reviewer_task_id, notification_id: message.message_id, read_only: true };
      row = await update(h, s, row.id, { phase: 'NOTIFIED', receipt, state: 'PENDING' });
      const notified = h.administration.listEvents().some(event => event.input.target.task_id === row!.reviewer_task_id && event.input.message_id === receipt.notification_id);
      if (!notified && ['QUEUED', 'WAITING_RESOURCES'].includes(h.inspectTask(row.reviewer_task_id).state))
        await h.administration.enqueueEvent({ kind: 'TASK_READY', target: h.inspectAgent(row.reviewer_agent_id).subject,
          dedup_key: 'git-review.' + row.id, payload_sha256: h.inspectTask(row.reviewer_task_id).creation_hash });
      await h.administration.startEvents(); row = await update(h, s, row.id, { phase: 'READY', state: 'READY' }); return receipt;
    } catch (error) {
      if (!h.state.faulted) await update(h, s, row.id, { state: 'UNKNOWN' }).catch(() => {}); throw error;
    }
    async function validateReady(current: BridgeRecord): Promise<void> {
      invariant(current.receipt && current.diff_source && current.binding_source, 'GIT18_BRIDGE_RECEIPT');
      assertAgent(h.inspectAgent(current.reviewer_agent_id), current); assertTask(h.inspectTask(current.reviewer_task_id), current);
      const message = h.state.get<{ payload: ContextSource; receiver: Subject; sender: Subject; message_type: string }>('MESSAGE', current.receipt.notification_id);
      invariant(message && current.receipt.notification_id === messageId(current) && message.receiver.agent_id === current.reviewer_agent_id && message.sender.agent_id === author.id && message.message_type === 'REVIEW_REQUEST', 'GIT18_BRIDGE_MESSAGE_BINDING');
      invariant((await h.context.readRange(s, message.payload)).text === notification(current), 'GIT18_BRIDGE_MESSAGE_BINDING');
    }
  }
}

export type NativeGitG4Options = {
  id: string; version?: string; watcher: Pick<GitReviewWatcher, 'readForGate'>; watcher_admin: unknown;
  review_id: string; expected: GitBinding; baseline_sha256: string; test_profile_sha256: string;
  verify?: (context: GateCheckerContext, review: GitReviewResult) => CheckerResult | Promise<CheckerResult>;
};
/** A registered trusted checker still decides the Gate. A model-shaped PASS report alone always yields NOT_RUN. */
export function createNativeGitG4Checker(h: Harness, options: NativeGitG4Options): GateCheckerDefinition {
  const expected = snapshot(options.expected); identifier(options.id); identifier(options.review_id);
  invariant(/^[a-f0-9]{64}$/.test(options.baseline_sha256) && /^[a-f0-9]{64}$/.test(options.test_profile_sha256), 'GIT18_BRIDGE_GATE_BINDING');
  const row = get(h, options.review_id); invariant(row?.receipt && row.state === 'READY' && same(row.dispatch.binding, expected), 'GIT18_BRIDGE_GATE_BINDING');
  const reviewerId = row.reviewer_agent_id, baseline = options.baseline_sha256, profile = options.test_profile_sha256,
    watcher = options.watcher, admin = options.watcher_admin, reviewId = options.review_id, verify = options.verify;
  return { id: options.id, version: options.version ?? '1', gates: ['g4'], kind: 'INDEPENDENT_REVIEW', reviewer_id: reviewerId, assurance: 'LOCAL_TRUSTED_LIBRARY',
    run: async context => {
      try {
      const current = get(h, reviewId), result = watcher.readForGate(admin, reviewId, expected);
      invariant(current && current.state === 'READY' && current.receipt && same(current.dispatch.binding, expected) &&
        context.gate_id === 'g4' && context.actor.agent_id === reviewerId && context.task_actor.agent_id === current.dispatch.event.author_agent_id &&
        context.task_actor.project_id === expected.project_id && context.candidate_ref.sha256 === expected.candidate_sha256 &&
        context.baseline_ref.sha256 === baseline && context.test_profile_ref.sha256 === profile && same(context.binding, current.rules_binding), 'GIT18_BRIDGE_GATE_BINDING');
      invariant(result.reviewer_agent_id === reviewerId && result.reviewer_task_id === current.reviewer_task_id, 'GIT18_BRIDGE_GATE_BINDING');
      const task = h.inspectTask(current.reviewer_task_id); assertTask(task, current);
      invariant(task.turns > 0 && task.received_message_ids.includes(current.receipt.notification_id) && !['FAILED', 'CANCELLED', 'TIMED_OUT', 'UNKNOWN_QUARANTINED'].includes(task.state), 'GIT18_BRIDGE_REVIEW_NOT_PROCESSED');
      for (const [kind, ref] of [['git-diff', current.dispatch.diff_ref], ['git-review', result.evidence_ref]] as const) {
        invariant(context.evidence.some(item => item.kind === kind && same(item.ref, ref)), 'GIT18_BRIDGE_GATE_BINDING');
        for await (const _chunk of context.readArtifact(ref)) { /* Exact Gate-authorized immutable bytes, never a repository reread. */ }
      }
      if (result.status !== 'PASS') return { status: result.status, reason: 'GIT18_BOUND_REVIEW_' + result.status, evidence_refs: [result.evidence_ref] };
      if (!verify) return { status: 'NOT_RUN', reason: 'GIT18_TRUSTED_VERIFIER_REQUIRED', evidence_refs: [result.evidence_ref] };
      return await verify(Object.freeze(context), result);
      } catch (error) {
        if (error instanceof NexusError && error.code.startsWith('GIT18_'))
          return { status: 'BLOCKED', reason: 'GIT18_BOUND_REVIEW_UNAVAILABLE', evidence_refs: [] };
        throw error;
      }
    } };
}
