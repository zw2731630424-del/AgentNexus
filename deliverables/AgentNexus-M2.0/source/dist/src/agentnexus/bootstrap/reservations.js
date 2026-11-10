import { auditEvent, canonical, invariant, NexusError, sha256, uid } from '../types.js';
import { clockFor, metadata } from '../control.js';
import { validateLogical } from '../runtime/contracts.js';
/** Provisional OS slots precede the PID-bound Permit; uncertainty survives Host restart. */
export class BootstrapReservations {
    #store;
    #enabled;
    #host;
    #resource;
    #profile;
    constructor(store, enabled, host, resource, profile) {
        this.#store = store;
        this.#enabled = enabled;
        this.#host = host;
        this.#resource = resource;
        this.#profile = profile;
        store.db.exec('CREATE TABLE IF NOT EXISTS m15_bootstrap_prepares(id TEXT PRIMARY KEY,boot TEXT NOT NULL,state TEXT NOT NULL,runtime TEXT UNIQUE,operation TEXT,logical TEXT NOT NULL,arguments_hash TEXT NOT NULL,resource TEXT NOT NULL,observed_process TEXT);');
    }
    fence() { invariant(this.#enabled() && !this.#store.faulted, 'M15_BOOTSTRAP_FEATURE_OR_AUDIT_BLOCKED'); }
    #audit(id, logical, phase, observation) {
        const { agent_id, project_id, task_id, session_id } = logical, m = metadata(this.#store);
        this.#store.audit(auditEvent({ agent_id, project_id, task_id, session_id }, { operation_id: id, operation_type: 'M15_WORKER_BOOTSTRAP', phase, execution_status: phase,
            detail: { runtime_identity: { host_boot_id: clockFor(this.#store).boot_id, host_process: this.#host }, worker_instance_id: null, resource_id: this.#resource, sandbox_profile_hash: this.#profile, policy_decision: { owner: 'P.RUNTIME_IDENTITY/P.AUDIT_REQUIRED', policy_epoch: m.policy_epoch, feature_epoch: m.feature_epoch }, exit_proof: null, artifact_hash: sha256(canonical(observation)), observation } }));
    }
    async claim(logical, args) {
        validateLogical(logical);
        this.fence();
        const id = uid();
        let committed = false;
        try {
            this.#store.transaction(() => {
                this.fence();
                invariant(!this.#store.db.prepare("SELECT 1 FROM m15_bootstrap_prepares WHERE state IN ('PREPARING','PREPARED','UNKNOWN_QUARANTINED') LIMIT 1").get(), 'M15_PREPARED_SLOT_HELD');
                invariant(!this.#store.db.prepare("SELECT 1 FROM m14_host_resources WHERE kind='PROCESS_SLOT' AND state<>'RELEASED' LIMIT 1").get(), 'M14_WORKER_QUOTA');
                this.#store.db.prepare('INSERT INTO m15_bootstrap_prepares VALUES(?,?,?,NULL,NULL,?,?,?,NULL)').run(id, clockFor(this.#store).boot_id, 'PREPARING', canonical(logical), sha256(canonical(args)), this.#resource);
                this.#audit(id, logical, 'REQUESTED', { native_invoked: false, authorization: 'TRUSTED_SUSPENDED_BOOTSTRAP_ONLY', automatic_retry: false });
            });
            committed = true;
            await this.#store.flush();
            this.fence();
            return id;
        }
        catch (error) {
            if (committed) {
                const e = new NexusError(error instanceof NexusError ? error.code : 'M15_BOOTSTRAP_AUDIT_UNCERTAIN');
                Object.defineProperty(e, 'bootstrap_id', { value: id });
                throw e;
            }
            throw error;
        }
    }
    async bind(id, runtime) {
        this.#store.transaction(() => {
            this.fence();
            const row = this.#store.db.prepare('SELECT logical,boot FROM m15_bootstrap_prepares WHERE id=? AND state=?').get(id, 'PREPARING');
            invariant(row && row.logical === canonical(runtime.logical) && row.boot === runtime.host_boot_id && runtime.profile_hash === this.#profile, 'M15_PREPARED_BINDING');
            invariant(this.#store.db.prepare("UPDATE m15_bootstrap_prepares SET state='PREPARED',runtime=?,observed_process=? WHERE id=? AND state='PREPARING'").run(runtime.runtime_id, canonical(runtime.process), id).changes === 1, 'M15_PREPARED_BINDING');
            this.#audit(id, runtime.logical, 'PREPARED', { runtime_id: runtime.runtime_id, worker_instance_id: runtime.worker_instance_id, process: runtime.process, untrusted_code_started: false });
        });
        await this.#store.flush();
    }
    /** Invoked inside ProductionGateway's original atomic consume transaction. */
    transfer(g) {
        this.fence();
        const row = this.#store.db.prepare("SELECT * FROM m15_bootstrap_prepares WHERE runtime=? AND state='PREPARED'").get(g.runtime_id);
        invariant(row && row.boot === g.host_boot_id && row.logical === canonical(g.logical) && row.arguments_hash === g.arguments_hash && row.resource === g.resource_id && row.observed_process === canonical(g.process) && g.profile_hash === this.#profile, 'M15_PREPARED_TRANSFER');
        invariant(this.#store.db.prepare("UPDATE m15_bootstrap_prepares SET state='TRANSFERRED',operation=? WHERE runtime=? AND state='PREPARED'").run(g.operation_id, g.runtime_id).changes === 1, 'M15_PREPARED_TRANSFER');
    }
    async failed(id, invoked, reason) {
        this.#store.transaction(() => {
            const row = this.#store.db.prepare('SELECT logical FROM m15_bootstrap_prepares WHERE id=? AND state IN (?,?)').get(id, 'PREPARING', 'PREPARED');
            if (!row)
                return;
            const state = invoked ? 'UNKNOWN_QUARANTINED' : 'NOT_INVOKED';
            this.#store.db.prepare('UPDATE m15_bootstrap_prepares SET state=? WHERE id=?').run(state, id);
            this.#audit(id, JSON.parse(row.logical), state, { reason, native_invoked: invoked, automatic_retry: false });
        });
        await this.#store.flush();
    }
    async endRuntime(runtime) { const row = this.#store.db.prepare("SELECT id FROM m15_bootstrap_prepares WHERE runtime=? AND state='PREPARED'").get(runtime); if (!row)
        return false; await this.failed(row.id, true, 'AUTHORIZATION_ENDED_WITHOUT_TRANSFER_OR_BOOTSTRAP_EXIT_PROOF'); return true; }
    async recover() { let after = ''; for (;;) {
        const rows = this.#store.db.prepare("SELECT id FROM m15_bootstrap_prepares WHERE id>? AND state IN ('PREPARING','PREPARED') AND boot<>? ORDER BY id LIMIT 32").all(after, clockFor(this.#store).boot_id);
        if (!rows.length)
            break;
        for (const row of rows) {
            await this.failed(row.id, true, 'HOST_RESTART_WITHOUT_COMPLETE_BOOTSTRAP_EXIT_PROOF');
            after = row.id;
        }
    } }
    stats() { return this.#store.db.prepare('SELECT state,COUNT(*) count FROM m15_bootstrap_prepares GROUP BY state').all(); }
}
