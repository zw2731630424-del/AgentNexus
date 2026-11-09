import { fork } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { invariant, canonical, sha256 } from '../types.ts';
import type { CredentialServicePort, ServiceSnapshot, BrokerInput, BrokerResult } from './contracts.ts';
import { DAILY_QUALIFICATION } from './daily-contracts.ts';

const guard = Object.freeze({ assertSafe(value: string | Uint8Array, _channel: string) {
  const text = typeof value === 'string' ? value : Buffer.from(value).toString('utf8');
  invariant(!/\bBearer\s+\S+|\bsk-[A-Za-z0-9_-]{16,}|synthetic-test-[A-Za-z0-9_-]{8,}/.test(text), 'SERVICE_HOST_SECRET_PATTERN_BLOCKED');
} });
type Pending = { resolve: (v: any) => void; reject: (e: any) => void; timer: NodeJS.Timeout; delta?: (text: string) => Promise<void>; stream: Promise<void> };
const failure = (value: any) => Object.assign(Error(typeof value.error === 'string' ? value.error : 'SERVICE_UNAVAILABLE'), { code: value.error ?? 'SERVICE_UNAVAILABLE', sent: value.sent === true, timed_out: value.timed_out === true, http_status: value.http_status ?? null, partial: value.partial === true });

