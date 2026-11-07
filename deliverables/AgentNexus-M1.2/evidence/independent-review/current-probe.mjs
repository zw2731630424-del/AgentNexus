import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
const workspace = process.env.AGENTNEXUS_REVIEW_WORKSPACE;
const base = process.env.AGENTNEXUS_TEST_DATA_ROOT;
const destination = process.env.AGENTNEXUS_REVIEW_EVIDENCE;
if (!workspace || !base || !destination) throw new Error('Review paths are required');
const { openHost } = await import(pathToFileURL(join(workspace, 'src/agentnexus/host.ts')));
const { intentHash } = await import(pathToFileURL(join(workspace, 'src/agentnexus/gateway.ts')));
await mkdir(base, { recursive: true });
const ID = { agent_id: 'review', project_id: 'review', task_id: 'review', session_id: 'review' };
const results = [];
const checked = async promise => { try { return { fulfilled: true, value: await promise }; } catch (error) { return { fulfilled: false, code: error.code, message: error.message }; } };

{
  const root = await mkdtemp(join(base, 'current-mode-')); const h = await openHost(root);
  const prepare = await checked(h.administration.prepareMode({ scope: {}, mode: 'ENFORCE', policy_ids: ['P.IDENTITY'], reason: 'Reaffirm the mandatory identity policy', expires_at: null }, h.administration.metadata().policy_revision));
  let commit = null;
  if (prepare.fulfilled) { const p = prepare.value; await h.administration.confirmMode(p.challenge_id, 'PREVIEW_ACK', p.preview_hash); await h.administration.confirmMode(p.challenge_id, 'RISK_ACK', p.preview_hash); commit = await checked(h.administration.commitMode(p.challenge_id, p.preview_hash)); }
  let lookup; try { lookup = { value: h.policy.modeFor('P.STYLE', {}) }; } catch (error) { lookup = { code: error.code }; }
  await h.close(); const reopen = await checked(openHost(root));
  if (reopen.fulfilled) { await reopen.value.close(); reopen.value = 'OPENED_AND_CLOSED'; }
  results.push({ probe: 'independent-owner-enforce', root, prepare, commit, lookup, reopen });
}

{
  const root = await mkdtemp(join(base, 'current-output-')); const h = await openHost(root); const a = h.bindAgent(ID);
  let finish; const pending = new Promise(resolve => { finish = resolve; }); let nextCalled = false, cleanupCalled = false;
  h.administration.registerTool({ id: 'review.output', version: '1', feature_id: 'tool.test', capability: 'LOCAL_WRITE', policy_ids: ['P.STYLE'], requires_sandbox: false, timeout_ms: 20,
    schema() {}, writer_resource: (_args, identity) => identity.project_id + ':output', execute() { return { data: null, stdout: { [Symbol.asyncIterator]() { return this; }, async next() { nextCalled = true; await pending; return { done: true }; }, return() { cleanupCalled = true; return new Promise(() => {}); } } }; }
  });
  const request = { call_id: 'output-timeout', tool_id: 'review.output', tool_version: '1', arguments: null, resource_id: 'review:output' };
  const approval_id = await h.administration.approve(intentHash(ID, request), ID, 'Exact synthetic output stream review');
  let returned = false; const run = a.request({ ...request, approval_id }).then(value => { returned = true; return value; });
  await delay(120);
  const beforeFinish = { returned, nextCalled, cleanupCalled, active: h.features.activeCount(), faulted: h.store.faulted, operations: h.store.db.prepare('SELECT state,executor_state FROM control_operations').all(), writerCount: h.store.db.prepare('SELECT count(*) AS n FROM control_writers').get().n };
  finish(); const result = await run; const afterFinish = h.administration.inspectOperation(result.operation_id);
  await delay(10); const recovery = h.store.faulted ? await checked(h.store.recover()) : { fulfilled: true, skipped: true };
  const ref = await h.administration.recordReconciliationEvidence({ kind: 'SYNTHETIC_OUTPUT_TIMEOUT', source: 'Independent local probe', description: 'Observed deadline cancellation and retained unknown output state', observation: { result, beforeFinish, afterFinish } });
  const releaseAttempt = await checked(h.administration.prepareReconciliation({ request_id: 'output-release', operation_id: result.operation_id, intent_hash: result.intent_hash, expected_revision: 0, action: 'ADJUDICATE', outcome: 'CONFIRMED_NOT_APPLIED', reason: 'Synthetic output timeout requires separate producer exit proof', evidence_refs: [ref], release_writer: true }));
  await a.close(); await h.close();
  results.push({ probe: 'output-deadline', root, timeout_ms: 20, observation_ms: 120, beforeFinish, result, afterFinish, recovery, releaseAttempt });
}

{
  const root = await mkdtemp(join(base, 'current-resolver-')); const h = await openHost(root); const a = h.bindAgent(ID);
  let resolverCalls = 0, executions = 0;
  const pause = new Int32Array(new SharedArrayBuffer(4));
  h.administration.registerTool({ id: 'review.resolver', version: '1', feature_id: 'tool.test', capability: 'LOCAL_WRITE', policy_ids: ['P.STYLE'], requires_sandbox: false,
    schema() {}, writer_resource: (_args, identity) => { resolverCalls++; if (resolverCalls === 3) Atomics.wait(pause, 0, 0, 600); return identity.project_id + ':resolver'; }, execute() { executions++; return { data: null }; }
  });
  const request = { call_id: 'resolver-delay', tool_id: 'review.resolver', tool_version: '1', arguments: null, resource_id: 'review:resolver' };
  const approval_id = await h.administration.approve(intentHash(ID, request), ID, 'Exact synthetic resolver review', 400);
  const start = Date.now(); const result = await a.request({ ...request, approval_id }); const elapsed_ms = Date.now() - start;
  const operation = h.administration.inspectOperation(result.operation_id);
  await a.close(); await h.close();
  results.push({ probe: 'resolver-must-precede-last-clock-fence', root, approval_lifetime_ms: 400, resolver_delay_ms: 600, resolverCalls, executions, elapsed_ms, result, operation });
}
await writeFile(destination, JSON.stringify({ node: process.version, created_at: new Date().toISOString(), workspace, results }, null, 2) + '\n');
console.log(JSON.stringify(results.map(r => ({ probe: r.probe, status: r.result?.status, reason: r.result?.reason, executions: r.executions, prepare: r.prepare?.code, reopen: r.reopen?.fulfilled, beforeFinish: r.beforeFinish }))));
