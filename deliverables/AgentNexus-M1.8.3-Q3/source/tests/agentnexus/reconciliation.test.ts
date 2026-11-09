import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { openHost } from '../../src/agentnexus/host.ts';
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { intentHash } from '../../src/agentnexus/gateway.ts';
import type { ReconciliationRequest } from '../../src/agentnexus/reconciliation.ts';
import type { ToolDefinition, ToolRequest, ToolResult } from '../../src/agentnexus/gateway.ts';
import type { ArtifactRef, Identity } from '../../src/agentnexus/types.ts';

const ID: Identity = { agent_id: 'reconcile-worker', project_id: 'reconcile-project', task_id: 'reconcile-task', session_id: 'reconcile-session' };
const request: ToolRequest = { call_id: 'original', tool_id: 'reconcile.effect', tool_version: '1', resource_id: ID.project_id + ':effect', arguments: { synthetic: true } };
async function caseRoot(prefix = 'case-') {
  const base = resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT ?? '.workflow-kit/runtime/AgentNexus-M1.2/test-data', 'reconciliation'); await mkdir(base, { recursive: true }); return mkdtemp(join(base, prefix));
}
type Host = Awaited<ReturnType<typeof openHost>>;
const count = (h: Host) => (h.store.db.prepare('SELECT n FROM reconciliation_effects').get() as { n: number }).n;
function register(h: Host, overrides: Partial<ToolDefinition> = {}) {
  h.store.db.exec('CREATE TABLE IF NOT EXISTS reconciliation_effects(n INTEGER); INSERT INTO reconciliation_effects SELECT 0 WHERE NOT EXISTS(SELECT 1 FROM reconciliation_effects)');
  h.administration.registerTool({ id: 'reconcile.effect', version: '1', feature_id: 'tool.test', capability: 'LOCAL_WRITE', policy_ids: ['P.COMMAND_RISK'], requires_sandbox: false,
    writer_resource: (_args, identity) => identity.project_id + ':effect', schema() {}, execute() { h.store.db.exec('UPDATE reconciliation_effects SET n=n+1'); throw new Error('Synthetic unknown effect result'); }, ...overrides });
}
async function signed(h: Host, r = request) { return { ...r, approval_id: await h.administration.approve(intentHash(ID, r), ID, 'Explicit local reconciliation fixture effect') }; }
async function fixture(t: test.TestContext, overrides: Partial<ToolDefinition> = {}) {
  const root = await caseRoot(); const host = await openHost(root); register(host, overrides); const agent = host.bindAgent(ID);
  t.after(async () => { await agent.close(); await host.close(); });
  const result = await agent.request(await signed(host)); assert.equal(result.status, 'INCONCLUSIVE');
  return { host, agent, root, result };
}
async function evidence(h: Host, r: ToolResult, observation: any = { actual_effects: count(h) }) {
  return h.administration.recordReconciliationEvidence({ kind: 'LOCAL_SYNTHETIC_OBSERVATION', source: 'test-owned SQLite counter / actual handler settlement', description: 'Administrator inspected the original local operation evidence', observation: { operation_id: r.operation_id, intent_hash: r.intent_hash, ...observation } });
}
function adjudicate(r: ToolResult, ref: ArtifactRef, extra: Partial<ReconciliationRequest> = {}): ReconciliationRequest {
  return { request_id: 'adjudicate-1', operation_id: r.operation_id, intent_hash: r.intent_hash, expected_revision: 0,
    action: 'ADJUDICATE', outcome: 'CONFIRMED_APPLIED', release_writer: true, reason: 'Observed the actual local effect and trusted executor settlement', evidence_refs: [ref], ...extra };
}
async function commit(h: Host, r: ReconciliationRequest) { const p = await h.administration.prepareReconciliation(r); return h.administration.commitReconciliation(p.challenge_id, p.preview_hash); }

