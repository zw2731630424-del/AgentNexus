import { request as httpsRequest } from 'node:https';
import { canonical, invariant, NexusError, sha256 } from '../types.js';
import { hostSubject, identifier, snapshot } from '../harness/contracts.js';
import { natural } from './protocol.js';
import { assertEgressAdmission } from './egress.js';
/** Real grants require an external, trusted explicit-user-authorization verifier, never a model's assertion. */
export class ProviderAuthorizationBook {
    #state;
    #admin;
    #verify;
    constructor(state, admin, verify) { state.checkAdmin(admin); this.#state = state; this.#admin = admin; this.#verify = verify; }
    async approve(admin, input, authorizationRef) {
        this.#state.checkAdmin(admin);
        const p = snapshot(input, 32768);
        for (const id of [p.provider_id, p.model_id, p.project_id])
            identifier(id);
        invariant(Object.keys(p).sort().join(',') === 'context_hashes,data_scope,endpoint,expires_at,key_use,max_cost_micros,max_input_tokens,max_output_tokens,max_requests,model_id,project_id,provider_id,stop_method,uploads_project_source', 'MODEL18_AUTHORIZATION_SCHEMA');
        const url = new URL(p.endpoint);
        invariant(url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && !url.port, 'MODEL18_ENDPOINT');
        for (const v of [p.max_requests, p.max_input_tokens, p.max_output_tokens, p.max_cost_micros])
            natural(v);
        invariant(p.max_requests > 0 && p.max_requests <= 128 && p.max_input_tokens > 0 && p.max_output_tokens > 0, 'MODEL18_AUTHORIZATION_LIMIT');
        invariant(p.key_use === 'HOST_VAULT_ONLY' && p.stop_method === 'ABORT_AND_REVOKE' && typeof p.uploads_project_source === 'boolean' && p.data_scope.length > 0 && p.data_scope.length <= 16 && p.data_scope.every(s => typeof s === 'string' && s.length > 0 && s.length <= 128), 'MODEL18_AUTHORIZATION_SCOPE');
        invariant(p.context_hashes.length > 0 && p.context_hashes.length <= 128 && p.context_hashes.every(h => /^[a-f0-9]{64}$/.test(h)) && Date.parse(p.expires_at) > Date.now(), 'MODEL18_AUTHORIZATION_SCOPE');
        invariant(typeof authorizationRef === 'string' && authorizationRef.length > 0 && authorizationRef.length <= 256 && !/[\x00-\x1f]/.test(authorizationRef), 'MODEL18_USER_AUTHORIZATION');
        const id = sha256(canonical(p));
        let verified = false;
        try {
            verified = await this.#verify(authorizationRef, id);
        }
        catch { /* static failure below */ }
        invariant(verified === true, 'MODEL18_USER_AUTHORIZATION');
        await this.#state.change(hostSubject(this.#state.boot_id), 'MODEL18_APPROVED', () => { invariant(this.#state.count('MODEL18_APPROVAL') < 128 && !this.#state.get('MODEL18_APPROVAL', id), 'MODEL18_APPROVAL_LIMIT'); this.#state.insert('MODEL18_APPROVAL', id, hostSubject(this.#state.boot_id), 'ACTIVE', { revision: 0, id, plan: p, authorization_ref: authorizationRef, state: 'ACTIVE', reserved_requests: 0, reserved_input: 0, reserved_output: 0, reserved_cost: 0 }); }, { approval_id: id, provider_id: p.provider_id, model_id: p.model_id, max_cost_micros: p.max_cost_micros });
        return id;
    }
    async revoke(admin, id) { this.#state.checkAdmin(admin); await this.#state.change(hostSubject(this.#state.boot_id), 'MODEL18_REVOKED', () => { const a = this.#state.get('MODEL18_APPROVAL', id); invariant(a, 'MODEL18_AUTHORIZATION_REQUIRED'); this.#state.update('MODEL18_APPROVAL', id, a.revision, 'REVOKED', { ...a, state: 'REVOKED', revision: a.revision + 1 }); }, { approval_id: id }); }
    async admit(admin, id, input) {
        this.#state.checkAdmin(admin);
        const r = snapshot(input, 1024 * 1024), requestId = r.request.headers['x-agentnexus-request-id'];
        identifier(requestId);
        natural(r.input_tokens);
        natural(r.output_tokens);
        natural(r.estimated_cost_micros);
        invariant(r.input_tokens > 0 && r.output_tokens > 0, 'MODEL18_AUTHORIZATION_LIMIT');
        await this.#state.change(r.subject, 'MODEL18_NETWORK_ADMITTED', () => {
            const a = this.#state.get('MODEL18_APPROVAL', id);
            invariant(a && a.state === 'ACTIVE' && Date.parse(a.plan.expires_at) > Date.now(), 'MODEL18_AUTHORIZATION_REQUIRED');
            const p = a.plan;
            invariant(r.model.provider_id === p.provider_id && r.model.model_id === p.model_id && r.request.url === p.endpoint && r.subject.project_id === p.project_id && p.context_hashes.includes(r.context_hash), 'MODEL18_AUTHORIZATION_SCOPE');
            // Public/synthetic admission is bound to exact bytes. This does not grant source upload.
            if (r.model.price.assurance === 'REAL' || !p.uploads_project_source || r.egress)
                assertEgressAdmission(this.#state, r);
            const hash = sha256(canonical(r)), old = this.#state.get('MODEL18_NETWORK', requestId);
            if (old) {
                invariant(old.input_hash === hash && old.approval_id === id && old.state === 'ADMITTED', 'MODEL18_NETWORK_REPLAY');
                return;
            }
            invariant(a.reserved_requests + 1 <= p.max_requests && a.reserved_input + r.input_tokens <= p.max_input_tokens && a.reserved_output + r.output_tokens <= p.max_output_tokens && a.reserved_cost + r.estimated_cost_micros <= p.max_cost_micros, 'MODEL18_AUTHORIZATION_BUDGET');
            this.#state.update('MODEL18_APPROVAL', id, a.revision, 'ACTIVE', { ...a, reserved_requests: a.reserved_requests + 1, reserved_input: a.reserved_input + r.input_tokens, reserved_output: a.reserved_output + r.output_tokens, reserved_cost: a.reserved_cost + r.estimated_cost_micros, revision: a.revision + 1 });
            invariant(this.#state.count('MODEL18_NETWORK') < 4096, 'MODEL18_NETWORK_LIMIT');
            this.#state.insert('MODEL18_NETWORK', requestId, r.subject, 'ADMITTED', { revision: 0, request_id: requestId, input_hash: hash, approval_id: id, state: 'ADMITTED' });
        }, { request_id: requestId, approval_id: id, context_hash: r.context_hash });
    }
    async dispatch(admin, id, input) {
        this.#state.checkAdmin(admin);
        const requestId = input.request.headers['x-agentnexus-request-id'];
        await this.#state.change(input.subject, 'MODEL18_NETWORK_DISPATCHED', () => {
            const a = this.#state.get('MODEL18_APPROVAL', id), r = this.#state.get('MODEL18_NETWORK', requestId);
            invariant(a && a.state === 'ACTIVE' && Date.parse(a.plan.expires_at) > Date.now() && r && r.approval_id === id && r.state === 'ADMITTED' && r.input_hash === sha256(canonical(input)), 'MODEL18_NETWORK_REPLAY');
            this.#state.update('MODEL18_NETWORK', requestId, r.revision, 'DISPATCHED', { ...r, state: 'DISPATCHED', revision: r.revision + 1 });
        }, { request_id: requestId, approval_id: id });
    }
    fence(admin, id, input) {
        this.#state.checkAdmin(admin);
        invariant(!this.#state.faulted, 'MODEL18_AUTHORIZATION_STORE_FAULTED');
        const a = this.#state.get('MODEL18_APPROVAL', id), r = this.#state.get('MODEL18_NETWORK', input.request.headers['x-agentnexus-request-id']);
        invariant(a && a.state === 'ACTIVE' && Date.parse(a.plan.expires_at) > Date.now() && r && r.state === 'DISPATCHED' && r.approval_id === id && r.input_hash === sha256(canonical(input)), 'MODEL18_AUTHORIZATION_REQUIRED');
        if (input.model.price.assurance === 'REAL' || input.egress || !a.plan.uploads_project_source)
            assertEgressAdmission(this.#state, input);
    }
}
/** HTTPS implementation is unreachable without both approved plan and qualified credential/Worker boundary. No redirects/retries. */
export class AuthorizedHttpsTransport {
    assurance = 'REAL';
    #book;
    #admin;
    #approval;
    #qualification;
    #pending = new Map();
    constructor(book, admin, approval, qualification) { this.#book = book; this.#admin = admin; this.#approval = approval; this.#qualification = qualification; }
    #qualified() { const q = this.#qualification(); invariant(q.worker_isolation === 'QUALIFIED' && q.credential_service === 'QUALIFIED' && typeof q.evidence_sha256 === 'string' && /^[a-f0-9]{64}$/.test(q.evidence_sha256), 'MODEL18_NETWORK_QUALIFICATION_BLOCKED'); }
    async preflight(input) { this.#qualified(); const copy = snapshot(input, 1024 * 1024); invariant(copy.model.provider_id === 'deepseek' && copy.request.url === 'https://api.deepseek.com/chat/completions', 'MODEL181_PROVIDER_NOT_AUTHORIZED'); invariant(copy.egress && copy.egress.body_hash === sha256(copy.request.body), 'MODEL181_EGRESS_REQUIRED'); invariant(copy.model.price.assurance === 'REAL', 'MODEL18_REAL_PRICE_REQUIRED'); const id = copy.request.headers['x-agentnexus-request-id']; invariant(this.#pending.size < 16 && !this.#pending.has(id), 'MODEL18_NETWORK_BACKPRESSURE'); this.#pending.set(id, { admission: copy, ready: false }); try {
        await this.#book.admit(this.#admin, this.#approval, copy);
        await this.#book.dispatch(this.#admin, this.#approval, copy);
        const slot = this.#pending.get(id);
        invariant(slot, 'MODEL18_NETWORK_CANCELLED');
        slot.ready = true;
    }
    catch (error) {
        this.#pending.delete(id);
        throw error;
    } }
    abandon(id) { this.#pending.delete(id); }
    async send(request, authorization, signal) {
        this.#qualified();
        invariant(!signal.aborted, 'MODEL18_NETWORK_CANCELLED');
        const id = request.headers['x-agentnexus-request-id'], slot = this.#pending.get(id), admission = slot?.admission;
        invariant(slot?.ready && admission && canonical(admission.request) === canonical(request), 'MODEL18_AUTHORIZATION_REQUIRED');
        this.#pending.delete(id);
        this.#qualified();
        invariant(!signal.aborted, 'MODEL18_NETWORK_CANCELLED');
        invariant(/^Bearer [^\r\n]+$/.test(authorization) && authorization.length <= 8192, 'MODEL18_AUTH_HEADER');
        this.#book.fence(this.#admin, this.#approval, admission);
        return new Promise((resolve, reject) => {
            const req = httpsRequest(request.url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'text/event-stream', authorization, 'content-length': Buffer.byteLength(request.body) }, signal, agent: false, rejectUnauthorized: true }, response => {
                const headers = {};
                for (const [key, value] of Object.entries(response.headers))
                    if (['content-type', 'retry-after'].includes(key) && typeof value === 'string')
                        headers[key] = value;
                resolve({ status: response.statusCode ?? 0, headers, body: response });
            });
            req.once('error', () => reject(new NexusError('MODEL18_NETWORK_FAILURE')));
            req.end(request.body);
        });
    }
}
/** Explicit in-process wire fixture. Callback sees no authorization header and never performs network I/O. */
export class FixtureTransport {
    assurance = 'SIMULATED';
    #respond;
    #calls = 0;
    constructor(respond) { this.#respond = respond; }
    get calls() { return this.#calls; }
    async send(request, _authorization, signal) { invariant(!signal.aborted, 'MODEL18_FIXTURE_CANCELLED'); invariant(this.#calls < 4096, 'MODEL18_FIXTURE_LIMIT'); return this.#respond(snapshot(request, 1024 * 1024), this.#calls++, signal); }
}
export function wireFixture(content, options = {}) {
    const event = (value) => 'data: ' + JSON.stringify(value) + '\n\n';
    const body = event({ id: 'synthetic-response', choices: [{ index: 0, delta: { content }, finish_reason: options.finish ?? 'stop' }] }) +
        (options.usage === null ? '' : event({ id: 'synthetic-response', choices: [], usage: options.usage ?? { prompt_tokens: 10, completion_tokens: 20 } })) + (options.done === false ? '' : 'data: [DONE]\n\n');
    const bytes = Buffer.from(body), size = options.chunk_bytes ?? 17;
    natural(size, 65536);
    invariant(size > 0, 'MODEL18_FIXTURE_CHUNK');
    return { status: options.status ?? 200, headers: { 'content-type': 'text/event-stream' }, body: (async function* () { for (let i = 0; i < bytes.length; i += size)
            yield bytes.subarray(i, i + size); })() };
}
