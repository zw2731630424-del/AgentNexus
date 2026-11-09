import { canonical, invariant, sha256 } from '../types.js';
import { hostSubject, identifier, snapshot } from '../harness/contracts.js';
import { inspectFinalRequest } from './request-review.js';
import { egressBinding, egressSources } from './request-binding.js';
export { egressBinding, egressSources } from './request-binding.js';
const KIND = 'MODEL181_EGRESS_GRANT';
const REVIEW = 'MODEL182_FINAL_REQUEST_REVIEW';
const reviewKey = (grant_id, request_hash) => sha256(canonical({ grant_id, request_hash }));
function reviewed(state, grant, input) {
    const requestHash = sha256(canonical(input.request)), id = reviewKey(grant.id, requestHash), record = state.get(REVIEW, id);
    return !!record && record.state === 'APPROVED' && record.id === id && record.grant_id === grant.id && record.request_hash === requestHash &&
        record.context_hash === input.context_hash && record.context_hash === grant.context_hash && record.body_hash === grant.body_hash &&
        record.sources_hash === grant.sources_hash && record.authorization_ref === grant.authorization_ref;
}
export function assertEgressAdmission(state, input) {
    invariant(!state.faulted, 'MODEL181_EGRESS_STORE_FAULTED');
    const e = input.egress, g = e ? state.get(KIND, e.grant_id) : null;
    invariant(g && e && Object.keys(e).sort().join(',') === 'authorization_ref,body_hash,classification,context_hash,grant_id,sources_hash' && g.state === 'ACTIVE' && Date.parse(g.expires_at) > Date.now() && ['PUBLIC', 'SYNTHETIC'].includes(g.classification) && g.provider_id === input.model.provider_id && g.model_id === input.model.model_id && g.project_id === input.subject.project_id && g.endpoint === input.request.url && g.context_hash === input.context_hash && g.body_hash === sha256(input.request.body) && e.body_hash === g.body_hash && e.context_hash === g.context_hash && e.sources_hash === g.sources_hash && e.authorization_ref === g.authorization_ref && e.classification === g.classification, 'MODEL181_EGRESS_REQUIRED');
    invariant(input.model.price.assurance !== 'REAL' || reviewed(state, g, input), 'MODEL182_FINAL_REVIEW_REQUIRED');
}
/** Host-reviewed exact bytes, not Agent classification labels. Initial M1.8.1 scope
 * permits PUBLIC/SYNTHETIC only; INTERNAL/CONFIDENTIAL/SECRET cannot be enabled here.
 * The verifier must attest actual source review and the user's authorization.
 */
