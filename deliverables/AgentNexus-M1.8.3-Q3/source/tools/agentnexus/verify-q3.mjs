import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
const source = fileURLToPath(new URL('../../', import.meta.url));
const output = fileURLToPath(new URL('../../../../../.workflow-kit/runtime/AgentNexus-M1.8.3-Q3/verification/' + new Date().toISOString().replace(/[:.]/g, '-') + '/', import.meta.url));
await mkdir(output, { recursive: true });
async function manifest() {
  const files = [];
  async function visit(relative) {
    for (const e of await readdir(join(source, relative), { withFileTypes: true })) {
      if (['node_modules', 'dist', 'raw', '.git'].includes(e.name)) continue;
      const path = join(relative, e.name);
      if (e.isDirectory()) await visit(path);
      else files.push({ path: path.replaceAll('\\', '/'), sha256: createHash('sha256').update(await readFile(join(source, path))).digest('hex') });
    }
  }
  await visit(''); return files.sort((a, b) => a.path.localeCompare(b.path));
}
const before = await manifest(), stages = [];
async function run(name, executable, args) {
  console.log(name + ' starting');
  const child = spawn(executable, args, { cwd: source, shell: false, windowsHide: true, env: { ...process.env, AGENTNEXUS_TEST_DATA_ROOT: join(output, 'fixtures') }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', b => stdout += b); child.stderr.on('data', b => stderr += b);
  const exit = await new Promise(resolve => { child.on('error', e => resolve({ code: -1, error: e.code })); child.on('close', (code, signal) => resolve({ code, signal })); });
  await writeFile(join(output, name + '.stdout.txt'), stdout); await writeFile(join(output, name + '.stderr.txt'), stderr);
  const stage = { name, executable, args, ...exit, summary: stdout.split('\n').filter(s => /^# (tests|pass|fail|skipped|cancelled|duration)/.test(s)) };
  stages.push(stage); console.log(JSON.stringify(stage));
}
const node = process.execPath, pwsh = process.env.AGENTNEXUS_POWERSHELL ?? (existsSync('C:\\Program Files\\PowerShell\\7\\pwsh.exe') ? 'C:\\Program Files\\PowerShell\\7\\pwsh.exe' : 'pwsh.exe');
await run('typecheck', node, ['tools/agentnexus/typecheck-m15.mjs']);
for (const file of ['credential-service/build.ps1', 'credential-helper/build.ps1', 'credential-launcher/build.ps1', 'credential-helper/build-synthetic-ui.ps1']) await run('native-' + file.replaceAll('/', '-'), pwsh, ['-NoProfile', '-File', 'native/' + file]);
const files = ['m18-vault', 'm18-ledger', 'm18-gateway', 'm18-secret-boundary', 'm18-authorization', 'm18-protocol', 'm18-review-fixes', 'm181-control', 'm181-adapter', 'm182-egress', 'm183-service', 'q2-daily', 'q3-stack'].map(n => 'tests/agentnexus/' + n + '.test.ts');
files.push(...(await readdir(join(source, 'tests/desktop'))).filter(n => n.endsWith('.test.ts')).map(n => 'tests/desktop/' + n));
await run('affected-tests', node, ['--test', '--test-reporter=tap', '--test-concurrency=1', ...files]);
await run('desktop-build', node, ['tools/agentnexus/build-desktop.mjs']);
for (const file of ['desktop/main.mjs', 'desktop/preload.cjs', 'desktop/trusted-entry.mjs', 'desktop/renderer/app.js', 'tools/agentnexus/verify-q3.mjs', 'tools/agentnexus/q3-desktop-e2e.mjs']) await run('syntax-' + file.replaceAll('/', '-'), node, ['--check', file]);
if (process.env.Q3_RUN_SYNTHETIC_HELPER_UI === '1') await run('desktop-e2e', node, ['tools/agentnexus/q3-desktop-e2e.mjs']);
const after = await manifest(), unchanged = JSON.stringify(before) === JSON.stringify(after);
const result = { schema: 'agentnexus.q3.verification.v1', output, source_unchanged: unchanged, started_source: before, final_source: after, stages,
  scope: 'Affected regression + actual same-SID synthetic processes/UI when requested; native compilation/pure tests. Not deployed OS qualification.',
  real_credentials: 0, provider_requests: 0, real_windows_os_qualification: 'NOT_RUN', full_historical_regression: 'NOT_RERUN',
  status: stages.every(s => s.code === 0) && unchanged ? 'PASS' : 'FAIL' };
await writeFile(join(output, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify({ output, status: result.status, source_unchanged: unchanged })); process.exitCode = result.status === 'PASS' ? 0 : 1;
