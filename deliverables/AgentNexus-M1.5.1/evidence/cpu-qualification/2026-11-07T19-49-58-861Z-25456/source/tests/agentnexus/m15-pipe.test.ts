// Actual same-account Windows primitives. No account, ACL, profile or task changes.
// A primitive is never a production cross-account/composition qualification.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect } from 'node:net';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const runtime = join(sourceRoot, 'src/agentnexus/production/windows/runtime.ps1');
const defaultPowerShell = 'C:\\Program Files\\WindowsApps\\OpenAI.CodexPrimaryRuntime.v26-1104-709-0_26.1104.709.0_x64__3k8sg7r9htsxt\\dependencies\\native\\powershell\\pwsh.exe';
const powerShell = process.env.AGENTNEXUS_TEST_POWERSHELL_PATH ?? defaultPowerShell;
const available = process.platform === 'win32' && existsSync(powerShell);
const skipWindows = available ? false : 'NOT_RUN: Windows and the fixed existing PowerShell executable are required';
const logRoot = resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT ?? '.workflow-kit/runtime/AgentNexus-M1.5/data', 'm15-pipe');
const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const imageHash = available ? hash(powerShell) : '';
type Response = { id: string; ok: boolean; result?: any; error?: { code: string; message: string } };
type Peer = { os: 'windows'; principal: string; pid: number; start_id: string; os_session: string };

class Rpc {
  child: ChildProcessWithoutNullStreams;
  pending = new Map<string, { resolve: (r: Response) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  operations = new Map<string, string>();
  buffer = Buffer.alloc(0);
  stderr = '';
  serial = 0;
  evidencePath: string;
  constructor() {
    mkdirSync(logRoot, { recursive: true });
    this.evidencePath = join(logRoot, `bootstrap-native-${Date.now()}-${randomUUID()}.jsonl`);
    this.child = spawn(powerShell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', runtime], { shell: false, windowsHide: true, stdio: 'pipe' });
    this.child.stderr.on('data', b => { this.stderr += b.toString(); });
    this.child.stdout.on('data', chunk => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      for (;;) {
        const end = this.buffer.indexOf(10);
        if (end < 0) { assert.ok(this.buffer.length < 65536, 'bounded partial native RPC frame'); break; }
        assert.ok(end + 1 <= 65536, 'bounded native RPC response');
        const raw = this.buffer.subarray(0, end).toString('utf8');
        this.buffer = this.buffer.subarray(end + 1);
        const frame: Response = JSON.parse(raw);
        // Only actual response fields and raw response JSONL are preserved.
        // These fixtures exchange static synthetic bytes, never credentials/keys.
        appendFileSync(this.evidencePath, JSON.stringify({ received_at: new Date().toISOString(), helper_pid: this.child.pid, op: this.operations.get(frame.id) ?? null, frame, raw_jsonl: raw + '\n' }) + '\n');
        const waiter = this.pending.get(frame.id);
        if (waiter) { clearTimeout(waiter.timer); this.pending.delete(frame.id); waiter.resolve(frame); }
      }
    });
    const fail = (error: Error) => { for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(error); } this.pending.clear(); };
    this.child.once('error', fail);
    this.child.once('exit', (code, signal) => fail(new Error(`native helper exited ${code}/${signal}: ${this.stderr}`)));
  }
  call(op: string, params: Record<string, unknown> = {}, deadline = 3000): Promise<Response> {
    assert.ok(this.pending.size < 8, 'bounded fixture RPC requests');
    const id = `m15-native-${++this.serial}`;
    const bytes = Buffer.from(JSON.stringify({ id, op, deadline_ms: deadline, params }) + '\n');
    assert.ok(bytes.length <= 65536);
    this.operations.set(id, op);
    return new Promise((resolveResult, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); this.child.kill(); reject(new Error(`RPC timeout ${op}: ${this.stderr}`)); }, deadline + 12000);
      this.pending.set(id, { resolve: resolveResult, reject, timer });
      this.child.stdin.write(bytes);
    });
  }
  close() { this.child.stdin.end(); if (this.child.exitCode === null) this.child.kill(); }
}
function good(r: Response): any { assert.equal(r.ok, true, JSON.stringify(r.error)); return r.result; }
function denied(r: Response, code: string | RegExp) { assert.equal(r.ok, false, JSON.stringify(r)); if (typeof code === 'string') assert.equal(r.error?.code, code); else assert.match(r.error?.code ?? '', code); }
function settings(peer: Peer, changes: Record<string, unknown> = {}) { return { peer_sid: peer.principal, peer_image: powerShell, peer_image_sha256: imageHash, ...changes }; }
function makeRpc(t: test.TestContext) { const rpc = new Rpc(); t.after(() => rpc.close()); return rpc; }
function newName() { return `AgentNexus-M15-${process.pid}-${randomUUID()}`; }
async function pair(t: test.TestContext) {
  const server = makeRpc(t), client = makeRpc(t);
  const [host, worker] = await Promise.all([server.call('identity'), client.call('identity')]);
  const a: Peer = good(host), b: Peer = good(worker), name = newName();
  const listen = await server.call('bootstrap.testpipe.listen', { name, ...settings(b) });
  if (!listen.ok && ['WIN32_5', 'ACCESS_DENIED'].includes(listen.error?.code ?? '')) {
    t.skip('NOT_RUN: host sandbox denies a new local pipe with the exact user-SID-only DACL; no capability ACE or ACL change attempted');
    return null;
  }
  const endpoint = good(listen);
  const accepting = server.call('bootstrap.testpipe.accept', { endpoint_id: endpoint.endpoint_id }, 5000);
  const connecting = await client.call('bootstrap.testpipe.connect', { name, ...settings(a), expected_peer: { os: a.os, principal: a.principal, pid: a.pid, start_id: a.start_id, os_session: a.os_session } }, 5000);
  const accepted = await accepting;
  if (!connecting.ok && ['WIN32_5', 'ACCESS_DENIED'].includes(connecting.error?.code ?? '')) {
    t.skip('NOT_RUN: host AppContainer denies this exact user-SID-only named pipe; no permission fallback');
    return null;
  }
  return { server, client, a, b, name, endpoint, host: good(accepted), worker: good(connecting) };
}

