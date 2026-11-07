import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { link, lstat, mkdir, mkdtemp, readFile, rm, rmdir, symlink, truncate, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { INTEGRITY_LIMITS, verifyPackage } from '../../src/agentnexus/integrity.ts';
import type { PackageEntry } from '../../src/agentnexus/integrity.ts';
import { canonical } from '../../src/agentnexus/types.ts';

// New synthetic fixture text only. Never reads/copies the legacy Kit or user code.
const fixtureBase = resolve('.workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/fixtures');
const controlled = { sourceMode: 'controlled_static' } as const;
function hash(value: Uint8Array | string): string { return createHash('sha256').update(value).digest('hex'); }
function entry(path: string, value: Uint8Array | string = ''): PackageEntry {
  return { path, bytes: Buffer.byteLength(value), sha256: hash(value) };
}
async function fixture(t: TestContext): Promise<{ container: string; root: string }> {
  await mkdir(fixtureBase, { recursive: true });
  const container = await mkdtemp(join(fixtureBase, 'pkg-'));
  const root = join(container, 'tree');
  await mkdir(root);
  t.after(async () => {
    const target = resolve(container);
    const rel = relative(fixtureBase, target);
    assert.ok(rel && rel !== '..' && !rel.startsWith('..' + sep), 'cleanup remains inside the task fixture base');
    await rm(target, { recursive: true, force: true });
  });
  return { container, root };
}
async function manifest(root: string, files: PackageEntry[], extra: Record<string, unknown> = {}): Promise<void> {
  const body = { schema: 'agentnexus/package/1', profile: 'portable-ascii-v1', files, ...extra };
  await writeFile(join(root, 'manifest.json'), canonical(body) + '\n');
}
async function pack(root: string, files: Record<string, Uint8Array | string>): Promise<PackageEntry[]> {
  const list: PackageEntry[] = [];
  for (const path of Object.keys(files).sort()) {
    const full = join(root, ...path.split('/'));
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, files[path]);
    list.push(entry(path, files[path]));
  }
  await manifest(root, list);
  return list;
}
async function expected(root: string, reason: string, status = 'FAIL'): Promise<void> {
  const result = await verifyPackage(root, controlled);
  assert.equal(result.status, status, JSON.stringify(result));
  assert.equal(result.reason, reason, JSON.stringify(result));
}
function deniedLink(t: TestContext, error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException).code;
  if (['EPERM', 'EACCES', 'ENOTSUP', 'ENOSYS', 'EINVAL'].includes(code ?? '')) {
    t.skip(`NOT_RUN: real OS link fixture unavailable (${code}); no simulated OS PASS`);
    return true;
  }
  return false;
}

test('controlled static bytes close over binary, empty and nested same-name files', async t => {
  const { root } = await fixture(t);
  const files = await pack(root, {
    'data.bin': Uint8Array.from([0, 255, 13, 10, 128]), 'empty': '',
    'nested/manifest.json': 'ordinary covered content',
    'validation/SHA256SUMS.txt': 'ordinary covered old-style filename',
  });
  const result = await verifyPackage(root, controlled);
  assert.equal(result.status, 'PASS', JSON.stringify(result));
  assert.equal(result.filesChecked, files.length);
  assert.equal(result.bytesChecked, files.reduce((sum, f) => sum + f.bytes, 0));
  assert.equal(result.manifest_sha256, hash(await readFile(join(root, 'manifest.json'))));
  for (const key of ['schema', 'canonical', 'portablePaths', 'bidirectional', 'fileContents', 'secondInventory']) assert.equal(result.checks[key], true);
  assert.equal(result.checks.assurance, 'CONTROLLED_STATIC_HOST_PRECONDITION_ONLY');
  assert.equal(result.checks.allWindowsReparseTags, 'NOT_VERIFIED_BY_NODE');
  assert.equal(result.checks.alternateDataStreams, 'NOT_ENUMERATED_BY_NODE');
  assert.equal(result.checks.adversarialTOCTOU, 'NOT_CLOSED');
});

