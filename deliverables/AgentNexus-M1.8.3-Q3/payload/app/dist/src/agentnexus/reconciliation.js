import { ADMIN, acquireMutation, adminEvent, clockFor, getChallenge, markChallengeConsumed, newChallenge } from './control.js';
import { auditEvent, boundedJson, canonical, freezeJson, invariant, now, sha256, uid } from './types.js';
import { validateArtifactRef } from './records.js';
// Trusted local administration only. Evidence integrity is machine-checked; its real-world
// interpretation belongs to the authenticated administrator, never to an Agent/PDP callback.
export class OperationReconciliation {
    #store;
    #admin;
    #gate;
    #running;
    #inflight;
    constructor(store, admin, gate, running, inflight) {
        this.#store = store;
        this.#admin = admin;
        this.#gate = gate;
        this.#running = running;
        this.#inflight = inflight;
    }
    async recover() {
        this.#store.transaction(() => {
            let after = '';
            while (true) {
                const rows = this.#store.db.prepare("SELECT operation_id,intent_hash,state,executor_state FROM control_operations WHERE operation_id>? AND state IN ('PREPARED','CLAIMED','STARTED','RESULT_RECORDED') ORDER BY operation_id LIMIT 100").all(after);
                if (!rows.length)
                    break;
                for (const r of rows) {
                    const hasIntent = !!this.#store.db.prepare("SELECT 1 FROM anx_records WHERE operation_id=? AND domain='audit' AND json_extract(body,'$.phase')='START_INTENT' LIMIT 1").get(r.operation_id);
                    const remote = !!this.#store.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='m14_host_operations'").get() && !!this.#store.db.prepare('SELECT 1 FROM m14_host_operations WHERE operation=?').get(r.operation_id);
                    const executor = remote ? 'UNKNOWN' : r.executor_state === 'SETTLED' ? 'SETTLED' : hasIntent ? 'UNKNOWN' : 'NOT_INVOKED';
                    const state = r.state === 'PREPARED' && !hasIntent ? 'BLOCKED' : 'INDETERMINATE';
                    this.#store.db.prepare('UPDATE control_operations SET state=?,executor_state=? WHERE operation_id=?').run(state, executor, r.operation_id);
                    adminEvent(this.#store, 'RECOVERY', 'OPERATION_REQUIRES_RECONCILE', { operation_id: r.operation_id, intent_hash: r.intent_hash, previous_state: r.state, state, executor_state: executor, automatic_retry: false });
                    after = r.operation_id;
                }
            }
        });
        await this.#store.flush();
    }
    #operation(id) {
        const op = this.#store.db.prepare('SELECT operation_id,intent_hash,state,executor_state,reconcile_revision,workspace FROM control_operations WHERE operation_id=?').get(id);
        invariant(op, 'UNKNOWN_OPERATION');
        return op;
    }
    #request(request) {
        const r = JSON.parse(boundedJson(request));
        invariant(r && Object.keys(r).sort().join(',') === 'action,evidence_refs,expected_revision,intent_hash,operation_id,outcome,reason,release_writer,request_id', 'INVALID_RECONCILIATION');
        invariant(typeof r.request_id === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(r.request_id) && typeof r.operation_id === 'string' && /^[a-f0-9-]{36}$/.test(r.operation_id), 'INVALID_RECONCILIATION');
        invariant(typeof r.intent_hash === 'string' && /^[a-f0-9]{64}$/.test(r.intent_hash) && Number.isSafeInteger(r.expected_revision) && r.expected_revision >= 0, 'INVALID_RECONCILIATION');
        invariant(['ADJUDICATE', 'RELEASE_WRITER'].includes(r.action) && ['CONFIRMED_APPLIED', 'CONFIRMED_NOT_APPLIED', 'UNKNOWN_QUARANTINED'].includes(r.outcome), 'INVALID_RECONCILIATION');
        invariant(typeof r.reason === 'string' && r.reason.trim().length >= 8 && r.reason.length <= 2048 && typeof r.release_writer === 'boolean', 'RECONCILIATION_REASON_REQUIRED');
        invariant(Array.isArray(r.evidence_refs) && r.evidence_refs.length > 0 && r.evidence_refs.length <= 8, 'RECONCILIATION_EVIDENCE_REQUIRED');
        let total = 0;
        const ids = new Set();
        for (const ref of r.evidence_refs) {
            validateArtifactRef(ref);
            invariant(ref.bytes > 0 && !ids.has(ref.artifact_id), 'RECONCILIATION_EVIDENCE_REQUIRED');
            total += ref.bytes;
            ids.add(ref.artifact_id);
        }
        invariant(total <= 1048576, 'RECONCILIATION_EVIDENCE_LIMIT');
        invariant(!(r.outcome === 'UNKNOWN_QUARANTINED' && r.release_writer), 'UNKNOWN_MUST_REMAIN_QUARANTINED');
        invariant(r.action !== 'RELEASE_WRITER' || r.release_writer, 'INVALID_WRITER_RELEASE');
        return freezeJson(r);
    }
    #check(r) {
        const op = this.#operation(r.operation_id);
        invariant(!this.#inflight(op.operation_id), 'OPERATION_ACTIVE');
        if (this.#store.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='m14_host_operations'").get()) {
            const remote = this.#store.db.prepare('SELECT inflight FROM m14_host_operations WHERE operation=?').get(op.operation_id);
            invariant(!remote || remote.inflight === 0, 'OPERATION_ACTIVE');
        }
        invariant(op.intent_hash === r.intent_hash, 'RECONCILIATION_INTENT_MISMATCH');
        invariant(op.reconcile_revision === r.expected_revision, 'RECONCILIATION_REVISION_CONFLICT');
        invariant(!this.#store.db.prepare('SELECT 1 FROM control_reconciliations WHERE request_id=?').get(r.request_id), 'RECONCILIATION_REPLAY');
        const final = this.#store.db.prepare("SELECT id,outcome,revision,writer_released FROM control_reconciliations WHERE operation_id=? AND action='ADJUDICATE' AND outcome<>'UNKNOWN_QUARANTINED' ORDER BY revision DESC LIMIT 1").get(r.operation_id);
        if (r.action === 'ADJUDICATE') {
            invariant(!final, 'OPERATION_ALREADY_ADJUDICATED');
            // A storage fault can prevent Gateway's uncertainty projection from committing.
            // An inactive CLAIMED/STARTED operation is still uncertain, never a retryable failure.
            invariant(['INDETERMINATE', 'RESULT_RECORDED', 'CLAIMED', 'STARTED'].includes(op.state), 'OPERATION_NOT_RECONCILABLE');
        }
        else {
            invariant(final && final.outcome === r.outcome, 'FINAL_ADJUDICATION_REQUIRED');
            invariant(!!this.#store.db.prepare('SELECT 1 FROM control_writers WHERE operation_id=?').get(op.operation_id), 'WRITER_ALREADY_RELEASED');
        }
        if (r.release_writer) {
            // M1.4 remote execution cannot inherit the trusted-local NOT_INVOKED/SETTLED shortcut.
            // Its verifier must first persist an independent production exit/owner receipt.
            if (this.#store.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='m14_host_operations'").get()) {
                const remote = this.#store.db.prepare('SELECT grant_body,boot,state FROM m14_host_operations WHERE operation=?').get(op.operation_id);
                if (remote) {
                    const receipt = this.#store.db.prepare('SELECT * FROM m14_release_authorizations WHERE operation=?').get(op.operation_id);
                    invariant(receipt && receipt.consumed === 0 && receipt.boot === remote.boot && receipt.boot === clockFor(this.#store).boot_id && ['CLAIMED', 'STARTED', 'EXIT_VERIFIED'].includes(remote.state) && receipt.profile_hash === JSON.parse(remote.grant_body).profile_hash, 'M14_RESOURCE_RELEASE_AUTHORITY_REQUIRED');
                    const resources = this.#store.db.prepare('SELECT resource,kind,state,revision FROM m14_host_resources WHERE operation=? ORDER BY resource,kind').all(op.operation_id);
                    invariant(resources.length === 5 && resources.every(v => v.state === 'HELD') && canonical(resources) === receipt.resource_versions, 'M14_RESOURCE_REVISION_CONFLICT');
                    const proof = this.#store.db.prepare('SELECT body,hash FROM m14_verified_exit_proofs WHERE operation=?').get(op.operation_id);
                    invariant(proof && proof.hash === receipt.proof_hash && JSON.parse(proof.body).production_release_authority === true && JSON.parse(proof.body).state === 'EXIT_VERIFIED', 'M14_PRODUCTION_EXIT_REQUIRED');
                }
            }
            invariant(!this.#running(op.operation_id) && ['NOT_INVOKED', 'SETTLED'].includes(op.executor_state), 'EXECUTOR_EXIT_NOT_CONFIRMED');
            invariant(!this.#store.faulted, 'CORE_STORAGE_UNAVAILABLE');
        }
        return op;
    }
    async #verifyEvidence(r) {
        for (const ref of r.evidence_refs)
            for await (const _chunk of this.#store.artifacts.read(ref)) { /* Complete hash barrier, never an early iterator return. */ }
    }
    async prepare(admin, request) {
        this.#admin(admin);
        const r = this.#request(request);
        this.#check(r);
        await this.#verifyEvidence(r);
        const hash = sha256(canonical(r));
        let id = '';
        this.#store.transaction(() => {
            this.#check(r);
            id = newChallenge(this.#store, 'RECONCILE', r, hash, r.expected_revision);
            adminEvent(this.#store, 'OPERATION_RECONCILIATION', 'PREPARED', r, { challenge_id: id, preview_hash: hash });
        });
        await this.#store.flush();
        return { challenge_id: id, preview_hash: hash, request: r };
    }
    async commit(admin, id, previewHash) {
        this.#admin(admin);
        const release = acquireMutation(this.#gate);
        try {
            const challenge = getChallenge(this.#store, id, 'RECONCILE');
            invariant(challenge.hash === previewHash, 'PREVIEW_HASH_MISMATCH');
            const r = this.#request(JSON.parse(challenge.payload));
            invariant(sha256(canonical(r)) === previewHash && challenge.revision === r.expected_revision, 'PREVIEW_HASH_MISMATCH');
            this.#check(r);
            await this.#verifyEvidence(r);
            const adjudicationId = uid(), at = now();
            let writerReleased = false;
            this.#store.transaction(() => {
                const currentChallenge = getChallenge(this.#store, id, 'RECONCILE');
                invariant(currentChallenge.hash === previewHash && currentChallenge.payload === challenge.payload, 'PREVIEW_HASH_MISMATCH');
                this.#check(r);
                markChallengeConsumed(this.#store, id);
                if (r.release_writer) {
                    writerReleased = this.#store.db.prepare('DELETE FROM control_writers WHERE operation_id=?').run(r.operation_id).changes === 1;
                    if (this.#store.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='m14_host_operations'").get() && this.#store.db.prepare('SELECT 1 FROM m14_host_operations WHERE operation=?').get(r.operation_id)) {
                        invariant(writerReleased && this.#store.db.prepare('UPDATE m14_release_authorizations SET consumed=1 WHERE operation=? AND consumed=0').run(r.operation_id).changes === 1, 'M14_RELEASE_REPLAY');
                        this.#store.db.prepare("UPDATE m14_host_resources SET state='RELEASED',revision=revision+1 WHERE operation=? AND state<>'RELEASED'").run(r.operation_id);
                        this.#store.db.prepare("UPDATE m14_host_operations SET state='RELEASED' WHERE operation=?").run(r.operation_id);
                    }
                }
                const state = r.outcome === 'UNKNOWN_QUARANTINED' ? 'INDETERMINATE' : r.outcome === 'CONFIRMED_APPLIED' ? 'RECONCILED_APPLIED' : 'RECONCILED_NOT_APPLIED';
                invariant(this.#store.db.prepare('UPDATE control_operations SET state=?,reconcile_revision=reconcile_revision+1 WHERE operation_id=? AND reconcile_revision=?').run(state, r.operation_id, r.expected_revision).changes === 1, 'RECONCILIATION_REVISION_CONFLICT');
                const event = this.#store.audit(auditEvent(ADMIN, { operation_id: r.operation_id, operation_type: 'OPERATION_RECONCILIATION', phase: r.action, parameters: r,
                    detail: { adjudication_id: adjudicationId, revision: r.expected_revision + 1, adjudicator: 'host-admin', observed_at: at, writer_released: writerReleased, automatic_retry: false } }));
                this.#store.db.prepare('INSERT INTO control_reconciliations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(adjudicationId, r.request_id, r.operation_id, r.expected_revision + 1, r.intent_hash, r.action, r.outcome, 'host-admin', at, r.reason, canonical(r.evidence_refs), writerReleased ? 1 : 0, event.event_id);
            });
            await this.#store.flush();
            return { adjudication_id: adjudicationId, operation_id: r.operation_id, intent_hash: r.intent_hash, revision: r.expected_revision + 1, outcome: r.outcome, writer_released: writerReleased, automatic_retry: false };
        }
        finally {
            release();
        }
    }
    inspect(admin, operationId) {
        this.#admin(admin);
        const op = this.#operation(operationId);
        const records = this.#store.db.prepare('SELECT * FROM control_reconciliations WHERE operation_id=? ORDER BY revision LIMIT 100').all(operationId);
        const writer = this.#store.db.prepare('SELECT resource,fence FROM control_writers WHERE operation_id=?').get(operationId) ?? null;
        return { ...op, writer, adjudications: records, executor_running: this.#running(operationId) };
    }
    async recordEvidence(admin, evidence) {
        this.#admin(admin);
        boundedJson(evidence);
        for (const field of ['kind', 'source', 'description'])
            invariant(typeof evidence[field] === 'string' && evidence[field].trim().length > 0 && evidence[field].length <= 2048, 'RECONCILIATION_EVIDENCE_REQUIRED');
        invariant(Object.hasOwn(evidence, 'observation'), 'RECONCILIATION_EVIDENCE_REQUIRED');
        const ref = await this.#store.artifacts.putBytes(Buffer.from(canonical(evidence)), { maxBytes: 65536, media_type: 'application/json' });
        adminEvent(this.#store, 'OPERATION_RECONCILIATION', 'EVIDENCE_RECORDED', { evidence_ref: ref });
        await this.#store.flush();
        return ref;
    }
}
