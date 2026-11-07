import { fileURLToPath } from 'node:url';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { openHost } from './host.ts';

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== 'demo') {
    process.stdout.write('Usage: node src/agentnexus/cli.ts demo\n'); process.exitCode = 2; return;
  }
  const base = fileURLToPath(new URL('../../.workflow-kit/runtime/AgentNexus-v0.4-M1/demos/', import.meta.url));
  await mkdir(base, { recursive: true });
  const root = await mkdtemp(join(base, 'local-'));
  const host = await openHost(root);
  const agent = host.bindAgent({ agent_id: 'demo-agent', project_id: 'demo-project', task_id: 'demo-task', session_id: 'demo-session' });
  try {
    const echo = await agent.request({ call_id: 'echo-1', tool_id: 'native.echo', tool_version: '1', arguments: { message: 'AgentNexus native M1', real_model: false } });
    const diagnostics = await agent.request({ call_id: 'json-1', tool_id: 'native.diagnostics', tool_version: '1', arguments: { language: 'json', source: '{"broken":}', document_uri: 'memory:demo.json', version: 1 } });
    const timeline = agent.reconstructTask();
    const verification = await host.store.verify();
    process.stdout.write(JSON.stringify({
      scope: 'Real local broker/SQLite/artifact/JSON checks with synthetic inputs; no model or shell execution',
      root, deployment: host.deployment, echo, diagnostics,
      reconstruction: { events: timeline.records.length, next_cursor: timeline.next_cursor, replay: timeline.replay }, verification,
    }, null, 2) + '\n');
    if (echo.status !== 'PASS' || diagnostics.status !== 'PASS' || (diagnostics.data as any)?.status !== 'FAIL') process.exitCode = 1;
  } finally { await agent.close(); await host.close(); }
}
main().catch(error => { process.stderr.write(`${error.code ?? error.name}: ${error.message}\n`); process.exitCode = 1; });