test('empty package permits exactly its manifest, with zero payload budgets', async t => {
  const { root } = await fixture(t);
  await manifest(root, []);
  const result = await verifyPackage(root, { ...controlled, maxFiles: 0, maxTotalBytes: 0 });
  assert.equal(result.status, 'PASS', JSON.stringify(result));
  assert.equal(result.filesChecked, 0); assert.equal(result.bytesChecked, 0);
});

test('matching mutable tree is INCONCLUSIVE, never a trusted release root', async t => {
  const { root } = await fixture(t);
  await pack(root, { 'plain.txt': 'raw bytes\r\nare preserved' });
  const result = await verifyPackage(root, { sourceMode: 'mutable' });
  assert.equal(result.status, 'INCONCLUSIVE'); assert.equal(result.reason, 'TOCTOU_NOT_CLOSED');
  assert.equal(result.checks.fileContents, true);
  assert.equal(result.checks.assurance, 'NO_OS_ADMISSION');
});

test('same-size modified content fails its SHA-256', async t => {
  const { root } = await fixture(t);
  await pack(root, { 'a': 'original' });
  await writeFile(join(root, 'a'), 'modified');
  await expected(root, 'HASH_MISMATCH');
});

test('appended content fails declared byte size', async t => {
  const { root } = await fixture(t);
  await pack(root, { 'a': 'original' });
  await writeFile(join(root, 'a'), 'original plus');
  await expected(root, 'BYTES_MISMATCH');
});

test('missing and unlisted files are both reported by full relative path', async t => {
  const { root } = await fixture(t);
  await pack(root, { 'present': 'a' });
  await manifest(root, [entry('missing', 'a')]);
  const result = await verifyPackage(root, controlled);
  assert.equal(result.status, 'FAIL'); assert.equal(result.reason, 'INVENTORY_MISMATCH');
  assert.ok(result.details.some(x => x.code === 'MISSING_FILE' && x.path === 'missing'));
  assert.ok(result.details.some(x => x.code === 'UNLISTED_FILE' && x.path === 'present'));
});

test('unlisted nested manifest and SHA256SUMS names are never self exceptions', async t => {
  for (const path of ['sub/manifest.json', 'validation/SHA256SUMS.txt', 'unexpected.cjs', '.hidden']) {
    await t.test(path, async sub => {
      const { root } = await fixture(sub);
      await manifest(root, []);
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), 'new unlisted bytes');
      const result = await verifyPackage(root, controlled);
      assert.equal(result.status, 'FAIL');
      assert.ok(result.details.some(x => x.code === 'UNLISTED_FILE' && x.path === path));
    });
  }
});

test('root manifest is required and cannot list itself', async t => {
  const { root } = await fixture(t);
  await expected(root, 'MANIFEST_MISSING');
  await manifest(root, [entry('manifest.json')]);
  await expected(root, 'MANIFEST_LISTS_SELF');
});

test('root manifest directory and non-directory roots fail', async t => {
  const { root, container } = await fixture(t);
  await mkdir(join(root, 'manifest.json'));
  await expected(root, 'NON_REGULAR_ENTRY');
  const file = join(container, 'root-file'); await writeFile(file, 'x');
  await expected(file, 'ROOT_NOT_DIRECTORY');
  await expected(join(container, 'absent-root'), 'ROOT_NOT_FOUND');
});

test('duplicate JSON keys are rejected despite JSON.parse last-wins semantics', async t => {
  const { root } = await fixture(t);
  await writeFile(join(root, 'manifest.json'), '{"files":[],"profile":"portable-ascii-v1","schema":"agentnexus/package/1","schema":"agentnexus/package/1"}\n');
  await expected(root, 'MANIFEST_NONCANONICAL');
  const a = entry('a'); await writeFile(join(root, 'a'), '');
  const duplicateEntry = `{"files":[{"bytes":0,"path":"discarded","path":"a","sha256":"${a.sha256}"}],"profile":"portable-ascii-v1","schema":"agentnexus/package/1"}\n`;
  await writeFile(join(root, 'manifest.json'), duplicateEntry);
  await expected(root, 'MANIFEST_NONCANONICAL');
});