test('M15-PIPE REAL_WINDOWS_PRIMITIVE: persistent bidirectional frames bind kernel peers and exclude client instance right', { skip: skipWindows }, async t => {
  const f = await pair(t); if (!f) return;
  assert.equal(f.endpoint.peer_client_rights, 0x0012019b);
  assert.equal(f.endpoint.client_create_instance_right, false);
  assert.equal(f.endpoint.first_pipe_instance, true);
  assert.equal(f.endpoint.remote_clients_rejected, true);
  assert.match(f.endpoint.dacl_sddl, /^D:P/);
  assert.match(f.endpoint.dacl_sddl, /0x12019b/i);
  assert.equal(f.host.peer.pid, f.client.child.pid);
  assert.equal(f.worker.peer.pid, f.server.child.pid);
  assert.equal(f.host.standard_account_verified, false);
  assert.equal(f.host.source, 'REAL_WINDOWS_PRIMITIVE');
  assert.equal(f.host.release_authority, false);
  const payloads = [Buffer.alloc(0), Buffer.from('first synthetic frame'), Buffer.from(JSON.stringify({ principal: 'S-1-5-18', pid: 1 })), Buffer.alloc(24576, 0x35)];
  for (const payload of payloads) {
    const [received, written]: [Response, Response] = await Promise.all([
      f.server.call('bootstrap.testpipe.read', { channel_id: f.host.channel_id }),
      f.client.call('bootstrap.testpipe.write', { channel_id: f.worker.channel_id, payload_base64: payload.toString('base64') }),
    ]);
    assert.equal(good(written).bytes, payload.length);
    assert.deepEqual(Buffer.from(good(received).payload_base64, 'base64'), payload);
    const reply = Buffer.from('ack:' + payload.length);
    const [returned]: [Response, Response] = await Promise.all([
      f.client.call('bootstrap.testpipe.read', { channel_id: f.worker.channel_id }),
      f.server.call('bootstrap.testpipe.write', { channel_id: f.host.channel_id, payload_base64: reply.toString('base64') }),
    ]);
    assert.deepEqual(Buffer.from(good(returned).payload_base64, 'base64'), reply);
  }
  const peer = good(await f.server.call('bootstrap.testpipe.peer', { channel_id: f.host.channel_id }));
  assert.equal(peer.peer.pid, f.client.child.pid); assert.equal(peer.payload_identity_trusted, false);
  assert.ok(peer.lease_remaining_ms > 299000, 'successful peer ping renews idle lease');
  denied(await f.server.call('bootstrap.pipe.peer', { channel_id: f.host.channel_id }), 'BOOTSTRAP_MODE');
  t.diagnostic('Same-account primitive: peer ACE excludes instance creation, but this SID also owns the full-control server ACE. Distinct-SID effective denial remains NOT_RUN.');
});

