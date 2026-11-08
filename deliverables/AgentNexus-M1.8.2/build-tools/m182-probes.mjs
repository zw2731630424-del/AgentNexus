// Trusted local engineering probes. Synthetic objects only; no credential lookup.
import { mkdir, mkdtemp, writeFile, readFile, lstat, link, symlink, rename, unlink, readdir } from 'node:fs/promises';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = join(root, 'deliverables/AgentNexus-M1.8.2/source');
const run = join(root, '.workflow-kit/runtime/AgentNexus-M1.8.2');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir(run, { recursive: true });
const out = await mkdtemp(join(run, 'probes-'));
const json = (name, value) => writeFile(join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const errorCode = error => ({ code: /^[A-Z0-9_]+$/.test(error?.code ?? '') ? error.code : 'PROBE_ERROR', syscall: error?.syscall ?? null });

async function filesystem() {
  const space = join(out, 'filesystem'); await mkdir(space);
  const file = join(space, 'source.txt'), hard = join(space, 'hard.txt'), outside = join(space, 'outside'), slot = join(space, 'slot'), saved = join(space, 'saved');
  await writeFile(file, 'synthetic link capability probe', { flag: 'wx' }); await mkdir(outside); await mkdir(slot);
  const result = { kind: 'ACTUAL_CURRENT_SANDBOX_OS_PRIMITIVES', hardlink: null, junction: null, rename: null };
  try { await link(file, hard); result.hardlink = { status: 'PASS', links: Number((await lstat(hard)).nlink) }; }
  catch (error) { result.hardlink = { status: 'FAIL', ...errorCode(error) }; }
  try { await rename(slot, saved); result.rename = { status: 'PASS' }; }
  catch (error) { result.rename = { status: 'FAIL', ...errorCode(error) }; }
  try { await symlink(outside, slot, 'junction'); result.junction = { status: 'PASS' }; await unlink(slot); }
  catch (error) { result.junction = { status: 'FAIL', ...errorCode(error) }; }
  await json('filesystem.json', result);
  const { storageFixture, prepare, execute } = await import(new URL('../../deliverables/AgentNexus-M1.8.2/source/tests/agentnexus/m161-storage-fixture.ts', import.meta.url));
  const phases = [], harness = await storageFixture(join(out, 'storage'), { storage: { beforeIO: phase => { phases.push(phase); } } });
  try {
    await prepare(harness, Buffer.from('synthetic managed publication'), 29);
    const task = await execute(harness);
    await json('storage.json', { task, phases, writes: harness.state.list('STORAGE_WRITE', { limit: 32 }),
      reservations: harness.state.list('resource_reservation', { limit: 32 }), claims: harness.state.count('resource_storage_claim'),
      namespace: await readdir(join(out, 'storage/files')), scope: 'Synthetic fixture; no product assertions changed; failure retains capacity' });
  } finally { await harness.close(); }
  return result;
}

async function nativePaths() {
  const { EvidenceRpc } = await import(new URL('../../deliverables/AgentNexus-M1.8.2/source/tests/agentnexus/m151-rpc.ts', import.meta.url));
  const rpc = new EvidenceRpc(join(out, 'native-paths'));
  try {
    const observations = [];
    for (const path of [process.execPath, process.env.AGENTNEXUS_TEST_POWERSHELL_PATH]) {
      observations.push({ path, sha256: sha(await readFile(path)),
        native: await rpc.call('file.read', { root: dirname(path), relative_path: basename(path), max_bytes: 8 }) });
    }
    await json('native-paths.json', { observations, scope: 'Fixed executable handle traversal; no Job breakaway success is inferred' });
    return observations;
  } finally { await rpc.close(); }
}

async function vaultIsolation() {
  const { CredentialVault, createVaultAdminCapability, WindowsCurrentUserDpapiProtector } = await import(new URL('../../deliverables/AgentNexus-M1.8.2/source/src/agentnexus/model-runtime/vault.ts', import.meta.url));
  const { EvidenceRpc } = await import(new URL('../../deliverables/AgentNexus-M1.8.2/source/tests/agentnexus/m151-rpc.ts', import.meta.url));
  const powershell = process.env.AGENTNEXUS_TEST_POWERSHELL_PATH;
  const admin = createVaultAdminCapability(), vaultRoot = join(out, 'synthetic-vault');
  const vault = await CredentialVault.open({ root: vaultRoot, admin, mode: 'SYNTHETIC', powershell });
  const secret = Buffer.from('synthetic-test-negative-isolation-' + sha(Buffer.from(out)).slice(0, 24));
  const expected = sha(secret);
  await vault.add(admin, { key_id: 'synthetic.probe', provider_id: 'deepseek', models: ['deepseek-flash'], secret,
    max_concurrency: 1, requests_per_minute: 10 }); secret.fill(0);
  vault.close();
  const observer = new EvidenceRpc(join(out, 'identity'));
  const child = spawn(process.execPath, [join(root, 'tools/agentnexus/m182-vault-reader.mjs'), join(vaultRoot, 'vault.sqlite'), powershell],
    { shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { SystemRoot: process.env.SystemRoot, WINDIR: process.env.WINDIR } });
  child.stdin.on('error', () => {});
  let raw = ''; const closed = new Promise(resolveClose => child.once('close', (code, signal) => resolveClose({ code, signal })));
  child.stderr.on('data', () => {}); // No raw helper errors are promoted to ordinary evidence.
  try {
  const packet = await new Promise((accept, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(Error('SYNTHETIC_READER_TIMEOUT')); }, 20000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', () => { if (!raw.includes('\n')) { clearTimeout(timer); reject(Error('SYNTHETIC_READER_FAILED')); } });
    child.stdout.on('data', bytes => { raw += bytes.toString(); if (raw.length > 4096) { clearTimeout(timer); child.kill(); reject(Error('SYNTHETIC_READER_LIMIT')); return; }
      if (raw.includes('\n')) { clearTimeout(timer); try { accept(JSON.parse(raw.split('\n')[0])); } catch { reject(Error('SYNTHETIC_READER_PACKET')); } } });
  });
    const parentIdentity = await observer.good('identity', { pid: process.pid });
    const childIdentity = await observer.good('identity', { pid: packet.pid });
    child.stdin.end('done\n'); const exit = await closed;
    const result = { status: packet.sha256 === expected && packet.file_read && packet.decrypt ? 'ISOLATION_FAIL' : 'INCONCLUSIVE',
      synthetic_only: true, parent_identity: parentIdentity, child_identity: childIdentity,
      same_sid: parentIdentity.principal === childIdentity.principal, ordinary_process_read: packet.file_read,
      ordinary_process_dpapi_decrypt: packet.decrypt, expected_sha256: expected, observed_sha256: packet.sha256, exit,
      real_vault_qualification: 'BLOCKED', cross_account_test: 'NOT_RUN',
      scope: 'Actual new OS process under inherited identity; NOT a deployed restricted Worker and NOT a real credential' };
    await json('vault-isolation.json', result); return result;
  } finally {
    if (!child.stdin.destroyed && !child.stdin.writableEnded) child.stdin.end('done\n');
    if (child.exitCode === null && child.signalCode === null) child.kill();
    let timer; await Promise.race([closed, new Promise(resolveWait => { timer = setTimeout(resolveWait, 2000); })]); clearTimeout(timer);
    await observer.close();
  }
}

