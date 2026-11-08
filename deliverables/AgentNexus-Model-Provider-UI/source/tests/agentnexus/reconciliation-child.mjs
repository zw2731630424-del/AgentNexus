import { openHost } from '../../src/agentnexus/host.ts';
import { intentHash } from '../../src/agentnexus/gateway.ts';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const [root, scenario] = process.argv.slice(2);
setInterval(() => {}, 1000); // Keep the exact crash window alive until the parent confirms termination.
const identity = { agent_id: 'reconcile-worker', project_id: 'reconcile-project', task_id: 'reconcile-task', session_id: 'reconcile-session' };
const request = { call_id: 'original', tool_id: 'reconcile.effect', tool_version: '1', resource_id: identity.project_id + ':effect', arguments: { synthetic: true } };
const host = await openHost(root);
const hold = () => new Promise(() => {});
const signalWindow = () => {
  const op = host.store.db.prepare('SELECT operation_id,intent_hash,state,executor_state FROM control_operations LIMIT 1').get();
  writeFileSync(join(root, 'window.json'), JSON.stringify({ scenario, ...op }));
};
host.administration.registerTool({ id: 'reconcile.effect', version: '1', feature_id: 'tool.test', capability: 'LOCAL_WRITE', policy_ids: ['P.COMMAND_RISK'], requires_sandbox: false,
  writer_resource: (_args, id) => id.project_id + ':effect', schema() {}, execute() {
    writeFileSync(join(root, 'effect.txt'), '1');
    if (scenario === 'after-call-before-started') { signalWindow(); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0); }
    return { data: { written: true } };
  } });
const original = host.store.flush.bind(host.store);
host.store.flush = async () => {
  await original();
  const op = host.store.db.prepare('SELECT state,executor_state FROM control_operations LIMIT 1').get(); if (!op) return;
  const stop = (scenario === 'before-call' && op.state === 'CLAIMED' && op.executor_state === 'NOT_INVOKED')
    || (scenario === 'handler-before-result' && op.state === 'STARTED' && op.executor_state === 'SETTLED')
    || (scenario === 'result-before-ack' && op.state === 'RESULT_RECORDED')
    || (scenario === 'ack-before-delivery' && op.state === 'SUCCEEDED');
  if (stop) { signalWindow(); await hold(); }
};
const approval_id = await host.administration.approve(intentHash(identity, request), identity, 'Explicit local child crash fixture');
await host.bindAgent(identity).request({ ...request, approval_id });
throw new Error('Expected crash window was missed');