test('duplicate complete path and unsorted arrays fail independently', async t => {
  const { root } = await fixture(t);
  await manifest(root, [entry('a'), entry('a')]);
  await expected(root, 'DUPLICATE_PATH');
  await manifest(root, [entry('b'), entry('a')]);
  await expected(root, 'MANIFEST_ORDER');
});

test('case conflicts include ancestor directories and file-directory prefixes', async t => {
  for (const [paths, reason] of [
    [['A', 'a'], 'PATH_CASE_COLLISION'],
    [['Dir/a', 'dir/b'], 'PATH_CASE_COLLISION'],
    [['a', 'a/b'], 'PATH_PREFIX_CONFLICT'],
  ] as const) {
    await t.test(paths.join(' vs '), async sub => {
      const { root } = await fixture(sub);
      await manifest(root, paths.map(path => entry(path)));
      await expected(root, reason);
    });
  }
});

test('path traversal, device aliases, malformed separators and Unicode reject before payload reads', async t => {
  const paths = [
    '../outside', './a', 'a//b', '/outside', 'C:/outside', '//server/share', 'a\\b',
    'a:stream', 'NUL.txt', 'COM1', 'con.tar.gz', 'a.', 'a ', 'PROGRA~1/file',
    '', 'a\0b', 'e\u0301', '\u00e9', '\u0130', 'a/'.repeat(2),
  ];
  for (const path of paths) {
    await t.test(JSON.stringify(path), async sub => {
      const { root, container } = await fixture(sub);
      const outside = join(container, 'outside'); await writeFile(outside, 'canary');
      await manifest(root, [entry(path)]);
      const result = await verifyPackage(root, controlled);
      assert.equal(result.status, 'FAIL', JSON.stringify(result));
      assert.equal(result.reason, 'PATH_PROFILE');
      assert.equal(result.filesChecked, 0); assert.equal(result.bytesChecked, 0);
      assert.equal(await readFile(outside, 'utf8'), 'canary');
    });
  }
});

test('schema, digest and byte count reject invalid declarations', async t => {
  const { root } = await fixture(t);
  for (const extra of [{ schema: 'other' }, { profile: 'unicode' }, { unexpected: true }, { files: null }]) {
    await manifest(root, [], extra); await expected(root, 'MANIFEST_SCHEMA');
  }
  const invalid = [
    { ...entry('a'), bytes: -1 }, { ...entry('a'), bytes: 0.5 },
    { ...entry('a'), bytes: Number.MAX_SAFE_INTEGER + 1 },
    { ...entry('a'), sha256: 'A'.repeat(64) }, { ...entry('a'), sha256: '0'.repeat(63) },
    { ...entry('a'), extra: true }, null,
  ];
  for (const value of invalid) {
    await writeFile(join(root, 'manifest.json'), canonical({ schema: 'agentnexus/package/1', profile: 'portable-ascii-v1', files: [value] }) + '\n');
    await expected(root, 'MANIFEST_ENTRY');
  }
});

test('canonical encoding rejects whitespace, BOM, bad UTF-8 and equivalent escapes', async t => {
  const { root } = await fixture(t);
  await pack(root, { a: '' });
  const valid = await readFile(join(root, 'manifest.json'));
  for (const bytes of [Buffer.concat([valid, Buffer.from('\n')]), Buffer.from(' ' + valid.toString()), Buffer.from(valid.toString().replace('"a"', '"\\u0061"'))]) {
    await writeFile(join(root, 'manifest.json'), bytes); await expected(root, 'MANIFEST_NONCANONICAL');
  }
  for (const bytes of [Buffer.concat([Buffer.from([239, 187, 191]), valid]), Buffer.from([255, 254, 0])]) {
    await writeFile(join(root, 'manifest.json'), bytes); await expected(root, 'MANIFEST_JSON');
  }
});

