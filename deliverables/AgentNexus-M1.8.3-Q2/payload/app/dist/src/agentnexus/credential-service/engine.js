// Native service child entry point. stdout is protocol-only; no payload logging.
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { CredentialBroker } from './broker.js';
import { attestServiceBoundary, readApprovedConsents, SERVICE_DATA_ROOT, QUALIFICATION_DATA_ROOT } from './boundary.js';
import { invariant } from '../types.js';
import { wireFixture, FixtureTransport } from '../model-runtime/transport.js';
import { DailyGateway } from './daily-gateway.js';
const synthetic = process.argv[2] === '--synthetic-test-worker';
const root = synthetic ? resolve(process.argv[3] ?? '') : SERVICE_DATA_ROOT;
if (synthetic)
    invariant(process.argv.length === 4 && /[\\/]\.workflow-kit[\\/]runtime[\\/]AgentNexus-M1\.8\.3(?:-Q2)?[\\/]/i.test(root), 'SERVICE_SYNTHETIC_ROOT_REQUIRED');
else
    invariant(process.argv.length === 2, 'SERVICE_START_ARGUMENTS_DENIED');
let scenario = 'normal';
const fixture = new FixtureTransport(async (_request, _n, signal) => {
    if (scenario === 'timeout')
        await new Promise((_, reject) => { signal.addEventListener('abort', () => reject(Error('FIXTURE_CANCELLED')), { once: true }); if (signal.aborted)
            reject(Error('FIXTURE_CANCELLED')); });
    return wireFixture(JSON.stringify({ kind: 'FINAL', text: scenario === 'utf8' ? '你好，世界。🌏' : scenario === 'large' ? 'abcdefgh'.repeat(3000) : 'SIMULATED · isolated credential process, no network.' }), { usage: scenario === 'no-usage' ? null : { prompt_tokens: 20, completion_tokens: 10 }, done: scenario !== 'disconnect', status: scenario === 'auth' ? 401 : scenario === 'forbidden' ? 403 : scenario === 'rate' ? 429 : scenario === 'unavailable' ? 503 : 200, chunk_bytes: 7 });
});
const boundary = synthetic ? undefined : await attestServiceBoundary();
const simulatedRuntime = synthetic || boundary?.mode === 'QUALIFICATION_ONLY';
const broker = await CredentialBroker.open({ synthetic: simulatedRuntime, root: boundary?.mode === 'QUALIFICATION_ONLY' ? QUALIFICATION_DATA_ROOT : root, boundary, ...(simulatedRuntime ? { fixture } : {}) });
if (boundary?.mode === 'QUALIFIED')
    broker.installApprovedConsents(boundary, await readApprovedConsents(boundary));
