import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { request as httpsRequest } from 'node:https';
import { canonical, invariant, sha256 } from '../types.js';
import { subject as validateSubject, identifier, snapshot } from '../harness/contracts.js';
import { CredentialVault, createVaultAdminCapability, assertPendingSecretMetadataSafe } from '../model-runtime/vault.js';
import { ChatProviderAdapter, ProviderParseFault, ProviderFault } from '../model-runtime/adapters.js';
import { createDeepSeekFlashSpec, deepSeekCost } from '../model-runtime/deepseek.js';
import { inspectFinalRequest } from '../model-runtime/request-review.js';
import { sseEvents } from '../model-runtime/streaming.js';
import { wireFixture } from '../model-runtime/transport.js';
import { ServiceStore } from './store.js';
import { assertServiceBoundary, SERVICE_DATA_ROOT, QUALIFICATION_DATA_ROOT } from './boundary.js';
import { DAILY_QUALIFICATION } from './daily-contracts.js';
const ENDPOINT = 'https://api.deepseek.com/chat/completions';
const MODELS = ['deepseek-flash', 'deepseek-v4-pro'];
const fields = (v, allowed, required = allowed) => invariant(v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).every(k => allowed.includes(k)) && required.every(k => Object.hasOwn(v, k)), 'SERVICE_SCHEMA');
const natural = (v, min = 0, max = Number.MAX_SAFE_INTEGER) => invariant(Number.isSafeInteger(v) && Number(v) >= min && Number(v) <= max, 'SERVICE_AMOUNT');
const code = (e) => { const c = e?.code; return typeof c === 'string' && /^[A-Z][A-Z0-9_]{0,95}$/.test(c) ? c : 'SERVICE_OPERATION_FAILED'; };
/** Fixed HTTPS egress, no redirects/proxy environment, no automatic retries. */
function sendHttps(body, authorization, signal) {
    return new Promise((resolve, reject) => {
        const req = httpsRequest(ENDPOINT, { method: 'POST', headers: { authorization, 'content-type': 'application/json', accept: 'text/event-stream', 'content-length': Buffer.byteLength(body) },
            signal, agent: false, rejectUnauthorized: true, maxHeaderSize: 16384 }, res => resolve({ status: res.statusCode ?? 0,
            headers: { 'content-type': typeof res.headers['content-type'] === 'string' ? res.headers['content-type'] : '' }, body: res }));
        req.on('error', () => reject(Error('SERVICE_PROVIDER_DISCONNECTED')));
        req.end(body);
    });
}
/** All instances in tests are SIMULATED. REAL requires the native service's
 * OS attestation and fixed protected store; clients cannot select either. */
