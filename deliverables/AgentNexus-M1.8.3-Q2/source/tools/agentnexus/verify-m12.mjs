import { mkdir, cp, readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve, relative } from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = fileURLToPath(new URL('../../', import.meta.url));
const stamp = new Date().toISOString().replace(/[:.]/g, '-') + '-' + process.pid;
const out = join(root, '.workflow-kit/runtime/AgentNexus-M1.2/verification', stamp), sandbox = join(out, 'workspace');
const dataRoot = join(root, '.workflow-kit/runtime/AgentNexus-M1.2/data', Date.now().toString(36) + '-' + process.pid);
await mkdir(sandbox, { recursive: true });
for (const name of ['src','tests','tools','config','package.json']) await cp(join(root, name), join(sandbox, name), { recursive: true, errorOnExist: true, force: false });
const files = [];
async function inventory(base) {
  const entries = await readdir(base, { withFileTypes: true });
  for (const entry of entries.sort((a,b) => a.name.localeCompare(b.name))) {
    const p = join(base, entry.name);
    if (entry.isDirectory()) await inventory(p);
    else if (entry.isFile()) { const bytes = await readFile(p); files.push({ path: relative(sandbox, p).replaceAll('\\','/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }); }
    else throw new Error('Non-regular source entry');
  }
}
await inventory(sandbox);
await writeFile(join(out, 'source-manifest.json'), JSON.stringify({ version: JSON.parse(await readFile(join(sandbox, 'package.json'), 'utf8')).version, files }, null, 2) + '\n');
const tests = (await readdir(join(sandbox, 'tests/agentnexus'))).filter(x => x.endsWith('.test.ts')).sort().map(x => 'tests/agentnexus/' + x);
const started_at = new Date().toISOString();
const child = spawn(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap', '--test-reporter=./tools/agentnexus/json-reporter.mjs', '--test-reporter-destination=../all-tests.tap', '--test-reporter-destination=../events.jsonl', ...tests], { cwd: sandbox, shell: false, windowsHide: true, env: { ...process.env, NODE_OPTIONS: '', NODE_PATH: '', AGENTNEXUS_TEST_DATA_ROOT: dataRoot }, stdio: ['ignore','pipe','pipe'] });
const stdout = [], stderr = []; child.stdout.on('data', b => stdout.push(b)); child.stderr.on('data', b => stderr.push(b));
const exit_code = await new Promise((done, reject) => { child.once('error', reject); child.once('exit', done); });
await writeFile(join(out, 'runner.stdout.txt'), Buffer.concat(stdout)); await writeFile(join(out, 'runner.stderr.txt'), Buffer.concat(stderr));
const events = (await readFile(join(out, 'events.jsonl'), 'utf8')).trim().split('\n').filter(Boolean).map(x => JSON.parse(x));
const summaries = events.filter(x => x.type === 'test:summary'); const summary = summaries.at(-1);
const cases = events.filter(x => ['test:pass','test:fail'].includes(x.type));
const result = { schema: 'agentnexus/m1.2/verification/1', started_at, ended_at: new Date().toISOString(), exit_code, node: process.version, platform: process.platform, test_files: tests, summary, cases, isolated_workspace: relative(root, sandbox).replaceAll('\\','/'), test_data_root: dataRoot, source_manifest: 'source-manifest.json', real_model: false, os_sandbox: 'BLOCKED', os_identity: 'NOT_RUN' };
await writeFile(join(out, 'results.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ output: resolve(out), exit_code, summary })); process.exitCode = exit_code ?? 1;
