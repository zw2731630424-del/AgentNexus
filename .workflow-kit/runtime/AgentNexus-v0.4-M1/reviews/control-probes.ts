import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

// Read-only product review; all state and clock overrides are synthetic/owned.
const root = resolve('.');
const out = resolve('.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews');
const names = ['types', 'control', 'features', 'policy', 'gateway', 'host', 'storage', 'diagnostics'];
async function fingerprints() {
  return Object.fromEntries(await Promise.all(names.map(async name => [
    `src/agentnexus/${name}.ts`, createHash('sha256').update(await readFile(join(root, `src/agentnexus/${name}.ts`))).digest('hex'),
  ])));
}
const before = await fingerprints();
const { openHost } = await import(pathToFileURL(join(root, 'src/agentnexus/host.ts')).href);
const { intentHash } = await import(pathToFileURL(join(root, 'src/agentnexus/gateway.ts')).href);
await mkdir(out, { recursive: true });
const observations: Record<string, unknown> = {};
const scopes = ['G','P','A','T'];
const def = (id: string, state = 'ON') => ({ id, kind: 'OPTIONAL', default: state, scopes, depends_on: [], conflicts: [] });
const identity = { agent_id: 'review-a', project_id: 'review-project', task_id: 'review-task', session_id: 'review-session' };
async function create(definitions: any[], policies: any[] = []) {
  const state = await mkdtemp(join(out, 'control-state-'));
  return { host: await openHost(state, { definitions, policies }), state };
}
async function change(host: any, changes: any[]) {
  const p = await host.administration.previewFeatures(changes, host.administration.metadata().feature_revision);
  await host.administration.commitFeatures(p.challenge_id, p.preview_hash);
}

{
  const { host, state } = await create([def('review.optional', 'OFF')]);
  let stops = 0;
  host.administration.registerModule('review.optional', { stop: async () => { stops++; } });
  await change(host, [{ id: 'review.optional', scope: {}, state: 'ON' }]);
  const lease = host.features.acquire('review.optional');
  let failure = '';
  try { await change(host, [{ id: 'review.optional', scope: {}, state: 'INHERIT' }]); }
  catch (error) { failure = (error as any).code ?? String(error); }
  observations.inherit_to_off = { state_store: state, failure, resolved: host.features.resolve('review.optional'),
    active_count: host.features.activeCount(), lease_aborted: lease.signal.aborted, stop_calls: stops };
  lease.release(); await host.close();
}

{
  const { host, state } = await create([def('tool.test'), def('devint.runtime')]);
  const agent = host.bindAgent(identity);
  const lease = host.features.acquire('devint.runtime');
  let failed = '';
  try { await change(host, [{ id: 'devint.runtime', scope: {}, state: 'OFF' }]); }
  catch (error) { failed = (error as any).code ?? String(error); }
  const failedState = host.features.resolve('devint.runtime'); lease.release();
  const result = await agent.request({ call_id: 'diagnostics-after-failure', tool_id: 'native.diagnostics', tool_version: '1', arguments: {
    language: 'json', source: '{"synthetic":true}', document_uri: 'review://runtime-blocked.json', version: 1,
  } });
  observations.diagnostics_after_failed_stop = { state_store: state, stop_failure: failed, runtime: failedState, result };
  await agent.close(); await host.close();
}

{
  const policy = { id: 'REVIEW.APPROVAL', level: 'L1', degradable: true, enforcement_owner: 'PDP', modes: {} };
  const { host, state } = await create([def('tool.test')], [policy]);
  let executions = 0;
  host.administration.registerTool({ id: 'review.approved', version: '1', feature_id: 'tool.test', policy_ids: ['REVIEW.APPROVAL'], requires_sandbox: false,
    schema: () => {}, execute: () => { executions++; return { data: { synthetic: true } }; } });
  const agent = host.bindAgent(identity);
  const request = { call_id: 'expired-unused-approval', tool_id: 'review.approved', tool_version: '1', arguments: null };
  const hash = intentHash(identity, request);
  const id = await host.administration.approve(hash, identity, 'Synthetic expiry review only', 100);
  const initiallyValid = host.policy.approvalValid(id, hash, identity);
  await delay(160);
  const expired = host.policy.approvalValid(id, hash, identity);
  const actualNow = Date.now; let revived = false, result: unknown;
  try {
    Date.now = () => actualNow() - 10000;
    revived = host.policy.approvalValid(id, hash, identity);
    result = await agent.request({ ...request, approval_id: id });
  } finally { Date.now = actualNow; }
  observations.expired_approval_clock_rollback = { state_store: state,
    clock_scope: 'logical Date.now override in owned probe process; not OS-clock verification',
    initially_valid: initiallyValid, valid_after_actual_expiry: expired, valid_after_clock_rollback: revived,
    handler_executions: executions, result };
  await agent.close(); await host.close();
}

