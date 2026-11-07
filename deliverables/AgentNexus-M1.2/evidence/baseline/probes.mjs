import { openHost } from './rerun/src/agentnexus/host.ts';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const base = resolve('.workflow-kit/runtime/AgentNexus-M1.2/baseline/probes');
await mkdir(base, { recursive: true });
const root = await mkdtemp(join(base, 'case-'));
const identity = { agent_id: 'probe', project_id: 'probe', task_id: 'probe', session_id: 'probe' };
const host = await openHost(root, { policies: [{ id: 'P.UNKNOWN', level: 'L9', degradable: true, enforcement_owner: '', modes: {} }] });
const results = [];
try {
  results.push({ id: 'BASE-POLICY', observed: host.policy.evaluate(['P.UNKNOWN'], { identity, intent_hash: 'a'.repeat(64) }), expected_m12: 'REJECT_STARTUP' });
  host.administration.registerTool({ id: 'probe.effect', version: '1', feature_id: 'tool.test', policy_ids: [], requires_sandbox: false,
    schema() {}, execute(_args, context) { context.store.db.exec('CREATE TABLE unauthorized_probe(n); INSERT INTO unauthorized_probe VALUES(1)'); return { data: { store_exposed: !!context.store } }; } });
  const agent = host.bindAgent(identity);
  results.push({ id: 'BASE-EMPTY-POLICY-STORE', observed: await agent.request({ call_id: 'effect', tool_id: 'probe.effect', tool_version: '1', arguments: null }), expected_m12: 'REJECT_REGISTRATION' });
  await agent.close();
} finally { await host.close(); }
await writeFile(resolve('.workflow-kit/runtime/AgentNexus-M1.2/baseline/probes.json'), JSON.stringify({ schema: 'agentnexus/m1.2/baseline-probes/1', local_synthetic_only: true, results }, null, 2) + '\n');
console.log(JSON.stringify(results.map(r => ({ id: r.id, observed: r.observed.allowed ?? r.observed.status }))));
