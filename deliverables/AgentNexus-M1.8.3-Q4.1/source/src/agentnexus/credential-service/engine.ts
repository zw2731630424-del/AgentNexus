// Native service child entry point. stdout is protocol-only; no payload logging.
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { CredentialBroker } from './broker.ts';
import { attestServiceBoundary, readApprovedConsents, SERVICE_DATA_ROOT, QUALIFICATION_DATA_ROOT } from './boundary.ts';
import { invariant } from '../types.ts';
import { wireFixture, FixtureTransport } from '../model-runtime/transport.ts';
import { DailyGateway } from './daily-gateway.ts';
import { randomUUID } from 'node:crypto';

const syntheticStack = process.argv[2] === '--synthetic-stack-worker';
const synthetic = process.argv[2] === '--synthetic-test-worker' || syntheticStack;
const root = synthetic ? resolve(process.argv[3] ?? '') : SERVICE_DATA_ROOT;
if (synthetic) invariant(process.argv.length === 4 && /[\\/]\.workflow-kit[\\/]runtime[\\/]AgentNexus-M1\.8\.3(?:-Q[23])?[\\/]/i.test(root), 'SERVICE_SYNTHETIC_ROOT_REQUIRED');
else invariant(process.argv.length === 2, 'SERVICE_START_ARGUMENTS_DENIED');
let scenario = 'normal';
const fixture = new FixtureTransport(async (_request, _n, signal) => {
  if (scenario === 'timeout') await new Promise<void>((_, reject) => { signal.addEventListener('abort', () => reject(Error('FIXTURE_CANCELLED')), { once: true }); if (signal.aborted) reject(Error('FIXTURE_CANCELLED')); });
  return wireFixture(JSON.stringify({ kind: 'FINAL', text: scenario === 'utf8' ? '你好，世界。🌏' : scenario === 'stream' ? 'abcdefgh'.repeat(1000) : scenario === 'large' ? 'abcdefgh'.repeat(3000) : 'SIMULATED · isolated credential process, no network.' }),
    { usage: scenario === 'no-usage' ? null : { prompt_tokens: 20, completion_tokens: 10 }, done: scenario !== 'disconnect', status: scenario === 'auth' ? 401 : scenario === 'forbidden' ? 403 : scenario === 'rate' ? 429 : scenario === 'unavailable' ? 503 : 200, chunk_bytes: 7 });
});
const boundary = synthetic ? undefined : await attestServiceBoundary();
const simulatedRuntime = synthetic || boundary?.mode === 'QUALIFICATION_ONLY';
const broker = await CredentialBroker.open({ synthetic: simulatedRuntime, root: boundary?.mode === 'QUALIFICATION_ONLY' ? QUALIFICATION_DATA_ROOT : root, boundary, ...(simulatedRuntime ? { fixture } : {}) });
if (boundary?.mode === 'QUALIFIED') broker.installApprovedConsents(boundary, await readApprovedConsents(boundary));
const daily = synthetic ? DailyGateway.syntheticFixture(broker) : DailyGateway.nativeService(broker, boundary!);
type Writer = (value: any) => Promise<void>;
const acks = new Map<string, { seq: number; resolve: () => void; reject: () => void }>();
const channels = new Map<string, Set<string>>();
let output: Promise<void> = Promise.resolve();
let outputBytes = 0, outputFrames = 0;
const inflight = new Map<string, number>(), retired = new Set<string>();
const nativeWrite: Writer = async value => {
  const line = JSON.stringify(value) + '\n'; invariant(Buffer.byteLength(line) <= 1024 * 1024, 'SERVICE_FRAME_LIMIT');
  const bytes = Buffer.byteLength(line);
  invariant(outputFrames < 64 && outputBytes + bytes <= 4 * 1024 * 1024, 'SERVICE_OUTPUT_BACKPRESSURE');
  outputFrames++; outputBytes += bytes;
  output = output.then(async () => { if (!process.stdout.write(line)) await once(process.stdout, 'drain'); }).finally(() => { outputFrames--; outputBytes -= bytes; }); await output;
};
const ipcWrite: Writer = value => new Promise((resolve, reject) => { if (!process.send) { reject(Error('SERVICE_IPC_CLOSED')); return; } process.send(value, undefined, undefined, (e: Error | null) => e ? reject(e) : resolve()); });
let runtimeChild: ReturnType<typeof fork> | undefined;
let runtimeReady: Promise<void> = Promise.resolve();
let runtimePid = 0;
const dailyPipe = '\\\\.\\pipe\\AgentNexus-Q3-Synthetic-' + randomUUID();
const dailyChannels = new Set<string>();
const helperChannels = new Set<string>();
function disconnect(channel: string) {
  daily.disconnect(channel); broker.disconnectImports(channel); broker.disconnect([...(channels.get(channel) ?? [])]); channels.delete(channel);
  for (const [key, ack] of acks) if (key.startsWith(channel + ':')) ack.reject();
}
async function handle(channel: string, request: any, write: Writer) {
  const send = (response: any) => write(synthetic ? response : { channel, response });
  const id = request?.id;
  if (request?.method === 'session.disconnect') { retired.delete(channel); disconnect(channel); return; }
  else if (retired.has(channel)) return;
  const count = inflight.get(channel) ?? 0;
  if (count >= 16) { disconnect(channel); retired.add(channel); await send({ id, ok: false, error: 'SERVICE_CHANNEL_BACKPRESSURE', sent: false }); return; }
  inflight.set(channel, count + 1);
  try {
    invariant(request && typeof request === 'object' && !Array.isArray(request) && Object.keys(request).sort().join(',') === 'id,method,params' && typeof id === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(id) && typeof request.method === 'string', 'SERVICE_RPC_SCHEMA');
    if (!channels.has(channel)) channels.set(channel, new Set());
    const p = request.params;
    if (request.method === 'stream.ack') {
      invariant(p && Object.keys(p).sort().join(',') === 'request_id,seq', 'SERVICE_SCHEMA');
      const ack = acks.get(channel + ':' + p.request_id); invariant(ack && ack.seq === p.seq, 'SERVICE_STREAM_ACK'); ack.resolve(); return;
    }
    if (request.method === 'request.cancel') {
      invariant(p && Object.keys(p).join(',') === 'request_id', 'SERVICE_SCHEMA');
      if (daily && broker.store.dailyGrantForRequest(p.request_id)) { const value = daily.cancel(channel, p.request_id); await send({ id, ok: true, value }); return; }
      invariant(channels.get(channel)?.has(p.request_id), 'SERVICE_REQUEST_OWNER'); broker.disconnect([p.request_id]); await send({ id, ok: true, value: { cancelled: true, automatic_retry: false } }); return;
    }
    if (request.method === 'session.disconnect') { disconnect(channel); return; }
    if (request.method.startsWith('credential.') || request.method === 'budget.configure') broker.claimManagement(id, request.method);
    let value: any;
    if (request.method === 'snapshot') { invariant(p && Object.keys(p).length === 0, 'SERVICE_SCHEMA'); value = dailyChannels.has(channel) ? daily.channelSnapshot(channel, syntheticStack) : broker.snapshot(); }
    else if (request.method === 'credential.prepare') value = broker.prepareImport(channel, p);
    else if (request.method === 'credential.ticket.cancel') value = broker.cancelImport(channel, p);
    else if (request.method.startsWith('credential.') || request.method === 'budget.configure') value = await broker.mutate(request.method, p, channel);
    else if (request.method === 'broker.prepare') value = broker.prepare(p.input);
    else if (request.method === 'daily.prepare') {
      if (syntheticStack && dailyChannels.has(channel)) daily.authorizeSynthetic(channel, p.input);
      // A separately signed QUALIFICATION_ONLY deployment has no REAL vault or
      // network transport. It may exercise the existing synthetic reviewer on
      // the actual native chain; QUALIFIED mode still needs signed exact consent.
      else if (boundary?.mode === 'QUALIFICATION_ONLY' && dailyChannels.has(channel)) broker.reviewSynthetic(p.input);
      value = daily.prepare(channel, p);
    }
    else if (request.method === 'broker.execute' || request.method === 'daily.execute') {
      const dailyRequest = request.method === 'daily.execute';
      if (dailyRequest) invariant(daily, 'DAILY_PRODUCTION_RUNTIME_BLOCKED');
      const binding = dailyRequest ? p.grant?.binding : p.binding;
      invariant(binding && typeof binding.request_id === 'string', 'SERVICE_SCHEMA');
      const requests = channels.get(channel)!; invariant(requests.size < 4 && !requests.has(binding.request_id), 'SERVICE_REQUEST_INFLIGHT'); requests.add(binding.request_id);
      let seq = 0;
      try {
        const stream = async (text: string) => {
          const key = channel + ':' + id, current = ++seq;
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => { acks.delete(key); reject(Error('SERVICE_STREAM_CONSUMER_TIMEOUT')); }, 10000);
            acks.set(key, { seq: current, resolve: () => { clearTimeout(timer); acks.delete(key); resolve(); }, reject: () => { clearTimeout(timer); acks.delete(key); reject(Error('SERVICE_STREAM_CLOSED')); } });
            void send({ id, event: 'delta', seq: current, text }).catch(() => { acks.get(key)?.reject(); });
          });
        };
        value = dailyRequest ? await daily!.execute(channel, p, stream) : await broker.execute(p, stream);
      } finally { requests.delete(binding.request_id); acks.get(channel + ':' + id)?.reject(); }
    } else if (syntheticStack && request.method === 'synthetic.stack.info') { await runtimeReady; invariant(runtimePid > 0, 'SYNTHETIC_RUNTIME_UNAVAILABLE'); value = { pipe: dailyPipe, runtime_pid: runtimePid }; }
    else if (syntheticStack && request.method === 'synthetic.helper.rpc') {
      invariant(p && Object.keys(p).sort().join(',') === 'helper_channel,request' && /^[a-f0-9-]{36}$/.test(p.helper_channel) && ['snapshot', 'credential.prepare', 'credential.save', 'credential.ticket.cancel'].includes(p.request?.method), 'SYNTHETIC_HELPER_SCHEMA');
      invariant(helperChannels.has(p.helper_channel) || helperChannels.size < 8, 'SYNTHETIC_HELPER_CAPACITY');
      helperChannels.add(p.helper_channel);
      await handle('helper-' + p.helper_channel, p.request, async response => { value = response; });
    }
    else if (syntheticStack && request.method === 'synthetic.helper.disconnect') { invariant(p && /^[a-f0-9-]{36}$/.test(p.helper_channel), 'SYNTHETIC_HELPER_SCHEMA'); disconnect('helper-' + p.helper_channel); helperChannels.delete(p.helper_channel); value = { disconnected: true }; }
    else if (synthetic && request.method === 'synthetic.daily.authorize') value = { grant_id: daily!.authorizeSynthetic(channel, p.input, p.decisions) };
    else if (simulatedRuntime && request.method === 'synthetic.review') value = { grant_id: broker.reviewSynthetic(p.input, p.decisions) };
    else if (simulatedRuntime && request.method === 'synthetic.scenario') { invariant(['normal', 'timeout', 'utf8', 'stream', 'large', 'auth', 'forbidden', 'rate', 'no-usage', 'disconnect', 'unavailable'].includes(p.name), 'SERVICE_FIXTURE_SCENARIO'); scenario = p.name; value = { simulated: true }; }
    else if (simulatedRuntime && request.method === 'synthetic.audit') value = broker.store.auditRows();
    else if (simulatedRuntime && request.method === 'synthetic.grant.revoke') { broker.store.grantRevoke(p.id); value = { revoked: true }; }
    else if (synthetic && request.method === 'session.close') { runtimeChild?.kill(); for (const c of [...channels.keys()]) disconnect(c); await broker.close(); await send({ id, ok: true, value: { closed: true } }); process.disconnect?.(); process.exitCode = 0; return; }
    else invariant(false, 'SERVICE_METHOD_DENIED');
    await send({ id, ok: true, value });
  } catch (error) {
    const e = error as { code?: unknown; sent?: boolean; timed_out?: boolean; partial?: boolean; http_status?: number };
    if (typeof request?.method === 'string' && request.method.startsWith('credential.')) broker.rejected(request.method, typeof id === 'string' ? id : 'invalid', typeof e.code === 'string' ? e.code : 'SERVICE_OPERATION_FAILED');
    await send({ id: typeof id === 'string' && id.length <= 128 ? id : 'invalid', ok: false,
      error: typeof e.code === 'string' && /^[A-Z][A-Z0-9_]{0,95}$/.test(e.code) ? e.code : 'SERVICE_OPERATION_FAILED',
      sent: e.sent === true, timed_out: e.timed_out === true, partial: e.partial === true, http_status: [200, 400, 401, 403, 404, 422, 429, 500, 502, 503, 504].includes(e.http_status ?? 0) ? e.http_status : null });
  } finally { const remaining = (inflight.get(channel) ?? 1) - 1; if (remaining > 0) inflight.set(channel, remaining); else inflight.delete(channel); }
}
if (synthetic) {
  invariant(!!process.send, 'SERVICE_INHERITED_CHANNEL_REQUIRED');
  if (syntheticStack) {
    runtimeChild = fork(fileURLToPath(new URL(import.meta.url.endsWith('.ts') ? './daily-runtime.ts' : './daily-runtime.js', import.meta.url)), ['--synthetic-runtime', dailyPipe], { serialization: 'advanced', ...{ windowsHide: true }, stdio: ['ignore', 'ignore', 'pipe', 'ipc'], env: { SystemRoot: 'C:\\Windows', WINDIR: 'C:\\Windows' }, execArgv: [] });
    runtimeChild.stderr?.on('data', b => b.fill(0));
    runtimeReady = new Promise<void>((resolve, reject) => {
      runtimeChild!.on('message', (value: any) => {
        if (value?.event === 'ready') { runtimePid = value.pid; resolve(); return; }
        if (value?.event === 'disconnect') { dailyChannels.delete(value.channel); disconnect(value.channel); return; }
        if (value?.event !== 'request' || !/^[a-f0-9]{32}$/.test(value.channel) || !['snapshot', 'daily.prepare', 'daily.execute', 'request.cancel', 'stream.ack'].includes(value.request?.method)) { runtimeChild!.kill(); return; }
        dailyChannels.add(value.channel);
        void handle(value.channel, value.request, response => new Promise<void>((res, rej) => { runtimeChild!.send({ channel: value.channel, response }, (e: Error | null) => e ? rej(e) : res()); })).catch(() => runtimeChild!.kill());
      });
      runtimeChild!.on('error', reject);
      runtimeChild!.on('exit', () => { runtimePid = 0; for (const channel of dailyChannels) disconnect(channel); dailyChannels.clear(); reject(Error('SYNTHETIC_RUNTIME_EXITED')); });
    });
    void runtimeReady.catch(() => {});
  }
  process.on('message', value => { void handle('inherited-synthetic', value, ipcWrite).catch(() => process.exit(1)); });
  process.on('disconnect', () => { runtimeChild?.kill(); for (const channel of channels.keys()) disconnect(channel); setTimeout(() => process.exit(0), 100).unref(); });
  await ipcWrite({ event: 'ready', assurance: 'SIMULATED' });
} else {
  let buffer = Buffer.alloc(0);
  process.stdin.on('data', (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]); if (buffer.length > 1024 * 1024) { process.exitCode = 1; process.stdin.destroy(); return; }
    for (;;) {
      const i = buffer.indexOf(10); if (i < 0) break; const line = buffer.subarray(0, i).toString('utf8'); buffer = Buffer.from(buffer.subarray(i + 1));
      try {
        const value = JSON.parse(line), peer = value.peer;
        invariant(typeof value.channel === 'string' && peer?.authenticated === true && peer.service_sid === boundary!.service_sid, 'SERVICE_NATIVE_PEER_REQUIRED');
        if (peer.kind === 'CREDENTIAL_HELPER') {
          invariant(peer.elevated === true && peer.integrity === 'high', 'SERVICE_HELPER_TOKEN_REQUIRED');
          invariant(['snapshot', 'credential.prepare', 'credential.save', 'credential.state', 'credential.delete', 'credential.models', 'credential.ticket.cancel', 'session.disconnect'].includes(value.request?.method), 'SERVICE_HELPER_METHOD_DENIED');
        } else {
          invariant(peer.kind === 'DAILY_RUNTIME' && /^S-1-/.test(peer.operator_sid) && Number.isSafeInteger(peer.session_id) && peer.session_id > 0, 'SERVICE_RUNTIME_TOKEN_REQUIRED');
          invariant(['snapshot', 'daily.prepare', 'daily.execute', 'request.cancel', 'stream.ack', 'session.disconnect'].includes(value.request?.method), 'SERVICE_DAILY_METHOD_DENIED');
          if (value.request.method === 'session.disconnect') dailyChannels.delete(value.channel);
          else {
            invariant(Number.isSafeInteger(peer.expires_at_ms), 'SERVICE_RUNTIME_EXPIRY_REQUIRED');
            if (peer.expires_at_ms <= Date.now()) {
              disconnect(value.channel);
              void nativeWrite({ channel: value.channel, response: { id: value.request.id, ok: false, error: 'DAILY_NATIVE_EXPIRY', sent: false } }).catch(() => process.exit(1)); continue;
            }
            daily.registerNativeChannel(value.channel, peer.runtime_identity, peer.expires_at_ms); dailyChannels.add(value.channel);
          }
        }
        void handle(value.channel, value.request, nativeWrite).catch(() => process.exit(1));
      } catch { process.exitCode = 1; process.stdin.destroy(); }
    }
  });
  process.stdin.on('end', () => { for (const [channel, ids] of channels) { broker.disconnectImports(channel); broker.disconnect([...ids]); } setTimeout(() => process.exit(0), 100).unref(); });
}
