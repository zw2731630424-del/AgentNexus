import { canonical, invariant, NexusError, sha256, uid } from '../types.js';
import { keys, profileHash, sameProcess, snapshot, validateLogical } from '../runtime/contracts.js';
import { authenticated, grantMatches, validateGrant, validateRuntime } from '../production/contracts.js';
import { WindowsSupervisor } from '../production/windows-supervisor.js';
import { digestArguments, workerInput } from './worker.js';
import { AuthenticatedSession, LauncherLink } from './session.js';
class StreamSlot {
    #value = null;
    #wake = null;
    #ended = false;
    #error;
    async push(bytes) { invariant(!this.#ended && !this.#value && bytes.length <= 4096, 'M15_OUTPUT_BACKPRESSURE'); await new Promise(done => { this.#value = { bytes, done }; this.#wake?.(); this.#wake = null; }); }
    end(error) { this.#ended = true; this.#error = error; this.#value?.done(); this.#wake?.(); this.#wake = null; }
    async *[Symbol.asyncIterator]() { try {
        for (;;) {
            if (this.#value) {
                const v = this.#value;
                this.#value = null;
                try {
                    yield v.bytes;
                }
                finally {
                    v.done();
                }
                continue;
            }
            if (this.#error)
                throw this.#error;
            if (this.#ended)
                return;
            await new Promise(resolve => { this.#wake = resolve; });
        }
    }
    finally {
        this.end(new NexusError('M15_OUTPUT_CONSUMER_CLOSED'));
    } }
}
/** Host-side owner: process identities originate exclusively from the authenticated Launcher. */
export class RemoteSupervisor {
    helper_hash;
    link;
    #profile;
    #prepared = new Map();
    #runtimes = new Map();
    #grants = new Map();
    #hostKey;
    constructor(link, helperHash, profile, hostPublicKey) { this.link = link; this.helper_hash = helperHash; this.#profile = snapshot(profile); this.#hostKey = hostPublicKey; }
    async prepare(logical, args) {
        validateLogical(logical);
        digestArguments(args);
        invariant(this.#prepared.size < 4, 'M15_PREPARE_LIMIT');
        const p = snapshot(await this.link.call('PREPARE', { logical, arguments: args }, uid(), Date.now() + 10000));
        keys(p, ['id', 'process', 'parent', 'profile_hash', 'arguments_hash', 'logical', 'runtime']);
        invariant(p.profile_hash === profileHash(this.#profile) && p.arguments_hash === sha256(canonical(args)) && canonical(p.logical) === canonical(logical) && p.runtime === null && p.process.principal === this.#profile.principal, 'M15_PREPARED_BINDING');
        const handle = Object.freeze({});
        this.#prepared.set(handle, { ...p });
        return handle;
    }
    async inspect(handle, signal) {
        const p = this.#prepared.get(handle);
        invariant(p, 'M15_PREPARED_UNKNOWN');
        const o = await this.link.call('INSPECT', { id: p.id }, p.id, Date.now() + 1500, signal);
        invariant(sameProcess(o.process, p.process) && sameProcess(o.parent, p.parent) && o.profile_hash === p.profile_hash && o.assurance === 'REAL_WINDOWS', 'M15_PREPARED_CHANGED');
        return snapshot(o);
    }
    attach(runtime, handle) { const p = this.#prepared.get(handle); invariant(p && p.runtime === null && sameProcess(runtime.process, p.process) && sameProcess(runtime.parent, p.parent) && canonical(runtime.logical) === canonical(p.logical) && runtime.profile_hash === p.profile_hash, 'M15_ATTACH_BINDING'); p.runtime = runtime.runtime_id; this.#runtimes.set(runtime.runtime_id, p); }
    registerGrant(packet, input = null) { const g = authenticated(packet, this.#hostKey); validateGrant(g); invariant(this.#runtimes.has(g.runtime_id) && !this.#grants.has(g.runtime_id), 'M15_GRANT_BINDING'); this.#grants.set(g.runtime_id, snapshot({ permit: packet, input })); }
    async ready(runtime, g, args, signal) {
        const p = this.#runtimes.get(runtime.runtime_id), packet = this.#grants.get(runtime.runtime_id);
        invariant(p && packet && canonical(packet.permit.body) === canonical(g) && p.arguments_hash === g.arguments_hash, 'M15_READY_BINDING');
        await this.link.call('AUTHORIZE', { id: p.id, runtime, permit: packet.permit, arguments: args, input: packet.input }, g.operation_id, Math.min(g.expires_at, Date.now() + 1800), signal);
    }
    start(runtime, g, args) {
        const p = this.#runtimes.get(runtime.runtime_id);
        invariant(p && this.#grants.has(runtime.runtime_id) && p.arguments_hash === sha256(canonical(args)) && Date.now() < g.expires_at, 'M15_START_BINDING');
        const stdout = new StreamSlot(), stderr = new StreamSlot();
        const exit = this.link.call('START', { id: p.id, operation_id: g.operation_id }, g.operation_id, Date.now() + runtime.profile.limits.wall_ms, undefined, async (event) => {
            keys(event, ['stream', 'data_base64']);
            const e = event;
            invariant(['stdout', 'stderr'].includes(e.stream) && typeof e.data_base64 === 'string' && e.data_base64.length <= 5464, 'M15_OUTPUT_FRAME');
            const bytes = Buffer.from(e.data_base64, 'base64');
            invariant(bytes.length <= 4096 && bytes.toString('base64') === e.data_base64, 'M15_OUTPUT_FRAME');
            await (e.stream === 'stdout' ? stdout : stderr).push(bytes);
        }).then(result => { const evidence = snapshot(result); invariant(evidence.source === 'REAL_WINDOWS' && sameProcess(evidence.process, runtime.process) && sameProcess(evidence.parent, runtime.parent), 'M15_EXIT_BINDING'); stdout.end(); stderr.end(); if (evidence.root_exited && evidence.job_empty && Object.values(evidence.outputs).every(o => o.eof && o.producer_closed)) {
            this.#runtimes.delete(runtime.runtime_id);
            this.#grants.delete(runtime.runtime_id);
            for (const [h, item] of this.#prepared)
                if (item === p)
                    this.#prepared.delete(h);
        } return evidence; }, error => { stdout.end(error); stderr.end(error); throw error; });
        void exit.catch(() => { });
        return { stdout, stderr, exit, terminate: () => { this.link.close(); stdout.end(new NexusError('M15_TERMINATION_REQUESTED')); stderr.end(new NexusError('M15_TERMINATION_REQUESTED')); } };
    }
    close() { this.link.close(); }
}
export class WorkerLauncherService {
    #session;
    #supervisor;
    #profile;
    #hostSid;
    #hostKey;
    #entries = new Map();
    #enabled;
    constructor(session, supervisor, profile, hostSid, hostKey, enabled = () => true) { this.#session = session; this.#supervisor = supervisor; this.#profile = snapshot(profile); this.#hostSid = hostSid; this.#hostKey = hostKey; this.#enabled = enabled; }
    async serve(signal) {
        try {
            while (!signal.aborted) {
                const request = await this.#session.receive(Date.now() + 30000, signal);
                let result;
                try {
                    const payload = request.payload;
                    switch (request.kind) {
                        case 'PREPARE': {
                            invariant(this.#enabled(), 'M15_LAUNCHER_FEATURE_DISABLED');
                            keys(payload, ['logical', 'arguments']);
                            const p = payload;
                            validateLogical(p.logical);
                            digestArguments(p.arguments);
                            invariant(this.#entries.size < 4, 'M15_LAUNCHER_LIMIT');
                            const handle = await this.#supervisor.prepare('nexus.digest', p.arguments, this.#profile, this.#hostSid, this.#profile.principal), observed = await this.#supervisor.inspect(handle), id = uid();
                            this.#entries.set(id, { handle, logical: snapshot(p.logical), args: snapshot(p.arguments), runtime: null, grant: null, used: false });
                            result = { id, process: observed.process, parent: observed.parent, profile_hash: observed.profile_hash, arguments_hash: sha256(canonical(p.arguments)), logical: p.logical, runtime: null };
                            break;
                        }
                        case 'INSPECT': {
                            keys(payload, ['id']);
                            const p = this.#get(payload.id);
                            result = await this.#supervisor.inspect(p.handle);
                            break;
                        }
                        case 'AUTHORIZE': {
                            invariant(this.#enabled(), 'M15_LAUNCHER_FEATURE_DISABLED');
                            keys(payload, ['id', 'runtime', 'permit', 'arguments', 'input']);
                            const p = payload, entry = this.#get(p.id);
                            const g = authenticated(p.permit, this.#hostKey);
                            validateGrant(g);
                            validateRuntime(p.runtime);
                            grantMatches(g, p.runtime, { policy_epoch: g.policy_epoch, feature_epoch: g.feature_epoch });
                            invariant(!entry.used && entry.grant === null && g.operation_id === request.operation_id && canonical(entry.logical) === canonical(g.logical) && canonical(entry.args) === canonical(p.arguments) && g.arguments_hash === sha256(canonical(entry.args)) && p.runtime.profile_hash === profileHash(this.#profile), 'M15_LAUNCHER_AUTHORIZATION');
                            const observed = await this.#supervisor.inspect(entry.handle);
                            invariant(sameProcess(observed.process, p.runtime.process) && sameProcess(observed.parent, p.runtime.parent), 'M15_LAUNCHER_PROCESS');
                            workerInput(entry.args, g, p.input, this.#hostKey);
                            this.#supervisor.attach(p.runtime, entry.handle);
                            this.#supervisor.setBootstrap(p.runtime, Buffer.from(canonical({ schema: 'agentnexus/worker-bootstrap/1', permit: p.permit, arguments: entry.args, ...(p.input === null ? {} : { input: p.input }) })));
                            await this.#supervisor.ready(p.runtime, g, entry.args, signal);
                            entry.runtime = snapshot(p.runtime);
                            entry.grant = g;
                            result = { authorized: true, operation_id: g.operation_id };
                            break;
                        }
                        case 'START': {
                            invariant(this.#enabled(), 'M15_LAUNCHER_FEATURE_DISABLED');
                            keys(payload, ['id', 'operation_id']);
                            const p = payload, entry = this.#get(p.id), r = entry.runtime, g = entry.grant;
                            invariant(r && g && !entry.used && p.operation_id === g.operation_id && request.operation_id === g.operation_id && Date.now() < g.expires_at, 'M15_LAUNCHER_START');
                            entry.used = true;
                            const run = this.#supervisor.start(r, g, entry.args);
                            let gate = Promise.resolve(), monitoring = false;
                            const monitor = setInterval(() => { if (monitoring || this.#session.transportBusy)
                                return; monitoring = true; void this.#session.recheck().catch(() => run.terminate('HOST_PEER_LOST')).finally(() => { monitoring = false; }); }, 250);
                            const pump = async (stream, source) => { for await (const chunk of source) {
                                const event = { stream, data_base64: Buffer.from(chunk).toString('base64') };
                                const task = gate.then(() => this.#session.send('EVENT', event, request.request_id, request.operation_id, request.expires, signal));
                                gate = task;
                                await task;
                            } };
                            try {
                                const [, , evidence] = await Promise.all([pump('stdout', run.stdout), pump('stderr', run.stderr), run.exit]);
                                result = evidence;
                                if (evidence.root_exited && evidence.job_empty && Object.values(evidence.outputs).every(o => o.eof && o.producer_closed))
                                    this.#entries.delete(p.id);
                            }
                            catch (error) {
                                run.terminate('IPC_OR_OUTPUT_UNCERTAIN');
                                throw error;
                            }
                            finally {
                                clearInterval(monitor);
                            }
                            break;
                        }
                        case 'STOP': {
                            keys(payload, []);
                            this.#supervisor.close();
                            result = { termination_requested: true, exit_verified: false };
                            break;
                        }
                        case 'PING': {
                            keys(payload, []);
                            result = { alive: true, prepared: this.#entries.size };
                            break;
                        }
                        default: throw new NexusError('M15_LAUNCHER_METHOD');
                    }
                    await this.#session.send('RESULT', result, request.request_id, request.operation_id, request.expires, signal);
                }
                catch (error) {
                    await this.#session.send('ERROR', { reason: error instanceof NexusError ? error.code : 'LAUNCHER_UNCERTAIN', automatic_retry: false }, request.request_id, request.operation_id, request.expires, signal);
                    throw error;
                }
            }
        }
        finally {
            this.#supervisor.close();
            this.#session.close();
        }
    }
    #get(id) { const entry = this.#entries.get(id); invariant(entry, 'M15_PREPARED_UNKNOWN'); return entry; }
}
