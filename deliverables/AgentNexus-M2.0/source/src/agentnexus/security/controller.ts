import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, lstatSync, existsSync } from 'node:fs';
import { join, resolve, parse } from 'node:path';
import { randomUUID } from 'node:crypto';
import { canonical, invariant, sha256 } from '../types.ts';
import { CLASSIFICATIONS, defaultProfile, migrateProfile, resolveFeatures, SECURITY_FEATURES, validateProfile } from './profile.ts';
import type { Environment, SecurityProfile } from './profile.ts';

export type SecurityPlan = { id: string; hash: string; revision: number; from: SecurityProfile; to: SecurityProfile; changed: string[]; risks: string[]; restart: boolean; reauthorization: boolean; current: ReturnType<typeof resolveFeatures>; target: ReturnType<typeof resolveFeatures>; modulesToEnable: string[]; modulesToDisable: string[]; incompatible: string[]; servicesToRestart: string[]; revalidate: string[]; affected: string[]; expiresAt: string };
export type SecurityHooks = { feature(id: string): boolean; enforcement(): SecurityProfile['policy']['enforcement']; defaultDeny(): boolean; requireWriteApproval(): boolean; record(kind: string, fields: Record<string, string | number | boolean | null>): void };
const AUDIT_FEATURE: Record<string, string> = { CREDENTIAL: 'credentials.audit', COMMAND: 'audit.commands', TOOL: 'audit.tools', FILE: 'audit.files', PROVIDER: 'audit.providers', MESSAGE: 'audit.messages', POLICY: 'audit.policy' };
/** One trusted Host owns this object. It is never returned from bindAgent(). */
export class SecurityController implements SecurityHooks {
  #db: DatabaseSync; #active: SecurityProfile; #revision: number; #desired: SecurityProfile; #plans = new Map<string, SecurityPlan>(); #environment: () => Environment;
  #legacyLedgerPending = false;
  get legacyLedgerPending() { return this.#legacyLedgerPending; }
  private constructor(db: DatabaseSync, p: SecurityProfile, revision: number, environment: () => Environment) { this.#db = db; this.#active = p; this.#desired = p; this.#revision = revision; this.#environment = environment; }
  static open(root: string, environment: () => Environment): SecurityController {
    const folder = resolve(root); let part = parse(folder).root;
    for (const item of folder.slice(part.length).split(/[\\/]/).filter(Boolean)) { part = join(part, item); try { invariant(!lstatSync(part).isSymbolicLink(), 'SECURITY_UNSAFE_PATH'); } catch (e: any) { if (e.code !== 'ENOENT') throw e; } }
    mkdirSync(folder, { recursive: true, mode: 0o700 }); const path = join(folder, 'security.sqlite');
    try { invariant(!lstatSync(path).isSymbolicLink(), 'SECURITY_UNSAFE_PATH'); } catch (e: any) { if (e.code !== 'ENOENT') throw e; }
    const db = new DatabaseSync(path, { timeout: 1000 });
    try {
      db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA trusted_schema=OFF; CREATE TABLE IF NOT EXISTS profile(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,value TEXT NOT NULL) STRICT; CREATE TABLE IF NOT EXISTS security_audit(seq INTEGER PRIMARY KEY,at TEXT NOT NULL,actor TEXT NOT NULL,kind TEXT NOT NULL,body TEXT NOT NULL,previous_hash TEXT NOT NULL,hash TEXT NOT NULL) STRICT;');
      const row = db.prepare('SELECT revision,value FROM profile WHERE id=1').get() as { revision: number; value: string } | undefined;
      const legacy = !row && existsSync(join(folder,'..','host','kernel.sqlite'));
      const p = row ? validateProfile(JSON.parse(row.value)) : defaultProfile(legacy?'HARDENED_DEPLOYMENT_MODE':'LOCAL_DEVELOPMENT_MODE');
      const c = new SecurityController(db, p, row?.revision ?? 0, environment);
      c.verifyAudit();
      if (!row) { db.exec('BEGIN IMMEDIATE'); try { db.prepare('INSERT INTO profile VALUES(1,0,?)').run(canonical(p)); c.#append('HOST_BOOTSTRAP', 'PROFILE_INITIALIZED', { after: p, actualBoundary: legacy?'LEGACY_MODE_NOT_DOWNGRADED':'LOCAL_SAME_SID_NOT_ISOLATED', realLedgerMigration: false, legacyLedgerPending:legacy }); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; } }
      const initialized = db.prepare("SELECT body FROM security_audit WHERE kind='PROFILE_INITIALIZED' ORDER BY seq LIMIT 1").get() as {body:string};c.#legacyLedgerPending = JSON.parse(initialized.body).legacyLedgerPending === true;
      c.#append('HOST_BOOTSTRAP', 'RUNTIME_REVALIDATED', { mode: p.mode, features: resolveFeatures(p, environment()) });
      return c;
    } catch (e) { db.close(); throw e; }
  }
  feature(id: string): boolean { invariant(SECURITY_FEATURES.some(d => d.id === id), 'SECURITY_UNKNOWN_FEATURE'); return resolveFeatures(this.#active, this.#environment()).find(d => d.id === id)!.status === 'ENABLED'; }
  enforcement() { return this.#active.policy.enforcement; }
  defaultDeny() { return this.feature('policy.defaultDeny'); }
  requireWriteApproval() { return this.feature('policy.approval') && this.feature('execution.fileWriteApproval'); }
  profile(): SecurityProfile { return validateProfile(this.#active); }
  snapshot() {
    const features = resolveFeatures(this.#active, this.#environment());
    const hardened = this.#active.mode === 'HARDENED_DEPLOYMENT_MODE';
    const required = features.filter(f => f.desired && f.status !== 'ENABLED');
    return { revision: this.#revision, active: this.profile(), desired: validateProfile(this.#desired), pendingRestart: canonical(this.#active) !== canonical(this.#desired), features,
      qualification: hardened ? required.length ? 'BLOCKED' : 'NOT_RUN' : features.find(f=>f.id==='credentials.secretRedaction')?.status === 'ENABLED' ? 'LOCAL_SCOPE_ONLY' : 'BLOCKED', assurance: hardened ? 'NOT_RUN' : 'NO_SAME_SID_ISOLATION_CLAIM',
      boundary: 'OS storage protects credentials at rest. Same-SID malware and administrator malware are outside Local isolation claims. Credential read APIs are never exposed to Agents.',
      realLedgerAuthority: this.legacyLedgerPending?'UNRESOLVED_LEGACY_LEDGER_NO_MIGRATION':'PINNED_HOST_STORE',
      fixedBoundaries: SECURITY_FEATURES.filter(d => d.fixed).map(d => d.id), audit: this.audit(32), legacyQualificationUnchanged: true };
  }
  preview(input: unknown, revision: number, affected: string[] = []): SecurityPlan {
    invariant(revision === this.#revision, 'SECURITY_REVISION_CONFLICT');
    const to = validateProfile(input), from = validateProfile(this.#desired);
    if (!this.feature('credentials.secretRedaction')) invariant(canonical(to.dataEgress.scopes) === canonical(from.dataEgress.scopes) || to.dataEgress.scopes.length === 0, 'SECURITY_SECRET_BOUNDARY_UNAVAILABLE');
    const changed = SECURITY_FEATURES.filter(d => from.features[d.id] !== to.features[d.id]).map(d => d.id);
    for (const name of ['mode', 'policy', 'dataEgress', 'budgets'] as const) if (canonical(from[name]) !== canonical(to[name])) changed.push(name);
    invariant(changed.length > 0, 'SECURITY_NO_CHANGE');
    const restart = from.mode !== to.mode || changed.some(id => SECURITY_FEATURES.find(d => d.id === id)?.restart) || canonical(this.#active) !== canonical(this.#desired);
    const risks = changed.filter(id => to.features[id] === false).map(id => {
      const targetState=resolveFeatures(to,this.#environment()).find(f=>f.id===id)?.status;
      return targetState==='DISABLED' ? `${id}: optional module will stop enforcing after application${restart ? ' and restart' : ''}` : `${id}: requested disable is ${targetState}; existing owner controls are not acknowledged as disabled`;
    });
    if (to.policy.enforcement !== 'ENFORCED') risks.push('Policy ' + to.policy.enforcement + ': registered policy decisions no longer block operations. Host identity, exact resource ownership and OS permissions remain.');
    if (to.dataEgress.enforcement !== 'ENFORCED') risks.push('Data Egress ' + to.dataEgress.enforcement + ': no mandatory egress policy protection. Known-secret leak prevention remains.');
    if (from.mode !== to.mode) risks.push('Mode change: credentials are kept in their existing backend; no automatic key transfer, service installation, account/ACL changes or historical qualification updates.');
    if (to.mode === 'LOCAL_DEVELOPMENT_MODE') risks.push('Local mode does not resist malicious same-SID or administrator processes.');
    const current = resolveFeatures(this.#active, this.#environment()), target = resolveFeatures(to, this.#environment());
    const plan = { id: randomUUID(), revision, from, to, changed, risks, restart, reauthorization: changed.some(id => /credentials|deployment|policy|dataEgress|mode/.test(id)), current, target,
      modulesToEnable: changed.filter(id => to.features[id] === true), modulesToDisable: changed.filter(id => to.features[id] === false), incompatible: target.filter(f => f.desired && f.status !== 'ENABLED').map(f => f.id + ':' + f.status), servicesToRestart: restart ? ['AgentNexus Desktop Host'] : [],
      revalidate: target.filter(f => f.desired).map(f => f.id), affected: [...affected, 'Tool Gateway', 'Model Gateway'], expiresAt: new Date(Date.now() + 300000).toISOString() };
    const signed = { ...plan, hash: sha256(canonical(plan)) }; this.#plans.clear(); this.#plans.set(signed.id, signed); return JSON.parse(canonical(signed));
  }
  commit(id: string, hash: string, confirmation: string) {
    const p = this.#plans.get(id);
    invariant(p && p.hash === hash && p.revision === this.#revision && Date.parse(p.expiresAt) > Date.now(), 'SECURITY_PLAN_STALE');
    invariant(confirmation === 'APPLY_SECURITY_CHANGE', 'SECURITY_CONFIRMATION_REQUIRED');
    this.#db.exec('BEGIN IMMEDIATE');
    try {
      const result = this.#db.prepare('UPDATE profile SET revision=revision+1,value=? WHERE id=1 AND revision=?').run(canonical(p.to), this.#revision);
      invariant(result.changes === 1, 'SECURITY_REVISION_CONFLICT');
      this.#append('TRUSTED_MANAGEMENT_UI', 'PROFILE_CHANGED', { before: p.from, after: p.to, affected: p.affected, changed: p.changed, risk: p.risks, restart: p.restart, reauthorization: p.reauthorization, plan_hash: p.hash, effectiveAfterRestart: p.restart });
      this.#db.exec('COMMIT');
    } catch (e) { this.#db.exec('ROLLBACK'); throw e; }
    this.#revision++; this.#desired = validateProfile(p.to); if (!p.restart) this.#active = validateProfile(p.to); this.#plans.clear(); return this.snapshot();
  }
  importPreview(input: unknown, revision: number, affected: string[]) { const m = migrateProfile(input); const p = this.preview(m.profile, revision, affected); return { ...p, migratedFrom: m.from }; }
  export() { return { schema: 'agentnexus/security-profile/1', revision: this.#revision, securityProfile: validateProfile(this.#desired) }; }
  admitProvider(input: import('../model-runtime/protocol.ts').TransportAdmission) {
    const p = this.profile(), e = p.dataEgress;
    const scopes = e.scopes.filter(s => s.id === (s.scope === 'PROVIDER' ? input.model.provider_id : s.scope === 'PROJECT' ? input.subject.project_id : input.subject.agent_id));
    const classification = !this.feature('data.classification') ? 'NOT_CLASSIFIED' : input.model.price.assurance === 'SIMULATED' ? 'SYNTHETIC' : scopes.reduce((c, s) => CLASSIFICATIONS.indexOf(s.classification) > CLASSIFICATIONS.indexOf(c) ? s.classification : c, e.classification);
    const pattern = this.feature('data.secretScanning') && /(?:sk-[A-Za-z0-9_-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_-]?key|authorization)\s*[:=]\s*["']?[A-Za-z0-9_-]{20,})/i.test(input.request.body);
    const allowed = !pattern && (input.model.price.assurance === 'SIMULATED' || classification !== 'SECRET' && !scopes.some(s => s.decision !== 'ALLOW') && (scopes.length > 0 || e.defaultDecision === 'ALLOW'));
    const mode = this.feature('data.egress') ? e.enforcement : 'OFF';
    const decision = mode === 'OFF' ? 'NOT_ENFORCED' : allowed ? 'ALLOW' : mode === 'ADVISORY' ? 'WOULD_DENY' : 'DENY';
    this.record('PROVIDER', { request_id: input.request.headers['x-agentnexus-request-id'], agent_id: input.subject.agent_id, provider_id: input.model.provider_id, model_id: input.model.model_id, body_hash: sha256(input.request.body), classification, enforcement: mode, decision });
    invariant(mode !== 'ENFORCED' || allowed, 'SECURITY_DATA_EGRESS_BLOCKED');
    invariant(!(mode === 'ADVISORY' && !allowed && p.policy.advisoryConfirmation), 'SECURITY_ADVISORY_CONFIRMATION_REQUIRED');
    return { enforcement: mode, decision, classification, body_hash: sha256(input.request.body) };
  }
  record(kind: string, fields: Record<string, string | number | boolean | null>) {
    invariant(Object.hasOwn(AUDIT_FEATURE, kind), 'SECURITY_AUDIT_KIND');
    if (!this.feature(AUDIT_FEATURE[kind])) return;
    // The caller supplies identifiers, hashes and decisions, never commands, prompts or bodies.
    const allowed = ['request_id', 'agent_id', 'project_id', 'provider_id', 'model_id', 'tool_id', 'operation_id', 'message_id', 'body_hash', 'intent_hash', 'classification', 'enforcement', 'decision', 'outcome', 'action', 'key_id', 'status'];
    invariant(Object.keys(fields).every(k => allowed.includes(k)) && Buffer.byteLength(canonical(fields)) <= 4096, 'SECURITY_AUDIT_METADATA_ONLY');
    this.#append('HOST_RUNTIME', kind, fields);
  }
  #append(actor: string, kind: string, body: unknown) {
    const previous = this.#db.prepare('SELECT hash FROM security_audit ORDER BY seq DESC LIMIT 1').get() as { hash: string } | undefined;
    const row = { at: new Date().toISOString(), actor, kind, body, previous_hash: previous?.hash ?? '0'.repeat(64) };
    this.#db.prepare('INSERT INTO security_audit(at,actor,kind,body,previous_hash,hash) VALUES(?,?,?,?,?,?)').run(row.at, actor, kind, canonical(body), row.previous_hash, sha256(canonical(row)));
  }
  audit(limit = 100): {seq:number;at:string;actor:string;kind:string;body:any;previous_hash:string;hash:string}[] { invariant(Number.isSafeInteger(limit) && limit >= 1 && limit <= 1000, 'SECURITY_AUDIT_LIMIT'); return (this.#db.prepare('SELECT * FROM security_audit ORDER BY seq DESC LIMIT ?').all(limit) as {seq:number;at:string;actor:string;kind:string;body:string;previous_hash:string;hash:string}[]).map(r => ({ ...r, body: JSON.parse(r.body) })); }
  verifyAudit() { let previous = '0'.repeat(64); for (const r of this.#db.prepare('SELECT * FROM security_audit ORDER BY seq').iterate() as Iterable<Record<string, any>>) { invariant(r.previous_hash === previous && r.hash === sha256(canonical({ at: r.at, actor: r.actor, kind: r.kind, body: JSON.parse(r.body), previous_hash: r.previous_hash })), 'SECURITY_AUDIT_INTEGRITY'); previous = r.hash; } }
  close() { this.#plans.clear(); this.#db.close(); }
}