// No production native runtime authenticator exists yet. Even qualification
// deployment cannot turn a caller-controlled Subject into a trusted runtime.
const daily = synthetic ? DailyGateway.syntheticFixture(broker) : undefined;
const acks = new Map();
const channels = new Map();
let output = Promise.resolve();
const nativeWrite = async (value) => {
    const line = JSON.stringify(value) + '\n';
    invariant(Buffer.byteLength(line) <= 1024 * 1024, 'SERVICE_FRAME_LIMIT');
    output = output.then(async () => { if (!process.stdout.write(line))
        await once(process.stdout, 'drain'); });
    await output;
};
const ipcWrite = value => new Promise((resolve, reject) => { if (!process.send) {
    reject(Error('SERVICE_IPC_CLOSED'));
    return;
} process.send(value, undefined, undefined, (e) => e ? reject(e) : resolve()); });
async function handle(channel, request, write) {
    const send = (response) => write(synthetic ? response : { channel, response });
    const id = request?.id;
    try {
        invariant(request && typeof request === 'object' && !Array.isArray(request) && Object.keys(request).sort().join(',') === 'id,method,params' && typeof id === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(id) && typeof request.method === 'string', 'SERVICE_RPC_SCHEMA');
        if (!channels.has(channel))
            channels.set(channel, new Set());
        const p = request.params;
        if (request.method === 'stream.ack') {
            invariant(p && Object.keys(p).sort().join(',') === 'request_id,seq', 'SERVICE_SCHEMA');
            const ack = acks.get(channel + ':' + p.request_id);
            invariant(ack && ack.seq === p.seq, 'SERVICE_STREAM_ACK');
            ack.resolve();
            return;
        }
        if (request.method === 'request.cancel') {
            invariant(p && Object.keys(p).join(',') === 'request_id', 'SERVICE_SCHEMA');
            if (daily && broker.store.dailyGrantForRequest(p.request_id)) {
                const value = daily.cancel(channel, p.request_id);
                await send({ id, ok: true, value });
                return;
            }
            invariant(channels.get(channel)?.has(p.request_id), 'SERVICE_REQUEST_OWNER');
            broker.disconnect([p.request_id]);
            await send({ id, ok: true, value: { cancelled: true, automatic_retry: false } });
            return;
        }
        if (request.method === 'session.disconnect') {
            daily?.disconnect(channel);
            broker.disconnectImports(channel);
            broker.disconnect([...(channels.get(channel) ?? [])]);
            channels.delete(channel);
            return;
        }
        if (request.method.startsWith('credential.') || request.method === 'budget.configure')
            broker.claimManagement(id, request.method);
        let value;
        if (request.method === 'snapshot') {
            invariant(p && Object.keys(p).length === 0, 'SERVICE_SCHEMA');
            value = broker.snapshot();
        }
        else if (request.method === 'credential.prepare')
            value = broker.prepareImport(channel, p);
        else if (request.method === 'credential.ticket.cancel')
            value = broker.cancelImport(channel, p);
        else if (request.method.startsWith('credential.') || request.method === 'budget.configure')
            value = await broker.mutate(request.method, p, channel);
        else if (request.method === 'broker.prepare')
            value = broker.prepare(p.input);
        else if (request.method === 'daily.prepare') {
            invariant(daily, 'DAILY_PRODUCTION_RUNTIME_BLOCKED');
            value = daily.prepare(channel, p);
        }
        else if (request.method === 'broker.execute' || request.method === 'daily.execute') {
            const dailyRequest = request.method === 'daily.execute';
            if (dailyRequest)
                invariant(daily, 'DAILY_PRODUCTION_RUNTIME_BLOCKED');
            const binding = dailyRequest ? p.grant?.binding : p.binding;
            invariant(binding && typeof binding.request_id === 'string', 'SERVICE_SCHEMA');
            const requests = channels.get(channel);
            invariant(requests.size < 4 && !requests.has(binding.request_id), 'SERVICE_REQUEST_INFLIGHT');
            requests.add(binding.request_id);
            let seq = 0;
            try {
                const stream = async (text) => {
                    const key = channel + ':' + id, current = ++seq;
                    await new Promise((resolve, reject) => {
                        const timer = setTimeout(() => { acks.delete(key); reject(Error('SERVICE_STREAM_CONSUMER_TIMEOUT')); }, 10000);
                        acks.set(key, { seq: current, resolve: () => { clearTimeout(timer); acks.delete(key); resolve(); }, reject: () => { clearTimeout(timer); acks.delete(key); reject(Error('SERVICE_STREAM_CLOSED')); } });
                        void send({ id, event: 'delta', seq: current, text }).catch(() => { acks.get(key)?.reject(); });
                    });
                };
                value = dailyRequest ? await daily.execute(channel, p, stream) : await broker.execute(p, stream);
            }
            finally {
                requests.delete(binding.request_id);
                acks.get(channel + ':' + id)?.reject();
            }
        }
        else if (synthetic && request.method === 'synthetic.daily.authorize')
            value = { grant_id: daily.authorizeSynthetic(channel, p.input, p.decisions) };
        else if (simulatedRuntime && request.method === 'synthetic.review')
            value = { grant_id: broker.reviewSynthetic(p.input, p.decisions) };
        else if (simulatedRuntime && request.method === 'synthetic.scenario') {
            invariant(['normal', 'timeout', 'utf8', 'large', 'auth', 'forbidden', 'rate', 'no-usage', 'disconnect', 'unavailable'].includes(p.name), 'SERVICE_FIXTURE_SCENARIO');
            scenario = p.name;
            value = { simulated: true };
        }
        else if (simulatedRuntime && request.method === 'synthetic.audit')
            value = broker.store.auditRows();
        else if (simulatedRuntime && request.method === 'synthetic.grant.revoke') {
            broker.store.grantRevoke(p.id);
            value = { revoked: true };
        }
        else if (synthetic && request.method === 'session.close') {
            await broker.close();
            await send({ id, ok: true, value: { closed: true } });
            process.disconnect?.();
            process.exitCode = 0;
            return;
        }
        else
            invariant(false, 'SERVICE_METHOD_DENIED');
        await send({ id, ok: true, value });
    }
    catch (error) {
        const e = error;
        if (typeof request?.method === 'string' && request.method.startsWith('credential.'))
            broker.rejected(request.method, typeof id === 'string' ? id : 'invalid', typeof e.code === 'string' ? e.code : 'SERVICE_OPERATION_FAILED');
        await send({ id: typeof id === 'string' && id.length <= 128 ? id : 'invalid', ok: false,
            error: typeof e.code === 'string' && /^[A-Z][A-Z0-9_]{0,95}$/.test(e.code) ? e.code : 'SERVICE_OPERATION_FAILED',
            sent: e.sent === true, timed_out: e.timed_out === true, partial: e.partial === true, http_status: [200, 400, 401, 403, 404, 422, 429, 500, 502, 503, 504].includes(e.http_status ?? 0) ? e.http_status : null });
    }
}
if (synthetic) {
    invariant(!!process.send, 'SERVICE_INHERITED_CHANNEL_REQUIRED');
    process.on('message', value => { void handle('inherited-synthetic', value, ipcWrite).catch(() => process.exit(1)); });
    process.on('disconnect', () => { daily?.disconnect('inherited-synthetic'); broker.disconnectImports('inherited-synthetic'); broker.disconnect([...(channels.get('inherited-synthetic') ?? [])]); setTimeout(() => process.exit(0), 100).unref(); });
    await ipcWrite({ event: 'ready', assurance: 'SIMULATED' });
}
else {
    let buffer = Buffer.alloc(0);
    process.stdin.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        if (buffer.length > 1024 * 1024) {
            process.exitCode = 1;
            process.stdin.destroy();
            return;
        }
        for (;;) {
            const i = buffer.indexOf(10);
            if (i < 0)
                break;
            const line = buffer.subarray(0, i).toString('utf8');
            buffer = Buffer.from(buffer.subarray(i + 1));
            try {
                const value = JSON.parse(line), peer = value.peer;
                invariant(typeof value.channel === 'string' && peer?.authenticated === true && peer.kind === 'CREDENTIAL_HELPER' && peer.elevated === true && peer.integrity === 'high' && peer.service_sid === boundary.service_sid, 'SERVICE_NATIVE_PEER_REQUIRED');
                invariant(['snapshot', 'credential.prepare', 'credential.save', 'credential.state', 'credential.delete', 'credential.models', 'credential.ticket.cancel', 'session.disconnect'].includes(value.request?.method), 'SERVICE_HELPER_METHOD_DENIED');
                void handle(value.channel, value.request, nativeWrite).catch(() => process.exit(1));
            }
            catch {
                process.exitCode = 1;
                process.stdin.destroy();
            }
        }
    });
    process.stdin.on('end', () => { for (const [channel, ids] of channels) {
        broker.disconnectImports(channel);
        broker.disconnect([...ids]);
    } setTimeout(() => process.exit(0), 100).unref(); });
}
