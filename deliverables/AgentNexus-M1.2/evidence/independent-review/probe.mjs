import { openHost } from './workspace/src/agentnexus/host.ts';
import { intentHash } from './workspace/src/agentnexus/gateway.ts';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const base = process.env.AGENTNEXUS_TEST_DATA_ROOT;
if (!base) throw new Error('Dedicated AGENTNEXUS_TEST_DATA_ROOT is required');
await mkdir(base, { recursive: true });
const ID = { agent_id: 'review', project_id: 'review', task_id: 'review', session_id: 'review' };
const results = [];
const errorCode = async promise => { try { return { fulfilled: true, value: await promise }; } catch (error) { return { fulfilled: false, code: error.code, message: error.message }; } };

// No raw database mutation: public administrative methods accept and persist an
// ENFORCE request that the same runtime later rejects on restart.
{
  const root = await mkdtemp(join(base, 'enforce-'));
  const h = await openHost(root);
  const p = await h.administration.prepareMode({ scope: {}, mode: 'ENFORCE', policy_ids: ['P.IDENTITY'], reason: 'Reaffirm the mandatory identity policy', expires_at: null }, h.administration.metadata().policy_revision);
  await h.administration.confirmMode(p.challenge_id, 'PREVIEW_ACK', p.preview_hash);
  await h.administration.confirmMode(p.challenge_id, 'RISK_ACK', p.preview_hash);
  const commit = await errorCode(h.administration.commitMode(p.challenge_id, p.preview_hash));
  let lookup; try { lookup = { value: h.policy.modeFor('P.STYLE', {}) }; } catch (error) { lookup = { code: error.code }; }
  await h.close();
  const reopen = await errorCode(openHost(root));
  if (reopen.fulfilled) await reopen.value.close();
  results.push({ probe: 'enforce-independent-owner-persists-unreadable-state', root, commit, lookup, reopen });
}

// The handler fulfills immediately; only stdout is pending. Observe whether the
// registered timeout is still effective while consuming this trusted output.
{
  const root = await mkdtemp(join(base, 'output-'));
  const h = await openHost(root); const a = h.bindAgent(ID);
  let finish; const pending = new Promise(resolve => { finish = resolve; });
  let nextCalled = false;
  h.administration.registerTool({ id: 'review.output', version: '1', feature_id: 'tool.test', capability: 'LOCAL_WRITE', policy_ids: ['P.STYLE'], requires_sandbox: false, timeout_ms: 20,
    schema() {}, writer_resource: (_args, identity) => identity.project_id + ':output',
    execute() { return { data: null, stdout: { [Symbol.asyncIterator]() { return this; }, async next() { nextCalled = true; await pending; return { done: true }; } } }; }
  });
  const request = { call_id: 'output-timeout', tool_id: 'review.output', tool_version: '1', arguments: null };
  const approval_id = await h.administration.approve(intentHash(ID, request), ID, 'Exact synthetic output stream review');
  let returned = false; const run = a.request({ ...request, approval_id }).then(value => { returned = true; return value; });
  await delay(120);
  const beforeFinish = { returned, nextCalled, active: h.features.activeCount(), operations: h.store.db.prepare('SELECT state,executor_state FROM control_operations').all(), writerCount: h.store.db.prepare('SELECT count(*) AS n FROM control_writers').get().n };
  finish(); const result = await run;
  const afterFinish = h.administration.inspectOperation(result.operation_id);
  await a.close(); await h.close();
  results.push({ probe: 'output-producer-outlives-tool-timeout', root, timeout_ms: 20, observed_after_ms: 120, beforeFinish, result, afterFinish });
}

await writeFile(new URL('./probe-results.json', import.meta.url), JSON.stringify({ node: process.version, created_at: new Date().toISOString(), results }, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
