import { cp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const output = dirname(fileURLToPath(import.meta.url));
const root = resolve(output, '../../../..');
const workspace = join(output, 'workspace');
await mkdir(workspace, { recursive: true });
for (const name of ['src', 'tests', 'config', 'package.json']) await cp(join(root, name), join(workspace, name), { recursive: true, force: false, errorOnExist: true });
const files = [];
async function manifest(path) {
  for (const entry of (await readdir(path, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) await manifest(full);
    else if (entry.isFile()) { const bytes = await readFile(full); files.push({ path: relative(workspace, full).replaceAll('\\', '/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }); }
    else throw new Error('Non-regular source');
  }
}
await manifest(workspace);
await writeFile(join(output, 'source-manifest.json'), JSON.stringify({ copied_at: new Date().toISOString(), root, workspace, files }, null, 2) + '\n');
const env = { ...process.env, NODE_OPTIONS: '', NODE_PATH: '', AGENTNEXUS_TEST_DATA_ROOT: join(output, 'd') };
const tests = ['security', 'reconciliation', 'gateway', 'control'].map(name => `tests/agentnexus/${name}.test.ts`);
const startedAt = new Date().toISOString();
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap', ...tests], { cwd: workspace, env, shell: false, encoding: 'utf8', timeout: 90000 });
await writeFile(join(output, 'tests.tap'), result.stdout ?? '');
await writeFile(join(output, 'tests.stderr.txt'), result.stderr ?? '');
await writeFile(join(output, 'test-result.json'), JSON.stringify({ started_at: startedAt, ended_at: new Date().toISOString(), exit_code: result.status, error: result.error ? String(result.error) : null, node: process.version, tests, data_root: env.AGENTNEXUS_TEST_DATA_ROOT }, null, 2) + '\n');
const probe = spawnSync(process.execPath, [join(output, 'probe.mjs')], { cwd: workspace, env, shell: false, encoding: 'utf8', timeout: 15000 });
await writeFile(join(output, 'probe.stdout.txt'), probe.stdout ?? '');
await writeFile(join(output, 'probe.stderr.txt'), probe.stderr ?? '');
console.log(JSON.stringify({ tests_exit: result.status, probe_exit: probe.status, output }));
process.exitCode = result.status || probe.status || (result.error || probe.error ? 1 : 0);
