import { DatabaseSync } from 'node:sqlite';
import { existsSync, lstatSync, mkdirSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { canonical, invariant, sha256 } from '../types.js';
const LIMIT = 100_000_000;
/** A single durable owner. All four scope holds and the request record commit in
 * one SQLite transaction. Host/UI projections never authorize spending. */
export class ServiceStore {
    #db;
    synthetic;
    constructor(root, synthetic) {
        this.synthetic = synthetic;
        mkdirSync(root, { recursive: true });
        invariant(!lstatSync(root).isSymbolicLink() && realpathSync.native(root).toLowerCase() === resolve(root).toLowerCase(), 'SERVICE_UNSAFE_STORE');
        const file = join(root, 'ledger.sqlite');
        // Production must be provisioned once from the inherited zero-use budget
        // under the approved deployment. Loss of its file never creates fresh quota.
        invariant(synthetic || existsSync(file), 'SERVICE_LEDGER_PROVISIONING_REQUIRED');
        if (existsSync(file))
            invariant(!lstatSync(file).isSymbolicLink() && lstatSync(file).nlink === 1, 'SERVICE_UNSAFE_STORE');
        this.#db = new DatabaseSync(file, { timeout: 5000 });
        this.#db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA trusted_schema=OFF;');
        this.#db.exec(`CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY,v TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS budgets(scope TEXT NOT NULL,id TEXT NOT NULL,lim INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0,held INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(scope,id)) STRICT;
      CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY,operation_id TEXT UNIQUE NOT NULL,nonce TEXT UNIQUE NOT NULL,subject TEXT NOT NULL,binding TEXT NOT NULL,body_hash TEXT NOT NULL,state TEXT NOT NULL,input_limit INTEGER NOT NULL,output_limit INTEGER NOT NULL,held INTEGER NOT NULL,input_tokens INTEGER NOT NULL DEFAULT 0,output_tokens INTEGER NOT NULL DEFAULT 0,cost_micros INTEGER NOT NULL DEFAULT 0,key_handle TEXT,created_at TEXT NOT NULL,reason TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS labels(id TEXT PRIMARY KEY,body TEXT NOT NULL,deleted INTEGER NOT NULL DEFAULT 0) STRICT;
      CREATE TABLE IF NOT EXISTS grants(id TEXT PRIMARY KEY,request_hash TEXT NOT NULL,subject_hash TEXT NOT NULL,body TEXT NOT NULL,expires INTEGER NOT NULL,epoch INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0) STRICT;
      CREATE TABLE IF NOT EXISTS prepared(nonce TEXT PRIMARY KEY,binding_hash TEXT NOT NULL,expires INTEGER NOT NULL,consumed INTEGER NOT NULL DEFAULT 0) STRICT;
      CREATE TABLE IF NOT EXISTS management_requests(id TEXT PRIMARY KEY,method TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS daily_grants(id TEXT PRIMARY KEY,request_id TEXT UNIQUE NOT NULL,operation_id TEXT UNIQUE NOT NULL,nonce TEXT UNIQUE NOT NULL,body TEXT NOT NULL,hash TEXT NOT NULL,runtime_identity TEXT NOT NULL,channel_binding TEXT NOT NULL,service_instance TEXT NOT NULL,expires INTEGER NOT NULL,epoch INTEGER NOT NULL,state TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS audit(seq INTEGER PRIMARY KEY,at TEXT NOT NULL,code TEXT NOT NULL,body TEXT NOT NULL,previous_hash TEXT NOT NULL,hash TEXT UNIQUE NOT NULL) STRICT;`);
        const owner = this.#db.prepare("SELECT v FROM meta WHERE k='owner'").get();
        if (!owner) {
            invariant(synthetic, 'SERVICE_LEDGER_PROVISIONING_REQUIRED');
            this.#db.prepare('INSERT INTO meta VALUES (?,?)').run('owner', 'm181-deepseek-100m');
            this.#db.prepare('INSERT INTO meta VALUES (?,?)').run('assurance', 'SIMULATED');
            this.#db.prepare('INSERT INTO budgets(scope,id,lim) VALUES (?,?,?)').run('GLOBAL', 'm181-deepseek', LIMIT);
        }
        invariant(this.#db.prepare("SELECT v FROM meta WHERE k='owner'").get()?.v === 'm181-deepseek-100m' &&
            this.#db.prepare("SELECT v FROM meta WHERE k='assurance'").get()?.v === (synthetic ? 'SIMULATED' : 'REAL') &&
            this.#db.prepare("SELECT lim FROM budgets WHERE scope='GLOBAL' AND id='m181-deepseek'").get()?.lim === LIMIT &&
            this.#db.prepare("SELECT count(*) n FROM budgets WHERE scope='GLOBAL'").get()?.n === 1, 'SERVICE_LEDGER_IDENTITY');
        const global = this.#db.prepare("SELECT used,held FROM budgets WHERE scope='GLOBAL' AND id='m181-deepseek'").get();
        invariant([global.used, global.held, global.used + global.held].every(n => Number.isSafeInteger(n) && n >= 0), 'SERVICE_LEDGER_IDENTITY');
        invariant(this.#db.prepare('PRAGMA quick_check').get().quick_check === 'ok', 'SERVICE_STORE_CORRUPT');
        this.transaction(() => {
            // No outstanding request capability survives service/store recovery.
            this.#db.prepare("UPDATE daily_grants SET state='REVOKED' WHERE state='ISSUED'").run();
            for (const row of this.#db.prepare("SELECT id FROM requests WHERE state IN ('RESERVED','SENT')").all()) {
                this.#db.prepare("UPDATE requests SET state='UNKNOWN',reason='SERVICE_RESTART_NO_RETRY' WHERE id=?").run(row.id);
                this.audit('REQUEST_RECOVERED_UNKNOWN', { request_id: row.id, automatic_retry: false, released: false });
            }
        });
    }
    transaction(action) {
        this.#db.exec('BEGIN IMMEDIATE');
        try {
            const result = action();
            this.#db.exec('COMMIT');
            return result;
        }
        catch (e) {
            this.#db.exec('ROLLBACK');
            throw e;
        }
    }
    audit(code, body) {
        invariant(this.#db.prepare('SELECT count(*) n FROM audit').get().n < 100000, 'SERVICE_AUDIT_CAPACITY');
        const previous = this.#db.prepare('SELECT hash FROM audit ORDER BY seq DESC LIMIT 1').get()?.hash ?? '0'.repeat(64);
        const at = new Date().toISOString(), serialized = canonical(body);
        const hash = sha256(canonical({ at, code, body, previous }));
        this.#db.prepare('INSERT INTO audit(at,code,body,previous_hash,hash) VALUES (?,?,?,?,?)').run(at, code, serialized, previous, hash);
    }
    auditRows() { return this.#db.prepare('SELECT * FROM audit ORDER BY seq').all(); }
    claimManagement(id, method) {
        this.transaction(() => {
            invariant(!this.#db.prepare('SELECT 1 FROM management_requests WHERE id=?').get(id), 'SERVICE_MANAGEMENT_REPLAY');
            invariant(this.#db.prepare('SELECT count(*) n FROM management_requests').get().n < 50000, 'SERVICE_MANAGEMENT_CAPACITY');
            this.#db.prepare('INSERT INTO management_requests VALUES (?,?)').run(id, method);
            this.audit('MANAGEMENT_REQUEST_CLAIMED', { request_id: id, method });
        });
    }
    label(id) { const r = this.#db.prepare('SELECT body,deleted FROM labels WHERE id=?').get(id); return r ? { ...JSON.parse(r.body), deleted: r.deleted === 1 } : null; }
    labelPut(id, value, deleted = false) {
        this.#db.prepare('INSERT INTO labels VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body,deleted=excluded.deleted').run(id, canonical(value), Number(deleted));
    }
    grantPut(hash, subjectHash, body, expires, epoch) {
        const id = randomUUID();
        this.#db.prepare('INSERT INTO grants(id,request_hash,subject_hash,body,expires,epoch) VALUES (?,?,?,?,?,?)').run(id, hash, subjectHash, canonical(body), expires, epoch);
        return id;
    }
    grant(id) { const r = this.#db.prepare('SELECT * FROM grants WHERE id=?').get(id); return r ? { ...r, body: JSON.parse(r.body) } : null; }
    findGrant(requestHash, subjectHash, epoch) {
        const row = this.#db.prepare('SELECT id FROM grants WHERE request_hash=? AND subject_hash=? AND epoch=? AND revoked=0 AND expires>? ORDER BY expires DESC LIMIT 1').get(requestHash, subjectHash, epoch, Date.now());
        return row ? this.grant(row.id) : null;
    }
    grantRevoke(id) { this.#db.prepare('UPDATE grants SET revoked=1 WHERE id=?').run(id); this.audit('EGRESS_GRANT_REVOKED', { grant_id: id }); }
    dailyGrantPut(grant) {
        this.transaction(() => {
            invariant(this.#db.prepare('SELECT count(*) n FROM daily_grants').get().n < 8192, 'DAILY_GRANT_CAPACITY');
            invariant(!this.#db.prepare('SELECT 1 FROM daily_grants WHERE request_id=? OR operation_id=? OR nonce=?').get(grant.binding.request_id, grant.binding.operation_id, grant.binding.nonce), 'DAILY_GRANT_REPLAY');
            this.#db.prepare("INSERT INTO daily_grants VALUES (?,?,?,?,?,?,?,?,?,?,?,'ISSUED')").run(grant.grant_id, grant.binding.request_id, grant.binding.operation_id, grant.binding.nonce, canonical(grant), sha256(canonical(grant)), grant.runtime_identity, grant.channel_binding, grant.service_instance, grant.binding.deadline, grant.binding.policy_epoch);
            this.audit('DAILY_GRANT_ISSUED', { grant_id: grant.grant_id, request_id: grant.binding.request_id, runtime_identity: grant.runtime_identity, input_hash: grant.input_hash, owner: 'CREDENTIAL_SERVICE' });
        });
    }
    dailyGrant(id) { return this.#db.prepare('SELECT * FROM daily_grants WHERE id=?').get(id); }
    dailyGrantForRequest(requestId) { return this.#db.prepare('SELECT * FROM daily_grants WHERE request_id=?').get(requestId); }
    dailyRevokeRequest(requestId, runtimeIdentity) {
        this.transaction(() => {
            invariant(this.#db.prepare("UPDATE daily_grants SET state='REVOKED' WHERE request_id=? AND runtime_identity=? AND state='ISSUED'").run(requestId, runtimeIdentity).changes === 1, 'DAILY_REQUEST_NOT_CANCELLABLE');
            this.audit('DAILY_UNSENT_GRANT_CANCELLED', { request_id: requestId, runtime_identity: runtimeIdentity, automatic_retry: false });
        });
    }
    dailyRevokeRuntime(identity) {
        this.transaction(() => {
            const changed = this.#db.prepare("UPDATE daily_grants SET state='REVOKED' WHERE runtime_identity=? AND state='ISSUED'").run(identity).changes;
            if (changed)
                this.audit('DAILY_RUNTIME_REVOKED', { runtime_identity: identity, revoked_grants: Number(changed) });
        });
    }
    prepared(binding) {
        invariant(this.#db.prepare('SELECT count(*) n FROM prepared').get().n < 8192, 'SERVICE_PREPARE_CAPACITY');
        this.#db.prepare('INSERT INTO prepared(nonce,binding_hash,expires) VALUES (?,?,?)').run(binding.nonce, sha256(canonical(binding)), binding.deadline);
    }
    scopes(s) { return [['GLOBAL', 'm181-deepseek'], ['PROJECT', s.project_id], ['AGENT', s.project_id + ':' + s.agent_id], ['TASK', s.project_id + ':' + s.task_id]]; }
    configure(s, input) {
        this.transaction(() => {
            const scopes = this.scopes(s).filter(([scope]) => scope !== 'GLOBAL');
            for (const [scope, id] of scopes) {
                const limit = input[scope === 'AGENT' ? 'agent_tokens' : scope === 'TASK' ? 'task_tokens' : 'project_tokens'];
                invariant(Number.isSafeInteger(limit) && limit > 0 && limit <= LIMIT, 'SERVICE_BUDGET_LIMIT');
                const old = this.#db.prepare('SELECT * FROM budgets WHERE scope=? AND id=?').get(scope, id);
                invariant(!old || old.used + old.held <= limit, 'SERVICE_BUDGET_BELOW_COMMITTED');
                this.#db.prepare('INSERT INTO budgets(scope,id,lim) VALUES (?,?,?) ON CONFLICT(scope,id) DO UPDATE SET lim=excluded.lim').run(scope, id, limit);
            }
            this.audit('SCOPE_BUDGET_CONFIGURED', { agent_id: s.agent_id, task_id: s.task_id, project_id: s.project_id, ...input, counter_reset: false });
        });
    }
    reserve(binding, s, input, output, daily) {
        invariant(Number.isSafeInteger(input) && input > 0 && Number.isSafeInteger(output) && output > 0 && input + output <= LIMIT, 'SERVICE_TOKEN_LIMIT');
        this.transaction(() => {
            const attached = this.#db.prepare('SELECT * FROM daily_grants WHERE request_id=?').get(binding.request_id);
            invariant(!attached || daily, 'DAILY_GRANT_REQUIRED');
            if (daily) {
                const grant = daily.grant, row = this.dailyGrant(grant.grant_id);
                invariant(row && row.state === 'ISSUED' && row.expires > Date.now() && row.epoch === binding.policy_epoch &&
                    row.hash === daily.grant_hash && row.hash === sha256(canonical(grant)) && row.service_instance === daily.service_instance &&
                    row.runtime_identity === daily.runtime_identity && row.channel_binding === daily.channel_binding &&
                    canonical(grant.binding) === canonical(binding) && grant.subject_hash === sha256(canonical(s)) &&
                    grant.token_budget.input_limit === input && grant.token_budget.output_limit === output && grant.token_budget.total === input + output, 'DAILY_GRANT_INVALID_OR_CONSUMED');
                invariant(this.#db.prepare("UPDATE daily_grants SET state='CONSUMED' WHERE id=? AND state='ISSUED'").run(grant.grant_id).changes === 1, 'DAILY_GRANT_REPLAY');
                this.audit('DAILY_GRANT_CONSUMED', { grant_id: grant.grant_id, request_id: binding.request_id, runtime_identity: daily.runtime_identity });
            }
            invariant(!this.#db.prepare('SELECT 1 FROM requests WHERE id=? OR operation_id=? OR nonce=?').get(binding.request_id, binding.operation_id, binding.nonce), 'SERVICE_REQUEST_REPLAY');
            const prepared = this.#db.prepare('SELECT * FROM prepared WHERE nonce=?').get(binding.nonce);
            invariant(prepared && prepared.consumed === 0 && prepared.expires > Date.now() && prepared.binding_hash === sha256(canonical(binding)), 'SERVICE_PREPARED_BINDING_REQUIRED');
            this.#db.prepare('UPDATE prepared SET consumed=1 WHERE nonce=?').run(binding.nonce);
            invariant(!(this.#db.prepare("SELECT 1 FROM requests WHERE state='UNKNOWN'").get()), 'SERVICE_USAGE_RECONCILIATION_REQUIRED');
            invariant(this.#db.prepare('SELECT count(*) n FROM requests').get().n < 4096, 'SERVICE_REQUEST_CAPACITY');
            const total = input + output;
            for (const [scope, id] of this.scopes(s)) {
                if (scope !== 'GLOBAL')
                    this.#db.prepare('INSERT OR IGNORE INTO budgets(scope,id,lim) VALUES (?,?,?)').run(scope, id, scope === 'AGENT' || scope === 'TASK' ? 1_000_000 : LIMIT);
                const b = this.#db.prepare('SELECT * FROM budgets WHERE scope=? AND id=?').get(scope, id);
                invariant(b && b.used + b.held + total <= b.lim, 'SERVICE_TOKEN_BUDGET_EXHAUSTED');
            }
            for (const [scope, id] of this.scopes(s))
                this.#db.prepare('UPDATE budgets SET held=held+? WHERE scope=? AND id=?').run(total, scope, id);
            this.#db.prepare("INSERT INTO requests(id,operation_id,nonce,subject,binding,body_hash,state,input_limit,output_limit,held,created_at,reason) VALUES (?,?,?,?,?,?,'RESERVED',?,?,?,?,'RESERVED')")
                .run(binding.request_id, binding.operation_id, binding.nonce, canonical(s), canonical(binding), binding.request_body_hash, input, output, total, new Date().toISOString());
            this.audit('TOKENS_RESERVED', { binding, held_tokens: total, owner: 'CREDENTIAL_SERVICE' });
        });
    }
    request(id) { return this.#db.prepare('SELECT * FROM requests WHERE id=?').get(id); }
    sent(id, handle) {
        this.transaction(() => {
            const row = this.request(id);
            invariant(row?.state === 'RESERVED', 'SERVICE_REQUEST_STATE');
            const binding = { ...JSON.parse(row.binding), credential_handle_id: handle };
            this.#db.prepare('UPDATE requests SET binding=? WHERE id=?').run(canonical(binding), id);
            invariant(this.#db.prepare("UPDATE requests SET state='SENT',key_handle=?,reason='SEND_INTENT' WHERE id=? AND state='RESERVED'").run(handle, id).changes === 1, 'SERVICE_REQUEST_STATE');
            this.audit('PROVIDER_SEND_INTENT', { request_id: id, key_handle_id: handle, automatic_retry: false });
        });
    }
    notSent(id) {
        this.transaction(() => {
            const r = this.request(id);
            invariant(r?.state === 'RESERVED', 'SERVICE_ALREADY_SENT');
            for (const [scope, sid] of this.scopes(JSON.parse(r.subject)))
                this.#db.prepare('UPDATE budgets SET held=held-? WHERE scope=? AND id=?').run(r.held, scope, sid);
            this.#db.prepare("UPDATE requests SET state='NOT_SENT',held=0,reason='PROVEN_NOT_SENT' WHERE id=?").run(id);
            this.audit('REQUEST_NOT_SENT', { request_id: id });
        });
    }
    settle(id, meter, cost, complete) {
        return this.transaction(() => {
            const r = this.request(id);
            invariant(r && ['SENT', 'RESERVED'].includes(r.state), 'SERVICE_REQUEST_STATE');
            const input = meter?.input_tokens ?? 0, output = meter?.output_tokens ?? 0;
            invariant([input, output, cost, input + output].every(n => Number.isSafeInteger(n) && n >= 0), 'SERVICE_USAGE_INVALID');
            const known = complete && !!meter && input <= r.input_limit && output <= r.output_limit;
            for (const [scope, sid] of this.scopes(JSON.parse(r.subject)))
                this.#db.prepare('UPDATE budgets SET used=used+?,held=held-? WHERE scope=? AND id=?').run(input + output, known ? r.held : 0, scope, sid);
            this.#db.prepare('UPDATE requests SET state=?,held=?,input_tokens=?,output_tokens=?,cost_micros=?,reason=? WHERE id=?')
                .run(known ? 'SETTLED' : 'UNKNOWN', known ? 0 : r.held, input, output, cost, known ? 'PROVIDER_USAGE' : 'USAGE_UNKNOWN_NO_RETRY', id);
            this.audit(known ? 'USAGE_SETTLED' : 'USAGE_UNKNOWN', { request_id: id, input_tokens: input, output_tokens: output, cost_estimate_micros: cost, actual_invoice_micros: null, capacity_released: known });
            return known;
        });
    }
    usage() {
        const r = this.#db.prepare("SELECT * FROM budgets WHERE scope='GLOBAL' AND id='m181-deepseek'").get();
        const rows = this.#db.prepare('SELECT * FROM requests ORDER BY created_at').all();
        const sum = (entries) => ({ input_tokens: entries.reduce((n, x) => n + x.input_tokens, 0), output_tokens: entries.reduce((n, x) => n + x.output_tokens, 0), cached_tokens: null, reasoning_tokens: null, requests: entries.filter(x => x.state !== 'NOT_SENT' && x.state !== 'RESERVED').length, failed_requests: entries.filter(x => x.state === 'UNKNOWN' || x.state === 'NOT_SENT').length, estimated_cost_micros: entries.reduce((n, x) => n + x.cost_micros, 0), actual_cost_micros: null });
        const zero = sum([]), total = sum(rows);
        const group = (field) => [...new Set(rows.map(x => ['agent_id', 'task_id'].includes(field) ? JSON.parse(x.subject)[field] : JSON.parse(x.binding)[field]))].map(id => ({ id, ...sum(rows.filter(x => (['agent_id', 'task_id'].includes(field) ? JSON.parse(x.subject)[field] : JSON.parse(x.binding)[field]) === id)) }));
        return { global: { id: 'm181-deepseek', owner: 'CREDENTIAL_SERVICE', assurance: this.synthetic ? 'SIMULATED' : 'REAL', limit: LIMIT, used: r.used, held: r.held, remaining_tokens: Math.max(0, LIMIT - r.used - r.held), unknown: rows.filter(x => x.state === 'UNKNOWN').length, requests: total.requests, state: rows.some(x => x.state === 'UNKNOWN') ? 'BLOCKED' : 'OPEN' },
            real: this.synthetic ? zero : total, simulated: this.synthetic ? total : zero,
            simulated_budget: { limits: { tokens: LIMIT }, used: { tokens: this.synthetic ? r.used : 0 }, held: { tokens: this.synthetic ? r.held : 0 } },
            by_provider: group('provider_id'), by_model: group('model_id'), by_agent: group('agent_id'), by_task: group('task_id'),
            records: rows.map(x => ({ request_id: x.id, assurance: this.synthetic ? 'SIMULATED' : 'REAL', state: x.state, ...JSON.parse(x.binding), tokens: x.input_tokens + x.output_tokens, held_tokens: x.held, cost_micros: x.cost_micros })) };
    }
    close() { this.#db.close(); }
}