class RpcClient implements CredentialServicePort {
  readonly guard = guard;
  #assurance: 'SIMULATED' | 'REAL';
  get assurance() { return this.#assurance; }
  #fixtureAuthority: boolean;
  #pending = new Map<string, Pending>();
  #closed = false;
  #writeQueue: Promise<void> = Promise.resolve();
  readonly child: ChildProcess; readonly synthetic: boolean;
  constructor(child: ChildProcess, synthetic: boolean) {
    this.child = child; this.synthetic = synthetic;
    this.#assurance = synthetic ? 'SIMULATED' : 'REAL'; this.#fixtureAuthority = synthetic;
    if (synthetic) child.on('message', value => this.#receive(value));
    else {
      let buffer = Buffer.alloc(0);
      child.stdout!.on('data', (b: Buffer) => {
        buffer = Buffer.concat([buffer, b]); if (buffer.length > 1024 * 1024) { this.#fail(); return; }
        for (;;) { const i = buffer.indexOf(10); if (i < 0) return; const line = buffer.subarray(0, i).toString('utf8'); buffer = Buffer.from(buffer.subarray(i + 1));
          try { this.#receive(JSON.parse(line)); } catch { this.#fail(); return; } }
      });
    }
    child.on('exit', () => this.#fail()); child.on('error', () => this.#fail());
    child.stderr?.on('data', (b: Buffer) => { b.fill(0); });
    child.stdin?.on('error', () => this.#fail());
  }
  #fail() { this.#closed = true; for (const p of this.#pending.values()) { clearTimeout(p.timer); p.reject(failure({ error: 'SERVICE_DISCONNECTED', sent: true })); } this.#pending.clear(); }
  #receive(value: any) {
    if (value?.event === 'ready') return;
    const p = this.#pending.get(value?.id); if (!p) return;
    if (value.event === 'delta') {
      if (typeof value.text !== 'string' || Buffer.byteLength(value.text) > 32768 || !Number.isSafeInteger(value.seq)) { this.#fail(); return; }
      p.stream = p.stream.then(async () => { guard.assertSafe(value.text, 'SERVICE_DELTA'); await p.delta?.(value.text); await this.#write({ id: randomUUID(), method: 'stream.ack', params: { request_id: value.id, seq: value.seq } }); });
      void p.stream.catch(() => { this.child.kill(); this.#fail(); }); return;
    }
    this.#pending.delete(value.id); clearTimeout(p.timer);
    void p.stream.then(() => { if (value.ok === true) p.resolve(value.value); else p.reject(failure(value)); }, () => p.reject(failure({ error: 'SERVICE_STREAM_CONSUMER_FAILED', sent: true })));
  }
  #write(value: any): Promise<void> {
    invariant(!this.#closed, 'SERVICE_DISCONNECTED'); const data = JSON.stringify(value);
    invariant(Buffer.byteLength(data) <= 1024 * 1024, 'SERVICE_FRAME_LIMIT');
    this.#writeQueue = this.#writeQueue.then(() => new Promise<void>((resolve, reject) => {
      if (this.synthetic) this.child.send!(JSON.parse(data), (e: Error | null) => e ? reject(e) : resolve());
      else this.child.stdin!.write(data + '\n', e => e ? reject(e) : resolve());
    })); return this.#writeQueue;
  }
  async #call(method: string, params: unknown, delta?: (text: string) => Promise<void>): Promise<any> {
    invariant(!this.#closed && this.#pending.size < 16, 'SERVICE_BACKPRESSURE'); const id = randomUUID();
    const result = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => { this.#pending.delete(id); reject(failure({ error: 'SERVICE_RPC_TIMEOUT', sent: method === 'broker.execute' || method === 'daily.execute', timed_out: true })); }, 135000);
      this.#pending.set(id, { resolve, reject, timer, delta, stream: Promise.resolve() });
    });
    try { await this.#write({ id, method, params }); } catch { const p = this.#pending.get(id); if (p) { clearTimeout(p.timer); this.#pending.delete(id); p.reject(failure({ error: 'SERVICE_DISCONNECTED', sent: method === 'broker.execute' || method === 'daily.execute' })); } }
    return result;
  }
  async invoke(method: string, params: unknown = {}): Promise<any> {
    const input = params as any;
    if (method !== 'credential.save') return this.#call(method, params);
    invariant(this.synthetic, 'SERVICE_SECRET_ENTRY_DENIED');
    invariant(input?.secret instanceof Uint8Array, 'SERVICE_SECRET_BYTES_REQUIRED');
    const copy = Buffer.from(input.secret); input.secret.fill(0); input.secret = undefined;
    try {
      const { secret: _removed, import_ticket: _oldTicket, import_operation_id: _oldOperation, ...rest } = input;
      const metadata = JSON.parse(JSON.stringify(rest));
      const ticket = await this.#call('credential.prepare', { operation_id: randomUUID(), metadata_hash: sha256(canonical(metadata)), secret_sha256: sha256(copy) });
      return await this.#call(method, { ...metadata, secret_b64: copy.toString('base64'), import_ticket: ticket.ticket_id, import_operation_id: ticket.operation_id });
    }
    finally { copy.fill(0); }
  }
  async snapshot(): Promise<ServiceSnapshot> {
    const value: ServiceSnapshot = await this.#call('snapshot', {});
    this.#assurance = value.qualification.mode;
    this.#fixtureAuthority = this.synthetic || (value.qualification.mode === 'SIMULATED' && value.qualification.synthetic_key_entry === true); return value;
  }
  async execute(input: BrokerInput, signal?: AbortSignal, onDelta?: (text: string) => Promise<void>): Promise<BrokerResult> {
    invariant(!signal?.aborted, 'SERVICE_CANCELLED_BEFORE_SEND');
    // This fixture review exists only on the separately labelled synthetic worker.
    invariant(this.synthetic && this.#fixtureAuthority, 'DAILY_NATIVE_RUNTIME_AUTHENTICATION_NOT_IMPLEMENTED');
    await this.#call('synthetic.daily.authorize', { input });
    const grant = await this.#call('daily.prepare', { input });
    const cancel = () => { void this.#call('request.cancel', { request_id: grant.binding.request_id }).catch(() => {}); };
    signal?.addEventListener('abort', cancel, { once: true });
    try { if (signal?.aborted) { cancel(); throw failure({ error: 'SERVICE_CANCELLED_BEFORE_SEND' }); } return await this.#call('daily.execute', { input, grant }, onDelta); }
    finally { signal?.removeEventListener('abort', cancel); }
  }
  async close(): Promise<void> {
    if (this.#closed) return;
    if (this.synthetic) await this.#call('session.close', {});
    else this.child.stdin?.end();
    await new Promise<void>(resolve => {
      if (this.child.exitCode !== null) { resolve(); return; }
      const timer = setTimeout(() => { this.child.kill(); resolve(); }, 2000); this.child.once('exit', () => { clearTimeout(timer); resolve(); });
    }); this.#fail();
  }
}

function blocked(): CredentialServicePort {
  const zero = { input_tokens: 0, output_tokens: 0, cached_tokens: null, reasoning_tokens: null, requests: 0, failed_requests: 0, estimated_cost_micros: 0, actual_cost_micros: null };
  const value: ServiceSnapshot = { daily_gateway: DAILY_QUALIFICATION, qualification: { live: 'BLOCKED', credential_service: 'BLOCKED', real_key_entry: false, synthetic_key_entry: false, mode: 'SIMULATED', reason: 'DAILY_NATIVE_RUNTIME_AUTHENTICATION_NOT_IMPLEMENTED' },
    keys: [], usage: { available: false, status: 'IPC_BLOCKED', global: { id: 'm181-deepseek', owner: 'CREDENTIAL_SERVICE', limit: 100000000, used: null, held: null, remaining_tokens: null, unknown: null, requests: null, state: 'BLOCKED' }, real: { ...zero, input_tokens: null, output_tokens: null, requests: null }, simulated: zero, simulated_budget: { limits: { tokens: 100000000 }, used: { tokens: 0 }, held: { tokens: 0 } }, by_provider: [], by_model: [], by_agent: [], by_task: [], records: [] }, policy_epoch: 0, service_instance: 'UNAVAILABLE' };
  return Object.freeze({ assurance: 'SIMULATED' as const, guard, async invoke(method: string) { if (method === 'snapshot') return structuredClone(value); throw failure({ error: 'CREDENTIAL_SERVICE_BLOCKED' }); }, async snapshot() { return structuredClone(value); }, async execute() { throw failure({ error: 'CREDENTIAL_SERVICE_BLOCKED' }); }, async close() {} });
}
export function unavailableCredentialService(): CredentialServicePort { return blocked(); }
export async function connectCredentialService(): Promise<CredentialServicePort> {
  // Q2 does not launch the High pipe-client from the ordinary Host. A native
  // runtime origin boundary is missing; no UAC, fallback or MI listener is used.
  return blocked();
}
/** Separate real OS process with inherited private IPC, but the same Windows SID.
 * This explicitly does NOT qualify production vault isolation. */
export async function openSyntheticCredentialService(root: string): Promise<CredentialServicePort> {
  const child = fork(fileURLToPath(new URL(import.meta.url.endsWith('.ts') ? './engine.ts' : './engine.js', import.meta.url)), ['--synthetic-test-worker', root], {
    serialization: 'advanced', ...{ windowsHide: true }, stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    env: { SystemRoot: 'C:\\Windows', WINDIR: 'C:\\Windows' }, execArgv: [], execPath: process.versions.electron ? 'D:\\Nodejs\\node.exe' : process.execPath,
  });
  const client = new RpcClient(child, true);
  // FIFO IPC queues requests until startup; no polling or exposed launch token.
  await client.snapshot(); return client;
}
