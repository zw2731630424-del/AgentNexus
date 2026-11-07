import { boundedJson, canonical, invariant, NexusError, sha256, uid } from './types.ts';
import type { FeatureDefinition, FeatureResolution, Json, Scope } from './types.ts';
import { acquireMutation, adminEvent, ancestors, contains, getChallenge, markChallengeConsumed, metadata, newChallenge, scopeKey, scopeLevel } from './control.ts';
import type { AdminCheck, MutationGate } from './control.ts';
import type { KernelStore } from './storage.ts';

export type FeatureChange = { id: string; scope: Scope; state: 'ON' | 'OFF' | 'INHERIT' };
export type Module = { stop?: (scope: Scope) => Promise<void>; preflight?: (scope: Scope) => Promise<void> };
type Owned = { feature: string; scope: Scope; controller: AbortController };

export class FeatureRegistry {
  #store: KernelStore; #definitions: Map<string, FeatureDefinition>; #admin: AdminCheck; #gate: MutationGate;
  #modules = new Map<string, Module>(); #owned = new Map<string, Owned>(); #health = new Map<string, string>();
  #pendingStops = new Map<string, Promise<void>>();
  constructor(store: KernelStore, definitions: FeatureDefinition[], checkAdmin: AdminCheck, gate: MutationGate) {
    this.#store = store; this.#admin = checkAdmin; this.#gate = gate;
    this.#definitions = new Map(definitions.map(d => [d.id, JSON.parse(canonical(d))]));
    invariant(this.#definitions.size === definitions.length, 'DUPLICATE_FEATURE');
    const visiting = new Set<string>(), done = new Set<string>();
    const walk = (id: string) => {
      invariant(!visiting.has(id), 'DEPENDENCY_CYCLE'); if (done.has(id)) return;
      const d = this.#definition(id); visiting.add(id);
      for (const dep of d.depends_on) walk(dep);
      for (const c of d.conflicts) this.#definition(c);
      visiting.delete(id); done.add(id);
    };
    for (const id of this.#definitions.keys()) walk(id);
  }
  #definition(id: string): FeatureDefinition {
    const d = this.#definitions.get(id); invariant(d, 'UNKNOWN_FEATURE', id); return d;
  }
  register(admin: unknown, id: string, module: Module = {}): void {
    this.#admin(admin); this.#definition(id); invariant(!this.#modules.has(id), 'MODULE_ALREADY_REGISTERED');
    this.#modules.set(id, module); this.#health.set(id, 'ENABLED');
  }
  #desired(id: string, scope: Scope, overlay: FeatureChange[] = []): 'ON' | 'OFF' {
    const def = this.#definition(id); let desired = def.default;
    if (def.kind === 'CORE') return 'ON';
    for (const ancestor of ancestors(scope)) {
      const key = scopeKey(ancestor);
      const over = overlay.find(c => c.id === id && scopeKey(c.scope) === key);
      const row = this.#store.db.prepare('SELECT value FROM control_features WHERE feature_id=? AND scope_key=?').get(id, key) as { value: string } | undefined;
      const value = over?.state ?? row?.value;
      if (value === 'OFF') return 'OFF';
      if (value === 'ON') desired = 'ON';
    }
    return desired;
  }
  resolve(id: string, scope: Scope = {}): FeatureResolution {
    scopeKey(scope); const m = metadata(this.#store); const desired = this.#desired(id, scope);
    const base = { id, desired, revision: m.feature_revision, epoch: m.feature_epoch, health: this.#health.get(id) ?? 'NOT_IMPLEMENTED' };
    if (desired === 'OFF') return { ...base, effective: 'OFF', reason: 'CONFIGURED_OFF', health: 'DISABLED' };
    if (this.#store.faulted) return { ...base, effective: 'BLOCKED', reason: 'CORE_STORAGE_UNAVAILABLE', health: 'FAILED' };
    if (!this.#modules.has(id)) return { ...base, effective: 'BLOCKED', reason: 'NOT_IMPLEMENTED' };
    if (['FAILED', 'QUIESCING', 'RECOVERING'].includes(base.health)) return { ...base, effective: 'BLOCKED', reason: base.health };
    for (const dep of this.#definition(id).depends_on) {
      const r = this.resolve(dep, scope); if (r.effective !== 'ON') return { ...base, effective: 'BLOCKED', reason: 'DEPENDENCY_DISABLED:' + dep };
    }
    for (const c of this.#definition(id).conflicts) if (this.#desired(c, scope) === 'ON') return { ...base, effective: 'BLOCKED', reason: 'FEATURE_CONFLICT:' + c };
    return { ...base, effective: 'ON', reason: 'READY', health: 'ENABLED' };
  }
  acquire(id: string, scope: Scope = {}) {
    invariant(!this.#gate.busy, 'CONFIG_QUIESCING'); const r = this.resolve(id, scope);
    invariant(this.#owned.size < 32, 'MODULE_RESOURCE_LIMIT');
    invariant(r.effective === 'ON', r.effective === 'OFF' ? 'FEATURE_OFF' : 'FEATURE_BLOCKED', r.reason);
    const key = uid(), controller = new AbortController();
    this.#owned.set(key, { feature: id, scope: JSON.parse(scopeKey(scope)), controller });
    let released = false;
    return { signal: controller.signal, epoch: r.epoch, cancel: (reason: unknown) => controller.abort(reason), release: () => { if (!released) { released = true; this.#owned.delete(key); } } };
  }
  activeCount(): number { return this.#owned.size + this.#pendingStops.size; }
  assertEpoch(epoch: number): void { invariant(metadata(this.#store).feature_epoch === epoch, 'FEATURE_EPOCH_STALE'); }
  async preview(admin: unknown, changes: FeatureChange[], expectedRevision: number) {
    this.#admin(admin); invariant(changes.length > 0 && changes.length <= 256, 'INVALID_CHANGE');
    boundedJson(changes); invariant(metadata(this.#store).feature_revision === expectedRevision, 'REVISION_CONFLICT');
    const normalized: FeatureChange[] = JSON.parse(canonical(changes)); const seen = new Set<string>();
    for (const c of normalized) {
      invariant(Object.keys(c).sort().join(',') === 'id,scope,state', 'INVALID_CHANGE');
      const d = this.#definition(c.id), level = scopeLevel(c.scope);
      invariant(d.scopes.includes(level), 'INVALID_SCOPE');
      invariant(['ON', 'OFF', 'INHERIT'].includes(c.state), 'INVALID_STATE');
      invariant(d.kind !== 'MODE', 'USE_MODE_PROTOCOL');
      invariant(d.kind !== 'CORE' || c.state === 'ON', 'CORE_REQUIRED');
      const key = c.id + ':' + scopeKey(c.scope); invariant(!seen.has(key), 'DUPLICATE_CHANGE'); seen.add(key);
      if (c.state === 'ON') {
        invariant(this.#modules.has(c.id), 'NOT_IMPLEMENTED');
        for (const dep of d.depends_on) invariant(this.#modules.has(dep), 'DEPENDENCY_NOT_IMPLEMENTED');
      }
    }
    const contexts: Scope[] = [{}, ...normalized.map(c => c.scope)];
    for (const row of this.#store.db.prepare('SELECT DISTINCT scope_key FROM control_features').all() as { scope_key: string }[]) contexts.push(JSON.parse(row.scope_key));
    const impacts: string[] = [];
    for (const scope of contexts) for (const d of this.#definitions.values()) {
      if (this.#desired(d.id, scope, normalized) !== 'ON') continue;
      for (const dep of d.depends_on) if (this.#desired(dep, scope, normalized) !== 'ON') impacts.push(`${d.id}@${scopeKey(scope)} requires ${dep}`);
      for (const conflict of d.conflicts) if (this.#desired(conflict, scope, normalized) === 'ON') impacts.push(`${d.id}@${scopeKey(scope)} conflicts ${conflict}`);
    }
    invariant(impacts.length === 0, 'DEPENDENCY_CHANGE_REQUIRED', impacts.slice(0, 20).join('; '));
    const payload = { changes: normalized, expected_revision: expectedRevision };
    const hash = sha256(canonical(payload)); let id = '';
    this.#store.transaction(() => { id = newChallenge(this.#store, 'FEATURE', payload as Json, hash, expectedRevision); adminEvent(this.#store, 'FEATURE_CHANGE', 'PREPARED', payload as Json, { preview_hash: hash, challenge_id: id }); });
    await this.#store.flush(); return { challenge_id: id, preview_hash: hash, changes: normalized };
  }
  async commit(admin: unknown, id: string, previewHash: string): Promise<void> {
    this.#admin(admin); const release = acquireMutation(this.#gate);
    let affected: FeatureChange[] = [];
    try {
      const challenge = getChallenge(this.#store, id, 'FEATURE');
      invariant(challenge.hash === previewHash, 'PREVIEW_HASH_MISMATCH');
      invariant(metadata(this.#store).feature_revision === challenge.revision, 'REVISION_CONFLICT');
      const payload = JSON.parse(challenge.payload) as { changes: FeatureChange[] }; affected = payload.changes;
      for (const c of affected) invariant(!this.#pendingStops.has(c.id), 'MODULE_STOP_PENDING');
      // Epoch revocation and QUIESCING fact precede cancellation. A failed stop never reports DISABLED.
      this.#store.transaction(() => { this.#store.db.exec('UPDATE control_meta SET feature_epoch=feature_epoch+1 WHERE singleton=1'); adminEvent(this.#store, 'FEATURE_CHANGE', 'QUIESCING', payload as Json); });
      await this.#store.flush();
      for (const c of affected) {
        const module = this.#modules.get(c.id);
        const effectiveOff = this.#desired(c.id, c.scope, affected) === 'OFF';
        if (effectiveOff) {
          this.#health.set(c.id, 'QUIESCING');
          for (const work of this.#owned.values()) if (work.feature === c.id && contains(c.scope, work.scope)) work.controller.abort(new NexusError('FEATURE_OFF'));
          if (module?.stop) {
            let timer: ReturnType<typeof setTimeout> | undefined;
            const stopping = Promise.resolve().then(() => module.stop!(c.scope));
            this.#pendingStops.set(c.id, stopping);
            const settle = (ok: boolean) => {
              if (this.#pendingStops.get(c.id) === stopping) this.#pendingStops.delete(c.id);
              // Record late settlement without automatically recovering or enabling this module.
              try { adminEvent(this.#store, 'FEATURE_CHANGE', 'MODULE_STOP_SETTLED', { id: c.id, scope: c.scope, completed: ok } as Json); void this.#store.flush().catch(() => {}); } catch { /* Store failure stays fail-closed. */ }
            };
            stopping.then(() => settle(true), () => settle(false));
            try { await Promise.race([stopping, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new NexusError('DRAIN_TIMEOUT')), 1000); })]); }
            finally { if (timer) clearTimeout(timer); }
          }
          invariant(![...this.#owned.values()].some(w => w.feature === c.id && contains(c.scope, w.scope)), 'MODULE_STILL_RUNNING');
        } else if (module?.preflight) await module.preflight(c.scope);
      }
      this.#store.transaction(() => {
        invariant(metadata(this.#store).feature_revision === challenge.revision, 'REVISION_CONFLICT');
        markChallengeConsumed(this.#store, id);
        for (const c of affected) this.#store.db.prepare('INSERT INTO control_features VALUES(?,?,?) ON CONFLICT(feature_id,scope_key) DO UPDATE SET value=excluded.value').run(c.id, scopeKey(c.scope), c.state);
        this.#store.db.exec('UPDATE control_meta SET feature_revision=feature_revision+1 WHERE singleton=1');
        adminEvent(this.#store, 'FEATURE_CHANGE', 'COMMITTED', payload as Json, { challenge_id: id, preview_hash: previewHash });
      });
      await this.#store.flush();
      for (const c of affected) this.#health.set(c.id, 'ENABLED');
    } catch (e) {
      for (const c of affected) this.#health.set(c.id, 'FAILED');
      try { adminEvent(this.#store, 'FEATURE_CHANGE', 'FAILED', { challenge_id: id }, { error: e instanceof Error ? e.message.slice(0, 1024) : 'unknown' }); await this.#store.flush(); } catch { /* Original failure remains authoritative; store retains outbox. */ }
      throw e;
    } finally { release(); }
  }
  async recover(admin: unknown, id: string, scope: Scope = {}): Promise<void> {
    this.#admin(admin); this.#definition(id); const release = acquireMutation(this.#gate);
    try {
      invariant(!this.#pendingStops.has(id), 'MODULE_STOP_PENDING'); invariant(![...this.#owned.values()].some(w => w.feature === id && contains(scope, w.scope)), 'MODULE_STILL_RUNNING');
      this.#health.set(id, 'RECOVERING');
      try { await this.#modules.get(id)?.preflight?.(scope); adminEvent(this.#store, 'FEATURE_CHANGE', 'RECOVERED', { id, scope } as Json); await this.#store.flush(); this.#health.set(id, 'ENABLED'); }
      catch (e) { this.#health.set(id, 'FAILED'); throw e; }
    } finally { release(); }
  }
}