test('extra empty directory and file-vs-directory mismatch cannot disappear', async t => {
  const { root } = await fixture(t);
  await manifest(root, []); await mkdir(join(root, 'empty'));
  const result = await verifyPackage(root, controlled);
  assert.equal(result.status, 'FAIL'); assert.ok(result.details.some(x => x.code === 'UNLISTED_DIRECTORY'));
  await manifest(root, [entry('empty')]);
  const mismatch = await verifyPackage(root, controlled);
  assert.equal(mismatch.status, 'FAIL'); assert.ok(mismatch.details.some(x => x.code === 'MISSING_FILE'));
});

test('file count and total bytes budgets work at exact limit and limit plus one', async t => {
  const { root } = await fixture(t);
  await pack(root, { a: 'ab', b: 'cd' });
  assert.equal((await verifyPackage(root, { ...controlled, maxFiles: 2, maxTotalBytes: 4 })).status, 'PASS');
  const files = await verifyPackage(root, { ...controlled, maxFiles: 1 });
  assert.equal(files.status, 'INCONCLUSIVE'); assert.equal(files.reason, 'FILE_COUNT_BUDGET');
  const bytes = await verifyPackage(root, { ...controlled, maxTotalBytes: 3 });
  assert.equal(bytes.status, 'INCONCLUSIVE'); assert.equal(bytes.reason, 'TOTAL_BYTES_BUDGET');
});

test('actual unlisted content also consumes size and count budgets', async t => {
  const { root } = await fixture(t);
  await manifest(root, []); await writeFile(join(root, 'extra'), 'ab');
  const bytes = await verifyPackage(root, { ...controlled, maxTotalBytes: 1 });
  assert.equal(bytes.status, 'INCONCLUSIVE'); assert.equal(bytes.reason, 'TOTAL_BYTES_BUDGET');
  const files = await verifyPackage(root, { ...controlled, maxFiles: 0 });
  assert.equal(files.status, 'INCONCLUSIVE'); assert.equal(files.reason, 'FILE_COUNT_BUDGET');
});

test('manifest and single-file caps are enforced without reading an oversized payload', async t => {
  const { root } = await fixture(t);
  await writeFile(join(root, 'manifest.json'), ' '.repeat(INTEGRITY_LIMITS.maxManifestBytes + 1));
  await expected(root, 'MANIFEST_BYTES_BUDGET', 'INCONCLUSIVE');
  await writeFile(join(root, 'huge'), '');
  await truncate(join(root, 'huge'), INTEGRITY_LIMITS.maxFileBytes + 1);
  await manifest(root, [{ path: 'huge', bytes: INTEGRITY_LIMITS.maxFileBytes + 1, sha256: hash('') }]);
  const result = await verifyPackage(root, controlled);
  assert.equal(result.status, 'INCONCLUSIVE'); assert.equal(result.reason, 'FILE_BYTES_BUDGET');
  assert.equal(result.bytesChecked, 0);
});

test('path length and depth have bounded rejection', async t => {
  const { root } = await fixture(t);
  await manifest(root, [entry('a'.repeat(INTEGRITY_LIMITS.maxComponentBytes + 1))]);
  await expected(root, 'PATH_PROFILE');
  await manifest(root, [entry(Array(INTEGRITY_LIMITS.maxDepth + 1).fill('a').join('/'))]);
  await expected(root, 'DEPTH_BUDGET', 'INCONCLUSIVE');
});