test('M15-PIPE REAL_WINDOWS_PRIMITIVE: first-instance ownership rejects a second native listener', { skip: skipWindows }, async t => {
  const server = makeRpc(t), other = makeRpc(t);
  const self: Peer = good(await server.call('identity')), name = newName();
  const listening = await server.call('bootstrap.testpipe.listen', { name, ...settings(self) });
  if (!listening.ok && ['WIN32_5', 'ACCESS_DENIED'].includes(listening.error?.code ?? '')) { t.skip('NOT_RUN: exact named-pipe server DACL denied by host sandbox'); return; }
  const endpoint = good(listening);
  assert.equal(endpoint.peer_client_rights, 0x0012019b);
  assert.equal(endpoint.client_create_instance_right, false);
  assert.match(endpoint.dacl_sddl, /0x12019b/i);
  const response = await other.call('bootstrap.testpipe.listen', { name, ...settings(self) });
  denied(response, /^(WIN32_5|ACCESS_DENIED)$/);
  const forged = await other.call('bootstrap.pipe.listen', { name: newName(), ...settings(self), allow_test_appcontainer: true });
  denied(forged, /^(BOOTSTRAP_ATTESTATION_REQUIRED|BOOTSTRAP_TEST_FLAG|BOOTSTRAP_STANDARD_ACCOUNT)$/);
  good(await server.call('bootstrap.testpipe.close', { endpoint_id: endpoint.endpoint_id }));
  denied(await server.call('bootstrap.testpipe.accept', { endpoint_id: endpoint.endpoint_id }), 'BOOTSTRAP_ENDPOINT_UNKNOWN');
});

test('M15-PIPE REAL_WINDOWS_PRIMITIVE: four listener owners and exact endpoint grammar are bounded without accepting a client', { skip: skipWindows }, async t => {
  const rpc = makeRpc(t), self: Peer = good(await rpc.call('identity'));
  denied(await rpc.call('bootstrap.testpipe.listen', { name: 'AgentNexus-M14-forged', ...settings(self) }), 'BOOTSTRAP_PIPE_NAME');
  const endpoints: string[] = [];
  for (let i = 0; i < 4; i++) {
    const result = await rpc.call('bootstrap.testpipe.listen', { name: newName(), ...settings(self) });
    if (!result.ok && ['WIN32_5', 'ACCESS_DENIED'].includes(result.error?.code ?? '')) { t.skip('NOT_RUN: exact named-pipe server DACL denied by host sandbox'); return; }
    endpoints.push(good(result).endpoint_id);
  }
  denied(await rpc.call('bootstrap.testpipe.listen', { name: newName(), ...settings(self) }), 'BOOTSTRAP_ENDPOINT_LIMIT');
  for (const endpoint_id of endpoints) good(await rpc.call('bootstrap.testpipe.close', { endpoint_id }));
});

