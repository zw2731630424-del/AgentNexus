import { randomUUID } from 'node:crypto';
import { canonical, invariant, sha256 } from '../types.js';
import { subject, snapshot } from '../harness/contracts.js';
import { DAILY_QUALIFICATION } from './daily-contracts.js';
import { assertServiceBoundary } from './boundary.js';
const exact = (value, keys) => invariant(value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === [...keys].sort().join(','), 'DAILY_SCHEMA');
/** Daily authority is held by the service. Native registration is reachable only
 * from the service-owned inherited engine channel, never from a public method. */
export class DailyGateway {
    #broker;
    #runtimes = new Map();
    #active = new Map();
    #native = new Map();
    #boundary;
    constructor(broker) { this.#broker = broker; }
    static syntheticFixture(broker) {
        invariant(broker.synthetic && !broker.boundary, 'DAILY_PRODUCTION_RUNTIME_BLOCKED');
        return new DailyGateway(broker);
    }
    static nativeService(broker, boundary) {
        assertServiceBoundary(boundary);
        invariant(broker.boundary === boundary, 'DAILY_SERVICE_BOUNDARY_MISMATCH');
        const daily = new DailyGateway(broker);
        daily.#boundary = boundary;
        return daily;
    }
    registerNativeChannel(channel, identity, expires) {
        invariant(this.#boundary && /^[a-f0-9]{32}$/.test(channel) && /^[a-f0-9-]{36}$/.test(identity), 'DAILY_NATIVE_CHANNEL');
        invariant(Number.isSafeInteger(expires) && expires > Date.now() && expires <= Date.now() + 300000, 'DAILY_NATIVE_EXPIRY');
        invariant(!this.#native.has(channel) || this.#native.get(channel).identity === identity && this.#native.get(channel).expires === expires, 'DAILY_RUNTIME_CHANGED');
        invariant(this.#native.has(channel) || this.#native.size < 64, 'DAILY_RUNTIME_CAPACITY');
        this.#native.set(channel, { identity, expires });
    }
    channelSnapshot(channel, syntheticStack = false) {
        invariant(syntheticStack && this.#broker.synthetic && !this.#boundary || (this.#native.get(channel)?.expires ?? 0) > Date.now(), 'DAILY_RUNTIME_UNAUTHENTICATED');
        return { ...this.#broker.snapshot(), deployment_mode: syntheticStack ? 'SYNTHETIC' : this.#boundary.mode ?? 'QUALIFICATION_ONLY', daily_gateway: { status: 'AVAILABLE', reason: syntheticStack ? 'SAME_SID_SYNTHETIC_STACK_NO_OS_QUALIFICATION' : 'SERVICE_OWNED_NATIVE_RUNTIME', medium_listener_created: true, uac_required: false, synthetic_protocol_available: true, protocol: syntheticStack ? 'SIMULATED' : 'NATIVE', production_qualified: !syntheticStack && this.#boundary?.mode === 'QUALIFIED' } };
    }
    /** Fixture authority, not exposed on any native channel. Reattaching revokes
     * outstanding grants; a caller's Subject is never OS authentication. */
    attachSynthetic(channel, scope, lifetimeMs = 120000) {
        invariant(this.#broker.synthetic && !this.#broker.boundary && typeof channel === 'string' && channel.length > 0 && channel.length <= 128 &&
            Number.isSafeInteger(lifetimeMs) && lifetimeMs > 0 && lifetimeMs <= 300000, 'DAILY_FIXTURE_ONLY');
        subject(scope);
        const key = this.#key(channel, scope);
        if (this.#runtimes.has(key))
            this.#revoke(this.#runtimes.get(key));
        invariant(this.#runtimes.size < 256, 'DAILY_RUNTIME_CAPACITY');
        this.#runtimes.set(key, { channel, identity: randomUUID(), subject: snapshot(scope), expires: Date.now() + lifetimeMs, alive: true });
    }
    #key(channel, scope) { return sha256(canonical({ channel, scope })); }
    authorizeSynthetic(channel, input, decisions) {
        const key = this.#key(channel, input.subject), existing = this.#runtimes.get(key);
        if (!existing || !existing.alive || existing.expires < Date.now() + 30000)
            this.attachSynthetic(channel, input.subject);
        return this.#broker.reviewSynthetic(input, decisions);
    }
    #runtime(channel, input) {
        subject(input.subject);
        const runtime = this.#runtimes.get(this.#key(channel, input.subject));
        invariant(runtime && runtime.alive && runtime.channel === channel && runtime.expires > Date.now() && canonical(runtime.subject) === canonical(input.subject), 'DAILY_RUNTIME_UNAUTHENTICATED');
        return runtime;
    }
    #channel(runtime) { return sha256(canonical({ channel: runtime.channel, identity: runtime.identity, service: this.#broker.instance, epoch: this.#broker.epoch })); }
    snapshot(channel) {
        invariant([...this.#runtimes.values()].some(r => r.channel === channel && r.alive && r.expires > Date.now()), 'DAILY_RUNTIME_UNAUTHENTICATED');
        return { ...this.#broker.snapshot(), daily_gateway: { ...DAILY_QUALIFICATION, protocol: 'SIMULATED', reason: 'INHERITED_SAME_SID_FIXTURE_IS_NOT_OS_AUTHENTICATION' } };
    }
    prepare(channel, params) {
        exact(params, ['input']);
        const input = snapshot(params.input, 1024 * 1024);
        if (!this.#boundary)
            this.#runtime(channel, input);
        invariant(!this.#broker.store.dailyGrantForRequest(input.request.headers['x-agentnexus-request-id']), 'DAILY_GRANT_REPLAY');
        // This validates service-held exact signed consent before any native Subject
        // is attached. Caller-supplied logical IDs never mint their own authority.
        const binding = this.#broker.prepare(input);
        if (this.#boundary && !this.#runtimes.has(this.#key(channel, input.subject))) {
            const native = this.#native.get(channel);
            invariant(native && native.expires > Date.now(), 'DAILY_RUNTIME_UNAUTHENTICATED');
            invariant(this.#runtimes.size < 256, 'DAILY_RUNTIME_CAPACITY');
            this.#runtimes.set(this.#key(channel, input.subject), { channel, identity: native.identity, subject: snapshot(input.subject), expires: Math.min(native.expires, Date.parse(this.#boundary.expires_at_utc)), alive: true });
        }
        const runtime = this.#runtime(channel, input);
        invariant(runtime.expires >= binding.deadline, 'DAILY_RUNTIME_EXPIRES_BEFORE_REQUEST');
        const inputLimit = Buffer.byteLength(input.request.body) + 4096;
        const grant = snapshot({ schema: 'agentnexus.daily-grant.v1', grant_id: randomUUID(), service_instance: this.#broker.instance,
            runtime_identity: runtime.identity, channel_binding: this.#channel(runtime), subject_hash: sha256(canonical(runtime.subject)),
            input_hash: sha256(canonical(input)), token_budget: { input_limit: inputLimit, output_limit: input.output_tokens, total: inputLimit + input.output_tokens }, binding });
        this.#broker.guard.assertSafe(canonical(grant), 'DAILY_GRANT');
        this.#broker.store.dailyGrantPut(grant);
        return grant;
    }
    async execute(channel, params, onDelta, signal) {
        exact(params, ['input', 'grant']);
        const p = snapshot(params, 1024 * 1024), runtime = this.#runtime(channel, p.input), grant = p.grant;
        invariant(!signal?.aborted, 'DAILY_CANCELLED_BEFORE_SEND');
        invariant(grant && grant.schema === 'agentnexus.daily-grant.v1' && grant.service_instance === this.#broker.instance &&
            grant.runtime_identity === runtime.identity && grant.channel_binding === this.#channel(runtime) && grant.subject_hash === sha256(canonical(runtime.subject)) &&
            grant.input_hash === sha256(canonical(p.input)) && grant.binding.policy_epoch === this.#broker.epoch && grant.binding.deadline > Date.now() &&
            runtime.expires >= grant.binding.deadline, 'DAILY_GRANT_BINDING');
        invariant(!this.#active.has(grant.binding.request_id) && this.#active.size < 4, 'DAILY_REQUEST_INFLIGHT');
        const controller = new AbortController(), abort = () => controller.abort();
        signal?.addEventListener('abort', abort, { once: true });
        this.#active.set(grant.binding.request_id, { channel, controller });
        try {
            // Persistent grant consumption and all four Token holds occur inside the
            // existing owner's single SQLite reserve transaction, before any send.
            return await this.#broker.execute({ input: p.input, binding: grant.binding }, onDelta, controller.signal, { grant, grant_hash: sha256(canonical(grant)), service_instance: this.#broker.instance, runtime_identity: runtime.identity, channel_binding: this.#channel(runtime) });
        }
        finally {
            signal?.removeEventListener('abort', abort);
            controller.abort();
            this.#active.delete(grant.binding.request_id);
        }
    }
    cancel(channel, requestId) {
        const active = this.#active.get(requestId);
        if (active) {
            invariant(active.channel === channel, 'DAILY_REQUEST_OWNER');
            active.controller.abort();
        }
        else {
            const grant = this.#broker.store.dailyGrantForRequest(requestId);
            invariant(grant && [...this.#runtimes.values()].some(runtime => runtime.channel === channel && runtime.identity === grant.runtime_identity), 'DAILY_REQUEST_OWNER');
            this.#broker.store.dailyRevokeRequest(requestId, grant.runtime_identity);
        }
        return { cancelled: true, automatic_retry: false };
    }
    #revoke(runtime) {
        runtime.alive = false;
        this.#broker.store.dailyRevokeRuntime(runtime.identity);
        for (const active of this.#active.values())
            if (active.channel === runtime.channel)
                active.controller.abort();
    }
    disconnect(channel) {
        this.#native.delete(channel);
        for (const [key, runtime] of this.#runtimes)
            if (runtime.channel === channel) {
                this.#revoke(runtime);
                this.#runtimes.delete(key);
            }
    }
}