test('actual default file and directory count limits accept the edge and reject one more', async t => {
  const { root } = await fixture(t);
  const payloads: Record<string, string> = {};
  for (let i = 0; i < INTEGRITY_LIMITS.maxFiles; i++) payloads[`d${i.toString().padStart(3, '0')}/f`] = '';
  await pack(root, payloads);
  const edge = await verifyPackage(root, controlled);
  assert.equal(edge.status, 'PASS', JSON.stringify(edge));
  assert.equal(edge.filesChecked, INTEGRITY_LIMITS.maxFiles);
  await mkdir(join(root, 'extra-dir'));
  await expected(root, 'DIRECTORY_COUNT_BUDGET', 'INCONCLUSIVE');
  await rmdir(join(root, 'extra-dir'));
  await writeFile(join(root, 'extra-file'), '');
  // At both directory and file edges the combined entry cap is reached first.
  await expected(root, 'ENTRY_COUNT_BUDGET', 'INCONCLUSIVE');
  const { root: flat } = await fixture(t);
  const flatPayloads: Record<string, string> = {};
  for (let i = 0; i < INTEGRITY_LIMITS.maxFiles; i++) flatPayloads[`f${i.toString().padStart(3, '0')}`] = '';
  await pack(flat, flatPayloads);
  await writeFile(join(flat, 'extra-file'), '');
  await expected(flat, 'FILE_COUNT_BUDGET', 'INCONCLUSIVE');
});

test('actual 8 MiB files and 16 MiB total accept the edge; declared and actual overflow reject', async t => {
  const { root } = await fixture(t);
  const bytes = Buffer.alloc(INTEGRITY_LIMITS.maxFileBytes, 37);
  const entries = await pack(root, { a: bytes, b: bytes });
  const edge = await verifyPackage(root, controlled);
  assert.equal(edge.status, 'PASS', JSON.stringify(edge));
  assert.equal(edge.bytesChecked, INTEGRITY_LIMITS.maxTotalBytes);
  await truncate(join(root, 'a'), INTEGRITY_LIMITS.maxFileBytes + 1);
  await expected(root, 'FILE_BYTES_BUDGET', 'INCONCLUSIVE');
  await truncate(join(root, 'a'), INTEGRITY_LIMITS.maxFileBytes);
  await writeFile(join(root, 'c'), 'x');
  await manifest(root, [...entries, entry('c', 'x')]);
  await expected(root, 'TOTAL_BYTES_BUDGET', 'INCONCLUSIVE');
});

test('maximum component and depth are accepted on an actually created portable path', async t => {
  const { root } = await fixture(t);
  await pack(root, { ['x'.repeat(INTEGRITY_LIMITS.maxComponentBytes)]: '' });
  assert.equal((await verifyPackage(root, controlled)).status, 'PASS');
  const { root: deep } = await fixture(t);
  await pack(deep, { [Array(INTEGRITY_LIMITS.maxDepth - 1).fill('d').concat('f').join('/')]: '' });
  assert.equal((await verifyPackage(deep, controlled)).status, 'PASS');
});

test('Host cannot expand limits or choose an unknown mode; relative roots reject', async t => {
  const { root } = await fixture(t);
  await manifest(root, []);
  for (const options of [
    { ...controlled, maxFiles: INTEGRITY_LIMITS.maxFiles + 1 },
    { ...controlled, maxTotalBytes: INTEGRITY_LIMITS.maxTotalBytes + 1 },
    { ...controlled, maxFiles: -1 }, { ...controlled, maxTotalBytes: NaN },
    { sourceMode: 'claimed-trusted' }, { ...controlled, ignore: ['rogue'] },
  ]) {
    const result = await verifyPackage(root, options as never);
    assert.equal(result.status, 'FAIL'); assert.equal(result.reason, 'INVALID_OPTIONS');
  }
  await expected('relative-tree', 'INVALID_ROOT');
});

