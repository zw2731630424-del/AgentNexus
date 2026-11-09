import { canonical, invariant, sha256, uid } from '../types.js';
import { nonce } from './contracts.js';
import { encodeFrame } from '../runtime/ipc.js';
import { snapshot } from '../runtime/contracts.js';
import { ProductionGateway } from './authority.js';
import { ExitProofVerifier } from './exit.js';
import { ProductionAudit } from './audit.js';
export class ProductionHost {
    #authority;
    #bridge;
    #verifier;
    #audit;
    #pending = 0;
    #closed = false;
    constructor(authority, bridge, verifier) { this.#authority = authority; this.#bridge = bridge; this.#verifier = verifier; this.#audit = new ProductionAudit(authority.store); }
    bindAgent(identity, runtimeId) {
        const frozen = JSON.parse(canonical(identity));
        let revoked = false;
        const assertLive = () => invariant(!revoked && !this.#closed, 'M14_SESSION_CLOSED');
        return Object.freeze({
            preview: (request) => { assertLive(); const p = this.#authority.preview(frozen, request, runtimeId); return { intent_hash: p.intent_hash, profile_hash: p.runtime.profile_hash, tool_id: p.tool.id, tool_version: p.tool.version, resource_id: p.request.resource_id }; },
            request: async (request) => {
                assertLive();
                invariant(this.#pending < 16, 'M14_HOST_BACKPRESSURE');
                this.#pending++;
                let g;
                let timer;
                const cancel = new AbortController();
                try {
                    request = snapshot(request);
                    const permit = await this.#authority.issue(frozen, request, runtimeId);
                    g = permit.body;
                    assertLive();
                    const runtime = this.#authority.identities.inspect(runtimeId), c = this.#bridge.connection(runtime), payload = { grant: permit, arguments: request.arguments };
                    // Signed grant binds arguments; copy now and recheck hash so caller mutation cannot affect the approved operation.
                    invariant(sha256(canonical(request.arguments)) === g.arguments_hash, 'M14_ARGUMENTS_CHANGED');
                    const e = { schema: 'agentnexus/ipc/1', ...frozen, request_id: uid(), runtime_id: runtimeId, runtime_session_id: runtime.worker_instance_id, worker_instance_id: runtime.worker_instance_id,
                        operation_id: g.operation_id, capability_id: g.permit_id, resource_id: g.resource_id, policy_epoch: g.policy_epoch, feature_epoch: g.feature_epoch, payload_hash: sha256(canonical(payload)), nonce: nonce(), deadline: g.expires_at, connection_id: c.connection_id, profile_hash: g.profile_hash, payload: payload };
                    this.#authority.fence(g);
                    const frame = encodeFrame(e, c.secret);
                    const expired = new Promise((_, reject) => { timer = setTimeout(() => { cancel.abort(); reject(new Error('M14_BRIDGE_DEADLINE')); }, Math.max(1, g.expires_at - Date.now()) + runtime.profile.limits.wall_ms); });
                    const received = (async () => { const response = await this.#bridge.send(runtime, frame, cancel.signal); const proof = await this.#verifier.accept(response.proof, g, this.#bridge.qualificationEvidence(runtime), cancel.signal); return { response, proof }; })();
                    const { response, proof } = await Promise.race([received, expired]);
                    this.#authority.retire(g.operation_id);
                    if (proof.state !== 'EXIT_VERIFIED')
                        await this.#authority.quarantine(g.operation_id, 'EXIT_UNVERIFIED');
                    this.#audit.record('host', 'RESULT_RECEIVED', g, g.operation_id, { proof_id: proof.proof_id, state: proof.state, resources_released: false }, g.resource_id);
                    await this.#audit.barrier();
                    return { status: proof.state === 'EXIT_VERIFIED' ? response.status : 'INCONCLUSIVE', operation_id: g.operation_id, exit_proof_id: proof.proof_id, resources: 'HELD', automatic_retry: false };
                }
                catch (error) {
                    const uncertain = typeof error.operation_id === 'string' ? error.operation_id : null;
                    if (!g && typeof error.operation_id === 'string') {
                        try {
                            const row = this.#authority.store.db.prepare('SELECT m.grant_body FROM m14_host_operations m JOIN control_operations c ON c.operation_id=m.operation WHERE m.operation=? AND c.request_key=?').get(uncertain, canonical({ identity: frozen, call_id: request.call_id }));
                            if (row)
                                g = JSON.parse(row.grant_body);
                        }
                        catch { }
                    }
                    if (g) {
                        try {
                            await this.#authority.quarantine(g.operation_id, error.code ?? 'IPC_RESULT_UNCERTAIN');
                        }
                        catch { }
                    }
                    const unknown = !!g || !!uncertain || this.#authority.store.faulted;
                    return { status: unknown ? 'INCONCLUSIVE' : 'BLOCKED', operation_id: g?.operation_id ?? uncertain, reason: error.code ?? 'IPC_RESULT_UNCERTAIN', resources: unknown ? 'UNKNOWN_QUARANTINED' : 'NOT_RESERVED', automatic_retry: false };
                }
                finally {
                    clearTimeout(timer);
                    this.#pending--;
                }
            },
            close: () => { revoked = true; return this.#authority.identities.revoke(runtimeId, 'LOGICAL_SESSION_CLOSED'); },
        });
    }
    close() { this.#closed = true; this.#authority.identities.close(); }
}