export class DataEgressPolicy {
    #state;
    #guard;
    #verify;
    constructor(state, admin, guard, verify) { state.checkAdmin(admin); invariant(typeof verify === 'function', 'MODEL181_EGRESS_REVIEW_REQUIRED'); this.#state = state; this.#guard = guard; this.#verify = verify; }
    async approve(admin, input) {
        this.#state.checkAdmin(admin);
        const g = snapshot(input);
        invariant(Object.keys(g).sort().join(',') === 'authorization_ref,body_hash,classification,context_hash,endpoint,expires_at,model_id,project_id,provider_id,sources_hash', 'MODEL181_EGRESS_SCHEMA');
        for (const v of [g.project_id, g.model_id, g.authorization_ref])
            identifier(v);
        invariant(g.provider_id === 'deepseek' && ['deepseek-flash', 'deepseek-v4-pro'].includes(g.model_id) && g.endpoint === 'https://api.deepseek.com/chat/completions', 'MODEL181_EGRESS_PROVIDER');
        invariant(['PUBLIC', 'SYNTHETIC'].includes(g.classification), 'MODEL181_EGRESS_CLASSIFICATION_DENIED');
        for (const h of [g.context_hash, g.body_hash, g.sources_hash])
            invariant(/^[a-f0-9]{64}$/.test(h), 'MODEL181_EGRESS_HASH');
        invariant(Number.isFinite(Date.parse(g.expires_at)) && Date.parse(g.expires_at) > Date.now(), 'MODEL181_EGRESS_EXPIRED');
        const id = sha256(canonical(g));
        let verified = false;
        try {
            verified = await this.#verify(g, id);
        }
        catch { /* no raw errors */ }
        invariant(verified === true, 'MODEL181_EGRESS_REVIEW_REQUIRED');
        await this.#state.change(hostSubject(this.#state.boot_id), 'MODEL181_EGRESS_APPROVED', () => {
            invariant(Date.parse(g.expires_at) > Date.now(), 'MODEL181_EGRESS_EXPIRED');
            const old = this.#state.get(KIND, id);
            if (old) {
                invariant(old.state === 'ACTIVE', 'MODEL181_EGRESS_REVOKED');
                return;
            }
            invariant(this.#state.count(KIND) < 4096, 'MODEL181_EGRESS_CAPACITY');
            this.#state.insert(KIND, id, hostSubject(this.#state.boot_id), 'ACTIVE', { ...g, revision: 0, id, state: 'ACTIVE' });
        }, { grant_id: id, ...g });
        return id;
    }
    async revoke(admin, id) {
        this.#state.checkAdmin(admin);
        await this.#state.change(hostSubject(this.#state.boot_id), 'MODEL181_EGRESS_REVOKED', () => {
            const g = this.#state.get(KIND, id);
            invariant(g, 'MODEL181_EGRESS_GRANT_REQUIRED');
            if (g.state === 'REVOKED')
                return;
            this.#state.update(KIND, id, g.revision, 'REVOKED', { ...g, state: 'REVOKED', revision: g.revision + 1 });
        }, { grant_id: id });
    }
    async approveReviewed(admin, input, decisions, authorization_ref, expires_at) {
        this.#state.checkAdmin(admin);
        const report = inspectFinalRequest(input, decisions, this.#guard);
        const id = await this.approve(admin, { ...egressBinding(input), provider_id: 'deepseek', classification: report.classification, authorization_ref, expires_at });
        const record = { revision: 0, id: reviewKey(id, report.request_hash), grant_id: id, state: 'APPROVED', review_hash: sha256(canonical(report)), request_hash: report.request_hash,
            context_hash: report.context_hash, body_hash: report.body_hash, sources_hash: report.sources_hash, authorization_ref };
        await this.#state.change(hostSubject(this.#state.boot_id), 'MODEL182_FINAL_REQUEST_REVIEW_APPROVED', () => {
            const old = this.#state.get(REVIEW, record.id);
            if (old) {
                invariant(canonical(old) === canonical(record), 'MODEL182_FINAL_REVIEW_CONFLICT');
                return;
            }
            invariant(this.#state.count(REVIEW) < 4096, 'MODEL182_FINAL_REVIEW_CAPACITY');
            this.#state.insert(REVIEW, record.id, hostSubject(this.#state.boot_id), 'APPROVED', record);
        }, { grant_id: id, review_hash: record.review_hash, request_hash: record.request_hash, source_count: report.source_manifest.length, component_count: report.components.length });
        return id;
    }
    #find(input) {
        const b = egressBinding(input);
        let after;
        for (;;) {
            const page = this.#state.list(KIND, { project_id: 'host', ...(after ? { after } : {}), limit: 100 });
            for (const g of page)
                if (g.state === 'ACTIVE' && Date.parse(g.expires_at) > Date.now() && Object.entries(b).every(([k, v]) => g[k] === v) &&
                    (input.model.price.assurance !== 'REAL' || reviewed(this.#state, g, { request: input.request, context_hash: input.context.sha256 })))
                    return g;
            if (page.length < 100)
                return null;
            after = page.at(-1).id;
        }
    }
    fence(admin, input, receipt) {
        this.#state.checkAdmin(admin);
        invariant(!this.#state.faulted, 'MODEL181_EGRESS_STORE_FAULTED');
        const b = egressBinding(input), g = this.#state.get(KIND, receipt.grant_id);
        invariant(g && Object.keys(receipt).sort().join(',') === 'authorization_ref,body_hash,classification,context_hash,grant_id,sources_hash' && g.state === 'ACTIVE' && Date.parse(g.expires_at) > Date.now() && ['PUBLIC', 'SYNTHETIC'].includes(g.classification) && Object.entries(b).every(([k, v]) => g[k] === v) && receipt.authorization_ref === g.authorization_ref && receipt.classification === g.classification && receipt.context_hash === g.context_hash && receipt.body_hash === g.body_hash && receipt.sources_hash === g.sources_hash, 'MODEL181_EGRESS_GRANT_REQUIRED');
        invariant(input.model.price.assurance !== 'REAL' || reviewed(this.#state, g, { request: input.request, context_hash: input.context.sha256 }), 'MODEL182_FINAL_REVIEW_REQUIRED');
        this.#guard.assertSafe(input.context.text, 'EGRESS_CONTEXT');
        this.#guard.assertSafe(input.request.body, 'EGRESS_BODY');
    }
    async admit(admin, input) {
        this.#state.checkAdmin(admin);
        const b = egressBinding(input);
        let g = null, reason = 'NO_REVIEWED_EXACT_BYTES';
        try {
            this.#guard.assertSafe(input.context.text, 'EGRESS_CONTEXT');
            this.#guard.assertSafe(input.request.body, 'EGRESS_BODY');
            g = this.#find(input);
        }
        catch {
            reason = 'SECRET_SCAN_FAILED';
        }
        const sources = egressSources(input.context);
        await this.#state.change(input.subject, 'MODEL181_EGRESS_DECISION', () => { }, { ...b, request_id: input.request.headers['x-agentnexus-request-id'], admission: g ? 'ALLOW' : 'DENY', classification: g?.classification ?? 'UNCLASSIFIED',
            grant_id: g?.id ?? null, authorization_ref: g?.authorization_ref ?? null, sources: sources.map(e => ({ event_id: e.source.event_id, record_hash: e.source.record_hash, payload_sha256: e.source.payload_ref.sha256, range_sha256: e.range_sha256 })), reason: g ? 'HOST_REVIEWED_AND_SCANNED' : reason }, input.request.headers['x-agentnexus-request-id']);
        invariant(g, 'MODEL181_EGRESS_DENIED');
        const receipt = { grant_id: g.id, context_hash: b.context_hash, body_hash: b.body_hash, sources_hash: b.sources_hash, classification: g.classification, authorization_ref: g.authorization_ref };
        this.fence(admin, input, receipt);
        return snapshot(receipt);
    }
}