for (const mode of ['sid', 'image', 'hash', 'pid', 'start'] as const) test(`M15-PIPE REAL_WINDOWS_PRIMITIVE: forged ${mode} cannot authenticate a persistent native peer`, { skip: skipWindows }, async t => {
  const server = makeRpc(t), client = makeRpc(t);
  const [sr, cr] = await Promise.all([server.call('identity'), client.call('identity')]);
  const a: Peer = good(sr), b: Peer = good(cr), name = newName();
  const changes = mode === 'sid' ? { peer_sid: 'S-1-5-18' } : mode === 'image' ? { peer_image: process.execPath, peer_image_sha256: hash(process.execPath) } : mode === 'hash' ? { peer_image_sha256: '0'.repeat(64) } : {};
  const listening = await server.call('bootstrap.testpipe.listen', { name, ...settings(b, changes) });
  if (!listening.ok && ['WIN32_5', 'ACCESS_DENIED'].includes(listening.error?.code ?? '')) { t.skip('NOT_RUN: exact pipe DACL unavailable in host sandbox'); return; }
  const endpoint = good(listening), accepting = server.call('bootstrap.testpipe.accept', { endpoint_id: endpoint.endpoint_id }, 4000);
  const expected = { os: a.os, principal: a.principal, pid: mode === 'pid' ? process.pid : a.pid, start_id: mode === 'start' ? '1' : a.start_id, os_session: a.os_session };
  const connected = await client.call('bootstrap.testpipe.connect', { name, ...settings(a), expected_peer: expected }, 4000);
  const accepted = await accepting;
  if (!connected.ok && ['WIN32_5', 'ACCESS_DENIED'].includes(connected.error?.code ?? '')) { t.skip('NOT_RUN: exact pipe connection denied by host sandbox'); return; }
  if (mode === 'pid' || mode === 'start') denied(connected, 'PEER_MISMATCH');
  else denied(accepted, mode === 'sid' ? 'BOOTSTRAP_PEER_SID' : mode === 'image' ? 'BOOTSTRAP_PEER_IMAGE' : 'BOOTSTRAP_PEER_IMAGE_HASH');
});

test('M15-PIPE REAL_WINDOWS_PRIMITIVE: oversized outbound payload revokes the channel without retry', { skip: skipWindows }, async t => {
  const f = await pair(t); if (!f) return;
  denied(await f.client.call('bootstrap.testpipe.write', { channel_id: f.worker.channel_id, payload_base64: Buffer.alloc(24577).toString('base64') }), 'BOOTSTRAP_FRAME_LIMIT');
  denied(await f.client.call('bootstrap.testpipe.peer', { channel_id: f.worker.channel_id }), 'BOOTSTRAP_CHANNEL_UNKNOWN');
  denied(await f.server.call('bootstrap.testpipe.read', { channel_id: f.host.channel_id }), /^(BOOTSTRAP_PIPE_EOF|WIN32_\d+|INVALID_REQUEST)$/);
  denied(await f.server.call('bootstrap.testpipe.peer', { channel_id: f.host.channel_id }), 'BOOTSTRAP_CHANNEL_UNKNOWN');
});

test('M15-PIPE REAL_WINDOWS_PRIMITIVE: oversized inbound length destroys a raw same-account connection', { skip: skipWindows }, async t => {
  const server = makeRpc(t), self: Peer = good(await server.call('identity')), name = newName();
  const listening = await server.call('bootstrap.testpipe.listen', { name, ...settings(self, { peer_image: process.execPath, peer_image_sha256: hash(process.execPath) }) });
  if (!listening.ok && ['WIN32_5', 'ACCESS_DENIED'].includes(listening.error?.code ?? '')) { t.skip('NOT_RUN: exact pipe DACL unavailable in host sandbox'); return; }
  const endpoint = good(listening), accepting = server.call('bootstrap.testpipe.accept', { endpoint_id: endpoint.endpoint_id }, 4000);
  const socket = connect('\\\\.\\pipe\\' + name); socket.on('error', () => {}); t.after(() => socket.destroy());
  try { await once(socket, 'connect'); }
  catch (error: any) {
    await accepting; // settle the native accept before fixture cleanup
    if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('NOT_RUN: host sandbox denied the raw same-account pipe fixture; no DACL/capability change attempted'); return; }
    throw error;
  }
  const accepted = good(await accepting);
  assert.equal(accepted.peer.pid, process.pid);
  const reading = server.call('bootstrap.testpipe.read', { channel_id: accepted.channel_id });
  const header = Buffer.alloc(4); header.writeUInt32BE(24577); socket.write(header);
  denied(await reading, 'BOOTSTRAP_FRAME_LIMIT');
  denied(await server.call('bootstrap.testpipe.peer', { channel_id: accepted.channel_id }), 'BOOTSTRAP_CHANNEL_UNKNOWN');
});

