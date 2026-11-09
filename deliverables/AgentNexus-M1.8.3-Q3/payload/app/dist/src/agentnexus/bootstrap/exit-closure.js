import { canonical, invariant, sha256 } from '../types.js';
import { keys, snapshot } from '../runtime/contracts.js';
import { ProductionAudit } from '../production/audit.js';
import { RESOURCE_KINDS } from '../production/contracts.js';
/** Only a trusted owner can call this. Worker JSON and a termination request never authorize release. */
export class ExitClosureOwner {
    #store;
    #audit;
    constructor(store) {
        this.#store = store;
        this.#audit = new ProductionAudit(store);
        store.db.exec(`CREATE TABLE IF NOT EXISTS m15_exit_closures(operation TEXT PRIMARY KEY,proof_hash TEXT NOT NULL,body TEXT NOT NULL,hash TEXT NOT NULL,state TEXT NOT NULL);
    CREATE TRIGGER IF NOT EXISTS m15_closure_immutable BEFORE UPDATE ON m15_exit_closures BEGIN SELECT RAISE(ABORT,'append only'); END;
    CREATE TRIGGER IF NOT EXISTS m15_closure_nodelete BEFORE DELETE ON m15_exit_closures BEGIN SELECT RAISE(ABORT,'append only'); END;`);
    }
    async close(proof, observation) {
        const o = snapshot(observation);
        keys(o, ['source', 'ipc', 'sandbox_closed', 'owners']);
        keys(o.ipc, ['connection_revoked', 'pending', 'unknown']);
        invariant(['SIMULATED', 'REAL_WINDOWS'].includes(o.source) && typeof o.sandbox_closed === 'boolean' && typeof o.ipc.connection_revoked === 'boolean' && Number.isSafeInteger(o.ipc.pending) && o.ipc.pending >= 0 && Number.isSafeInteger(o.ipc.unknown) && o.ipc.unknown >= 0 && Array.isArray(o.owners), 'M15_EXIT_CLOSURE');
        const rows = this.#store.db.prepare('SELECT resource,kind,state,revision FROM m14_host_resources WHERE operation=? ORDER BY resource,kind').all(proof.grant.operation_id);
        invariant(o.owners.length === 5 && new Set(o.owners.map(x => x.kind)).size === 5, 'M15_RESOURCE_OWNERS');
        for (const owner of o.owners) {
            keys(owner, ['kind', 'resource', 'revision', 'release_condition_verified']);
            invariant(RESOURCE_KINDS.includes(owner.kind) && typeof owner.resource === 'string' && Number.isSafeInteger(owner.revision) && typeof owner.release_condition_verified === 'boolean', 'M15_RESOURCE_OWNER');
        }
        const persisted = this.#store.db.prepare('SELECT hash,body FROM m14_verified_exit_proofs WHERE operation=?').get(proof.grant.operation_id);
        invariant(persisted && persisted.hash === proof.evidence_hash && persisted.body === canonical(proof), 'M15_PERSISTED_PROOF_REQUIRED');
        const complete = proof.state === 'EXIT_VERIFIED' && proof.production_release_authority && proof.observation.source === 'REAL_WINDOWS' && o.source === 'REAL_WINDOWS' && o.ipc.connection_revoked && o.ipc.pending === 0 && o.ipc.unknown === 0 && o.sandbox_closed && rows.length === 5 && rows.every(r => r.state === 'HELD' && o.owners.some(x => x.kind === r.kind && x.resource === r.resource && x.revision === r.revision && x.release_condition_verified));
        const state = complete ? 'EXIT_VERIFIED' : 'EXIT_UNVERIFIED', body = { schema: 'agentnexus/exit-closure/1', operation_id: proof.grant.operation_id, proof_hash: proof.evidence_hash, observation: o, state }, hash = sha256(canonical(body));
        this.#store.transaction(() => {
            this.#store.db.prepare('INSERT INTO m15_exit_closures VALUES(?,?,?,?,?)').run(proof.grant.operation_id, proof.evidence_hash, canonical(body), hash, state);
            this.#audit.record('exit_proof', state, proof.grant, proof.grant.operation_id, { closure_hash: hash, states: [...proof.states, ...(proof.states.includes('OUTPUT_PRODUCERS_SETTLED') ? ['OUTPUT_SETTLED'] : []), state], ipc: o.ipc, resources_released: false }, proof.grant.resource_id);
        });
        await this.#audit.barrier();
        return { state, hash };
    }
    assertRelease(operation, proofHash) {
        const row = this.#store.db.prepare('SELECT * FROM m15_exit_closures WHERE operation=?').get(operation);
        invariant(row && row.state === 'EXIT_VERIFIED' && row.proof_hash === proofHash && sha256(row.body) === row.hash, 'M15_COMPLETE_EXIT_CLOSURE_REQUIRED');
    }
}
