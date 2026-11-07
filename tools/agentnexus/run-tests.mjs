import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../../', import.meta.url));
const files = readdirSync(new URL('../../tests/agentnexus/', import.meta.url))
  .filter(name => name.endsWith('.test.ts')).sort().map(name => `tests/agentnexus/${name}`);
if (!files.length) throw new Error('No AgentNexus tests found');
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap', ...files], { cwd: root, stdio: 'inherit', shell: false });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
