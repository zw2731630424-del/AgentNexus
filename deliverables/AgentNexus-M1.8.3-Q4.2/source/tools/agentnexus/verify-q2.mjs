import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const source = fileURLToPath(new URL('../../', import.meta.url));
const output = fileURLToPath(new URL('../../../../../.workflow-kit/runtime/AgentNexus-M1.8.3-Q2/verification/' + new Date().toISOString().replace(/[:.]/g, '-') + '/', import.meta.url));
await mkdir(output, { recursive: true });
async function manifest() {
  const files = [];
  async function visit(relative) {
    for (const e of await readdir(join(source, relative), { withFileTypes: true })) {
      if (['node_modules', 'dist', 'raw', '.git'].includes(e.name)) continue;
      const p = join(relative, e.name);
      if (e.isDirectory()) await visit(p);
      else files.push({ path: p.replaceAll('\\', '/'), sha256: createHash('sha256').update(await readFile(join(source, p))).digest('hex') });
    }
  }
  await visit(''); return files.sort((a, b) => a.path.localeCompare(b.path));
}
const before = await manifest(), stages = [];
async function run(name, args) {
  process.stdout.write(name + ' starting\n');
  const child = spawn(process.execPath, args, { cwd: source, shell: false, windowsHide: true, env: { ...process.env, AGENTNEXUS_TEST_DATA_ROOT: join(output, 'fixtures') }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', c => stdout += c); child.stderr.on('data', c => stderr += c);
  const exit = await new Promise(resolve => { child.on('error', () => resolve({ code: -1, signal: null })); child.on('close', (code, signal) => resolve({ code, signal })); });
  await writeFile(join(output, name + '.stdout.txt'), stdout); await writeFile(join(output, name + '.stderr.txt'), stderr);
  const stage = { name, args, ...exit, summary: stdout.split('\n').filter(s => /^# (tests|pass|fail|skipped|cancelled|duration)/.test(s)) };
  stages.push(stage); process.stdout.write(JSON.stringify(stage) + '\n');
}
const files = ['m18-vault', 'm18-ledger', 'm18-gateway', 'm18-secret-boundary', 'm18-authorization', 'm18-protocol', 'm18-review-fixes', 'm181-control', 'm181-adapter', 'm182-egress', 'm183-service', 'q2-daily'].map(n => 'tests/agentnexus/' + n + '.test.ts');
files.push(...(await readdir(join(source, 'tests/desktop'))).filter(n => n.endsWith('.test.ts')).map(n => 'tests/desktop/' + n));
await run('typecheck', ['tools/agentnexus/typecheck-m15.mjs']);
await run('affected-tests', ['--test', '--test-reporter=tap', '--test-concurrency=1', ...files]);
await run('desktop-build', ['tools/agentnexus/build-desktop.mjs']);
for (const file of ['desktop/main.mjs', 'desktop/preload.cjs', 'desktop/renderer/app.js', 'tools/agentnexus/verify-q2.mjs']) await run('syntax-' + file.replaceAll('/', '-'), ['--check', file]);
const after = await manifest(), unchanged = JSON.stringify(before) === JSON.stringify(after);
const result = { schema: 'agentnexus.q2.verification.v1', output, started_source: before, final_source: after, source_unchanged: unchanged, stages,
  scope: 'Affected source, typed protocol, independent synthetic processes and original desktop regression. Not OS security qualification.',
  real_credentials: 0, provider_requests: 0, os_qualification: 'BLOCKED', full_historical_regression: 'NOT_RERUN',
  status: stages.every(s => s.code === 0) && unchanged ? 'PASS' : 'FAIL' };
await writeFile(join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify({ output, status: result.status, source_unchanged: unchanged }) + '\n');
process.exitCode = result.status === 'PASS' ? 0 : 1;
