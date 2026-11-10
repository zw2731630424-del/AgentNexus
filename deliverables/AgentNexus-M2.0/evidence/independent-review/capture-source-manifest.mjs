import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const evidence = dirname(fileURLToPath(import.meta.url));
const source = fileURLToPath(new URL('../../../../deliverables/AgentNexus-M2.0/source/', import.meta.url));
const paths = [];
async function visit(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) { if (!['node_modules', 'dist', '.git', '__pycache__'].includes(entry.name)) await visit(path); }
    else if (entry.isFile()) paths.push(relative(source, path).replaceAll('\\', '/'));
  }
}
for (const folder of ['src', 'desktop', 'config', 'native', 'tools', 'tests']) await visit(join(source, folder));
for (const file of ['package.json', 'package-lock.json', 'tsconfig.json', 'README.md', '.gitignore']) { try { await readFile(join(source, file)); paths.push(file); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
const files = [];
for (const path of paths.sort()) {
  const bytes = await readFile(join(source, path));
  files.push({ path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const digest = createHash('sha256');
for (const file of files) digest.update(file.path + '\0' + file.sha256 + '\n');
const manifest = { schema: 'agentnexus/source-manifest/1', captured_at: new Date().toISOString(), source, method: 'SHA256 of sorted path + NUL + per-file SHA256 + LF', included_roots: ['src', 'desktop', 'config', 'native', 'tools', 'tests'], included_root_files: ['package.json', 'package-lock.json', 'tsconfig.json', 'README.md', '.gitignore'], excluded: ['dist/', 'node_modules/', '.git/', '__pycache__/'], source_tree_sha256: digest.digest('hex'), file_count: files.length, files };
const name = process.argv[2] ?? 'source-manifest-final.json';
if (!/^[A-Za-z0-9_.-]+\.json$/.test(name)) throw Error('REVIEW_MANIFEST_PATH');
await writeFile(join(evidence, name), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ file: name, source_tree_sha256: manifest.source_tree_sha256, file_count: files.length, captured_at: manifest.captured_at }));
