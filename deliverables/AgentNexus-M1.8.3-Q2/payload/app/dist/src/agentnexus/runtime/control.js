import { randomBytes } from 'node:crypto';
import { clockFor, metadata } from '../control.js';
import { canonical, invariant, NexusError, sha256, uid } from '../types.js';
import { AuditProducerSDK } from './audit.js';
import { decodeFrame } from './ipc.js';
import { hash, id, keys, LIMITS, profileHash, sameProcess, snapshot, validateLogical, validateProcess } from './contracts.js';
export class RuntimeControl {
    #store;
    #admin;
    #provider;
    #enabled;
    #connections = new Map();
    #audit;
    #closed = false;
    #pending = 0;
    #observations = new Set();
    #shutdown = new AbortController();
    boot_id;
    constructor(store, admin, provider, enabled) {
        invariant(['MODEL', 'WINDOWS_PRIMITIVE'].includes(provider.assurance), 'RUNTIME_PROVIDER_NOT_ADMITTED');
        this.#store = store;
        this.#admin = admin;
        this.#provider = provider;
        this.#enabled = enabled;
        this.#audit = new AuditProducerSDK(store);
        this.boot_id = clockFor(store).boot_id;
        store.db.exec(`
      CREATE TABLE IF NOT EXISTS runtime_bindings(id TEXT PRIMARY KEY,boot TEXT NOT NULL,state TEXT NOT NULL,revision INTEGER NOT NULL,body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS runtime_capabilities(id TEXT PRIMARY KEY,runtime TEXT NOT NULL,connection TEXT NOT NULL,scope TEXT NOT NULL,lease TEXT NOT NULL,feature_epoch INTEGER NOT NULL,policy_epoch INTEGER NOT NULL,consumed INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS runtime_operation_bindings(operation TEXT PRIMARY KEY,runtime TEXT UNIQUE NOT NULL,profile_hash TEXT NOT NULL,generation INTEGER NOT NULL,scope_hash TEXT);
      CREATE TABLE IF NOT EXISTS runtime_requests(id TEXT PRIMARY KEY,connection TEXT NOT NULL,nonce TEXT NOT NULL,operation TEXT UNIQUE NOT NULL,runtime TEXT NOT NULL,state TEXT NOT NULL,body TEXT NOT NULL,UNIQUE(connection,nonce));
      CREATE TABLE IF NOT EXISTS runtime_resources(resource TEXT PRIMARY KEY,kind TEXT NOT NULL,runtime TEXT NOT NULL,operation TEXT NOT NULL,state TEXT NOT NULL,revision INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS runtime_exit_proofs(id TEXT PRIMARY KEY,runtime TEXT NOT NULL,operation TEXT NOT NULL,body TEXT NOT NULL,hash TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS runtime_proof_no_update BEFORE UPDATE ON runtime_exit_proofs BEGIN SELECT RAISE(ABORT,'append only'); END;
      CREATE TRIGGER IF NOT EXISTS runtime_proof_no_delete BEFORE DELETE ON runtime_exit_proofs BEGIN SELECT RAISE(ABORT,'append only'); END;`);
    }
    #get(runtime) {
        id(runtime);
        const row = this.#store.db.prepare('SELECT * FROM runtime_bindings WHERE id=?').get(runtime);
        invariant(row, 'RUNTIME_UNKNOWN');
        const body = JSON.parse(row.body);
        invariant(body.state === row.state && body.revision === row.revision && body.host_boot_id === row.boot, 'RUNTIME_CORRUPT');
        return snapshot(body);
    }
    #event(b, producer, phase, detail, operation = b.runtime_id) {
        return this.#audit.producer(producer).emit(b.logical, { operation_id: operation, runtime_id: b.runtime_id, worker_instance_id: b.worker_instance_id, sandbox_profile_id: b.profile.id, resource_id: null }, phase, detail);
    }
    #set(b, state, reason) {
        const next = { ...b, state, revision: b.revision + 1 };
        invariant(this.#store.db.prepare('UPDATE runtime_bindings SET state=?,revision=?,body=? WHERE id=? AND revision=?').run(state, next.revision, canonical(next), b.runtime_id, b.revision).changes === 1, 'RUNTIME_REVISION_CONFLICT');
        this.#event(next, 'worker', state === 'REVOKED' ? 'REVOKED' : 'OBSERVED', { previous: b.state, state, reason });
        return snapshot(next);
    }
    #active(c) {
        invariant(!this.#closed && c.open, 'IPC_CONNECTION_CLOSED');
        const b = this.#get(c.runtime);
        invariant(b.host_boot_id === this.boot_id && b.state === 'ACTIVE', 'RUNTIME_NOT_ACTIVE');
        invariant(this.#enabled('security.identity.runtime') && this.#enabled('security.ipc'), 'RUNTIME_FEATURE_UNAVAILABLE');
        return b;
    }
    #connection(handle) { const c = this.#connections.get(handle); invariant(c, 'IPC_UNAUTHENTICATED'); return c; }
    #revokeConnections(runtime) {
        for (const [handle, c] of this.#connections)
            if (c.runtime === runtime) {
                c.open = false;
                c.cancel.abort();
                c.key.fill(0);
                this.#connections.delete(handle);
            }
    }
    async #observe(work, deadline, connection) {
        invariant(!this.#closed && !connection?.cancel.signal.aborted, 'IPC_CONNECTION_CLOSED');
        invariant(this.#observations.size < 32, 'NATIVE_OBSERVER_UNSETTLED');
        const controller = new AbortController();
        const abort = () => controller.abort(new NexusError('IPC_CONNECTION_CLOSED'));
        this.#shutdown.signal.addEventListener('abort', abort, { once: true });
        connection?.cancel.signal.addEventListener('abort', abort, { once: true });
        const native = Promise.resolve().then(() => { controller.signal.throwIfAborted(); return work(controller.signal); });
        this.#observations.add(native);
        native.then(() => this.#observations.delete(native), () => this.#observations.delete(native));
        let timer;
        const cancelled = new Promise((_resolve, reject) => {
            controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true });
            timer = setTimeout(() => controller.abort(new NexusError('RUNTIME_OBSERVATION_TIMEOUT')), Math.max(1, deadline - Date.now()));
        });
        try {
            return await Promise.race([native, cancelled]);
        }
        finally {
            if (timer)
                clearTimeout(timer);
            this.#shutdown.signal.removeEventListener('abort', abort);
            connection?.cancel.signal.removeEventListener('abort', abort);
        }
        // Uncooperative native work retains its observer slot until actual settlement. Never spawn unbounded replacements.
    }
    #operationBinding(b, operation, scopeHash, create) {
        const row = this.#store.db.prepare('SELECT * FROM runtime_operation_bindings WHERE operation=? OR runtime=?').get(operation, b.runtime_id);
        if (!row) {
            invariant(create, 'RUNTIME_OPERATION_MISMATCH');
            this.#store.db.prepare('INSERT INTO runtime_operation_bindings VALUES(?,?,?,?,?)').run(operation, b.runtime_id, b.profile_hash, b.generation, scopeHash);
            return;
        }
        invariant(row.operation === operation && row.runtime === b.runtime_id && row.profile_hash === b.profile_hash && row.generation === b.generation, 'RUNTIME_OPERATION_MISMATCH');
        invariant(!scopeHash || !row.scope_hash || scopeHash === row.scope_hash, 'RUNTIME_OPERATION_SCOPE_MISMATCH');
        if (scopeHash && !row.scope_hash)
            this.#store.db.prepare('UPDATE runtime_operation_bindings SET scope_hash=? WHERE operation=?').run(scopeHash, operation);
    }
    inspect(admin, runtime) { this.#admin(admin); return this.#get(runtime); }
    async create(admin, logical, process, parent, profile) {
        this.#admin(admin);
        invariant(!this.#closed, 'RUNTIME_CLOSED');
        const l = snapshot(logical), p = snapshot(process), par = snapshot(parent), s = snapshot(profile);
        validateLogical(l);
        validateProcess(p);
        validateProcess(par);
        const ph = profileHash(s);
        invariant(s.os === p.os && s.principal === p.principal && par.os === p.os, 'RUNTIME_PROFILE_IDENTITY');
        invariant(Number(this.#store.db.prepare('SELECT COUNT(*) n FROM runtime_bindings').get().n) < LIMITS.identities, 'RUNTIME_IDENTITY_LIMIT');
        const generation = Number(this.#store.db.prepare('SELECT COALESCE(MAX(json_extract(body,\'$.generation\')),0)+1 n FROM runtime_bindings').get().n);
        const b = { runtime_id: uid(), logical: l, process: p, parent: par, profile: s, profile_hash: ph,
            worker_instance_id: uid(), runtime_session_id: uid(), host_boot_id: this.boot_id, generation, state: 'CREATED', revision: 0 };
        this.#store.transaction(() => {
            invariant(!this.#store.db.prepare("SELECT 1 FROM runtime_bindings WHERE boot=? AND json_extract(body,'$.process.pid')=? AND state IN ('CREATED','AUTHENTICATED','ACTIVE','REVOKING')").get(this.boot_id, p.pid), 'RUNTIME_PROCESS_ALREADY_BOUND');
            this.#store.db.prepare('INSERT INTO runtime_bindings VALUES(?,?,?,?,?)').run(b.runtime_id, this.boot_id, b.state, 0, canonical(b));
            this.#event(b, 'worker', 'REQUESTED', { state: b.state, assurance: this.#provider.assurance, production_execution: 'BLOCKED' });
        });
        await this.#store.flush();
        return snapshot(b);
    }
    async authenticate(admin, runtime, channel) {
        this.#admin(admin);
        invariant(!this.#closed && this.#connections.size < LIMITS.connections, 'IPC_CONNECTION_LIMIT');
        const before = this.#get(runtime);
        invariant(before.state === 'CREATED' && before.host_boot_id === this.boot_id, 'RUNTIME_AUTH_STATE');
        // OS peer comes only from the constructor-bound trusted transport, never an envelope field.
        const peer = snapshot(await this.#observe(signal => this.#provider.peer(channel, signal), Date.now() + 2000));
        validateProcess(peer);
        invariant(sameProcess(peer, before.process), 'IPC_PEER_MISMATCH');
        const c = { id: uid(), runtime, channel, key: randomBytes(32), open: true, cancel: new AbortController() };
        this.#store.transaction(() => {
            invariant(!this.#closed && this.#get(runtime).revision === before.revision && this.#connections.size < LIMITS.connections, 'RUNTIME_REVISION_CONFLICT');
            this.#set(before, 'AUTHENTICATED', 'TRUSTED_TRANSPORT_OBSERVATION');
        });
        await this.#store.flush();
        invariant(!this.#closed && this.#get(runtime).state === 'AUTHENTICATED' && this.#connections.size < LIMITS.connections, 'RUNTIME_AUTH_STATE');
        const handle = Object.freeze({});
        this.#connections.set(handle, c);
        // Returned only to trusted Supervisor. Key must travel through its private bootstrap channel.
        return Object.freeze({ handle, connection_id: c.id, secret: Buffer.from(c.key) });
    }
    async activate(admin, handle) {
        this.#admin(admin);
        const c = this.#connection(handle), b = this.#get(c.runtime);
        invariant(c.open && !this.#closed && b.state === 'AUTHENTICATED' && b.host_boot_id === this.boot_id, 'RUNTIME_AUTH_STATE');
        this.#store.transaction(() => this.#set(b, 'ACTIVE', 'CONTRACT_ONLY_NO_PRODUCTION_PROFILE'));
        await this.#store.flush();
        return this.#get(c.runtime);
    }
    async issue(admin, handle, scope, lifetimeMs = 10000) {
        this.#admin(admin);
        const c = this.#connection(handle), b = this.#active(c), s = snapshot(scope);
        keys(s, ['operation_id', 'resource_id', 'payload_hash', 'kind']);
        id(s.operation_id);
        hash(s.payload_hash);
        invariant(['PURE', 'READ_ONLY', 'LOCAL_WRITE', 'PROCESS', 'EXTERNAL_EFFECT'].includes(s.kind) && s.resource_id.startsWith(b.logical.project_id + ':') && s.resource_id.length <= 256, 'CAPABILITY_SCOPE');
        invariant(Number.isSafeInteger(lifetimeMs) && lifetimeMs > 0 && lifetimeMs <= 30000, 'CAPABILITY_EXPIRY');
        const cap = uid(), lease = clockFor(this.#store).issue(lifetimeMs), m = metadata(this.#store);
        this.#store.transaction(() => {
            invariant(Number(this.#store.db.prepare('SELECT COUNT(*) n FROM runtime_capabilities').get().n) < LIMITS.capabilities, 'CAPABILITY_LIMIT');
            this.#operationBinding(b, s.operation_id, sha256(canonical(s)), true);
            this.#store.db.prepare('INSERT INTO runtime_capabilities VALUES(?,?,?,?,?,?,?,0)').run(cap, b.runtime_id, c.id, canonical(s), canonical(lease), m.feature_epoch, m.policy_epoch);
            this.#event(b, 'ipc', 'AUTHORIZED', { capability_id: cap, scope: s, expires_at: lease.expires_at }, s.operation_id);
        });
        await this.#store.flush();
        return cap;
    }
    #check(c, e) {
        const b = this.#active(c), l = b.logical;
        for (const key of ['agent_id', 'project_id', 'task_id', 'session_id'])
            invariant(e[key] === l[key], 'IPC_LOGICAL_MISMATCH');
        invariant(e.runtime_id === b.runtime_id && e.runtime_session_id === b.runtime_session_id && e.worker_instance_id === b.worker_instance_id && e.connection_id === c.id && e.profile_hash === b.profile_hash, 'IPC_BINDING_MISMATCH');
        const cap = this.#store.db.prepare('SELECT * FROM runtime_capabilities WHERE id=?').get(e.capability_id);
        invariant(cap && !cap.consumed && cap.runtime === b.runtime_id && cap.connection === c.id, 'CAPABILITY_INVALID');
        const lease = JSON.parse(cap.lease);
        invariant(clockFor(this.#store).valid(lease) && e.deadline > Date.now() && e.deadline <= lease.expires_at, 'IPC_EXPIRED');
        const m = metadata(this.#store);
        invariant(e.feature_epoch === m.feature_epoch && cap.feature_epoch === m.feature_epoch && e.policy_epoch === m.policy_epoch && cap.policy_epoch === m.policy_epoch, 'IPC_EPOCH_STALE');
        const scope = JSON.parse(cap.scope);
        this.#operationBinding(b, e.operation_id, null, false);
        invariant(scope.operation_id === e.operation_id && scope.resource_id === e.resource_id && scope.payload_hash === e.payload_hash, 'CAPABILITY_SCOPE');
        invariant(['PURE', 'READ_ONLY'].includes(scope.kind), 'BROKER_PROFILE_NOT_VERIFIED');
        return { b, cap, scope };
    }
    async consume(handle, frame) {
        invariant(this.#pending < 32, 'IPC_BACKPRESSURE');
        this.#pending++;
        let c;
        let consumed = null;
        try {
            c = this.#connection(handle);
            const e = snapshot(decodeFrame(frame, c.key));
            this.#check(c, e);
            const peer = snapshot(await this.#observe(signal => this.#provider.peer(c.channel, signal), e.deadline, c));
            validateProcess(peer);
            const { b, scope } = this.#check(c, e);
            invariant(sameProcess(peer, b.process), 'IPC_PEER_MISMATCH');
            this.#store.transaction(() => {
                this.#check(c, e);
                invariant(Number(this.#store.db.prepare('SELECT COUNT(*) n FROM runtime_requests').get().n) < LIMITS.requests, 'IPC_REPLAY_LEDGER_FULL');
                invariant(!this.#store.db.prepare('SELECT 1 FROM runtime_requests WHERE id=? OR operation=? OR (connection=? AND nonce=?)').get(e.request_id, e.operation_id, c.id, e.nonce), 'IPC_REPLAY');
                this.#store.db.prepare('INSERT INTO runtime_requests VALUES(?,?,?,?,?,?,?)').run(e.request_id, c.id, e.nonce, e.operation_id, b.runtime_id, 'AUTHORIZED', canonical(e));
                invariant(this.#store.db.prepare('UPDATE runtime_capabilities SET consumed=1 WHERE id=? AND consumed=0').run(e.capability_id).changes === 1, 'CAPABILITY_REPLAY');
                this.#event(b, 'ipc', 'REQUESTED', { request_id: e.request_id, payload_hash: e.payload_hash, resource_id: e.resource_id }, e.operation_id);
                this.#event(b, 'ipc', 'AUTHORIZED', { request_id: e.request_id, capability_id: e.capability_id, contract_only: true }, e.operation_id);
            });
            consumed = e;
            await this.#store.flush();
            // Revocation/expiry during the durable barrier must not authorize a subsequent start.
            const live = this.#active(c);
            const m = metadata(this.#store);
            invariant(live.revision === b.revision && e.feature_epoch === m.feature_epoch && e.policy_epoch === m.policy_epoch && e.deadline > Date.now() && clockFor(this.#store).valid(JSON.parse(this.#store.db.prepare('SELECT lease FROM runtime_capabilities WHERE id=?').get(e.capability_id).lease)), 'IPC_AUTHORIZATION_REVOKED');
            return snapshot({ operation_id: e.operation_id, request_id: e.request_id, runtime_id: b.runtime_id, kind: scope.kind, status: 'AUTHORIZED_CONTRACT_ONLY', execution: 'BLOCKED' });
        }
        catch (error) {
            if (c) {
                try {
                    const b = this.#get(c.runtime);
                    this.#store.transaction(() => {
                        if (consumed) {
                            this.#store.db.prepare("UPDATE runtime_requests SET state='INDETERMINATE' WHERE id=?").run(consumed.request_id);
                            this.#store.db.prepare("UPDATE runtime_resources SET state='UNKNOWN_QUARANTINED',revision=revision+1 WHERE operation=? AND state<>'RELEASED'").run(consumed.operation_id);
                        }
                        this.#event(b, 'ipc', consumed ? 'INDETERMINATE' : 'REJECTED', { reason: error?.code ?? 'IPC_INVALID', automatic_retry: false }, consumed?.operation_id ?? b.runtime_id);
                    });
                    await this.#store.flush();
                }
                catch { /* Failed audit never permits dispatch. */ }
            }
            throw error;
        }
        finally {
            this.#pending--;
        }
    }
    async disconnect(handle) {
        const c = this.#connection(handle);
        c.open = false;
        c.cancel.abort();
        c.key.fill(0);
        this.#connections.delete(handle);
        const b = this.#get(c.runtime);
        this.#store.transaction(() => {
            if (['ACTIVE', 'AUTHENTICATED'].includes(b.state))
                this.#set(b, 'UNKNOWN_QUARANTINED', 'IPC_DISCONNECTED');
            this.#store.db.prepare("UPDATE runtime_requests SET state='INDETERMINATE' WHERE runtime=? AND state='AUTHORIZED'").run(b.runtime_id);
            this.#store.db.prepare("UPDATE runtime_resources SET state='UNKNOWN_QUARANTINED',revision=revision+1 WHERE runtime=? AND state<>'RELEASED'").run(b.runtime_id);
            this.#event(b, 'ipc', 'INDETERMINATE', { automatic_retry: false, disconnect_is_not_exit: true });
        });
        await this.#store.flush();
    }
    async revoke(admin, runtime, reason) {
        this.#admin(admin);
        invariant(typeof reason === 'string' && reason.trim().length >= 8 && reason.length <= 1024, 'RUNTIME_REASON');
        const b = this.#get(runtime);
        // No await before revocation, including all already connected channels and capabilities.
        this.#revokeConnections(runtime);
        if (b.state === 'REVOKED')
            return;
        this.#store.transaction(() => {
            const revoking = this.#set(b, 'REVOKING', reason);
            this.#store.db.prepare('UPDATE runtime_capabilities SET consumed=1 WHERE runtime=?').run(runtime);
            this.#store.db.prepare("UPDATE runtime_requests SET state='INDETERMINATE' WHERE runtime=? AND state='AUTHORIZED'").run(runtime);
            this.#store.db.prepare("UPDATE runtime_resources SET state='UNKNOWN_QUARANTINED',revision=revision+1 WHERE runtime=? AND state<>'RELEASED'").run(runtime);
            this.#set(revoking, 'REVOKED', reason);
        });
        await this.#store.flush();
    }
    async revokeScope(admin, scope, reason) {
        this.#admin(admin);
        const pending = [];
        // Revoke all matching rows synchronously before the first await; bounded by the registry limit.
        for (const row of this.#store.db.prepare("SELECT id FROM runtime_bindings WHERE boot=? AND state<>'REVOKED' LIMIT 256").all(this.boot_id)) {
            const b = this.#get(row.id);
            if (Object.entries(scope).every(([k, v]) => b.logical[k] === v))
                pending.push(this.revoke(admin, row.id, reason));
        }
        await Promise.all(pending);
    }
    async reserve(admin, runtime, operation, resources) {
        this.#admin(admin);
        id(operation);
        const b = this.#get(runtime), rs = snapshot(resources);
        invariant(!this.#closed && b.host_boot_id === this.boot_id && b.state === 'ACTIVE' && rs.length > 0 && rs.length <= 8, 'RESOURCE_RESERVATION_STATE');
        this.#store.transaction(() => {
            invariant(Number(this.#store.db.prepare('SELECT COUNT(*) n FROM runtime_resources').get().n) + rs.length <= LIMITS.resources, 'RESOURCE_LIMIT');
            this.#operationBinding(b, operation, null, true);
            for (const r of rs) {
                keys(r, ['resource', 'kind']);
                invariant(['WRITER', 'WORKSPACE_LOCK', 'WORKER_QUOTA', 'PROCESS_SLOT', 'SANDBOX_RESERVATION'].includes(r.kind) && r.resource.startsWith(b.logical.project_id + ':') && r.resource.length <= 256, 'RESOURCE_SCOPE');
                this.#store.db.prepare('INSERT INTO runtime_resources VALUES(?,?,?,?,?,0)').run(r.resource, r.kind, runtime, operation, 'HELD');
            }
            this.#event(b, 'sandbox', 'AUTHORIZED', { operation_id: operation, resources: rs, execution_not_started: true }, operation);
        });
        await this.#store.flush();
    }
    async observeExit(admin, runtime, operation) {
        this.#admin(admin);
        id(operation);
        invariant(!this.#closed, 'RUNTIME_CLOSED');
        const b = this.#get(runtime);
        this.#operationBinding(b, operation, null, false);
        const o = snapshot(await this.#observe(signal => this.#provider.exit(b, signal), Date.now() + 2000));
        this.#validateExit(o, b);
        invariant(!this.#closed && this.#get(runtime).revision === b.revision, 'RUNTIME_REVISION_CONFLICT');
        const state = o.tree_empty && o.root_exited && o.membership_complete && !o.unknown_members && o.members.every(m => m.exited) ? 'PROCESS_TREE_EXITED' : o.root_exited ? 'PROCESS_EXITED' : o.termination_requested_at ? 'TERMINATION_REQUESTED' : 'EXIT_UNVERIFIED';
        const body = { proof_id: uid(), operation_id: operation, runtime_id: runtime, worker_instance_id: b.worker_instance_id,
            runtime_session_id: b.runtime_session_id, host_boot_id: b.host_boot_id, generation: b.generation, profile_hash: b.profile_hash,
            observation: o, state, production_release_authority: false };
        const digest = sha256(canonical(body));
        const abnormal = o.members.some(m => m.exited && m.exit_code !== 0);
        if (o.root_exited || abnormal)
            this.#revokeConnections(runtime);
        this.#store.transaction(() => {
            this.#operationBinding(b, operation, null, false);
            this.#store.db.prepare('INSERT INTO runtime_exit_proofs VALUES(?,?,?,?,?)').run(body.proof_id, runtime, operation, canonical(body), digest);
            if (['ACTIVE', 'AUTHENTICATED'].includes(b.state) && (o.root_exited || abnormal)) {
                this.#set(b, abnormal ? 'ABNORMAL_EXIT' : 'REVOKED', 'EXIT_OBSERVED_NOT_RELEASE_AUTHORIZATION');
                this.#store.db.prepare('UPDATE runtime_capabilities SET consumed=1 WHERE runtime=?').run(runtime);
                this.#store.db.prepare("UPDATE runtime_requests SET state='INDETERMINATE' WHERE runtime=? AND state='AUTHORIZED'").run(runtime);
                this.#store.db.prepare("UPDATE runtime_resources SET state='UNKNOWN_QUARANTINED',revision=revision+1 WHERE runtime=? AND state<>'RELEASED'").run(runtime);
            }
            this.#event(b, 'process', 'OBSERVED', { proof_id: body.proof_id, evidence_hash: digest, state, production_release_authority: false }, operation);
        });
        await this.#store.flush();
        return snapshot({ ...body, evidence_hash: digest });
    }
    #validateExit(o, b) {
        keys(o, ['process', 'parent', 'container_id', 'members', 'termination_requested_at', 'root_exited', 'tree_empty', 'membership_complete', 'unknown_members', 'handles_closed', 'outputs_closed', 'observed_at', 'source']);
        validateProcess(o.process);
        validateProcess(o.parent);
        invariant(sameProcess(o.process, b.process) && sameProcess(o.parent, b.parent) && o.source === this.#provider.assurance, 'EXIT_IDENTITY_MISMATCH');
        id(o.container_id);
        invariant(Array.isArray(o.members) && o.members.length > 0 && o.members.length <= 16 && o.members.some(m => sameProcess(m.process, b.process)), 'EXIT_MEMBERS');
        const seen = new Set();
        for (const m of o.members) {
            keys(m, ['process', 'exit_code', 'exited']);
            validateProcess(m.process);
            const k = canonical(m.process);
            invariant(!seen.has(k), 'EXIT_MEMBERS');
            seen.add(k);
            invariant(typeof m.exited === 'boolean' && (m.exit_code === null || Number.isSafeInteger(m.exit_code)) && (!m.exited || m.exit_code !== null), 'EXIT_MEMBERS');
        }
        for (const k of ['root_exited', 'tree_empty', 'membership_complete', 'unknown_members', 'handles_closed', 'outputs_closed'])
            invariant(typeof o[k] === 'boolean', 'EXIT_OBSERVATION');
        invariant(o.root_exited === o.members.find(m => sameProcess(m.process, b.process)).exited && (!o.tree_empty || o.members.every(m => m.exited)), 'EXIT_CONTRADICTORY_OBSERVATION');
        invariant(Number.isFinite(Date.parse(o.observed_at)) && (o.termination_requested_at === null || Number.isFinite(Date.parse(o.termination_requested_at))), 'EXIT_OBSERVATION');
    }
    async release(admin, runtime, operation, proofId) {
        this.#admin(admin);
        id(operation);
        id(proofId);
        const b = this.#get(runtime);
        const row = this.#store.db.prepare('SELECT * FROM runtime_exit_proofs WHERE id=? AND runtime=? AND operation=?').get(proofId, runtime, operation);
        invariant(row && sha256(row.body) === row.hash, 'EXIT_PROOF_REQUIRED');
        // Neither a test double nor a primitive-only helper can mint production resource authority.
        this.#event(b, 'reconciliation', 'REJECTED', { reason: 'FULL_OS_PROFILE_NOT_VERIFIED', proof_id: proofId }, operation);
        await this.#store.flush();
        invariant(false, 'FULL_OS_PROFILE_NOT_VERIFIED');
    }
    async recover() {
        let after = '';
        while (true) {
            const rows = this.#store.db.prepare('SELECT id FROM runtime_bindings WHERE id>? AND boot<>? ORDER BY id LIMIT 32').all(after, this.boot_id);
            if (!rows.length)
                break;
            this.#store.transaction(() => {
                for (const row of rows) {
                    const b = this.#get(row.id);
                    if (!['REVOKED', 'ABNORMAL_EXIT', 'UNKNOWN_QUARANTINED'].includes(b.state))
                        this.#set(b, 'UNKNOWN_QUARANTINED', 'HOST_RESTART');
                    this.#store.db.prepare('UPDATE runtime_capabilities SET consumed=1 WHERE runtime=?').run(b.runtime_id);
                    this.#store.db.prepare("UPDATE runtime_requests SET state='INDETERMINATE' WHERE runtime=? AND state='AUTHORIZED'").run(b.runtime_id);
                    this.#store.db.prepare("UPDATE runtime_resources SET state='UNKNOWN_QUARANTINED',revision=revision+1 WHERE runtime=? AND state<>'RELEASED'").run(b.runtime_id);
                    this.#event(b, 'reconciliation', 'INDETERMINATE', { identity: 'OLD_BOOT_REVOKED', process: 'UNKNOWN', sandbox: 'UNKNOWN', workspace: 'UNKNOWN_QUARANTINED', automatic_retry: false });
                    after = row.id;
                }
            });
            await this.#store.flush();
        }
    }
    async close() {
        this.#closed = true;
        this.#shutdown.abort();
        for (const c of this.#connections.values()) {
            c.open = false;
            c.cancel.abort();
            c.key.fill(0);
        }
        this.#connections.clear();
        // Persistent reservations are intentionally retained for recovery, including orderly Host shutdown.
    }
}