export class CredentialBroker {
    store;
    instance = randomUUID();
    epoch;
    #vault;
    #admin;
    #active = new Map();
    #closed = false;
    #mutation = false;
    #imports = new Map();
    synthetic;
    boundary;
    root;
    fixture;
    constructor(synthetic, boundary, root, vault, admin, fixture) {
        this.synthetic = synthetic;
        this.boundary = boundary;
        this.root = root;
        this.fixture = fixture;
        this.#vault = vault;
        this.#admin = admin;
        this.epoch = boundary?.policy_epoch ?? 1;
        this.store = new ServiceStore(root, synthetic);
    }
    static async open(options) {
        if (options.boundary) {
            assertServiceBoundary(options.boundary);
            invariant(options.synthetic ? options.boundary.mode === 'QUALIFICATION_ONLY' && options.root === QUALIFICATION_DATA_ROOT : options.boundary.mode === 'QUALIFIED' && options.root === SERVICE_DATA_ROOT, 'SERVICE_FIXED_ROOT_REQUIRED');
        }
        if (!options.synthetic) {
            assertServiceBoundary(options.boundary);
            invariant(options.root === SERVICE_DATA_ROOT, 'SERVICE_FIXED_ROOT_REQUIRED');
        }
        invariant(options.synthetic || !options.fixture, 'SERVICE_FIXTURE_DENIED');
        if (options.fixture)
            invariant(options.fixture.assurance === 'SIMULATED', 'SERVICE_FIXTURE_DENIED');
        const admin = createVaultAdminCapability();
        const powershell = existsSync('C:/Program Files/PowerShell/7/pwsh.exe') ? 'C:/Program Files/PowerShell/7/pwsh.exe' : 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
        const vault = await CredentialVault.open({ root: join(options.root, 'credentials'), admin,
            mode: options.synthetic ? 'SYNTHETIC' : 'LIVE', powershell, serviceBoundary: options.boundary });
        try {
            return new CredentialBroker(options.synthetic, options.boundary, options.root, vault, admin, options.fixture);
        }
        catch (e) {
            vault.close();
            throw e;
        }
    }
    get guard() { return this.#vault.guard; }
    claimManagement(id, method) { identifier(id); this.guard.assertSafe(canonical({ id, method }), 'SERVICE_MANAGEMENT_METADATA'); this.store.claimManagement(id, method); }
    rejected(method, request_id, error_code) {
        const metadata = { method: /^[a-z][a-z0-9_.]{0,79}$/.test(method) ? method : 'invalid', request_id: /^[A-Za-z0-9_.:-]{1,128}$/.test(request_id) ? request_id : 'invalid', code: /^[A-Z][A-Z0-9_]{0,95}$/.test(error_code) ? error_code : 'SERVICE_OPERATION_FAILED' };
        try {
            this.guard.assertSafe(canonical(metadata), 'SERVICE_REJECT_AUDIT');
            this.store.audit('CREDENTIAL_OPERATION_REJECTED', metadata);
        }
        catch {
            this.store.audit('CREDENTIAL_OPERATION_REJECTED', { code: 'REJECTED_METADATA_WITHHELD' });
        }
    }
    prepareImport(channel, input) {
        fields(input, ['operation_id', 'metadata_hash', 'secret_sha256']);
        identifier(input.operation_id);
        this.guard.assertSafe(canonical(input), 'SERVICE_IMPORT_METADATA');
        invariant(typeof channel === 'string' && channel.length > 0 && channel.length <= 128 && /^[a-f0-9]{64}$/.test(input.metadata_hash) && /^[a-f0-9]{64}$/.test(input.secret_sha256), 'SERVICE_IMPORT_TICKET_INVALID');
        invariant(this.synthetic || this.boundary?.real_import_enabled, 'SERVICE_REAL_IMPORT_BLOCKED');
        invariant(!this.boundary || Date.parse(this.boundary.expires_at_utc ?? '') > Date.now(), 'SERVICE_BOUNDARY_EXPIRED');
        for (const [id, ticket] of this.#imports)
            if (ticket.expires <= Date.now())
                this.#imports.delete(id);
        invariant(this.#imports.size < 2048 && ![...this.#imports.values()].some(t => t.operation_id === input.operation_id), 'SERVICE_IMPORT_REPLAY');
        const ticket_id = randomUUID(), expires = Date.now() + 30000;
        this.#imports.set(ticket_id, { channel, ...input, expires, epoch: this.epoch, state: 'ISSUED' });
        const audit = { ticket_id, operation_id_hash: sha256(input.operation_id), expires, epoch: this.epoch };
        this.guard.assertSafe(canonical(audit), 'SERVICE_IMPORT_AUDIT');
        this.store.audit('CREDENTIAL_IMPORT_PREPARED', audit);
        return { ticket_id, operation_id: input.operation_id, expires_at: expires };
    }
    disconnectImports(channel) {
        let count = 0;
        for (const ticket of this.#imports.values())
            if (ticket.channel === channel && ['ISSUED', 'COMMITTING'].includes(ticket.state)) {
                ticket.state = 'REVOKED';
                count++;
            }
        if (count)
            this.store.audit('CREDENTIAL_IMPORT_CHANNEL_REVOKED', { cancelled_tickets: count });
    }
    cancelImport(channel, input) {
        fields(input, ['ticket_id', 'operation_id']);
        identifier(input.ticket_id);
        identifier(input.operation_id);
        const ticket = this.#imports.get(input.ticket_id);
        invariant(ticket && ticket.channel === channel && ticket.operation_id === input.operation_id && ['ISSUED', 'COMMITTING'].includes(ticket.state), 'SERVICE_IMPORT_TICKET_INVALID');
        ticket.state = 'REVOKED';
        this.store.audit('CREDENTIAL_IMPORT_CANCELLED', { ticket_id: input.ticket_id, operation_id_hash: sha256(input.operation_id) });
        return { cancelled: true, automatic_retry: false };
    }
    #keys() {
        const records = this.store.usage().records;
        return this.#vault.list(this.#admin).filter(k => !this.store.label(k.key_id)?.deleted).map(k => {
            const label = this.store.label(k.key_id), rows = records.filter((r) => r.credential_handle_id === k.key_handle_id || r.key_handle_id === k.key_handle_id);
            return { ...k, classification: this.synthetic ? 'SYNTHETIC' : 'SECRET', name: label?.name ?? k.key_id, notes: label?.notes ?? '', created_at: label?.created_at ?? '',
                tokens: rows.reduce((n, r) => n + r.tokens, 0), requests: rows.length, errors: rows.filter((r) => r.state === 'UNKNOWN').length,
                health: k.state === 'ACTIVE' ? 'UNVERIFIED' : k.state };
        });
    }
    snapshot() {
        const value = { qualification: { live: this.boundary?.live_enabled ? 'QUALIFIED' : 'BLOCKED', credential_service: this.synthetic ? 'BLOCKED' : 'QUALIFIED',
                real_key_entry: !this.synthetic && this.boundary?.real_import_enabled === true, synthetic_key_entry: this.synthetic,
                mode: this.synthetic ? 'SIMULATED' : 'REAL', reason: this.synthetic ? 'SYNTHETIC_PROCESS_ONLY_NO_OS_QUALIFICATION' : 'NATIVE_SIGNED_DEPLOYMENT_BOUNDARY' },
            keys: this.#keys(), usage: this.store.usage(), policy_epoch: this.epoch, service_instance: this.instance, daily_gateway: DAILY_QUALIFICATION };
        this.guard.assertSafe(canonical(value), 'SERVICE_SNAPSHOT');
        return value;
    }
    async mutate(method, input, channel) {
        invariant(!this.#closed && !this.#mutation, 'SERVICE_BUSY');
        this.#mutation = true;
        let clear;
        let importTicket;
        try {
            switch (method) {
                case 'budget.configure': {
                    fields(input, ['subject', 'agent_tokens', 'task_tokens', 'project_tokens']);
                    validateSubject(input.subject);
                    this.guard.assertSafe(canonical(input), 'SERVICE_BUDGET_METADATA');
                    this.store.configure(input.subject, { agent_tokens: input.agent_tokens, task_tokens: input.task_tokens, project_tokens: input.project_tokens });
                    return { saved: true, counter_reset: false };
                }
                case 'credential.save': {
                    fields(input, ['provider_id', 'name', 'notes', 'secret_b64', 'rotate_id', 'max_concurrency', 'requests_per_minute', 'models', 'model_wire_ids', 'expires_at', 'import_ticket', 'import_operation_id'], ['provider_id', 'name', 'notes', 'secret_b64', 'max_concurrency', 'requests_per_minute', 'models', 'model_wire_ids']);
                    invariant(this.synthetic || this.boundary?.real_import_enabled, 'SERVICE_REAL_IMPORT_BLOCKED');
                    identifier(input.provider_id);
                    natural(input.max_concurrency, 1, 16);
                    natural(input.requests_per_minute, 1, 10000);
                    invariant(typeof input.name === 'string' && input.name.length > 0 && input.name.length <= 80 && typeof input.notes === 'string' && input.notes.length <= 500, 'SERVICE_METADATA');
                    invariant(Array.isArray(input.models) && input.models.length > 0 && input.models.length <= 128, 'SERVICE_MODEL_SCOPE');
                    fields(input.model_wire_ids, input.models);
                    for (const id of input.models) {
                        identifier(id);
                        invariant(MODELS.includes(input.model_wire_ids[id]), 'SERVICE_MODEL_ALLOWLIST');
                    }
                    invariant(typeof input.secret_b64 === 'string' && input.secret_b64.length <= 5500 && /^[A-Za-z0-9+/]+={0,2}$/.test(input.secret_b64), 'SERVICE_SECRET_FORMAT');
                    clear = Buffer.from(input.secret_b64, 'base64');
                    invariant(clear.toString('base64') === input.secret_b64 && clear.length >= 24 && clear.length <= 4096, 'SERVICE_SECRET_FORMAT');
                    if (this.synthetic)
                        invariant(clear.subarray(0, 15).toString() === 'synthetic-test-', 'SERVICE_SYNTHETIC_KEY_REQUIRED');
                    const { secret_b64: _removedSecret, import_ticket: _removedTicket, import_operation_id: _removedOperation, ...metadata } = input;
                    const importFence = () => {
                        invariant(importTicket && importTicket.state === 'COMMITTING' && importTicket.channel === channel && importTicket.epoch === this.epoch && importTicket.expires > Date.now(), 'SERVICE_IMPORT_TICKET_INVALID');
                        invariant(!this.boundary || Date.parse(this.boundary.expires_at_utc ?? '') > Date.now(), 'SERVICE_BOUNDARY_EXPIRED');
                    };
                    if (channel !== undefined || !this.synthetic) {
                        importTicket = this.#imports.get(input.import_ticket);
                        invariant(importTicket && importTicket.state === 'ISSUED' && importTicket.channel === channel && importTicket.expires > Date.now() && importTicket.epoch === this.epoch && importTicket.operation_id === input.import_operation_id && importTicket.metadata_hash === sha256(canonical(metadata)) && importTicket.secret_sha256 === sha256(clear), 'SERVICE_IMPORT_TICKET_INVALID');
                        importTicket.state = 'COMMITTING';
                    }
                    const id = 'key.' + randomUUID();
                    const spec = { key_id: id, provider_id: input.provider_id, models: input.models, secret: clear, max_concurrency: input.max_concurrency, requests_per_minute: input.requests_per_minute, ...(input.expires_at === undefined ? {} : { expires_at: input.expires_at }) };
                    this.guard.assertSafe(canonical(metadata), 'SERVICE_KEY_METADATA');
                    const intent = { key_id: id, provider_id: input.provider_id, old_key_id: input.rotate_id ?? null };
                    assertPendingSecretMetadataSafe(clear, canonical({ metadata, intent, ...(importTicket ? { import_operation_id_hash: sha256(importTicket.operation_id) } : {}) }));
                    invariant(this.synthetic || input.provider_id === 'deepseek', 'SERVICE_PROVIDER_ALLOWLIST');
                    if (input.rotate_id)
                        invariant(this.#keys().some(key => key.key_id === input.rotate_id && key.state !== 'ROTATING' && key.state !== 'QUARANTINED'), 'SERVICE_ROTATION_CONFLICT');
                    this.store.audit('CREDENTIAL_SAVE_INTENT', intent);
                    if (input.rotate_id) {
                        invariant(!this.store.label(input.rotate_id)?.deleted, 'SERVICE_HANDLE_REVOKED');
                        await this.#vault.rotate(this.#admin, input.rotate_id, spec, importTicket ? importFence : undefined);
                    }
                    else
                        await this.#vault.add(this.#admin, spec, importTicket ? importFence : undefined);
                    this.guard.assertSafe(canonical({ name: input.name, notes: input.notes, model_wire_ids: input.model_wire_ids }), 'SERVICE_KEY_METADATA');
                    this.store.labelPut(id, { name: input.name, notes: input.notes, model_wire_ids: input.model_wire_ids, created_at: new Date().toISOString() });
                    this.store.audit(input.rotate_id ? 'CREDENTIAL_ROTATED' : 'CREDENTIAL_SAVED', { key_id: id, old_key_id: input.rotate_id ?? null });
                    if (importTicket) {
                        importTicket.state = 'COMPLETED';
                        const audit = { ticket_id: input.import_ticket, operation_id_hash: sha256(importTicket.operation_id) };
                        this.guard.assertSafe(canonical(audit), 'SERVICE_IMPORT_AUDIT');
                        this.store.audit('CREDENTIAL_IMPORT_CONSUMED', audit);
                    }
                    return { stored: true, key_id: id, classification: this.synthetic ? 'SYNTHETIC' : 'SECRET' };
                }
                case 'credential.state': {
                    fields(input, ['key_id', 'enabled']);
                    identifier(input.key_id);
                    invariant(typeof input.enabled === 'boolean', 'SERVICE_SCHEMA');
                    const key = this.#keys().find(k => k.key_id === input.key_id);
                    invariant(key && (!input.enabled || ['DISABLED', 'ACTIVE'].includes(key.state)), 'SERVICE_HANDLE_REVOKED');
                    this.store.audit('CREDENTIAL_STATE_INTENT', { key_id: input.key_id, enabled: input.enabled });
                    this.#vault.setState(this.#admin, input.key_id, input.enabled ? 'ACTIVE' : 'DISABLED');
                    this.store.audit('CREDENTIAL_STATE_CHANGED', { key_id: input.key_id, enabled: input.enabled });
                    return { saved: true };
                }
                case 'credential.delete': {
                    fields(input, ['key_id']);
                    identifier(input.key_id);
                    const k = this.#keys().find(k => k.key_id === input.key_id);
                    invariant(k, 'SERVICE_HANDLE_REVOKED');
                    this.store.audit('CREDENTIAL_REVOKE_INTENT', { key_id: input.key_id });
                    this.#vault.setState(this.#admin, input.key_id, 'DISABLED');
                    // Tombstone remains even when an already-sent request is unresolved.
                    this.store.labelPut(input.key_id, this.store.label(input.key_id), true);
                    if (k.in_flight === 0)
                        this.#vault.remove(this.#admin, input.key_id);
                    this.store.audit('CREDENTIAL_REVOKED', { key_id: input.key_id, new_requests_denied: true, existing_requests_cancelled: false });
                    return { deleted: true };
                }
                case 'credential.models': {
                    fields(input, ['key_id', 'models', 'model_wire_ids']);
                    identifier(input.key_id);
                    const label = this.store.label(input.key_id);
                    invariant(label && !label.deleted && Array.isArray(input.models), 'SERVICE_HANDLE_REVOKED');
                    fields(input.model_wire_ids, input.models);
                    for (const id of input.models) {
                        identifier(id);
                        invariant(MODELS.includes(input.model_wire_ids[id]), 'SERVICE_MODEL_ALLOWLIST');
                    }
                    this.#vault.setModels(this.#admin, input.key_id, input.models);
                    this.store.labelPut(input.key_id, { ...label, model_wire_ids: input.model_wire_ids });
                    this.store.audit('CREDENTIAL_MODEL_SCOPE_CHANGED', { key_id: input.key_id, models: input.models });
                    return { saved: true };
                }
                default: invariant(false, 'SERVICE_METHOD_DENIED');
            }
        }
        finally {
            if (importTicket?.state === 'COMMITTING')
                importTicket.state = 'FAILED';
            clear?.fill(0);
            if (input && typeof input === 'object')
                input.secret_b64 = undefined;
            this.#mutation = false;
        }
    }
    #normalize(input) {
        invariant(!this.boundary || Date.parse(this.boundary.expires_at_utc ?? '') > Date.now(), 'SERVICE_BOUNDARY_EXPIRED');
        const p = snapshot(input, 1024 * 1024);
        fields(p, ['subject', 'request', 'model', 'context', 'context_hash', 'input_tokens', 'output_tokens']);
        validateSubject(p.subject);
        invariant(p.context_hash === p.context.sha256 && p.context_hash === sha256(p.context.text), 'SERVICE_CONTEXT_HASH');
        fields(p.request, ['method', 'url', 'body', 'headers']);
        invariant(p.request.method === 'POST' && p.request.url === ENDPOINT && Buffer.byteLength(p.request.body) <= 262144, 'SERVICE_ENDPOINT_ALLOWLIST');
        let body;
        try {
            body = JSON.parse(p.request.body);
        }
        catch {
            throw Error('SERVICE_BODY_JSON');
        }
        invariant(p.request.body === JSON.stringify(body) && body.model === 'deepseek-flash', 'SERVICE_MODEL_ALLOWLIST');
        natural(p.output_tokens, 1, 4096);
        invariant(body.max_tokens === p.output_tokens, 'SERVICE_OUTPUT_LIMIT');
        // Never trust caller price, capabilities or claimed input token counts.
        const model = createDeepSeekFlashSpec('2026-11-08T00:00:00Z', '2026-11-15T00:00:00Z');
        const normalized = { ...model, model_id: body.model, price: { ...model.price, assurance: this.synthetic ? 'SIMULATED' : 'REAL' } };
        invariant(this.synthetic || Date.parse(normalized.price.valid_until) > Date.now(), 'SERVICE_PROVIDER_FACTS_EXPIRED');
        this.guard.assertSafe(canonical(p), 'SERVICE_REQUEST');
        return { input: p, model: normalized, body };
    }
    /** Deliberately absent from production RPC. Synthetic review is a test-fixture
     * authority, never evidence that an Agent can self-classify public data. */
    reviewSynthetic(input, decisions) {
        invariant(this.synthetic, 'SERVICE_METHOD_DENIED');
        const p = this.#normalize(input), review = decisions ?? { sources: p.input.context.entries.map(e => ({ source: e.source, range_sha256: e.range_sha256, classification: 'SYNTHETIC', origin: 'SYNTHETIC_QUALIFICATION', review_ref: 'explicit-synthetic-test-review' })),
            ...(p.body.tools ? { tools: { sha256: sha256(canonical(p.body.tools)), classification: 'SYNTHETIC', review_ref: 'synthetic-tool-schema-review' } } : {}) };
        const report = inspectFinalRequest({ ...p.input, model: p.model }, review, this.guard);
        return this.store.grantPut(sha256(canonical(p.input)), sha256(canonical(p.input.subject)), { review, report }, Date.now() + 120000, this.epoch);
    }
    installApprovedConsents(boundary, document) {
        assertServiceBoundary(boundary);
        invariant(!this.synthetic && this.boundary === boundary, 'SERVICE_METHOD_DENIED');
        const expiry = Math.min(Date.parse(document.expires_at_utc), Date.parse(boundary.expires_at_utc ?? ''));
        for (const consent of document.consents) {
            fields(consent, ['input', 'decisions', 'classification', 'approval_ref']);
            invariant(expiry > Date.now() && /^APPROVED-[A-Za-z0-9_.:-]{1,200}$/.test(consent.approval_ref), 'SERVICE_USER_REVIEW_REQUIRED');
            const p = this.#normalize(consent.input), report = inspectFinalRequest({ ...p.input, model: p.model }, consent.decisions, this.guard);
            invariant(consent.classification === report.classification && ['PUBLIC', 'SYNTHETIC'].includes(report.classification), 'SERVICE_CLASSIFICATION_DENIED');
            this.store.grantPut(sha256(canonical(p.input)), sha256(canonical(p.input.subject)), { review: consent.decisions, report, external_user_review_ref: document.external_user_review_ref, approval_ref: consent.approval_ref }, expiry, this.epoch);
            this.store.audit('SIGNED_EXACT_REQUEST_CONSENT_IMPORTED', { request_hash: report.request_hash, approval_ref: consent.approval_ref, expires: expiry });
        }
    }
    #grant(id, input) {
        const g = this.store.grant(id);
        invariant(g && !g.revoked && g.expires > Date.now() && g.epoch === this.epoch && g.request_hash === sha256(canonical(input)) && g.subject_hash === sha256(canonical(input.subject)), 'SERVICE_EGRESS_DENIED');
        const p = this.#normalize(input);
        const report = inspectFinalRequest({ ...p.input, model: p.model }, g.body.review, this.guard);
        invariant(sha256(canonical(report)) === sha256(canonical(g.body.report)), 'SERVICE_EGRESS_CHANGED');
        return { g, ...p, report };
    }
    prepare(input, syntheticTimeoutMs) {
        invariant(syntheticTimeoutMs === undefined || this.synthetic, 'SERVICE_METHOD_DENIED');
        if (syntheticTimeoutMs !== undefined)
            natural(syntheticTimeoutMs, 10, 120000);
        const p = this.#normalize(input), g = this.store.findGrant(sha256(canonical(p.input)), sha256(canonical(p.input.subject)), this.epoch);
        invariant(g, 'SERVICE_EGRESS_DENIED');
        const admission = this.#grant(g.id, p.input);
        const key = this.#keys().filter(k => k.provider_id === p.input.model.provider_id && k.state === 'ACTIVE' && k.models.includes(p.input.model.model_id) && k.in_flight < k.max_concurrency)
            .sort((a, b) => a.spent_micros + a.reserved_micros - b.spent_micros - b.reserved_micros)[0];
        invariant(key, 'SERVICE_CREDENTIAL_REQUIRED');
        const id = p.input.request.headers['x-agentnexus-request-id'];
        const binding = { request_id: id, operation_id: randomUUID(), agent_id: p.input.subject.agent_id, runtime_identity: sha256(canonical(p.input.subject)), task_id: p.input.subject.task_id,
            project_id: p.input.subject.project_id, provider_id: p.input.model.provider_id, model_id: p.input.model.model_id, credential_handle_id: key.key_handle_id,
            request_body_hash: sha256(p.input.request.body), context_hash: p.input.context_hash, data_egress_decision: g.id, data_classification: admission.report.classification,
            token_reservation_id: id, deadline: Date.now() + (syntheticTimeoutMs ?? 30000), nonce: randomUUID(), policy_epoch: this.epoch };
        this.store.prepared(binding);
        return binding;
    }
    async execute(params, onDelta, signal, daily) {
        invariant(!this.#closed && this.#active.size < 4 && !signal?.aborted, 'SERVICE_BACKPRESSURE');
        fields(params, ['input', 'binding']);
        const p = this.#normalize(params.input), b = snapshot(params.binding);
        fields(b, ['request_id', 'operation_id', 'agent_id', 'runtime_identity', 'task_id', 'project_id', 'provider_id', 'model_id', 'credential_handle_id', 'request_body_hash', 'context_hash', 'data_egress_decision', 'data_classification', 'token_reservation_id', 'deadline', 'nonce', 'policy_epoch']);
        for (const id of [b.request_id, b.operation_id, b.nonce])
            identifier(id);
        invariant(!this.#active.has(b.request_id), 'SERVICE_REQUEST_INFLIGHT');
        invariant(typeof b.credential_handle_id === 'string' && /^[a-f0-9-]{36}$/.test(b.credential_handle_id), 'SERVICE_CREDENTIAL_HANDLE_REQUIRED');
        invariant(b.request_id === p.input.request.headers['x-agentnexus-request-id'] && b.agent_id === p.input.subject.agent_id && b.project_id === p.input.subject.project_id && b.task_id === p.input.subject.task_id && b.runtime_identity === sha256(canonical(p.input.subject)) && b.provider_id === p.input.model.provider_id && b.model_id === p.input.model.model_id && b.request_body_hash === sha256(p.input.request.body) && b.context_hash === p.input.context_hash && b.token_reservation_id === b.request_id && b.policy_epoch === this.epoch && b.deadline > Date.now() && b.deadline <= Date.now() + 120000, 'SERVICE_REQUEST_BINDING');
        const admitted = this.#grant(b.data_egress_decision, p.input);
        invariant(b.data_classification === admitted.report.classification, 'SERVICE_EGRESS_DENIED');
        invariant(this.synthetic || this.boundary?.live_enabled, 'SERVICE_LIVE_BLOCKED');
        // One byte per potential input token plus framing headroom is conservative.
        const inputLimit = Buffer.byteLength(p.input.request.body) + 4096;
        const ac = new AbortController(), abort = () => ac.abort();
        signal?.addEventListener('abort', abort, { once: true });
        const timer = setTimeout(abort, Math.max(1, b.deadline - Date.now()));
        this.#active.set(b.request_id, ac);
        let reserved = false, sent = false, lease, meter = null;
        let cost = 0, httpStatus = 0, pending = '', emitted = 0;
        const adapter = new ChatProviderAdapter('deepseek', { timeout_ms: 120000 });
        try {
            this.store.reserve(b, p.input.subject, inputLimit, p.input.output_tokens, daily);
            reserved = true;
            if (b.credential_handle_id !== null)
                invariant(this.#keys().some(k => k.key_handle_id === b.credential_handle_id && k.state === 'ACTIVE'), 'SERVICE_HANDLE_REVOKED');
            lease = this.#vault.acquire(this.#admin, { provider_id: p.input.model.provider_id, model_id: p.input.model.model_id, request_id: b.request_id, estimated_cost_micros: 0, subject_key: canonical(p.input.subject), ...(b.credential_handle_id ? { key_handle_id: b.credential_handle_id } : {}) });
            const labelKey = this.#keys().find(k => k.key_handle_id === lease.key_handle_id);
            invariant(this.store.label(labelKey.key_id)?.model_wire_ids[p.input.model.model_id] === p.body.model, 'SERVICE_MODEL_SCOPE');
            const tools = (p.body.tools ?? []).map((t) => ({ name: t.function.name, description: t.function.description, parameters: t.function.parameters }));
            const rebuilt = adapter.build({ request_id: b.request_id, model: p.model, prompt: p.input.context.text, max_output_tokens: p.input.output_tokens, stream: true, json: true, reasoning: 'disabled', tools });
            invariant(rebuilt.body === p.input.request.body, 'SERVICE_ADAPTER_REQUEST_MISMATCH');
            const parsed = await this.#vault.withCredential(this.#admin, lease.lease_id, async (authorization) => {
                invariant(!ac.signal.aborted && b.policy_epoch === this.epoch, 'SERVICE_CANCELLED');
                this.#grant(b.data_egress_decision, p.input);
                this.store.sent(b.request_id, lease.key_handle_id);
                sent = true;
                const response = this.synthetic ? this.fixture ? await this.fixture.send(rebuilt, '', ac.signal) : wireFixture(JSON.stringify({ kind: 'FINAL', text: 'SIMULATED · independent credential process, no network.' }), { usage: { prompt_tokens: 20, completion_tokens: 10 }, chunk_bytes: 7 }) : await sendHttps(rebuilt.body, authorization, ac.signal);
                httpStatus = response.status;
                const source = response.body, guard = this.guard;
                const observed = (async function* () {
                    for await (const data of sseEvents(source, ac.signal)) {
                        guard.assertSafe(data, 'SERVICE_STREAM_EVENT');
                        if (data !== '[DONE]') {
                            const event = JSON.parse(data);
                            for (const c of event.choices ?? [])
                                if (typeof c.delta?.content === 'string')
                                    pending += c.delta.content;
                            invariant(Buffer.byteLength(pending) <= 32768 && emitted + Buffer.byteLength(pending) <= 32768, 'SERVICE_STREAM_LIMIT');
                            guard.assertSafe(pending, 'SERVICE_STREAM_HOLDBACK');
                            let count = pending.length - guard.streamHoldbackChars();
                            if (count > 0 && /[\uD800-\uDBFF]/.test(pending[count - 1]) && /[\uDC00-\uDFFF]/.test(pending[count]))
                                count--;
                            if (count > 0) {
                                const next = pending.slice(0, count);
                                pending = pending.slice(count);
                                emitted += Buffer.byteLength(next);
                                await onDelta(next);
                            }
                        }
                        yield Buffer.from('data: ' + data + '\n\n');
                    }
                })();
                try {
                    return await adapter.parse({ ...response, headers: { ...response.headers, 'x-agentnexus-local-request-id': b.request_id }, body: observed }, ac.signal, guard);
                }
                catch (error) {
                    if (error instanceof ProviderParseFault)
                        meter = error.observed_usage;
                    throw error;
                }
            }, canonical(p.input.subject));
            meter = parsed.usage;
            cost = meter && !this.synthetic ? deepSeekCost(meter, 'PEAK').cost_micros : 0;
            invariant(this.store.settle(b.request_id, meter, cost, true), 'SERVICE_USAGE_UNKNOWN');
            reserved = false;
            this.#vault.settle(this.#admin, lease.lease_id, { outcome: 'SUCCESS', cost_micros: cost, usage_source: this.synthetic ? 'SIMULATED' : 'PROVIDER' }, canonical(p.input.subject));
            lease = undefined;
            this.guard.assertSafe(pending, 'SERVICE_STREAM_FINAL');
            if (pending)
                await onDelta(pending);
            return { response: parsed, key_handle_id: labelKey.key_handle_id, cost_micros: cost, reservation_id: b.request_id, assurance: this.synthetic ? 'SIMULATED' : 'REAL' };
        }
        catch (error) {
            if (error instanceof ProviderParseFault)
                meter = error.observed_usage;
            cost = meter && !this.synthetic ? deepSeekCost(meter, 'PEAK').cost_micros : 0;
            if (reserved && ['RESERVED', 'SENT'].includes(this.store.request(b.request_id)?.state)) {
                if (sent)
                    this.store.settle(b.request_id, meter, cost, false);
                else
                    this.store.notSent(b.request_id);
            }
            if (lease)
                try {
                    this.#vault.settle(this.#admin, lease.lease_id, { outcome: !sent ? 'NOT_SENT' : httpStatus === 401 || httpStatus === 403 ? 'AUTH' : httpStatus === 429 ? 'RATE_LIMIT' : 'UNKNOWN', cost_micros: cost, usage_source: this.synthetic ? 'SIMULATED' : 'PROVIDER' }, canonical(p.input.subject));
                }
                catch { /* Durable unknown lease remains held. */ }
            const failure = Object.assign(Error(sent ? 'SERVICE_SENT_OUTCOME_UNKNOWN' : code(error)), { code: sent ? 'SERVICE_SENT_OUTCOME_UNKNOWN' : code(error), http_status: httpStatus || null, timed_out: ac.signal.aborted && !signal?.aborted, sent, partial: emitted > 0 });
            this.store.audit('PROVIDER_REQUEST_FAILED', { request_id: b.request_id, code: failure.code, http_status: failure.http_status, timed_out: failure.timed_out, automatic_retry: false });
            throw failure;
        }
        finally {
            clearTimeout(timer);
            signal?.removeEventListener('abort', abort);
            ac.abort();
            this.#active.delete(b.request_id);
            adapter.abandon(b.request_id);
        }
    }
    disconnect(ids) { for (const id of ids)
        this.#active.get(id)?.abort(); }
    async close() { if (this.#closed)
        return; invariant(this.#active.size === 0 && !this.#mutation, 'SERVICE_BUSY'); this.#vault.close(); this.store.close(); this.#closed = true; }
}