test('M15-PIPE REAL_WINDOWS_PRIMITIVE: read deadline, explicit close and endpoint revocation are terminal', { skip: skipWindows }, async t => {
  const f = await pair(t); if (!f) return;
  const started = performance.now();
  denied(await f.server.call('bootstrap.testpipe.read', { channel_id: f.host.channel_id }, 100), 'DEADLINE');
  assert.ok(performance.now() - started < 3000);
  denied(await f.server.call('bootstrap.testpipe.peer', { channel_id: f.host.channel_id }), 'BOOTSTRAP_CHANNEL_UNKNOWN');
  good(await f.client.call('bootstrap.testpipe.close', { channel_id: f.worker.channel_id }));
  denied(await f.client.call('bootstrap.testpipe.peer', { channel_id: f.worker.channel_id }), 'BOOTSTRAP_CHANNEL_UNKNOWN');
  good(await f.server.call('bootstrap.testpipe.close', { endpoint_id: f.endpoint.endpoint_id }));
  denied(await f.server.call('bootstrap.testpipe.accept', { endpoint_id: f.endpoint.endpoint_id }), 'BOOTSTRAP_ENDPOINT_UNKNOWN');
});

test('M15-PIPE REAL_WINDOWS_PRIMITIVE: four live native channels fill owner quota and a closed slot can be reused', { skip: skipWindows }, async t => {
  const f = await pair(t); if (!f) return;
  const channels = [f.host];
  const clients: { rpc: Rpc; channel: any }[] = [{ rpc: f.client, channel: f.worker }];
  for (let i = 0; i < 3; i++) {
    const client = makeRpc(t); good(await client.call('identity'));
    const accepting = f.server.call('bootstrap.testpipe.accept', { endpoint_id: f.endpoint.endpoint_id }, 5000);
    const connected = good(await client.call('bootstrap.testpipe.connect', { name: f.name, ...settings(f.a) }, 5000));
    clients.push({ rpc: client, channel: connected });
    channels.push(good(await accepting));
  }
  denied(await f.server.call('bootstrap.testpipe.accept', { endpoint_id: f.endpoint.endpoint_id }), 'BOOTSTRAP_CHANNEL_LIMIT');
  good(await clients[1].rpc.call('bootstrap.testpipe.close', { channel_id: clients[1].channel.channel_id }));
  good(await f.server.call('bootstrap.testpipe.close', { channel_id: channels[1].channel_id }));
  const replacement = makeRpc(t); good(await replacement.call('identity'));
  const accepting = f.server.call('bootstrap.testpipe.accept', { endpoint_id: f.endpoint.endpoint_id }, 5000);
  good(await replacement.call('bootstrap.testpipe.connect', { name: f.name, ...settings(f.a) }, 5000));
  assert.notEqual(good(await accepting).channel_id, channels[1].channel_id);
});

