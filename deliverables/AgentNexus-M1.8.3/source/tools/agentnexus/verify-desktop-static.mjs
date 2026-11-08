import { spawnSync } from 'node:child_process';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = fileURLToPath(new URL('../../', import.meta.url)), out = fileURLToPath(new URL('../../../raw/static-' + new Date().toISOString().replace(/[:.]/g, '-') + '/', import.meta.url));
await mkdir(out, { recursive: true });
const checks = [];
function run(id, args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 60000 });
  checks.push({ id, args, code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '', error: result.error?.code ?? null });
}
run('strict-typescript', ['node_modules/typescript/lib/tsc.js', '--project', 'tsconfig.json', '--pretty', 'false']);
for (const path of ['desktop/main.mjs', 'desktop/sender.mjs', 'desktop/preload.cjs', 'desktop/renderer/app.js', 'tools/agentnexus/launch-desktop.mjs', 'tools/agentnexus/build-desktop.mjs', 'tests/desktop/desktop.spec.mjs']) run('syntax:' + path, ['--check', path]);
const files = [];
async function inventory(folder) {
  for (const item of await readdir(folder, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', 'test-results'].includes(item.name)) continue;
    const path = join(folder, item.name);
    if (item.isDirectory()) await inventory(path); else files.push({ path: relative(root, path).replaceAll('\\', '/'), sha256: createHash('sha256').update(await readFile(path)).digest('hex') });
  }
}
await inventory(root); files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
const sha256 = createHash('sha256').update(files.map(f => f.path + '\0' + f.sha256 + '\n').join('')).digest('hex');
const status = checks.every(c => c.code === 0 && !c.error) ? 'PASS' : 'FAIL';
await writeFile(join(out, 'checks.json'), JSON.stringify({ status, node: process.version, checks, source_set_sha256: sha256 }, null, 2) + '\n');
await writeFile(join(out, 'source-manifest.json'), JSON.stringify({ files, source_set_sha256: sha256, encoding: 'UTF8(path + NUL + lowercase SHA256 + LF), lexical path order' }, null, 2) + '\n');
console.log(JSON.stringify({ out, status, checks: checks.length, files: files.length, source_set_sha256: sha256 })); process.exitCode = status === 'PASS' ? 0 : 1;
