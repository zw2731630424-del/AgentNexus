import { canonical, invariant, NexusError, sha256 } from '../types.js';
import { profileHash, sameProcess, snapshot } from '../runtime/contracts.js';
import { NativeClient } from './native-client.js';
function processIdentity(p) { return { os: 'windows', principal: p.principal, pid: p.pid, start_id: p.start_id, os_session: p.os_session }; }
/** At most one queued output block; push completes only after the ArtifactStore consumes it. */
class OutputChannel {
    #item = null;
    #wake = null;
    #ended = false;
    #error = null;
    async push(data) { invariant(!this.#ended && !this.#item, 'M14_NATIVE_OUTPUT_BACKPRESSURE'); await new Promise(resolve => { this.#item = { data, consumed: resolve }; this.#wake?.(); this.#wake = null; }); }
    end(error = null) { this.#ended = true; this.#error = error; this.#item?.consumed(); this.#wake?.(); this.#wake = null; }
    async *[Symbol.asyncIterator]() {
        try {
            while (true) {
                if (this.#item) {
                    const item = this.#item;
                    this.#item = null;
                    try {
                        yield item.data;
                    }
                    finally {
                        item.consumed();
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
            this.end(new NexusError('M14_OUTPUT_CONSUMER_CLOSED'));
        }
    }
}
/** Worker-account Launcher side. Native code refuses a Host/same-SID or elevated launcher. */
export class WindowsSupervisor {
    helper_hash;
    #factory;
    #tools;
    #prepared = new Map();
    #byRuntime = new Map();
    #preparing = 0;
    #closed = false;
    constructor(factory, helperHash, tools) { this.#factory = factory; this.helper_hash = helperHash; this.#tools = new Map(tools.map(t => [t.id, t])); }
    async prepare(toolId, args, profile, hostSid, restrictingSid) {
        invariant(!this.#closed && this.#prepared.size + this.#preparing < 4, 'M14_SUPERVISOR_PREPARE_LIMIT');
        this.#preparing++;
        let client;
        try {
            const tool = this.#tools.get(toolId), input = snapshot(args);
            invariant(tool && tool.profile_hash === profileHash(profile), 'M14_TOOL_PROFILE');
            client = await this.#factory();
            invariant(!this.#closed && client.helper_hash === this.helper_hash, 'M14_NATIVE_HASH_CHANGED');
            const p = await client.request('sandbox.prepare', { executable: tool.executable, executable_sha256: tool.executable_hash, args: tool.argv(input), cwd: tool.cwd,
                profile_name: profile.id, expected_worker_sid: profile.principal, host_sid: hostSid, restricting_sid: restrictingSid, prepare_ttl_ms: 30000,
                limits: { active_processes: profile.limits.processes, process_memory_bytes: profile.limits.memory_bytes, job_memory_bytes: profile.limits.memory_bytes, cpu_rate: 2000, cpu_ms: profile.limits.cpu_ms, output_bytes: profile.limits.output_bytes },
                stdout_max_bytes: Math.min(16777216, profile.limits.output_bytes), stderr_max_bytes: Math.min(16777216, profile.limits.output_bytes) }, { deadline_ms: 10000 });
            invariant(p.suspended && p.job_assigned && p.job_limits_readback_verified && p.sandbox_combination_verified && p.process_handle_pinned, 'M14_NATIVE_PREPARE_UNVERIFIED');
            const handle = Object.freeze({});
            this.#prepared.set(handle, { client, id: p.prepare_id, process: processIdentity(p.process), parent: processIdentity(p.parent), profile_hash: profileHash(profile), tool, arguments_hash: sha256(canonical(input)), resumed: false, authorized_permit: null });
            return handle;
        }
        catch (error) {
            client?.close();
            throw error;
        }
        finally {
            this.#preparing--;
        }
    }
    async inspect(handle, signal) {
        const p = this.#prepared.get(handle);
        invariant(p && !p.resumed, 'M14_PREPARED_PROCESS_UNKNOWN');
        const observation = await p.client.request('sandbox.observe', { prepare_id: p.id }, { signal, deadline_ms: 1000 });
        invariant(observation.process && observation.root_in_job && observation.process_handle_pinned && observation.job_handle_pinned, 'M14_PROCESS_NOT_PINNED');
        const actual = processIdentity(observation.process);
        invariant(sameProcess(actual, p.process), 'M14_OS_IDENTITY_CHANGED');
        return { process: actual, parent: p.parent, alive: !observation.root_exit_observed && !observation.cancelled && !observation.consumed, profile_hash: p.profile_hash, assurance: 'REAL_WINDOWS' };
    }
    attach(runtime, handle) { const p = this.#prepared.get(handle); invariant(p && sameProcess(runtime.process, p.process) && sameProcess(runtime.parent, p.parent) && runtime.profile_hash === p.profile_hash, 'M14_SUPERVISOR_BINDING'); this.#byRuntime.set(runtime.runtime_id, p); }
    setBootstrap(runtime, bytes) { const p = this.#byRuntime.get(runtime.runtime_id); invariant(p && !p.resumed && bytes.length <= 16384, 'M15_WORKER_BOOTSTRAP'); p.bootstrap_input = Buffer.from(bytes); }
    async ready(runtime, g, args, signal) {
        const p = this.#byRuntime.get(runtime.runtime_id);
        invariant(p && !p.resumed && p.tool.id === g.tool_id && p.tool.version === g.tool_version && p.profile_hash === g.profile_hash && p.arguments_hash === g.arguments_hash && sha256(canonical(args)) === p.arguments_hash, 'M14_SUPERVISOR_BINDING');
        const o = await p.client.request('sandbox.observe', { prepare_id: p.id }, { signal, deadline_ms: 1000 });
        invariant(o.process && sameProcess(processIdentity(o.process), runtime.process) && o.root_in_job && !o.root_exit_observed && !o.consumed && !o.cancelled, 'M14_PREPARED_PROCESS_REPLACED');
        p.authorized_permit = g.permit_id;
    }
    start(runtime, g, args) {
        const p = this.#byRuntime.get(runtime.runtime_id);
        invariant(p && !p.resumed && p.authorized_permit === g.permit_id && sameProcess(p.process, g.process) && Date.now() < g.expires_at && sha256(canonical(args)) === p.arguments_hash, 'M14_SUPERVISOR_START_FENCE');
        p.resumed = true;
        const stdout = new OutputChannel(), stderr = new OutputChannel();
        const exit = p.client.request('sandbox.resume', { prepare_id: p.id, expected_process: p.process, bootstrap_input_base64: p.bootstrap_input?.toString('base64') ?? '' }, { deadline_ms: runtime.profile.limits.wall_ms, onEvent: async (event) => { const bytes = Buffer.from(event.data_base64, 'base64'); await (event.event === 'stdout' ? stdout : stderr).push(bytes); } }).then(result => {
            const outDone = result.stdout.producer_eof && !result.stdout.error && !result.stdout.overflow, errDone = result.stderr.producer_eof && !result.stderr.error && !result.stderr.overflow;
            stdout.end(outDone ? null : new NexusError('M14_STDOUT_UNSETTLED'));
            stderr.end(errDone ? null : new NexusError('M14_STDERR_UNSETTLED'));
            const members = result.members.filter((m) => m.parentage_verified).map((m) => ({ process: processIdentity(m.identity), parent: processIdentity(m.parent_identity), exited: m.exited, exit_code: m.exited ? m.exit_code : null, handle_signaled: m.exited }));
            const e = { source: 'REAL_WINDOWS', observation_id: p.id, process: processIdentity(result.root), parent: processIdentity(result.launcher), job_id: result.job_id, job_membership_verified: result.assigned_before_resume, job_empty: result.tree_empty_observed,
                membership_complete: result.history_complete_observed === true && result.parentage_verified_complete === true, unknown_members: !(result.history_complete_observed === true && result.parentage_verified_complete === true), members, root_exited: result.root_exit_observed, handles_closed: true, termination_requested_at: result.termination_requested_at, observed_at: new Date().toISOString(),
                sandbox: { profile_hash: runtime.profile_hash, token_verified: result.sandbox_combination_verified, network_verified: false, filesystem_verified: false, limits_verified: false, settled: result.tree_empty_observed },
                outputs: { stdout: { eof: outDone, producer_closed: outDone, producer_id: p.id + ':stdout' }, stderr: { eof: errDone, producer_closed: errDone, producer_id: p.id + ':stderr' } } };
            // Native observation is intentionally conservative. Qualification cannot manufacture missing evidence.
            if (e.root_exited && e.job_empty && outDone && errDone) {
                p.client.close();
                this.#byRuntime.delete(runtime.runtime_id);
                for (const [handle, item] of this.#prepared)
                    if (item === p)
                        this.#prepared.delete(handle);
            }
            return e;
        }, error => { stdout.end(error); stderr.end(error); throw error; });
        void exit.catch(() => { });
        return { stdout, stderr, exit, terminate: () => { stdout.end(new NexusError('M14_TERMINATION_REQUESTED')); stderr.end(new NexusError('M14_TERMINATION_REQUESTED')); p.client.close(); } };
    }
    close() { this.#closed = true; for (const p of this.#prepared.values())
        p.client.close(); this.#prepared.clear(); this.#byRuntime.clear(); }
}