async function readerDenial() {
  const rows = [];
  for (const [name, mode, application, backend] of [
    ['live-metadata', 'LIVE', 0x414e5638, 'windows-current-user-dpapi-v1'],
    ['foreign-backend', 'SYNTHETIC', 0x414e5638, 'foreign-protector'],
    ['wrong-application', 'SYNTHETIC', 0, 'windows-current-user-dpapi-v1'],
  ]) {
    const location = join(out, name, 'synthetic-vault'); await mkdir(location, { recursive: true });
    const path = join(location, 'vault.sqlite'), db = new DatabaseSync(path);
    db.exec('PRAGMA application_id=' + application + '; PRAGMA user_version=1; CREATE TABLE metadata(key TEXT,value TEXT);');
    const insert = db.prepare('INSERT INTO metadata VALUES (?,?)');
    for (const [key, value] of [['mode', mode], ['protector', backend], ['protection', 'WINDOWS_DPAPI_CURRENT_USER']]) insert.run(key, value);
    db.close(); // Deliberately no credentials table or protected payload exists.
    const child = spawn(process.execPath, [join(root, 'tools/agentnexus/m182-vault-reader.mjs'), path, process.env.AGENTNEXUS_TEST_POWERSHELL_PATH],
      { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { SystemRoot: process.env.SystemRoot, WINDIR: process.env.WINDIR } });
    let stdout = '', stderr = '', timer;
    child.stdout.on('data', bytes => { stdout += bytes.toString(); if (stdout.length > 4096) child.kill(); });
    child.stderr.on('data', bytes => { stderr += bytes.toString(); if (stderr.length > 8192) child.kill(); });
    const exit = await new Promise((accept, reject) => {
      timer = setTimeout(() => { child.kill(); reject(Error('SYNTHETIC_DENIAL_TIMEOUT')); }, 10000);
      child.once('error', reject); child.once('close', code => accept(code));
    }).finally(() => clearTimeout(timer));
    const denied = exit === 1 && stdout === '' && stderr.includes('SYNTHETIC_VAULT_METADATA_REQUIRED');
    rows.push({ name, status: denied ? 'PASS' : 'FAIL', expected: 'Reject before ciphertext SELECT or decrypt',
      exit_code: exit, stdout_bytes: Buffer.byteLength(stdout), stderr_sha256: sha(stderr), no_credentials_table: true });
  }
  await json('reader-denial.json', rows); if (rows.some(row => row.status !== 'PASS')) throw Error('SYNTHETIC_READER_DENIAL_FAILED');
  return rows;
}

async function main() {
  const action = { filesystem, 'native-paths': nativePaths, vault: vaultIsolation, 'reader-denial': readerDenial }[process.argv[2]];
  if (!action) throw Error('Use filesystem|native-paths|vault|reader-denial');
  const result = await action();
  await json('run.json', { created_at: new Date().toISOString(), node: process.version, platform: process.platform, source, out,
    real_credentials_read: false, system_security_changes: false, network_requests: 0 });
  console.log(JSON.stringify({ out, result }));
}
await main();