test('M12-REC-APPLIED: exact intent, evidence, append-only audit and single-use adjudication release settled writer', async t => {
  const { host, agent, result } = await fixture(t); const ref = await evidence(host, result);
  const input = adjudicate(result, ref); const p = await host.administration.prepareReconciliation(input);
  input.reason = 'Caller mutation after the prepared immutable authorization';
  const final = await host.administration.commitReconciliation(p.challenge_id, p.preview_hash);
  assert.equal(final.outcome, 'CONFIRMED_APPLIED'); assert.equal(final.writer_released, true); assert.equal(final.automatic_retry, false);
  assert.equal(count(host), 1); assert.equal(host.administration.inspectOperation(result.operation_id).state, 'RECONCILED_APPLIED');
  const row = host.store.db.prepare('SELECT * FROM control_reconciliations').get() as any;
  assert.equal(row.intent_hash, result.intent_hash); assert.equal(row.adjudicator, 'host-admin'); assert.equal(row.reason, p.request.reason);
  assert.throws(() => host.store.db.exec("UPDATE control_reconciliations SET reason='changed'"), /append only/);
  assert.throws(() => host.store.db.exec('DELETE FROM control_reconciliations'), /append only/);
  const audit = host.store.query('audit', { project_id: 'host', limit: 100 }).find(x => x.event_id === row.audit_event_id)!;
  assert.equal(audit.operation_id, result.operation_id); assert.equal((audit.body as any).parameters.intent_hash, result.intent_hash);
  await assert.rejects(host.administration.commitReconciliation(p.challenge_id, p.preview_hash), { code: 'CHALLENGE_REPLAY' });
  await assert.rejects(host.administration.prepareReconciliation(adjudicate(result, ref, { request_id: 'different', expected_revision: 1 })), { code: 'OPERATION_ALREADY_ADJUDICATED' });
  assert.equal((await agent.request(request)).reason, 'DUPLICATE_OPERATION'); assert.equal(count(host), 1);
});
test('M12-REC-NOT-APPLIED: evidence-confirmed absence never automatically reexecutes the original call', async t => {
  const { host, agent, result } = await fixture(t, { execute() { throw new Error('No effect was performed'); } });
  assert.equal(count(host), 0); const ref = await evidence(host, result);
  const final = await commit(host, adjudicate(result, ref, { outcome: 'CONFIRMED_NOT_APPLIED' }));
  assert.equal(final.writer_released, true); assert.equal(host.administration.inspectOperation(result.operation_id).state, 'RECONCILED_NOT_APPLIED');
  assert.equal((await agent.request(request)).reason, 'DUPLICATE_OPERATION'); assert.equal(count(host), 0);
  const fresh = { ...request, call_id: 'separately-authorized-new-operation' };
  assert.equal((await agent.request(fresh)).status, 'BLOCKED');
  const authorized = await agent.request(await signed(host, { ...fresh, call_id: 'explicit-new-call' }));
  assert.notEqual(authorized.operation_id, result.operation_id); assert.equal(authorized.status, 'INCONCLUSIVE'); assert.equal(count(host), 0);
});
test('M12-REC-NEGATIVE: missing evidence, wrong intent, forged authority and invalid outcomes fail closed', async t => {
  const { host, agent, result } = await fixture(t); const ref = await evidence(host, result);
  await assert.rejects(host.administration.prepareReconciliation(adjudicate(result, ref, { evidence_refs: [] })), { code: 'RECONCILIATION_EVIDENCE_REQUIRED' });
  await assert.rejects(host.administration.prepareReconciliation(adjudicate(result, ref, { intent_hash: 'b'.repeat(64) })), { code: 'RECONCILIATION_INTENT_MISMATCH' });
  await assert.rejects(host.administration.prepareReconciliation(adjudicate(result, ref, { outcome: 'ALLOW' as any })), { code: 'INVALID_RECONCILIATION' });
  assert.equal((agent as any).administration, undefined); assert.equal((agent as any).prepareReconciliation, undefined);
  assert.equal((await agent.request({ ...request, admin: true, adjudication: 'CONFIRMED_APPLIED' } as any)).reason, 'INVALID_TOOL_REQUEST');
  assert.equal(host.administration.inspectOperation(result.operation_id).adjudications.length, 0);
  assert.ok(host.administration.inspectOperation(result.operation_id).writer); assert.equal(count(host), 1);
});
test('M12-REC-UNKNOWN: quarantine persists over restart and may only advance with a new exact revision/challenge', async t => {
  const root = await caseRoot(); let host = await openHost(root); register(host); let agent = host.bindAgent(ID);
  try {
    const result = await agent.request(await signed(host)); const ref = await evidence(host, result);
    await commit(host, adjudicate(result, ref, { outcome: 'UNKNOWN_QUARANTINED', release_writer: false }));
    await assert.rejects(host.administration.prepareReconciliation(adjudicate(result, ref, { request_id: 'bad-release', expected_revision: 1, action: 'RELEASE_WRITER', outcome: 'UNKNOWN_QUARANTINED' })), { code: 'UNKNOWN_MUST_REMAIN_QUARANTINED' });
    await agent.close(); await host.close(); host = await openHost(root); register(host); agent = host.bindAgent(ID);
    const inspected = host.administration.inspectOperation(result.operation_id); assert.equal(inspected.state, 'INDETERMINATE'); assert.equal(inspected.reconcile_revision, 1); assert.ok(inspected.writer);
    assert.equal((await agent.request(request)).reason, 'DUPLICATE_OPERATION'); assert.equal(count(host), 1);
    await assert.rejects(host.administration.prepareReconciliation(adjudicate(result, ref, { request_id: 'stale' })), { code: 'RECONCILIATION_REVISION_CONFLICT' });
    const final = await commit(host, adjudicate(result, ref, { request_id: 'final-after-manual-verification', expected_revision: 1 })); assert.equal(final.revision, 2);
    assert.equal(host.administration.inspectOperation(result.operation_id).adjudications.length, 2); assert.equal(count(host), 1);
  } finally { await agent.close(); await host.close(); }
});
test('M12-REC-CONCURRENCY: competing administrator challenges create one final adjudication', async t => {
  const { host, result } = await fixture(t); const ref = await evidence(host, result);
  const a = await host.administration.prepareReconciliation(adjudicate(result, ref));
  const b = await host.administration.prepareReconciliation(adjudicate(result, ref, { request_id: 'competitor' }));
  const results = await Promise.allSettled([host.administration.commitReconciliation(a.challenge_id, a.preview_hash), host.administration.commitReconciliation(b.challenge_id, b.preview_hash)]);
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(host.administration.inspectOperation(result.operation_id).adjudications.length, 1); assert.equal(count(host), 1);
  await assert.rejects(host.administration.commitReconciliation(b.challenge_id, b.preview_hash), { code: 'RECONCILIATION_REVISION_CONFLICT' });
});
test('M12-REC-TIMEOUT: effect adjudication cannot release a running executor; explicit later release uses trusted settlement', async t => {
  const root = await caseRoot(); const host = await openHost(root); let finish!: () => void;
  const pending = new Promise<void>(r => finish = r); register(host, { timeout_ms: 20, async execute() { await pending; host.store.db.exec('UPDATE reconciliation_effects SET n=n+1'); return { data: null }; } });
  const agent = host.bindAgent(ID);
  try {
    const result = await agent.request(await signed(host)); assert.equal(result.reason, 'TOOL_TIMEOUT'); assert.equal(host.features.activeCount(), 1);
    const ref = await evidence(host, result, { actual_effects: 0, executor: 'still running' });
    await assert.rejects(host.administration.prepareReconciliation(adjudicate(result, ref)), { code: 'EXECUTOR_EXIT_NOT_CONFIRMED' });
    await commit(host, adjudicate(result, ref, { outcome: 'UNKNOWN_QUARANTINED', release_writer: false }));
    finish(); await delay(10); assert.equal(host.features.activeCount(), 0); assert.equal(count(host), 1);
    const finalEvidence = await evidence(host, result);
    await commit(host, adjudicate(result, finalEvidence, { request_id: 'applied-retain', expected_revision: 1, release_writer: false }));
    assert.ok(host.administration.inspectOperation(result.operation_id).writer);
    const release = await commit(host, adjudicate(result, finalEvidence, { request_id: 'release-after-settlement', action: 'RELEASE_WRITER', expected_revision: 2 }));
    assert.equal(release.writer_released, true); assert.equal(count(host), 1);
  } finally { finish(); await delay(10); await agent.close(); await host.close(); }
});
test('M12-REC-UNKNOWN-EXIT: administrator evidence alone cannot assert executor exit', async t => {
  const { host, result } = await fixture(t); const ref = await evidence(host, result);
  // Fault injection represents a missing durable executor observation, not an OS verification.
  host.store.db.prepare("UPDATE control_operations SET executor_state='UNKNOWN' WHERE operation_id=?").run(result.operation_id);
  await assert.rejects(host.administration.prepareReconciliation(adjudicate(result, ref)), { code: 'EXECUTOR_EXIT_NOT_CONFIRMED' });
  await commit(host, adjudicate(result, ref, { release_writer: false }));
  await assert.rejects(host.administration.prepareReconciliation(adjudicate(result, ref, { request_id: 'release-unknown', action: 'RELEASE_WRITER', expected_revision: 1 })), { code: 'EXECUTOR_EXIT_NOT_CONFIRMED' });
  assert.ok(host.administration.inspectOperation(result.operation_id).writer);
});
test('M12-REC-IOFAIL: failed adjudication transaction does not consume authorization or release writer', async t => {
  const { host, result } = await fixture(t); const ref = await evidence(host, result); const p = await host.administration.prepareReconciliation(adjudicate(result, ref));
  host.store.db.exec('PRAGMA query_only=ON');
  try { await assert.rejects(host.administration.commitReconciliation(p.challenge_id, p.preview_hash)); }
  finally { host.store.db.exec('PRAGMA query_only=OFF'); await host.store.recover(); }
  assert.equal(host.administration.inspectOperation(result.operation_id).adjudications.length, 0); assert.ok(host.administration.inspectOperation(result.operation_id).writer);
  assert.equal((host.store.db.prepare('SELECT consumed FROM control_challenges WHERE id=?').get(p.challenge_id) as any).consumed, 0); assert.equal(count(host), 1);
});
test('M12-REC-OUTPUT-TIMEOUT: late output never becomes PASS and UNKNOWN producer keeps its writer over restart', async t => {
  const root = await caseRoot(); let host = await openHost(root); let releaseNext!: (x: IteratorResult<Uint8Array>) => void;
  const next = new Promise<IteratorResult<Uint8Array>>(r => releaseNext = r); let cleanupRequested = false;
  register(host, { timeout_ms: 30, execute() { host.store.db.exec('UPDATE reconciliation_effects SET n=n+1'); return { data: null, stdout: { [Symbol.asyncIterator]() { return { next: () => next, return: () => { cleanupRequested = true; return new Promise<IteratorResult<Uint8Array>>(() => {}); } }; } } }; } });
  let agent = host.bindAgent(ID);
  try {
    const r = await agent.request(await signed(host)); assert.equal(r.status, 'INCONCLUSIVE'); assert.equal(r.reason, 'TOOL_TIMEOUT'); assert.equal(cleanupRequested, true);
    assert.equal(host.administration.inspectOperation(r.operation_id).executor_state, 'UNKNOWN'); assert.ok(host.administration.inspectOperation(r.operation_id).writer); assert.equal(count(host), 1);
    // Store-owned output closed; this is explicitly not producer exit confirmation.
    releaseNext({ done: true, value: undefined }); await delay(10); await host.store.recover();
    const ref = await evidence(host, r); await assert.rejects(host.administration.prepareReconciliation(adjudicate(r, ref)), { code: 'EXECUTOR_EXIT_NOT_CONFIRMED' });
    await agent.close(); await host.close(); host = await openHost(root); register(host); agent = host.bindAgent(ID);
    const op = host.administration.inspectOperation(r.operation_id); assert.equal(op.executor_state, 'UNKNOWN'); assert.ok(op.writer); assert.equal((await agent.request(request)).reason, 'DUPLICATE_OPERATION'); assert.equal(count(host), 1);
  } finally { releaseNext({ done: true, value: undefined }); await agent.close(); await host.close(); }
});

