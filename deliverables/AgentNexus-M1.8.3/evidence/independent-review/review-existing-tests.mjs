// Review-only runner: hashes the candidate and runs the supplied synthetic tests.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

const source = fileURLToPath(new URL('../../source/', import.meta.url));
const out = fileURLToPath(new URL('./', import.meta.url));
async function manifest() {
  const names = [];
  async function visit(path = '') {
    for (const entry of await readdir(source + path, { withFileTypes: true })) {
      const relative = path + entry.name;
      if (entry.isDirectory()) { if (!['node_modules', 'dist', 'raw', '.git'].includes(entry.name)) await visit(relative + '/'); }
      else if (entry.isFile()) names.push(relative);
      else throw Error('SOURCE_LINK_OR_SPECIAL_FILE');
    }
  }
  await visit(); names.sort();
  return Promise.all(names.map(async path => { const data = await readFile(new URL('../../source/' + path, import.meta.url)); return { path, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') }; }));
}
const at = new Date().toISOString(), suffix = at.replace(/[:.]/g, '-'), before = await manifest();
const pattern = process.argv[2];
const args = pattern ? ['--test', '--test-name-pattern', pattern, 'tests/agentnexus/m183-service.test.ts'] : ['--test', 'tests/agentnexus/m183-service.test.ts', 'tests/desktop/isolated.test.ts'];
const child = spawn(process.execPath, args, { cwd: source, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let stdout = '', stderr = '';
child.stdout.on('data', data => { stdout += data; }); child.stderr.on('data', data => { stderr += data; });
const result = await new Promise(resolve => { child.once('error', error => resolve({ error: error.code ?? 'RUN_ERROR' })); child.once('close', (code, signal) => resolve({ code, signal })); });
const after = await manifest();
const setHash = rows => createHash('sha256').update(rows.map(row => row.path + '\0' + row.sha256 + '\n').join('')).digest('hex');
const record = { at, node: process.version, command: [process.execPath, ...args], cwd: source, result, source_before: before, source_after: after, source_set_before: setHash(before), source_set_after: setHash(after), unchanged: JSON.stringify(before) === JSON.stringify(after), synthetic_tests_only: true, real_credentials_read: 0, provider_requests: 0, scope: 'Existing supplied synthetic tests only; no OS deployment or new attack probes', manifest_scope: 'All source files recursively except node_modules, dist, raw and .git' };
if (pattern) {
  const baselineFile = 'existing-tests-2026-11-08T16-18-17-301Z.json';
  const baseline = JSON.parse(await readFile(out + baselineFile, 'utf8'));
  const previous = new Map(baseline.source_after.map(row => [row.path, row]));
  record.baseline = baselineFile;
  record.delta_from_baseline = before.filter(row => JSON.stringify(previous.get(row.path)) !== JSON.stringify(row)).map(row => ({ path: row.path, previous: previous.get(row.path) ?? null, current: row }));
  record.removed_from_baseline = baseline.source_after.filter(row => !before.some(current => current.path === row.path));
}
await writeFile(out + 'existing-tests-' + suffix + '.stdout.txt', stdout, { flag: 'wx' });
await writeFile(out + 'existing-tests-' + suffix + '.stderr.txt', stderr, { flag: 'wx' });
await writeFile(out + 'existing-tests-' + suffix + '.json', JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
process.stdout.write(JSON.stringify({ result, unchanged: record.unchanged, record: 'existing-tests-' + suffix + '.json' }) + '\n' + stdout + stderr);
process.exitCode = typeof result.code === 'number' ? result.code : 1;
