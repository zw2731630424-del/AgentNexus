import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

// Final read-only product review: only CTRL-008 is dynamically rerun. Earlier
// unchanged seven cases remain bound to their separate evidence snapshots.
const root = resolve('.');
const out = resolve('.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews');
const names = ['types', 'control', 'features', 'policy', 'gateway', 'host', 'storage', 'diagnostics'];
async function hashes() {
  return Object.fromEntries(await Promise.all(names.map(async name => [
    `src/agentnexus/${name}.ts`, createHash('sha256').update(await readFile(join(root, `src/agentnexus/${name}.ts`))).digest('hex'),
  ])));
}
await mkdir(out, { recursive: true });
const before = await hashes();
const { openHost } = await import(pathToFileURL(join(root, 'src/agentnexus/host.ts')).href);
const state = await mkdtemp(join(out, 'final-stop-recovery-'));
const definition = { id: 'review.lifecycle', kind: 'OPTIONAL', default: 'ON', scopes: ['G','P','A','T'], depends_on: [], conflicts: [] };
const host = await openHost(state, { definitions: [definition], policies: [] });
let releaseStop: () => void = () => {};
const stopDone = new Promise<void>(resolve => { releaseStop = resolve; });
let ready = true, preflights = 0, stopSettled = false;
host.administration.registerModule(definition.id, {
  stop: async () => { await stopDone; ready = false; stopSettled = true; },
  preflight: async () => { preflights++; ready = true; },
});
const observations: Record<string, unknown> = {};
let failure: unknown = null;
try {
  const prepared = await host.administration.previewFeatures([{ id: definition.id, scope: {}, state: 'OFF' }], 0);
  let stopFailure = '';
  try { await host.administration.commitFeatures(prepared.challenge_id, prepared.preview_hash); }
  catch (error) { stopFailure = (error as any).code ?? String(error); }
  assert.equal(stopFailure, 'DRAIN_TIMEOUT');
  assert.equal(host.features.resolve(definition.id).effective, 'BLOCKED');
  assert.equal(host.features.activeCount(), 1);
  let recoveryFailure = '';
  try { await host.administration.recoverModule(definition.id); }
  catch (error) { recoveryFailure = (error as any).code ?? String(error); }
  assert.equal(recoveryFailure, 'MODULE_STOP_PENDING');
  const enabling = await host.administration.previewFeatures([{ id: definition.id, scope: {}, state: 'ON' }], 0);
  let enablingFailure = '';
  try { await host.administration.commitFeatures(enabling.challenge_id, enabling.preview_hash); }
  catch (error) { enablingFailure = (error as any).code ?? String(error); }
  assert.equal(enablingFailure, 'MODULE_STOP_PENDING');
  assert.equal(preflights, 0);
  observations.pending = { stop_failure: stopFailure, recovery_failure: recoveryFailure,
    enabling_failure: enablingFailure, active_count: host.features.activeCount(), ready, preflights, stopSettled };
  releaseStop(); await delay(0); await host.store.flush();
  assert.equal(host.features.activeCount(), 0);
  assert.equal(host.features.resolve(definition.id).effective, 'BLOCKED', 'settlement must not automatically restore health');
  await host.administration.recoverModule(definition.id);
  await delay(0);
  assert.equal(host.features.resolve(definition.id).effective, 'ON');
  assert.equal(ready, true); assert.equal(preflights, 1); assert.equal(stopSettled, true);
  observations.recovered = { resolution: host.features.resolve(definition.id), ready, preflights, stopSettled };
} catch (error) { failure = { name: (error as any).name, code: (error as any).code, message: String(error) }; }
finally { releaseStop(); await delay(0); await host.close(); }

const gateway = await readFile(join(root, 'src/agentnexus/gateway.ts'), 'utf8');
const policy = await readFile(join(root, 'src/agentnexus/policy.ts'), 'utf8');
const guardCalls = gateway.split('\n').map((line, index) => ({ line: index + 1, text: line }))
  .filter(item => item.text.includes('this.#policy.assertModesCurrent('));
const policyMethod = policy.slice(policy.indexOf('  assertModesCurrent('), policy.indexOf('  approvalValid('));
const staticInspection = {
  mode_guard_call_lines: guardCalls.map(item => item.line),
  mode_guard_call_count: guardCalls.length,
  first_guard_before_claim_transaction: gateway.indexOf('this.#policy.assertModesCurrent(') < gateway.indexOf("UPDATE control_operations SET state='CLAIMED'"),
  second_guard_after_start_intent_flush: gateway.lastIndexOf('this.#policy.assertModesCurrent(') > gateway.indexOf("emit('START_INTENT'"),
  no_await_between_last_guard_and_handler: !gateway.slice(gateway.lastIndexOf('this.#policy.assertModesCurrent('), gateway.indexOf('completion = Promise.resolve(def.execute')).split('\n').some(line => /^\s*await\b/.test(line)),
  assert_modes_body_uses_modeFor_and_epoch: policyMethod.includes('this.modeFor(') && policyMethod.includes('policy_epoch'),
  assert_modes_body_does_not_call_PDP: !policyMethod.includes('#evaluator') && !policyMethod.includes('.evaluate('),
  consumed_permit_rechecked_before_handler: gateway.includes("'PERMIT_EXPIRED_BEFORE_START'"),
  consumed_approval_rechecked_before_handler: gateway.includes("'APPROVAL_EXPIRED_BEFORE_START'"),
  scope: 'static control-flow inspection only; root owns delayed-flush execution regressions',
};
const after = await hashes();
const changed = Object.keys(before).filter(key => before[key] !== after[key]);
const staticOk = guardCalls.length === 2 && Object.entries(staticInspection).every(([key, value]) => key === 'scope' || typeof value !== 'boolean' || value);
const report = { schema: 'agentnexus/m1/final-control-probes/1', captured_utc: new Date().toISOString(),
  status: !failure && staticOk && changed.length === 0 ? 'PASS' : 'FAIL',
  scope: 'CTRL-008 controlled Node/SQLite lifecycle plus static final expiry fences; not full product or OS admission',
  state_store: state, source_sha256_before: before, source_sha256_after: after, source_changed: changed,
  observations, failure, static_expiry_fence_inspection: staticInspection,
  root_final_suite: 'PENDING_ROOT_FINAL_RESULT', product_source_modified: false };
await writeFile(join(out, 'final-control-probes.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'PASS') process.exitCode = 1;