for (const scenario of ['before-call','after-call-before-started','handler-before-result','result-before-ack','ack-before-delivery']) {
  test('M12-REC-CRASH: real process kill at ' + scenario + ' never replays local effect', async t => {
    const root = await caseRoot('crash-'); const marker = join(root, 'window.json'); const stderr: Buffer[] = [];
    const child = spawn(process.execPath, [fileURLToPath(new URL('./reconciliation-child.mjs', import.meta.url)), root, scenario], { cwd: process.cwd(), shell: false, windowsHide: true, stdio: ['ignore','pipe','pipe'] });
    child.stdout.resume(); child.stderr.on('data', x => stderr.push(x));
    const exited = new Promise<{ code: number | null; signal: string | null }>((resolveExit, reject) => { child.once('error', reject); child.once('exit', (code, signal) => resolveExit({ code, signal })); });
    try {
      const deadline = Date.now() + 15000;
      while (!existsSync(marker) && child.exitCode === null && Date.now() < deadline) await delay(10);
      assert.equal(existsSync(marker), true, Buffer.concat(stderr).toString() || 'Crash window did not occur');
      const window = JSON.parse(await readFile(marker, 'utf8')); assert.equal(child.kill('SIGKILL'), true); const termination = await exited;
      await writeFile(join(root, 'child-stderr.txt'), Buffer.concat(stderr));
      const recovery = await KernelStore.recoverAbandonedLock(root); assert.equal(recovery.recovered, true);
      const host = await openHost(root); register(host); const agent = host.bindAgent(ID);
      try {
        const r = await agent.request(request); assert.equal(r.reason, 'DUPLICATE_OPERATION'); assert.equal(r.operation_id, window.operation_id);
        assert.equal(count(host), 0, 'Recovery must never invoke the newly registered handler');
        const effect = existsSync(join(root, 'effect.txt')) ? await readFile(join(root, 'effect.txt'), 'utf8') : '';
        assert.equal(effect, scenario === 'before-call' ? '' : '1');
        const op = host.administration.inspectOperation(window.operation_id); assert.equal(op.intent_hash, window.intent_hash);
        if (scenario === 'ack-before-delivery') { assert.equal(op.state, 'SUCCEEDED'); assert.equal(op.writer, null); }
        else {
          assert.equal(op.state, 'INDETERMINATE'); assert.ok(op.writer);
          const ref = await host.administration.recordReconciliationEvidence({ kind: 'CRASH_FIXTURE_OBSERVATION', source: 'Actual killed child process / local file / SQLite audit', description: 'Administrator checked the original effect and exact crash window', observation: { window, effect, termination } });
          const input = adjudicate({ ...r, intent_hash: window.intent_hash }, ref, { outcome: scenario === 'before-call' ? 'CONFIRMED_NOT_APPLIED' : 'CONFIRMED_APPLIED' });
          if (scenario === 'after-call-before-started') {
            assert.equal(op.executor_state, 'UNKNOWN'); await assert.rejects(host.administration.prepareReconciliation(input), { code: 'EXECUTOR_EXIT_NOT_CONFIRMED' });
            await commit(host, { ...input, release_writer: false }); assert.ok(host.administration.inspectOperation(window.operation_id).writer);
          } else { const resolved = await commit(host, input); assert.equal(resolved.writer_released, true); }
          if (scenario === 'result-before-ack') assert.equal((host.store.db.prepare("SELECT count(*) n FROM anx_records WHERE operation_id=? AND json_extract(body,'$.phase')='RESULT'").get(window.operation_id) as any).n, 1);
        }
        await writeFile(join(root, 'recovery-evidence.json'), JSON.stringify({ scenario, window, termination, recovered: recovery, operation: host.administration.inspectOperation(window.operation_id), effect, replay_reason: r.reason }, null, 2));
      } finally { await agent.close(); await host.close(); }
    } finally { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); await exited; }
  });
}
