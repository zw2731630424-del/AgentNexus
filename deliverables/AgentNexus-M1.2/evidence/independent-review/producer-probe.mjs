import { mkdir, mkdtemp, writeFile, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const workspace = process.env.AGENTNEXUS_REVIEW_WORKSPACE ?? new URL('./workspace/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const { openHost } = await import(pathToFileURL(join(workspace, 'src/agentnexus/host.ts')));
const { intentHash } = await import(pathToFileURL(join(workspace, 'src/agentnexus/gateway.ts')));
const base = process.env.AGENTNEXUS_TEST_DATA_ROOT;
if (!base) throw new Error('Dedicated AGENTNEXUS_TEST_DATA_ROOT is required');
await mkdir(base, { recursive: true });
const root = await mkdtemp(join(base, 'producer-'));
const ID = { agent_id: 'review', project_id: 'review', task_id: 'review', session_id: 'review' };
const describeError = async promise => { try { return { fulfilled: true, value: await promise }; } catch (error) { return { fulfilled: false, code: error.code, message: error.message }; } };
let cleanupCalled = false;
const h = await openHost(root); const a = h.bindAgent(ID);
h.administration.registerTool({ id: 'review.producer', version: '1', feature_id: 'tool.test', capability: 'LOCAL_WRITE', policy_ids: ['P.STYLE'], requires_sandbox: false,
  schema() {}, writer_resource: (_args, identity) => identity.project_id + ':producer',
  execute() { return { data: null, stdout: { [Symbol.asyncIterator]() { return this; }, next() { return Promise.reject(new Error('Producer failed before confirmed cleanup')); }, return() { cleanupCalled = true; return new Promise(() => {}); } } }; }
});
const request = { call_id: 'unknown-output', tool_id: 'review.producer', tool_version: '1', arguments: null,
  ...(process.env.AGENTNEXUS_REVIEW_RESOURCE === '1' ? { resource_id: 'review:producer' } : {}) };
const approval_id = await h.administration.approve(intentHash(ID, request), ID, 'Exact synthetic producer review');
const result = await a.request({ ...request, approval_id });
const before = h.administration.inspectOperation(result.operation_id);
const ref = await h.administration.recordReconciliationEvidence({ kind: 'SYNTHETIC_PRODUCER_FAILURE', source: 'Independent local probe', description: 'Observed stream failure without a producer cleanup acknowledgement', observation: { operation_id: result.operation_id, intent_hash: result.intent_hash, cleanupCalled } });
const reconciliation = { request_id: 'producer-final', operation_id: result.operation_id, intent_hash: result.intent_hash, expected_revision: 0, action: 'ADJUDICATE', outcome: 'CONFIRMED_NOT_APPLIED', reason: 'No world effect was present in the synthetic handler', evidence_refs: [ref], release_writer: true };
const releaseAttempt = await describeError(h.administration.prepareReconciliation(reconciliation));
const prepared = await h.administration.prepareReconciliation({ ...reconciliation, release_writer: false });
const retained = await h.administration.commitReconciliation(prepared.challenge_id, prepared.preview_hash);
const incomplete = [];
for (const name of await readdir(join(root, 'artifacts/partials'))) if (name.endsWith('.incomplete.json')) incomplete.push(JSON.parse(await readFile(join(root, 'artifacts/partials', name), 'utf8')));
await a.close(); await h.close();
const reopened = await openHost(root);
const afterReopen = reopened.administration.inspectOperation(result.operation_id);
const secondRelease = await describeError(reopened.administration.prepareReconciliation({ ...reconciliation, request_id: 'producer-release', action: 'RELEASE_WRITER', expected_revision: 1 }));
await reopened.close();
const evidence = { node: process.version, created_at: new Date().toISOString(), workspace, root, cleanupCalled, result, before, releaseAttempt, retained, incomplete, afterReopen, secondRelease };
await writeFile(process.env.AGENTNEXUS_REVIEW_EVIDENCE ?? new URL('./producer-results.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ status: result.status, executor: before.executor_state, writerRetained: !!before.writer, releaseAttempt, secondRelease, cleanupCalled }));