test('M15-ATTEST REAL_WINDOWS_PRIMITIVE: only the actual pinned parent and exact protected file security can attest', { skip: skipWindows }, async t => {
  const rpc = makeRpc(t), self: Peer = good(await rpc.call('identity'));
  denied(await rpc.call('bootstrap.storage.inspect', { root: logRoot, allowed_principals: [self.principal] }), 'BOOTSTRAP_ATTESTATION_REQUIRED');
  denied(await rpc.call('bootstrap.testattest', { expected_sid: self.principal, process_id: self.pid, pins: [] }), 'BOOTSTRAP_PARENT_PID');
  denied(await rpc.call('bootstrap.testattest', { expected_sid: 'S-1-5-18', process_id: process.pid, pins: [] }), 'BOOTSTRAP_PEER_SID');
  denied(await rpc.call('bootstrap.testattest', { expected_sid: self.principal, process_id: process.pid, pins: Array(65).fill({}) }), 'BOOTSTRAP_PIN_LIMIT');
  const acl = spawnSync(powerShell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', '$a=Get-Acl -LiteralPath $env:AGENTNEXUS_TEST_NODE_IMAGE; @{sddl=$a.Sddl;owner=([Security.Principal.NTAccount]::new($a.Owner)).Translate([Security.Principal.SecurityIdentifier]).Value;protected=$a.AreAccessRulesProtected}|ConvertTo-Json -Compress'], { shell: false, windowsHide: true, encoding: 'utf8', env: { ...process.env, AGENTNEXUS_TEST_NODE_IMAGE: process.execPath }, timeout: 10000 });
  assert.equal(acl.status, 0, acl.stderr);
  const security = JSON.parse(acl.stdout);
  const pin = { path: process.execPath, directory: false, sha256: hash(process.execPath), owner_sid: security.owner, sddl: security.sddl };
  if (!security.protected) {
    denied(await rpc.call('bootstrap.testattest', { expected_sid: self.principal, process_id: process.pid, pins: [pin] }), 'BOOTSTRAP_DACL');
    await t.test('positive protected-pin attestation', { skip: 'NOT_RUN: existing Node image has an unprotected inherited DACL; no ACL was modified. The actual unprotected DACL was rejected.' }, () => {});
    return;
  }
  const proof = good(await rpc.call('bootstrap.testattest', { expected_sid: self.principal, process_id: process.pid, pins: [pin] }));
  assert.equal(proof.process.pid, process.pid); assert.equal(proof.image_sha256, hash(process.execPath));
  assert.equal(proof.standard_account_verified, false); assert.equal(proof.release_authority, false);
  denied(await rpc.call('bootstrap.pin.inspect', { pin_id: proof.pin_id }), 'BOOTSTRAP_MODE');
  assert.equal(good(await rpc.call('bootstrap.testpin.inspect', { pin_id: proof.pin_id })).pin_count, 1);
  good(await rpc.call('bootstrap.testunpin', { pin_id: proof.pin_id }));
  denied(await rpc.call('bootstrap.testpin.inspect', { pin_id: proof.pin_id }), 'BOOTSTRAP_PIN_UNKNOWN');
});

test('M15-PIPE REAL_WINDOWS_PRIMITIVE: killing the actual Node owner retires its native helper', { skip: skipWindows }, async t => {
  const child = spawn(process.execPath, [fileURLToPath(new URL('./m15-pipe-owner-child.mjs', import.meta.url))], { shell: false, windowsHide: true, env: { ...process.env, AGENTNEXUS_TEST_POWERSHELL_PATH: powerShell, AGENTNEXUS_TEST_DATA_ROOT: resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT ?? '.workflow-kit/runtime/AgentNexus-M1.5/data') }, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
  const exited = once(child, 'exit'); let stderr = ''; child.stderr!.on('data', b => { stderr += b.toString(); });
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) child.kill(); await exited; });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const [checkpoint] = await Promise.race([once(child, 'message'), exited.then(() => { throw Error('owner fixture exited before checkpoint: ' + stderr); }), new Promise<never>((_r, reject) => { timer = setTimeout(() => reject(Error('owner checkpoint deadline: ' + stderr)), 15000); })]);
    const ready: any = checkpoint;
    if (ready.status === 'BLOCKED' && ['WIN32_5', 'ACCESS_DENIED'].includes(ready.error?.code)) { t.skip('NOT_RUN: host denied the exact pipe listener in owner-death fixture'); return; }
    assert.equal(ready.status, 'READY', JSON.stringify(ready));
    try { process.kill(ready.helper_pid, 0); }
    catch (error: any) { if (error.code === 'EPERM') { t.skip('NOT_RUN: host denies observing the same-account helper liveness'); return; } throw error; }
    assert.equal(child.kill('SIGKILL'), true); await exited;
    const deadline = performance.now() + 5000; let absent = false;
    while (performance.now() < deadline) {
      try { process.kill(ready.helper_pid, 0); }
      catch (error: any) { if (error.code === 'ESRCH') { absent = true; break; } if (error.code !== 'EPERM') throw error; }
      await delay(40);
    }
    assert.equal(absent, true, 'the observed helper must retire after its real Node owner dies; process absence is not full-tree ExitProof');
  } finally { if (timer) clearTimeout(timer); }
});

test('M15-PIPE production cross-account protected bootstrap and effective client-instance denial', { skip: 'NOT_RUN / BLOCKED: approved distinct standard accounts, exact deployment ACL/profile and startup objects are absent; same-account primitives grant no qualification' }, () => {});