test('pre-abort is NOT_RUN; in-flight abort is INCONCLUSIVE with closed file work', async t => {
  const { root } = await fixture(t);
  await pack(root, { data: Buffer.alloc(256 * 1024, 23) });
  const pre = new AbortController(); pre.abort();
  const before = await verifyPackage(root, { ...controlled, signal: pre.signal });
  assert.equal(before.status, 'NOT_RUN'); assert.equal(before.reason, 'CANCELLED');
  const running = new AbortController();
  const pending = verifyPackage(root, { ...controlled, signal: running.signal }); running.abort();
  const during = await pending;
  assert.equal(during.status, 'INCONCLUSIVE'); assert.equal(during.reason, 'CANCELLED');
  assert.equal((await verifyPackage(root, controlled)).status, 'PASS');
});

test('diagnostic count and encoded bytes remain bounded for many extra files', async t => {
  const { root } = await fixture(t);
  await manifest(root, []);
  for (let i = 0; i < 80; i++) await writeFile(join(root, `f${i.toString().padStart(3, '0')}`), '');
  const result = await verifyPackage(root, controlled);
  assert.equal(result.status, 'FAIL'); assert.equal(result.detailCount, 80);
  assert.equal(result.detailsTruncated, true);
  assert.ok(result.details.length <= INTEGRITY_LIMITS.maxDetails);
  assert.ok(Buffer.byteLength(canonical(result.details)) <= INTEGRITY_LIMITS.maxDetailBytes);
});

test('candidate scripts, package metadata and git-looking files are data and never executed', async t => {
  const { root, container } = await fixture(t);
  const sentinel = join(container, 'must-not-exist');
  await pack(root, {
    'danger.cjs': `require('node:fs').writeFileSync(${JSON.stringify(sentinel)}, 'executed'); throw new Error('candidate executed');`,
    'package.json': JSON.stringify({ scripts: { preinstall: 'forbidden-command' }, type: 'module' }),
    '.git/config': '[filter "audit"]\nclean = forbidden-command\n',
  });
  assert.equal((await verifyPackage(root, controlled)).status, 'PASS');
  assert.equal(existsSync(sentinel), false);
  await writeFile(join(root, 'extra-malicious.cjs'), `require('node:fs').writeFileSync(${JSON.stringify(sentinel)}, 'bad');`);
  assert.equal((await verifyPackage(root, controlled)).status, 'FAIL');
  assert.equal(existsSync(sentinel), false);
});

test('real OS file symlink is rejected without following its target', async t => {
  const { root, container } = await fixture(t);
  const target = join(container, 'outside'); const linked = join(root, 'linked');
  await writeFile(target, 'outside target'); await manifest(root, [entry('linked', 'outside target')]);
  try { await symlink(target, linked, 'file'); }
  catch (error) { if (deniedLink(t, error)) return; throw error; }
  try { await expected(root, 'LINK_PATH'); assert.equal(await readFile(target, 'utf8'), 'outside target'); }
  finally { await unlink(linked); }
});

for (const type of ['dir', 'junction'] as const) {
  test(`real OS ${type} link is rejected`, async t => {
    if (type === 'junction' && process.platform !== 'win32') { t.skip('NOT_RUN: junction fixture is Windows-specific'); return; }
    const { root, container } = await fixture(t);
    const target = join(container, 'outside-dir'); const linked = join(root, 'linked');
    await mkdir(target); await writeFile(join(target, 'a'), 'outside target');
    await manifest(root, [entry('linked/a', 'outside target')]);
    try { await symlink(target, linked, type); }
    catch (error) { if (deniedLink(t, error)) return; throw error; }
    try { await expected(root, 'LINK_PATH'); }
    finally { await unlink(linked); }
  });
}

test('real OS hardlink to an outside object is rejected by link count', async t => {
  const { root, container } = await fixture(t);
  const target = join(container, 'outside'); const linked = join(root, 'linked');
  await writeFile(target, 'outside target'); await manifest(root, [entry('linked', 'outside target')]);
  try { await link(target, linked); }
  catch (error) { if (deniedLink(t, error)) return; throw error; }
  try {
    assert.ok((await lstat(linked, { bigint: true })).nlink > 1n);
    await expected(root, 'HARDLINK_PATH');
  } finally { await unlink(linked); }
});
