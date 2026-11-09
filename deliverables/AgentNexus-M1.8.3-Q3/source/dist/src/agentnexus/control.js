import { auditEvent, boundedJson, canonical, invariant, now, uid } from './types.js';
import { performance } from 'node:perf_hooks';
export const ADMIN = Object.freeze({ agent_id: 'host-admin', project_id: 'host', task_id: 'administration', session_id: 'host-control' });
class LeaseClock {
    boot_id = uid();
    #lastWall = Date.now();
    issue(lifetime) {
        const wall = Date.now();
        invariant(wall >= this.#lastWall - 100, 'CLOCK_INVALID');
        this.#lastWall = Math.max(wall, this.#lastWall);
        return { boot_id: this.boot_id, issued_wall: wall, expires_at: wall + lifetime, deadline_mono: performance.now() + lifetime };
    }
    valid(row) {
        const wall = Date.now(), rollback = wall < this.#lastWall - 100;
        this.#lastWall = Math.max(wall, this.#lastWall);
        return !rollback && row.boot_id === this.boot_id && wall >= row.issued_wall && wall < row.expires_at && performance.now() < row.deadline_mono;
    }
}
const clocks = new WeakMap();
export function clockFor(store) {
    let clock = clocks.get(store);
    if (!clock) {
        clock = new LeaseClock();
        clocks.set(store, clock);
    }
    return clock;
}
export function initializeControl(store) {
    store.db.exec(`
    CREATE TABLE IF NOT EXISTS control_meta(singleton INTEGER PRIMARY KEY CHECK(singleton=1), feature_revision INTEGER NOT NULL, feature_epoch INTEGER NOT NULL, policy_revision INTEGER NOT NULL, policy_epoch INTEGER NOT NULL);
    INSERT OR IGNORE INTO control_meta VALUES(1,0,0,0,0);
    CREATE TABLE IF NOT EXISTS control_features(feature_id TEXT NOT NULL,scope_key TEXT NOT NULL,value TEXT NOT NULL CHECK(value IN ('ON','OFF','INHERIT')),PRIMARY KEY(feature_id,scope_key));
    CREATE TABLE IF NOT EXISTS control_modes(scope_key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS control_challenges(id TEXT PRIMARY KEY,kind TEXT NOT NULL,payload TEXT NOT NULL,hash TEXT NOT NULL,stage INTEGER NOT NULL,expires_at INTEGER NOT NULL,revision INTEGER NOT NULL,consumed INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS control_approvals(id TEXT PRIMARY KEY,intent_hash TEXT NOT NULL,subject TEXT NOT NULL,project_id TEXT NOT NULL,expires_at INTEGER NOT NULL,feature_epoch INTEGER NOT NULL,policy_epoch INTEGER NOT NULL,consumed INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS control_operations(operation_id TEXT PRIMARY KEY,request_key TEXT UNIQUE NOT NULL,intent_hash TEXT NOT NULL,subject TEXT NOT NULL,state TEXT NOT NULL,permit_id TEXT UNIQUE,workspace TEXT,detail TEXT NOT NULL DEFAULT '{}');
    CREATE TABLE IF NOT EXISTS control_permits(id TEXT PRIMARY KEY,operation_id TEXT UNIQUE NOT NULL,intent_hash TEXT NOT NULL,subject TEXT NOT NULL,expires_at INTEGER NOT NULL,feature_epoch INTEGER NOT NULL,policy_epoch INTEGER NOT NULL,consumed INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS control_writers(resource TEXT PRIMARY KEY,operation_id TEXT UNIQUE NOT NULL,fence INTEGER NOT NULL);
  `);
    // Explicit local M1 schema upgrade. Historical grants have empty boot identity and cannot revive.
    for (const table of ['control_challenges', 'control_approvals', 'control_permits']) {
        const columns = new Set(store.db.prepare(`PRAGMA table_info(${table})`).all().map(x => x.name));
        for (const [name, sql] of [['boot_id', "TEXT NOT NULL DEFAULT ''"], ['deadline_mono', 'REAL NOT NULL DEFAULT 0'], ['issued_wall', 'INTEGER NOT NULL DEFAULT 0']])
            if (!columns.has(name))
                store.db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${sql}`);
    }
    const operationColumns = new Set(store.db.prepare('PRAGMA table_info(control_operations)').all().map(x => x.name));
    for (const [name, sql] of [['executor_state', "TEXT NOT NULL DEFAULT 'UNKNOWN'"], ['reconcile_revision', 'INTEGER NOT NULL DEFAULT 0']])
        if (!operationColumns.has(name))
            store.db.exec(`ALTER TABLE control_operations ADD COLUMN ${name} ${sql}`);
    store.db.exec(`CREATE TABLE IF NOT EXISTS control_reconciliations(
    id TEXT PRIMARY KEY, request_id TEXT UNIQUE NOT NULL, operation_id TEXT NOT NULL REFERENCES control_operations(operation_id),
    revision INTEGER NOT NULL, intent_hash TEXT NOT NULL, action TEXT NOT NULL, outcome TEXT NOT NULL,
    adjudicator TEXT NOT NULL, observed_at TEXT NOT NULL, reason TEXT NOT NULL, evidence TEXT NOT NULL,
    writer_released INTEGER NOT NULL, audit_event_id TEXT NOT NULL, UNIQUE(operation_id,revision));
    CREATE TRIGGER IF NOT EXISTS control_reconciliations_no_update BEFORE UPDATE ON control_reconciliations BEGIN SELECT RAISE(ABORT,'append only'); END;
    CREATE TRIGGER IF NOT EXISTS control_reconciliations_no_delete BEFORE DELETE ON control_reconciliations BEGIN SELECT RAISE(ABORT,'append only'); END;`);
    clockFor(store);
}
export function metadata(store) {
    return store.db.prepare('SELECT * FROM control_meta WHERE singleton=1').get();
}
export function scopeKey(scope) {
    invariant(scope !== null && typeof scope === 'object', 'INVALID_SCOPE');
    invariant(Object.keys(scope).every(x => ['project_id', 'agent_id', 'task_id'].includes(x)), 'INVALID_SCOPE');
    invariant(!scope.agent_id || !!scope.project_id, 'INVALID_SCOPE');
    invariant(!scope.task_id || !!scope.agent_id, 'INVALID_SCOPE');
    for (const value of Object.values(scope))
        invariant(typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(value), 'INVALID_SCOPE');
    return canonical(scope);
}
export function scopeLevel(scope) {
    scopeKey(scope);
    return scope.task_id ? 'T' : scope.agent_id ? 'A' : scope.project_id ? 'P' : 'G';
}
export function ancestors(scope) {
    scopeKey(scope);
    const out = [{}];
    if (scope.project_id)
        out.push({ project_id: scope.project_id });
    if (scope.agent_id)
        out.push({ project_id: scope.project_id, agent_id: scope.agent_id });
    if (scope.task_id)
        out.push({ ...scope });
    return out;
}
export function contains(parent, child) {
    return Object.entries(parent).every(([k, v]) => child[k] === v);
}
export function adminEvent(store, type, phase, parameters, detail = null) {
    return store.audit(auditEvent(ADMIN, { operation_type: type, phase, parameters, detail, cwd: store.root }));
}
export function newChallenge(store, kind, payload, hash, revision, expiresAt = Date.now() + 300000) {
    const id = uid();
    const lease = clockFor(store).issue(Math.min(300000, expiresAt - Date.now()));
    store.db.prepare('INSERT INTO control_challenges(id,kind,payload,hash,stage,expires_at,revision,boot_id,deadline_mono,issued_wall) VALUES(?,?,?,?,0,?,?,?,?,?)')
        .run(id, kind, boundedJson(payload), hash, lease.expires_at, revision, lease.boot_id, lease.deadline_mono, lease.issued_wall);
    return id;
}
export function getChallenge(store, id, kind) {
    const row = store.db.prepare('SELECT * FROM control_challenges WHERE id=? AND kind=?').get(id, kind);
    invariant(row && !row.consumed, 'CHALLENGE_REPLAY');
    invariant(clockFor(store).valid(row), 'CHALLENGE_EXPIRED');
    return row;
}
export function acquireMutation(gate) {
    invariant(!gate.busy, 'CONFIG_BUSY');
    gate.busy = true;
    return () => { gate.busy = false; };
}
export function markChallengeConsumed(store, id) {
    const r = store.db.prepare('UPDATE control_challenges SET consumed=1 WHERE id=? AND consumed=0').run(id);
    invariant(r.changes === 1, 'CHALLENGE_REPLAY');
}