{
  const { host, state } = await create([def('tool.test')]);
  const original = host.bindAgent(identity); await original.close();
  const replacement = host.bindAgent(identity);
  await replacement.request({ call_id: 'new-binding', tool_id: 'native.echo', tool_version: '1', arguments: { marker: 'new-binding-synthetic-data' } });
  let oldContext: any[] = [], oldAudit: any = { records: [] }, contextError = '', auditError = '';
  try { oldContext = original.context(); } catch (error) { contextError = (error as any).code ?? String(error); }
  try { oldAudit = original.reconstructTask(); } catch (error) { auditError = (error as any).code ?? String(error); }
  await original.close(); let replacementAfterOldClose: unknown;
  try { replacementAfterOldClose = await replacement.request({ call_id: 'after-old-close', tool_id: 'native.echo', tool_version: '1', arguments: null }); }
  catch (error) { replacementAfterOldClose = { code: (error as any).code ?? String(error) }; }
  observations.closed_facade = { state_store: state, old_context_rows: oldContext.length, old_audit_rows: oldAudit.records.length, context_error: contextError, audit_error: auditError,
    old_context_session_ids: oldContext.map((r: any) => r.body.session_id), replacement_after_old_close: replacementAfterOldClose };
  await host.close();
}

{
  const { host, state } = await create([def('tool.test')]);
  const a = host.bindAgent(identity);
  const b = host.bindAgent({ ...identity, agent_id: 'review-b', session_id: 'review-session-b' });
  await a.request({ call_id: 'agent-a-data', tool_id: 'native.echo', tool_version: '1', arguments: { marker: 'agent-a-synthetic-data' } });
  const context = b.context();
  observations.same_task_other_agent_read = { state_store: state, other_agent_context_rows: context.length,
    returned_agent_ids: context.map((r: any) => r.body.agent_id), classification: 'contract confirmation needed: task-wide sharing vs agent-private context' };
  await a.close(); await b.close(); await host.close();
}

{
  const { host, state } = await create([def('tool.test')]);
  const a = host.bindAgent(identity);
  const closing = a.close();
  let concurrent: unknown;
  try { concurrent = await a.request({ call_id: 'during-session-close', tool_id: 'native.echo', tool_version: '1', arguments: { synthetic: true } }); }
  catch (error) { concurrent = { code: (error as any).code ?? String(error) }; }
  await closing;
  observations.session_close_request_race = { state_store: state, request_after_close_started: concurrent };
  await host.close();
}

{
  const { host, state } = await create([def('tool.test')]);
  const a = host.bindAgent(identity);
  const actualNow = Date.now;
  let resolveOutput: (value: unknown) => void = () => {};
  let acknowledgeInvocation: () => void = () => {};
  const invocation = new Promise<void>(resolve => { acknowledgeInvocation = resolve; });
  let requestSettled = false;
  host.administration.registerTool({ id: 'review.timeout-clock', version: '1', feature_id: 'tool.test', policy_ids: [], requires_sandbox: false,
    timeout_ms: 20, schema: () => {}, execute: () => {
      Date.now = () => actualNow() - 10000;
      acknowledgeInvocation();
      return new Promise(resolve => { resolveOutput = resolve; });
    } });
  const pending = a.request({ call_id: 'timeout-clock-rollback', tool_id: 'review.timeout-clock', tool_version: '1', arguments: null })
    .then((value: unknown) => { requestSettled = true; return value; });
  let settledAfter80ms = false, result: unknown;
  try {
    await invocation; await delay(80); settledAfter80ms = requestSettled;
  } finally { Date.now = actualNow; resolveOutput({ data: { synthetic: true } }); }
  result = await pending; await delay(0);
  observations.handler_timeout_clock = { state_store: state,
    clock_scope: 'logical Date.now override in owned probe; not OS clock verification', timeout_ms: 20,
    request_settled_after_80ms: settledAfter80ms, result };
  await a.close(); await host.close();
}

const after = await fingerprints();
const changed = Object.keys(before).filter(key => before[key] !== after[key]);
const report = { schema: 'agentnexus/m1/control-review-probes/1', captured_utc: new Date().toISOString(),
  before_sha256: before, after_sha256: after, source_changed_during_probe: changed,
  observations, final_product_acceptance: 'PENDING_ROOT_FINAL_TESTS', product_files_modified: false };
await writeFile(join(out, 'control-probes.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ source_changed_during_probe: changed,
  inherit: observations.inherit_to_off,
  closed: observations.closed_facade,
  isolation: observations.same_task_other_agent_read,
  close_race: observations.session_close_request_race,
  timeout: observations.handler_timeout_clock,
}, null, 2));
