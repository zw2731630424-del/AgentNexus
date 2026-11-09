import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const source = fileURLToPath(new URL('../../', import.meta.url));
const output = fileURLToPath(new URL('../../../../../.workflow-kit/runtime/AgentNexus-M1.8.3/verification/' + new Date().toISOString().replace(/[:.]/g, '-') + '/', import.meta.url));
await mkdir(output, { recursive: true });
async function manifest() {
  const files = [];
  async function visit(relative) { for (const e of await readdir(join(source, relative), { withFileTypes: true })) { if (['node_modules','dist'].includes(e.name)) continue; const p = join(relative, e.name); if (e.isDirectory()) await visit(p); else files.push({ path: p.replaceAll('\\','/'), sha256: createHash('sha256').update(await readFile(join(source, p))).digest('hex') }); } }
  await visit(''); return files.sort((a,b) => a.path.localeCompare(b.path));
}
const before = await manifest();
const files = ['m18-vault','m18-ledger','m18-gateway','m18-secret-boundary','m18-authorization','m18-protocol','m18-review-fixes','m181-control','m181-adapter','m182-egress','m183-service'].map(n => 'tests/agentnexus/' + n + '.test.ts').concat(['tests/desktop/service.test.ts','tests/desktop/isolated.test.ts']);
const stages = [];
async function run(name, args) {
  const child = spawn(process.execPath, args, { cwd: source, shell: false, windowsHide: true,
    env: { ...process.env, AGENTNEXUS_TEST_DATA_ROOT: join(output, 'fixtures') }, stdio: ['ignore','pipe','pipe'] });
  let stdout = '', stderr = ''; child.stdout.on('data', c => stdout += c); child.stderr.on('data', c => stderr += c);
  const exit = await new Promise(resolve => child.on('close', (code, signal) => resolve({ code, signal })));
  await writeFile(join(output, name + '.stdout.txt'), stdout); await writeFile(join(output, name + '.stderr.txt'), stderr);
  stages.push({ name, args, ...exit, summary: stdout.split('\n').filter(s => /^# (tests|pass|fail|skipped|cancelled|duration)/.test(s)) });
}
await run('typecheck', ['tools/agentnexus/typecheck-m15.mjs']);
await run('affected-tests', ['--test','--test-reporter=tap','--test-concurrency=1', ...files]);
await run('desktop-build', ['tools/agentnexus/build-desktop.mjs']);
for (const file of ['desktop/main.mjs','desktop/preload.cjs','desktop/renderer/app.js','tools/agentnexus/verify-m183.mjs']) await run('syntax-' + file.replaceAll('/','-'), ['--check', file]);
const after = await manifest();
const result = { schema: 1, output, started_source: before, final_source: after, source_unchanged: JSON.stringify(before) === JSON.stringify(after), stages,
  scope: 'Affected M1.8/M1.8.1/M1.8.2 and desktop regression plus M1.8.3. No OS isolation qualification or live network.', real_provider_requests: 0, real_credentials_imported: 0,
  full_historical_regression: 'NOT_RERUN; historical 695-item FAIL remains preserved', status: stages.every(s => s.code === 0) && JSON.stringify(before) === JSON.stringify(after) ? 'PASS' : 'FAIL' };
await writeFile(join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ output, status: result.status, source_unchanged: result.source_unchanged, stages }, null, 2));
process.exitCode = result.status === 'PASS' ? 0 : 1;
