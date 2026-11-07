# AgentNexus M1 Source Review — Part 2

原件逐字节嵌入，保留CRLF/BOM/末尾换行。原始内容不格式化。每节标记中的bytes只计原文件；无末尾LF时补的分隔换行属于包装。integrity库仅测试导入，不是Host模块；JSON是运行数据，runner是测试入口。

## src/agentnexus/features.ts

类别：`current_native_implementation`；原始字节数：12008。

源文件 SHA256：

```text
d6aafeafd88f6fd5660afa6b4f29b68625d70ffc8f8138f90db657b6acacda5e
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0006","path":"src/agentnexus/features.ts","bytes":12008,"sha256":"d6aafeafd88f6fd5660afa6b4f29b68625d70ffc8f8138f90db657b6acacda5e","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"current_native_implementation","kind":"original","origin":{"kind":"workspace","path":"src/agentnexus/features.ts"}} -->
```typescript
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
```
<!-- agentnexus-export-end -->

## src/agentnexus/diagnostics.ts

类别：`current_native_implementation`；原始字节数：31299。

源文件 SHA256：

```text
d869a291068564eb942b05623f2b8e3f0f8348c40647215e1b85d86eef27d86d
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0007","path":"src/agentnexus/diagnostics.ts","bytes":31299,"sha256":"d869a291068564eb942b05623f2b8e3f0f8348c40647215e1b85d86eef27d86d","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"current_native_implementation","kind":"original","origin":{"kind":"workspace","path":"src/agentnexus/diagnostics.ts"}} -->
```typescript
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { lstat, readFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NexusError, now, sha256, uid } from './types.ts';
import type { Diagnostic, DiagnosticRequest, Dimension, Status, ValidationResult } from './types.ts';

const MAX_SOURCE = 256 * 1024;
const MAX_STDOUT = 128 * 1024;
const MAX_STDERR = 32 * 1024;
const MAX_DIAGNOSTICS = 200;
const MAX_JOBS = 18;
const MAX_PENDING_BYTES = 4 * 1024 * 1024;
const MAX_DOCUMENTS = 128;
const CHECKER_DIRECTORY = fileURLToPath(new URL('./checkers/', import.meta.url));
const PYTHON_CHECKER = fileURLToPath(new URL('./checkers/python_ast.py', import.meta.url));
const POWERSHELL_CHECKER = fileURLToPath(new URL('./checkers/powershell_ast.ps1', import.meta.url));

export type DevelopmentIntelligenceOptions = {
  pythonPath?: string; powerShellPath?: string; gitPath?: string;
  featureEnabled?: (id: string) => boolean;
  featureEpoch?: () => number; configRevision?: () => number;
  maxSourceBytes?: number; timeoutMs?: number;
};
export type ArgumentCheckRequest = {
  family: 'git' | 'python'; argv: string[]; document_uri: string; version: number;
};

type Outcome = {
  status: Status; reason: string; diagnostics?: Diagnostic[];
  checker_id?: string; checker_version?: string; environment?: Dimension;
  checked_dimension?: Dimension;
};
type Context = {
  id: string; request: DiagnosticRequest; fingerprint: string; bytes: number;
  result: ValidationResult; controller: AbortController; featureIds: string[];
};
type DocumentState = { version: number; fingerprint: string; token: string; active: Context | null };
type Waiter = { context: Context; resolve: () => void; reject: (error: Error) => void; onAbort: () => void };

function dimension(status: Status, reason: string, coverage: string, applicable = true): Dimension {
  return { status, reason, coverage, applicable };
}
function message(text: string): string { return Buffer.from(text).subarray(0, 1024).toString('utf8').replace(/\uFFFD$/, ''); }
function information(code: string, text: string): Diagnostic {
  return { code, severity: 'information', message: message(text), range: null };
}
function languageName(value: string): string {
  const aliases: Record<string, string> = { py: 'python', ps1: 'powershell', pwsh: 'powershell', cs: 'csharp', 'c#': 'csharp', js: 'javascript', ts: 'typescript', yml: 'yaml' };
  return aliases[value.toLowerCase()] ?? value.toLowerCase();
}
function sourceFeatures(language: string): string[] {
  const root = ['devint.runtime', 'devint.syntax-validator', 'devint.code-diagnostics'];
  if (['powershell', 'bash', 'zsh'].includes(language)) return [...root, 'devint.command-parser', `devint.command.${language}`];
  if (['python', 'csharp', 'javascript', 'typescript', 'json', 'yaml', 'sql', 'dockerfile'].includes(language)) root.push(`devint.code.${language}`);
  return root;
}
function validUnicode(value: string): boolean {
  return !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value);
}
function validRequest(request: DiagnosticRequest, limit: number): string | null {
  if (!request || typeof request !== 'object' || typeof request.source !== 'string' || typeof request.language !== 'string') return 'INVALID_REQUEST';
  if (!/^[A-Za-z0-9_+#.-]{1,32}$/.test(request.language)) return 'INVALID_LANGUAGE';
  if (typeof request.document_uri !== 'string' || !request.document_uri || request.document_uri.includes('\0') || Buffer.byteLength(request.document_uri) > 2048) return 'INVALID_DOCUMENT_URI';
  if (!Number.isSafeInteger(request.version) || request.version < 0) return 'INVALID_DOCUMENT_VERSION';
  if (request.dialect !== undefined && (typeof request.dialect !== 'string' || request.dialect.length > 64)) return 'INVALID_DIALECT';
  if (Buffer.byteLength(request.source) > limit) return 'SOURCE_LIMIT';
  if (!validUnicode(request.source) || !validUnicode(request.document_uri)) return 'INVALID_UNICODE';
  return null;
}
function abortOutcome(reason: unknown): Outcome {
  const code = typeof reason === 'string' ? reason : 'CANCELLED';
  return { status: code === 'VALIDATION_BYPASSED' ? 'BYPASSED' : 'INCONCLUSIVE', reason: code, diagnostics: [] };
}

/** Trusted local library. These parse-only adapters are not an OS sandbox or an authorization service. */
export class DevelopmentIntelligence {
  #options: DevelopmentIntelligenceOptions;
  #maxSourceBytes: number;
  #timeoutMs: number;
  #disposed = false;
  #running = 0;
  #pendingBytes = 0;
  #jobs = new Map<string, Context>();
  #documents = new Map<string, DocumentState>();
  #waiters: Waiter[] = [];
  #children = new Set<ChildProcess>();
  #unconfirmedChildren = new Set<ChildProcess>();

  constructor(options: DevelopmentIntelligenceOptions = {}) {
    this.#options = { ...options };
    this.#maxSourceBytes = options.maxSourceBytes ?? MAX_SOURCE;
    this.#timeoutMs = options.timeoutMs ?? 3000;
    if (!Number.isInteger(this.#maxSourceBytes) || this.#maxSourceBytes < 1 || this.#maxSourceBytes > MAX_SOURCE) throw new NexusError('INVALID_SOURCE_LIMIT');
    if (!Number.isInteger(this.#timeoutMs) || this.#timeoutMs < 1 || this.#timeoutMs > 30000) throw new NexusError('INVALID_TIMEOUT');
    for (const value of [options.pythonPath, options.powerShellPath, options.gitPath]) {
      if (value !== undefined && (typeof value !== 'string' || !isAbsolute(value) || value.includes('\0'))) throw new NexusError('CHECKER_PATH_MUST_BE_ABSOLUTE');
    }
  }

  async check(request: DiagnosticRequest, signal?: AbortSignal): Promise<ValidationResult> {
    const invalid = validRequest(request, this.#maxSourceBytes);
    if (invalid) return this.#invalidResult(request, invalid);
    // Copy input before the first await; callers cannot mutate a running document snapshot.
    const snapshot = { ...request, language: languageName(request.language) };
    return this.#run(snapshot, sourceFeatures(snapshot.language), signal, context => this.#checkSource(context), 'syntax');
  }

  async checkArguments(request: ArgumentCheckRequest, signal?: AbortSignal): Promise<ValidationResult> {
    if (!request || !['git', 'python'].includes(request.family) || !Array.isArray(request.argv) || request.argv.length > 128 || request.argv.some(arg => typeof arg !== 'string' || arg.includes('\0') || Buffer.byteLength(arg) > 4096 || !validUnicode(arg))) {
      return this.#invalidResult({ language: 'argv', source: '', document_uri: request?.document_uri, version: request?.version } as DiagnosticRequest, 'INVALID_ARGUMENT_REQUEST', 'args');
    }
    const family = request.family;
    const argv = [...request.argv];
    const snapshot: DiagnosticRequest = { language: family, source: JSON.stringify({ family, argv }), document_uri: request.document_uri, version: request.version };
    const invalid = validRequest(snapshot, Math.min(this.#maxSourceBytes, 65536));
    if (invalid) return this.#invalidResult(snapshot, invalid, 'args');
    const featureIds = ['devint.runtime', 'devint.command-parser', 'devint.argument-validator', family === 'git' ? 'devint.command.git' : 'devint.command.python-cli'];
    return this.#run(snapshot, featureIds, signal, context => this.#checkArgv(context, family, argv), 'args');
  }

  closeDocument(uri: string): void {
    const state = this.#documents.get(uri);
    state?.active?.controller.abort('DOCUMENT_CLOSED');
    this.#documents.delete(uri);
  }

  dispose(): void {
    this.#disposed = true;
    for (const context of this.#jobs.values()) context.controller.abort('DISPOSED');
    this.#documents.clear();
  }

  getActivity(): Readonly<{ jobs: number; running: number; queued: number; pendingBytes: number; children: number; unconfirmedChildren: number; documents: number }> {
    return { jobs: this.#jobs.size, running: this.#running, queued: this.#waiters.length, pendingBytes: this.#pendingBytes,
      children: this.#children.size, unconfirmedChildren: this.#unconfirmedChildren.size, documents: this.#documents.size };
  }

  async drain(timeoutMs = 1000): Promise<void> {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 1000) throw new NexusError('INVALID_DRAIN_TIMEOUT');
    const deadline = performance.now() + timeoutMs;
    while (this.#jobs.size || this.#running || this.#waiters.length || this.#pendingBytes || this.#children.size || this.#unconfirmedChildren.size) {
      if (performance.now() >= deadline) throw new NexusError('DIAGNOSTIC_DRAIN_TIMEOUT', 'Known diagnostic processes or queued work have not been confirmed drained.');
      await new Promise<void>(resolve => setTimeout(resolve, Math.min(10, Math.max(1, deadline - performance.now()))));
    }
  }

  async disposeAndWait(timeoutMs = 1000): Promise<void> {
    this.dispose();
    await this.drain(timeoutMs);
  }

  #enabled(id: string): boolean { return this.#options.featureEnabled ? this.#options.featureEnabled(id) === true : true; }
  #epoch(): number { return this.#options.featureEpoch?.() ?? 0; }
  #revision(): number { return this.#options.configRevision?.() ?? 0; }

  #base(request: DiagnosticRequest): ValidationResult {
    return {
      request_id: uid(), uri: typeof request?.document_uri === 'string' ? request.document_uri.slice(0, 2048) : '',
      version: Number.isSafeInteger(request?.version) ? request.version : 0,
      source_sha256: typeof request?.source === 'string' && Buffer.byteLength(request.source) <= this.#maxSourceBytes ? sha256(request.source) : '',
      checker_id: 'agentnexus-development-intelligence', checker_version: '0.1',
      feature_epoch: this.#epoch(), config_revision: this.#revision(),
      dimensions: {
        syntax: dimension('NOT_RUN', 'NOT_STARTED', 'none'),
        args: dimension('NOT_RUN', 'NOT_APPLICABLE', 'none', false),
        environment: dimension('NOT_RUN', 'NOT_STARTED', 'none'),
        safety: dimension('INCONCLUSIVE', 'STATIC_ANALYSIS_NOT_SAFETY_PROOF', 'no OS isolation, resource authorization or target execution established'),
        authorization: dimension('NOT_RUN', 'OWNER_TOOL_GATEWAY', 'diagnostic service cannot issue permits'),
      },
      status: 'NOT_RUN', reason: 'NOT_STARTED', diagnostics: [], evidence_refs: [],
      timing: { started_at: now(), elapsed_ms: 0 },
    };
  }

  #invalidResult(request: DiagnosticRequest, reason: string, target: 'syntax' | 'args' = 'syntax'): ValidationResult {
    const result = this.#base(request);
    result.status = 'FAIL'; result.reason = reason;
    result.dimensions[target] = dimension('FAIL', reason, 'bounded request envelope');
    result.diagnostics = [information(reason, 'The diagnostic request is outside the supported input contract.')];
    return result;
  }

  async #run(request: DiagnosticRequest, featureIds: string[], signal: AbortSignal | undefined, work: (context: Context) => Promise<Outcome>, target: 'syntax' | 'args'): Promise<ValidationResult> {
    const started = performance.now();
    const result = this.#base(request);
    if (target === 'args') {
      result.dimensions.syntax = dimension('NOT_RUN', 'STRUCTURED_ARGV_NO_SHELL_PARSE', 'no shell string is interpreted', false);
      result.dimensions.args = dimension('NOT_RUN', 'NOT_STARTED', 'registered argv subset');
    }
    const complete = (outcome: Outcome): ValidationResult => {
      result.status = outcome.status; result.reason = outcome.reason;
      result.dimensions[target] = outcome.checked_dimension ?? dimension(outcome.status, outcome.reason, target === 'args' ? `${request.language}_argv_registered_subset` : `${request.language}_parse_only`);
      result.diagnostics = outcome.diagnostics ?? [];
      result.checker_id = outcome.checker_id ?? result.checker_id;
      result.checker_version = outcome.checker_version ?? result.checker_version;
      if (outcome.environment) result.dimensions.environment = outcome.environment;
      result.timing.elapsed_ms = Math.round((performance.now() - started) * 1000) / 1000;
      return result;
    };
    if (this.#disposed) return complete({ status: 'BLOCKED', reason: 'DISPOSED' });
    try {
      if (featureIds.some(id => !this.#enabled(id))) return complete({ status: 'BYPASSED', reason: 'VALIDATION_BYPASSED' });
      if (!this.#enabled('devint.environment-checker')) result.dimensions.environment = dimension('BYPASSED', 'VALIDATION_BYPASSED', 'optional environment diagnostics');
      if (!this.#enabled('devint.safety-preflight')) result.dimensions.safety = dimension('BYPASSED', 'VALIDATION_BYPASSED', 'optional safety preflight');
    } catch { return complete({ status: 'BLOCKED', reason: 'FEATURE_UNAVAILABLE' }); }
    if (signal?.aborted) return complete(abortOutcome('CANCELLED'));
    const fingerprint = sha256(`${request.language}\0${request.dialect ?? ''}\0${request.source}`);
    const previous = this.#documents.get(request.document_uri);
    if (previous && (request.version < previous.version || (request.version === previous.version && fingerprint !== previous.fingerprint))) {
      return complete({ status: 'INCONCLUSIVE', reason: request.version < previous.version ? 'STALE_VERSION' : 'VERSION_HASH_MISMATCH' });
    }
    if (!previous && this.#documents.size >= MAX_DOCUMENTS) return complete({ status: 'BLOCKED', reason: 'DOCUMENT_LIMIT' });
    const bytes = Buffer.byteLength(request.source);
    if (this.#jobs.size >= MAX_JOBS || this.#pendingBytes + bytes > MAX_PENDING_BYTES) return complete({ status: 'BLOCKED', reason: 'QUEUE_LIMIT' });
    const context: Context = { id: result.request_id, request, fingerprint, bytes, result, controller: new AbortController(), featureIds };
    previous?.active?.controller.abort('SUPERSEDED_REQUEST');
    this.#documents.set(request.document_uri, { version: request.version, fingerprint, token: context.id, active: context });
    this.#jobs.set(context.id, context); this.#pendingBytes += bytes;
    const onAbort = () => context.controller.abort('CANCELLED');
    signal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => context.controller.abort('TIME_LIMIT'), this.#timeoutMs);
    const monitor = setInterval(() => {
      try {
        if (featureIds.some(id => !this.#enabled(id))) context.controller.abort('VALIDATION_BYPASSED');
        else if (this.#epoch() !== result.feature_epoch || this.#revision() !== result.config_revision) context.controller.abort('STALE_CONFIGURATION');
      } catch { context.controller.abort('FEATURE_UNAVAILABLE'); }
    }, 25);
    let acquired = false;
    let outcome: Outcome;
    try {
      await this.#acquire(context); acquired = true;
      if (context.controller.signal.aborted) outcome = abortOutcome(context.controller.signal.reason);
      else outcome = await work(context);
    } catch (error) {
      outcome = context.controller.signal.aborted ? abortOutcome(context.controller.signal.reason) : { status: 'INCONCLUSIVE', reason: error instanceof NexusError ? error.code : 'CHECKER_FAILED' };
    } finally {
      clearTimeout(timer); clearInterval(monitor); signal?.removeEventListener('abort', onAbort);
      this.#jobs.delete(context.id); this.#pendingBytes -= bytes;
      if (acquired) this.#release();
    }
    // A returned result is never authoritative for a superseded/closed/disabled document.
    try {
      if (featureIds.some(id => !this.#enabled(id))) outcome = abortOutcome('VALIDATION_BYPASSED');
      else if (this.#epoch() !== result.feature_epoch || this.#revision() !== result.config_revision) outcome = abortOutcome('STALE_CONFIGURATION');
      else if (this.#documents.get(request.document_uri)?.token !== context.id) outcome = abortOutcome(this.#disposed ? 'DISPOSED' : 'STALE_VERSION');
      else if (context.controller.signal.aborted && outcome.reason !== 'CHECKER_TERMINATION_UNCONFIRMED') outcome = abortOutcome(context.controller.signal.reason);
      if (!this.#enabled('devint.environment-checker')) outcome.environment = dimension('BYPASSED', 'VALIDATION_BYPASSED', 'optional environment diagnostics');
      if (!this.#enabled('devint.safety-preflight')) result.dimensions.safety = dimension('BYPASSED', 'VALIDATION_BYPASSED', 'optional safety preflight');
    } catch { outcome = { status: 'BLOCKED', reason: 'FEATURE_UNAVAILABLE' }; }
    const current = this.#documents.get(request.document_uri);
    if (current?.token === context.id) current.active = null;
    return complete(outcome);
  }

  async #acquire(context: Context): Promise<void> {
    if (context.controller.signal.aborted) throw new NexusError('CANCELLED');
    if (this.#running < 2) { this.#running++; return; }
    await new Promise<void>((resolve, reject) => {
      const waiter: Waiter = { context, resolve, reject, onAbort: () => {
        const index = this.#waiters.indexOf(waiter);
        if (index !== -1) this.#waiters.splice(index, 1);
        reject(new NexusError('CANCELLED'));
      } };
      this.#waiters.push(waiter);
      context.controller.signal.addEventListener('abort', waiter.onAbort, { once: true });
    });
  }

  #release(): void {
    this.#running--;
    while (this.#waiters.length) {
      const waiter = this.#waiters.shift()!;
      waiter.context.controller.signal.removeEventListener('abort', waiter.onAbort);
      if (waiter.context.controller.signal.aborted) { waiter.reject(new NexusError('CANCELLED')); continue; }
      this.#running++; waiter.resolve(); break;
    }
  }

  async #checkSource(context: Context): Promise<Outcome> {
    const { request } = context;
    const language = request.language;
    if (!['python', 'powershell', 'json'].includes(language)) return { status: 'NOT_RUN', reason: language === 'sql' ? 'SQL_CHECKER_NOT_IMPLEMENTED' : 'CHECKER_NOT_IMPLEMENTED' };
    const dialects: Record<string, string[]> = { json: ['json', 'rfc8259'], python: ['python3'], powershell: ['powershell7', '7'] };
    if (request.dialect !== undefined && !dialects[language].includes(request.dialect.toLowerCase())) return { status: 'NOT_RUN', reason: 'UNSUPPORTED_DIALECT' };
    if (language === 'json') {
      // Yield once so a newer document or already queued cancellation can fence this snapshot.
      await new Promise<void>(resolve => setImmediate(resolve));
      if (context.controller.signal.aborted) return abortOutcome(context.controller.signal.reason);
      const environment = this.#enabled('devint.environment-checker') ? dimension('PASS', 'BUILTIN_PARSER', 'JSON.parse in the reported Node runtime; OS hard isolation NOT_RUN') : undefined;
      try {
        JSON.parse(request.source);
        return { status: 'PASS', reason: 'JSON_PARSE_ONLY', checker_id: 'json-parse', checker_version: `Node-${process.versions.node}`, environment };
      } catch {
        // V8 may quote long source fragments in SyntaxError messages. Do not echo them.
        return { status: 'FAIL', reason: 'SYNTAX_ERROR', checker_id: 'json-parse', checker_version: `Node-${process.versions.node}`, environment, diagnostics: [{ code: 'JSON_SYNTAX_ERROR', severity: 'error', message: 'Invalid JSON syntax.', range: null }] };
      }
    }
    if (this.#unconfirmedChildren.size) return { status: 'BLOCKED', reason: 'CHECKER_TERMINATION_UNCONFIRMED' };
    const executable = language === 'python' ? this.#options.pythonPath : this.#options.powerShellPath;
    const script = language === 'python' ? PYTHON_CHECKER : POWERSHELL_CHECKER;
    if (!executable) return { status: 'BLOCKED', reason: 'CHECKER_NOT_CONFIGURED', environment: dimension('BLOCKED', 'CHECKER_NOT_CONFIGURED', 'Host must provide an absolute trusted interpreter path') };
    let scriptHash: string;
    try {
      const [executableStat, scriptStat] = await Promise.all([lstat(executable), lstat(script)]);
      if (!executableStat.isFile() || executableStat.isSymbolicLink() || !scriptStat.isFile() || scriptStat.isSymbolicLink() || scriptStat.size > 65536) return { status: 'BLOCKED', reason: 'INVALID_CHECKER_FILE' };
      scriptHash = sha256(await readFile(script));
    } catch { return { status: 'BLOCKED', reason: 'CHECKER_UNAVAILABLE', environment: dimension('BLOCKED', 'CHECKER_UNAVAILABLE', 'configured interpreter and fixed adapter files') }; }
    if (context.controller.signal.aborted) return abortOutcome(context.controller.signal.reason);
    const argv = language === 'python' ? ['-I', '-B', '-S', script] : ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', script];
    const outcome = await this.#child(executable, argv, context);
    if (outcome.checker_version) outcome.checker_version += `/adapter-${scriptHash.slice(0, 16)}`;
    if (outcome.status === 'PASS' || outcome.status === 'FAIL') {
      if (this.#enabled('devint.environment-checker')) outcome.environment = dimension('PASS', 'TRUSTED_ADAPTER_RESPONDED', 'fixed interpreter/adapter launch and reported version only; hard RSS/process-tree isolation NOT_RUN');
    }
    return outcome;
  }

  #child(executable: string, argv: string[], context: Context): Promise<Outcome> {
    return new Promise(resolve => {
      const env: NodeJS.ProcessEnv = {};
      // Only the Windows OS loader root is inherited. Never copy arbitrary env, PATH or credentials.
      if (process.platform === 'win32') {
        if (process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot;
        if (process.env.WINDIR) env.WINDIR = process.env.WINDIR;
      }
      env.PSModulePath = '';
      const child = spawn(executable, argv, { cwd: CHECKER_DIRECTORY, env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      this.#children.add(child);
      const output = Buffer.alloc(MAX_STDOUT);
      let stdoutBytes = 0; let stderrBytes = 0; let finished = false; let failure: string | null = null;
      let killTimer: ReturnType<typeof setTimeout> | undefined;
      const finish = (outcome: Outcome) => {
        if (finished) return;
        finished = true; if (killTimer) clearTimeout(killTimer);
        context.controller.signal.removeEventListener('abort', onAbort);
        resolve(outcome);
      };
      const stop = (reason: string) => {
        if (finished) return;
        failure ??= reason;
        child.stdin.destroy(); child.kill();
        killTimer ??= setTimeout(() => {
          this.#unconfirmedChildren.add(child);
          finish({ status: 'INCONCLUSIVE', reason: 'CHECKER_TERMINATION_UNCONFIRMED' });
        }, 500);
      };
      const onAbort = () => stop(typeof context.controller.signal.reason === 'string' ? context.controller.signal.reason : 'CANCELLED');
      context.controller.signal.addEventListener('abort', onAbort, { once: true });
      child.stdout.on('data', (chunk: Buffer) => {
        if (finished || failure) return;
        if (stdoutBytes + chunk.length > MAX_STDOUT) { stop('OUTPUT_LIMIT'); return; }
        chunk.copy(output, stdoutBytes); stdoutBytes += chunk.length;
      });
      child.stderr.on('data', (chunk: Buffer) => { stderrBytes += chunk.length; if (stderrBytes > MAX_STDERR && !failure) stop('OUTPUT_LIMIT'); });
      child.stdin.on('error', () => { if (!failure) stop('CHECKER_STDIN_FAILED'); });
      child.on('error', () => finish({ status: 'BLOCKED', reason: 'CHECKER_START_FAILED' }));
      child.on('close', code => {
        this.#children.delete(child);
        this.#unconfirmedChildren.delete(child);
        if (failure) { finish(failure === 'VALIDATION_BYPASSED' ? abortOutcome(failure) : { status: 'INCONCLUSIVE', reason: failure }); return; }
        if (code !== 0) { finish({ status: 'INCONCLUSIVE', reason: 'CHECKER_EXIT_FAILED' }); return; }
        try {
          const text = new TextDecoder('utf-8', { fatal: true }).decode(output.subarray(0, stdoutBytes));
          finish(parseCheckerOutput(JSON.parse(text), context.request));
        } catch { finish({ status: 'INCONCLUSIVE', reason: 'INVALID_CHECKER_OUTPUT' }); }
      });
      if (context.controller.signal.aborted) onAbort();
      else child.stdin.end(Buffer.from(context.request.source, 'utf8'));
    });
  }

  async #checkArgv(context: Context, family: 'git' | 'python', argv: string[]): Promise<Outcome> {
    const outcome = family === 'git' ? gitArguments(argv) : pythonArguments(argv);
    outcome.checked_dimension = dimension(outcome.status, outcome.reason, `${family}_argv_registered_subset`);
    outcome.checker_id = `${family}-argv-schema`; outcome.checker_version = '0.1';
    if (!this.#enabled('devint.environment-checker')) return outcome;
    const executable = family === 'python' ? this.#options.pythonPath : this.#options.gitPath;
    if (!executable) {
      outcome.environment = dimension('NOT_RUN', 'TARGET_EXECUTABLE_NOT_CONFIGURED', 'argv schema only; target executable version and cwd are not probed');
      return outcome;
    }
    try {
      const stat = await lstat(executable);
      outcome.environment = stat.isFile() && !stat.isSymbolicLink()
        ? dimension('PASS', 'HOST_EXECUTABLE_FILE_EXISTS', 'configured absolute file only; version, cwd, repository, dependencies and execution NOT_RUN')
        : dimension('BLOCKED', 'TARGET_EXECUTABLE_UNAVAILABLE', 'configured absolute file only');
    } catch { outcome.environment = dimension('BLOCKED', 'TARGET_EXECUTABLE_UNAVAILABLE', 'configured absolute file only'); }
    if (outcome.environment.status === 'BLOCKED' && outcome.status === 'PASS') { outcome.status = 'BLOCKED'; outcome.reason = 'TARGET_EXECUTABLE_UNAVAILABLE'; }
    return outcome;
  }
}

function parseCheckerOutput(payload: unknown, request: DiagnosticRequest): Outcome {
  const value = payload as Record<string, unknown>;
  const expected = request.language === 'python' ? 'python-ast' : 'powershell-ast';
  if (!value || value.schema !== 'agentnexus/checker/0.1' || value.checker_id !== expected || typeof value.checker_version !== 'string' || value.checker_version.length > 128 || !['PASS', 'FAIL', 'INCONCLUSIVE'].includes(value.status as string) || typeof value.reason !== 'string' || value.reason.length > 128 || !Array.isArray(value.diagnostics) || value.diagnostics.length > MAX_DIAGNOSTICS) throw new NexusError('INVALID_CHECKER_OUTPUT');
  const lines = request.source.split('\n').map(line => line.endsWith('\r') ? line.slice(0, -1) : line);
  const diagnostics = value.diagnostics.map((item: unknown): Diagnostic => {
    const d = item as Diagnostic;
    if (!d || typeof d.code !== 'string' || d.code.length > 128 || !['error', 'warning', 'information'].includes(d.severity) || typeof d.message !== 'string' || Buffer.byteLength(d.message) > 1024) throw new NexusError('INVALID_CHECKER_OUTPUT');
    if (d.range !== null) {
      for (const point of [d.range?.start, d.range?.end]) {
        if (!point || !Number.isInteger(point.line) || point.line < 0 || point.line >= lines.length || !Number.isInteger(point.character) || point.character < 0 || point.character > lines[point.line].length) throw new NexusError('INVALID_CHECKER_OUTPUT');
      }
      if (d.range.end.line < d.range.start.line || (d.range.end.line === d.range.start.line && d.range.end.character < d.range.start.character)) throw new NexusError('INVALID_CHECKER_OUTPUT');
    }
    return { code: d.code, severity: d.severity, message: d.message, range: d.range };
  });
  if (value.status === 'PASS' && diagnostics.some(d => d.severity === 'error')) throw new NexusError('INVALID_CHECKER_OUTPUT');
  if (value.status === 'FAIL' && !diagnostics.some(d => d.severity === 'error')) throw new NexusError('INVALID_CHECKER_OUTPUT');
  return { status: value.status as Status, reason: value.reason, checker_id: expected, checker_version: value.checker_version, diagnostics };
}

function argumentFailure(reason: string, status: Status = 'FAIL'): Outcome {
  return { status, reason, diagnostics: [information(reason, 'Argument is outside the registered command subset; the target program was not run.')] };
}
function gitArguments(argv: string[]): Outcome {
  const [command, ...args] = argv;
  if (!['status', 'diff', 'log', 'show', 'rev-parse'].includes(command)) return argumentFailure(command?.startsWith('-') ? 'GIT_GLOBAL_OPTIONS_NOT_SUPPORTED' : 'UNKNOWN_COMMAND_CONTRACT', command?.startsWith('-') ? 'FAIL' : 'NOT_RUN');
  const allowed: Record<string, Set<string>> = {
    status: new Set(['--short', '-s', '--branch', '-b', '--show-stash', '--porcelain', '--porcelain=v1', '--porcelain=v2', '--untracked-files=no', '--untracked-files=normal', '--untracked-files=all']),
    diff: new Set(['--stat', '--name-only', '--name-status', '--cached', '--staged', '--color=never', '--no-ext-diff', '--no-textconv', '--exit-code', '--quiet']),
    log: new Set(['--oneline', '--no-decorate', '--decorate=no', '--no-color']),
    show: new Set(['--stat', '--name-only', '--name-status', '--no-color', '--no-ext-diff', '--no-textconv']),
    'rev-parse': new Set(['--show-toplevel', '--show-prefix', '--is-inside-work-tree', '--git-dir', '--verify']),
  };
  let paths = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (paths) { if (!arg) return argumentFailure('EMPTY_PATHSPEC'); continue; }
    if (arg === '--' && command !== 'rev-parse') { paths = true; continue; }
    if (allowed[command].has(arg)) continue;
    if (command === 'log' && arg === '-n' && /^(?:0|[1-9][0-9]{0,2}|1000)$/.test(args[i + 1] ?? '')) { i++; continue; }
    if (command === 'log' && /^--max-count=(?:0|[1-9][0-9]{0,2}|1000)$/.test(arg)) continue;
    if (['show', 'rev-parse'].includes(command) && /^(?:HEAD|[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/.test(arg)) continue;
    return argumentFailure('UNSUPPORTED_ARGUMENT');
  }
  if (command === 'rev-parse' && (args.length === 0 || (args.includes('--verify') && !args.some(arg => /^(?:HEAD|[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/.test(arg))))) return argumentFailure('MISSING_REQUIRED_ARGUMENT');
  return { status: 'PASS', reason: 'ARGUMENT_SCHEMA_ONLY' };
}
function pythonArguments(argv: string[]): Outcome {
  if (argv.length === 1 && ['--version', '-V', '--help', '-h'].includes(argv[0])) return { status: 'PASS', reason: 'ARGUMENT_SCHEMA_ONLY' };
  let i = 0;
  const flags = new Set(['-I', '-B', '-S', '-E', '-s', '-u']);
  const seen = new Set<string>();
  while (i < argv.length && flags.has(argv[i])) {
    if (seen.has(argv[i])) return argumentFailure('DUPLICATE_OPTION');
    seen.add(argv[i++]);
  }
  const target = argv[i++];
  if (!target || target === '-' || target === '-i') return argumentFailure('INTERACTIVE_ENTRY_NOT_SUPPORTED', 'BLOCKED');
  if (target === '-c') {
    if (i >= argv.length) return argumentFailure('MISSING_REQUIRED_ARGUMENT');
    return { status: 'PASS', reason: 'ARGUMENT_SCHEMA_ONLY_INLINE_SOURCE_NOT_PARSED' };
  }
  if (target === '-m') {
    if (!/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(argv[i] ?? '')) return argumentFailure('INVALID_MODULE_NAME');
    return { status: 'PASS', reason: 'ARGUMENT_SCHEMA_ONLY_MODULE_NOT_IMPORTED' };
  }
  if (target === '--') {
    if (!argv[i] || argv[i] === '-') return argumentFailure('MISSING_SCRIPT_ARGUMENT');
    return { status: 'PASS', reason: 'ARGUMENT_SCHEMA_ONLY_SCRIPT_NOT_READ' };
  }
  if (target.startsWith('-')) return argumentFailure('UNSUPPORTED_INTERPRETER_OPTION');
  return { status: 'PASS', reason: 'ARGUMENT_SCHEMA_ONLY_SCRIPT_NOT_READ' };
}
```
<!-- agentnexus-export-end -->

## src/agentnexus/host.ts

类别：`current_native_implementation`；原始字节数：16750。

源文件 SHA256：

```text
ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0008","path":"src/agentnexus/host.ts","bytes":16750,"sha256":"ac3347f801a58ce5c76d6ca425658bb94fdc56b59c3d003d9b47840062ac9f5c","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"current_native_implementation","kind":"original","origin":{"kind":"workspace","path":"src/agentnexus/host.ts"}} -->
```typescript
import { readFile } from 'node:fs/promises';
import { KernelStore } from './storage.ts';
import { FeatureRegistry } from './features.ts';
import { PolicyEngine } from './policy.ts';
import type { ModeRequest, RuleEvaluator } from './policy.ts';
import { ToolGateway } from './gateway.ts';
import type { ToolDefinition, ToolRequest } from './gateway.ts';
import { DevelopmentIntelligence } from './diagnostics.ts';
import type { ArgumentCheckRequest } from './diagnostics.ts';
import { initializeControl, adminEvent, contains, metadata } from './control.ts';
import { auditEvent, boundedJson, canonical, invariant, now, sha256, uid, validateIdentity } from './types.ts';
import type { DiagnosticRequest, FeatureDefinition, Identity, Json, PolicyDefinition, Scope, ValidationResult } from './types.ts';
import type { FeatureChange, Module } from './features.ts';

export type HostOptions = {
  pythonPath?: string; powerShellPath?: string; ruleEvaluator?: RuleEvaluator;
  definitions?: FeatureDefinition[]; policies?: PolicyDefinition[];
};

export async function openHost(root: string, options: HostOptions = {}) {
  const featureData = options.definitions ?? JSON.parse(await readFile(new URL('../../config/agentnexus/features.json', import.meta.url), 'utf8')).features;
  const policyData = options.policies ?? JSON.parse(await readFile(new URL('../../config/agentnexus/policies.json', import.meta.url), 'utf8')).policies;
  const store = await KernelStore.open(root);
  try {
    initializeControl(store);
    // This capability is created only in trusted bootstrap and never enters the Agent facade.
    // It is a library separation mechanism. OS peer authentication remains BLOCKED, not implemented here.
    const token = Object.freeze({ capability: uid() });
    const checkAdmin = (candidate: unknown) => invariant(candidate === token, 'ADMIN_CAPABILITY_REQUIRED');
    const gate = { busy: false };
    const features = new FeatureRegistry(store, featureData, checkAdmin, gate);
    const policy = new PolicyEngine(store, policyData, checkAdmin, gate, () => features.activeCount(), options.ruleEvaluator);
    const gateway = new ToolGateway(store, features, policy, checkAdmin, gate);
    type Binding = { identity: Identity; scope: Scope; diagnostics: DevelopmentIntelligence | null; active: number; closing: boolean; closePromise: Promise<void> | null };
    const bindings = new Map<string, Binding>();
    let closed = false;
    let hostClosePromise: Promise<void> | null = null;
    const makeDiagnostics = (scope: Scope) => new DevelopmentIntelligence({
      pythonPath: options.pythonPath, powerShellPath: options.powerShellPath,
      featureEnabled: id => {
        try { const r = features.resolve(id, scope); return r.desired === 'ON' && !['FAILED','QUIESCING','RECOVERING'].includes(r.health); }
        catch { return true; } // Unrecognized language is reported NOT_RUN by DIE, never executed.
      },
      featureEpoch: () => metadata(store).feature_epoch, configRevision: () => metadata(store).feature_revision,
    });
    const unavailableValidation = (r: {document_uri: string;version: number;source: string}, status: 'BLOCKED'|'BYPASSED', reason: string): ValidationResult => {
      const dimension = { status, reason, coverage: 'none', applicable: true };
      return { request_id: uid(), uri: r.document_uri, version: r.version, source_sha256: sha256(r.source), checker_id: 'unavailable', checker_version: 'none', feature_epoch: metadata(store).feature_epoch,
        config_revision: metadata(store).feature_revision, dimensions: { syntax: dimension, args: dimension, environment: dimension, safety: dimension, authorization: { status: 'NOT_RUN', reason: 'OWNER_TOOL_GATEWAY', coverage: 'none', applicable: false } },
        status, reason, diagnostics: [], evidence_refs: [], timing: { started_at: now(), elapsed_ms: 0 } };
    };
    const stopDiagnostics = async (scope: Scope) => {
      for (const b of bindings.values()) if (contains(scope, b.scope) && b.diagnostics) {
        const d = b.diagnostics;
        if ('disposeAndWait' in d) await (d as any).disposeAndWait();
        else { d.dispose(); invariant(b.active === 0, 'DIAGNOSTICS_STILL_RUNNING'); }
        b.diagnostics = null;
      }
    };
    const preflightDiagnostics = async (scope: Scope) => {
      for (const b of bindings.values()) if (contains(scope, b.scope) && !b.diagnostics) b.diagnostics = makeDiagnostics(b.scope);
    };
    const nativeModules = ['core.identity','core.state','core.events','core.features','core.admin-audit','core.audit.trail','core.artifact.store','core.archive.raw','core.decision.ledger','policy.mode','tool.test',
      'devint.runtime','devint.command-parser','devint.syntax-validator','devint.argument-validator','devint.environment-checker','devint.command-preview','devint.code-diagnostics','devint.code.python','devint.code.json','devint.command.powershell','devint.command.git','devint.command.python-cli','audit.task-reconstruction'];
    for (const id of nativeModules) if (featureData.some((d: FeatureDefinition) => d.id === id)) features.register(token, id, id.startsWith('devint.') ? { stop: stopDiagnostics, preflight: preflightDiagnostics } : {});
    // Recover uncertain effects without invoking a handler or reissuing a permit.
    store.transaction(() => {
      let after = '';
      while (true) {
        const rows = store.db.prepare("SELECT operation_id,state FROM control_operations WHERE operation_id>? AND state IN ('CLAIMED','STARTED','RESULT_RECORDED') ORDER BY operation_id LIMIT 100").all(after) as { operation_id: string; state: string }[];
        if (!rows.length) break;
        for (const r of rows) {
          store.db.prepare("UPDATE control_operations SET state='INDETERMINATE' WHERE operation_id=?").run(r.operation_id);
          adminEvent(store, 'RECOVERY', 'OPERATION_REQUIRES_RECONCILE', { operation_id: r.operation_id, previous_state: r.state });
          after = r.operation_id;
        }
      }
    });
    await policy.onBoot();
    if (featureData.some((d: FeatureDefinition) => d.id === 'tool.test')) {
      gateway.register(token, { id: 'native.echo', version: '1', feature_id: 'tool.test', policy_ids: [], requires_sandbox: false,
        schema: args => { boundedJson(args); }, execute: args => ({ data: args }) });
      if (featureData.some((d: FeatureDefinition) => d.id === 'devint.runtime')) gateway.register(token, {
        id: 'native.diagnostics', version: '1', feature_id: 'tool.test', policy_ids: [], requires_sandbox: false,
        schema: args => {
          invariant(args !== null && typeof args === 'object' && !Array.isArray(args), 'DIAGNOSTIC_SCHEMA');
          const r = args as any;
          invariant(Object.keys(r).every(k => ['language','source','document_uri','version','dialect'].includes(k)), 'DIAGNOSTIC_SCHEMA');
          invariant(typeof r.language === 'string' && typeof r.source === 'string' && typeof r.document_uri === 'string' && Number.isSafeInteger(r.version), 'DIAGNOSTIC_SCHEMA');
        },
        validate: async (args, signal, identity) => {
          const b = bindings.get(canonical(identity)); invariant(b, 'UNKNOWN_SESSION');
          const r = args as unknown as DiagnosticRequest;
          const featureIds = ['devint.runtime','devint.code-diagnostics','devint.syntax-validator',
            ...(r.language === 'powershell' ? ['devint.command-parser','devint.command.powershell'] : ['devint.code.' + r.language])];
          const failedModule = featureIds.find(id => {
            try { return ['FAILED','QUIESCING','RECOVERING'].includes(features.resolve(id, b.scope).health); } catch { return false; }
          });
          // An explicit OFF is evaluated by the checker without reactivating a disposed instance.
          if (failedModule || features.resolve('devint.runtime', b.scope).desired === 'OFF') {
            const reason = failedModule ? 'MODULE_UNAVAILABLE:' + failedModule : 'VALIDATION_BYPASSED';
            const status = failedModule ? 'BLOCKED' as const : 'BYPASSED' as const;
            return unavailableValidation(r, status, reason);
          }
          const service = b.diagnostics ?? makeDiagnostics(b.scope);
          if (!b.diagnostics) {
            // Explicit invocation of an enabled checker may recreate its empty service after an unrelated language was stopped.
            // No previously disabled checker or background work is enabled here.
            b.diagnostics = service;
          }
          return service.check(args as unknown as DiagnosticRequest, signal);
        },
        execute: (_args, context) => ({ data: context.validation as unknown as Json }),
      });
      if (featureData.some((d: FeatureDefinition) => d.id === 'devint.runtime')) gateway.register(token, {
        id: 'native.command-check', version: '1', feature_id: 'tool.test', policy_ids: [], requires_sandbox: false,
        schema: args => {
          invariant(args !== null && typeof args === 'object' && !Array.isArray(args), 'COMMAND_CHECK_SCHEMA');
          const r = args as any;
          invariant(Object.keys(r).every(k => ['family','argv','document_uri','version'].includes(k)), 'COMMAND_CHECK_SCHEMA');
          invariant(['git','python'].includes(r.family) && Array.isArray(r.argv) && r.argv.length <= 128 && r.argv.every((x: unknown) => typeof x === 'string') && typeof r.document_uri === 'string' && Number.isSafeInteger(r.version), 'COMMAND_CHECK_SCHEMA');
        },
        validate: async (args, signal, identity) => {
          const b = bindings.get(canonical(identity)); invariant(b, 'UNKNOWN_SESSION');
          for (const id of ['devint.runtime','devint.command-parser','devint.argument-validator']) {
            const f = features.resolve(id, b.scope);
            const r = args as unknown as ArgumentCheckRequest;
            if (['FAILED','QUIESCING','RECOVERING'].includes(f.health)) return unavailableValidation({ ...r, source: canonical(r.argv) }, 'BLOCKED', 'MODULE_UNAVAILABLE:' + id);
            if (f.desired === 'OFF') return unavailableValidation({ ...r, source: canonical(r.argv) }, 'BYPASSED', 'VALIDATION_BYPASSED');
          }
          if (!b.diagnostics) b.diagnostics = makeDiagnostics(b.scope);
          return b.diagnostics.checkArguments(args as unknown as ArgumentCheckRequest, signal);
        },
        execute: (args, context) => ({ data: { validation: context.validation, preview: { family: (args as any).family, argv: (args as any).argv, cwd: 'task-resource-not-executed', will_execute: false } } as unknown as Json }),
      });
    }
    adminEvent(store, 'HOST_LIFECYCLE', 'LOCAL_LIBRARY_READY', { runtime: process.version, sqlite: process.versions.sqlite ?? 'unknown', modules: nativeModules.filter(id => featureData.some((d: FeatureDefinition) => d.id === id)), arbitrary_execution: 'BLOCKED', os_admin_auth: 'NOT_RUN' });
    await store.flush();
    const administration = Object.freeze({
      metadata: () => metadata(store),
      previewFeatures: (changes: FeatureChange[], revision: number) => features.preview(token, changes, revision),
      commitFeatures: (id: string, hash: string) => features.commit(token, id, hash),
      recoverModule: (id: string, scope: Scope = {}) => features.recover(token, id, scope),
      registerModule: (id: string, module: Module = {}) => features.register(token, id, module),
      prepareMode: (request: ModeRequest, revision: number) => policy.prepare(token, request, revision),
      confirmMode: (id: string, phase: 'PREVIEW_ACK' | 'RISK_ACK', hash: string) => policy.confirm(token, id, phase, hash),
      commitMode: (id: string, hash: string) => policy.commit(token, id, hash),
      completePreflight: (scope: Scope) => policy.completePreflight(token, scope),
      approve: (hash: string, identity: Identity, reason: string, lifetimeMs?: number) => policy.approve(token, hash, identity, reason, lifetimeMs),
      registerTool: (definition: ToolDefinition) => gateway.register(token, definition),
      recordDecision: async (decision: Json, status: 'PROPOSED' | 'ACCEPTED', evidence: any[] = []) => {
        boundedJson(decision); const id = uid();
        const identity = { agent_id: 'host-admin', project_id: 'host', task_id: 'administration', session_id: 'host-control' };
        store.transaction(() => {
          const event = adminEvent(store, 'DECISION', status, { decision_id: id });
          store.decision({ ...identity, event_id: uid(), operation_id: event.operation_id, observed_at: now(), decision_id: id, status, authority_ref: 'trusted-bootstrap-capability', supersedes: null, evidence_refs: evidence, decision });
        }); await store.flush(); return id;
      },
    });
    function bindAgent(identity: Identity) {
      invariant(!closed, 'HOST_CLOSED'); validateIdentity(identity);
      const key = canonical(identity); invariant(!bindings.has(key), 'SESSION_ALREADY_BOUND'); invariant(bindings.size < 16, 'SESSION_LIMIT');
      const frozen = Object.freeze(JSON.parse(key)) as Identity;
      const scope = { project_id: frozen.project_id, agent_id: frozen.agent_id, task_id: frozen.task_id };
      const b: Binding = { identity: frozen, scope, diagnostics: makeDiagnostics(scope), active: 0, closing: false, closePromise: null };
      store.audit(auditEvent(frozen, { operation_type: 'AGENT_LIFECYCLE', phase: 'SESSION_BOUND', execution_status: 'BOUND', cwd: store.root, parameters: { binding_kind: 'LOCAL_TRUSTED_FACADE', os_agent_process: false } }));
      bindings.set(key, b);
      const assertBound = () => invariant(!closed && !b.closing && bindings.get(key) === b, 'SESSION_CLOSED');
      return Object.freeze({
        identity: frozen,
        request: async (request: ToolRequest) => {
          assertBound(); b.active++;
          try { return await gateway.run(frozen, request); } finally { b.active--; }
        },
        feature: (id: string) => { assertBound(); return features.resolve(id, scope); },
        reconstructTask: (after = 0, limit = 100) => {
          assertBound();
          const records = store.query('audit', { project_id: frozen.project_id, task_id: frozen.task_id, agent_id: frozen.agent_id, session_id: frozen.session_id, after, limit });
          return { records, next_cursor: records.at(-1)?.seq ?? after, replay: 'READ_ONLY_NO_EXECUTOR' };
        },
        context: (after = 0, limit = 100) => { assertBound(); return store.query('context', { project_id: frozen.project_id, task_id: frozen.task_id, agent_id: frozen.agent_id, session_id: frozen.session_id, after, limit }); },
        close: async () => {
          if (closed || bindings.get(key) !== b) return; // Idempotent stale close cannot revoke a replacement binding.
          if (b.closePromise) return b.closePromise;
          invariant(b.active === 0, 'SESSION_HAS_ACTIVE_OPERATIONS');
          b.closing = true; // Revoke before the first await; cleanup cannot open a new request window.
          b.closePromise = (async () => {
            let auditFailure: unknown = null;
            const operation = uid();
            try { store.audit(auditEvent(frozen, { operation_id: operation, operation_type: 'AGENT_LIFECYCLE', phase: 'SESSION_REVOKING', execution_status: 'REVOKING', cwd: store.root })); await store.flush(); }
            catch (error) { auditFailure = error; }
            if (b.diagnostics) { if ('disposeAndWait' in b.diagnostics) await (b.diagnostics as any).disposeAndWait(); else b.diagnostics.dispose(); }
            if (bindings.get(key) === b) bindings.delete(key);
            try { store.audit(auditEvent(frozen, { operation_id: operation, operation_type: 'AGENT_LIFECYCLE', phase: 'SESSION_REVOKED', execution_status: 'REVOKED', cwd: store.root })); await store.flush(); }
            catch (error) { auditFailure ??= error; }
            if (auditFailure) throw auditFailure;
          })();
          return b.closePromise;
        },
      });
    }
    return Object.freeze({
      administration, bindAgent,
      deployment: Object.freeze({ status: 'BLOCKED', reason: 'OS_ADMIN_AUTH_AND_SANDBOX_NOT_VERIFIED', api: 'LOCAL_TRUSTED_LIBRARY_ONLY', no_network_listener: true }),
      // Trusted bootstrap/test inspection only; none of these objects are in the Agent facade.
      store, features, policy, gateway,
      close: async () => {
        if (hostClosePromise) return hostClosePromise;
        invariant(features.activeCount() === 0 && ![...bindings.values()].some(b => b.active !== 0), 'ACTIVE_OPERATIONS');
        closed = true;
        hostClosePromise = (async () => { await stopDiagnostics({}); bindings.clear(); await store.close(); })();
        return hostClosePromise;
      },
    });
  } catch (error) { await store.close(); throw error; }
}
```
<!-- agentnexus-export-end -->

## src/agentnexus/records.ts

类别：`current_native_implementation`；原始字节数：6510。

源文件 SHA256：

```text
393e0a70a20a4dae21287169d1313bae949842cf0f712bacb3ebf432a5ed7800
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0009","path":"src/agentnexus/records.ts","bytes":6510,"sha256":"393e0a70a20a4dae21287169d1313bae949842cf0f712bacb3ebf432a5ed7800","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"current_native_implementation","kind":"original","origin":{"kind":"workspace","path":"src/agentnexus/records.ts"}} -->
```typescript
import {
  boundedJson, canonical, invariant, sha256, validateIdentity,
} from './types.ts';
import type {
  ArtifactRef, AuditInput, ContextInput, DecisionInput, Domain, Json, StoredRecord,
} from './types.ts';

export const ZERO_HASH = '0'.repeat(64);
export const MAX_FRAME_BYTES = 64 * 1024;
export const MAX_ARTIFACT_BYTES = 512 * 1024 * 1024;
const HASH = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

function string(value: unknown, max = 512): asserts value is string {
  invariant(typeof value === 'string' && value.length > 0 && Buffer.byteLength(value) <= max, 'INVALID_RECORD');
}
function nullableString(value: unknown, max = 512): void { if (value !== null) string(value, max); }
function fields(value: Record<string, unknown>, names: string[]): void {
  invariant(Object.keys(value).length === names.length && names.every(k => Object.hasOwn(value, k)), 'INVALID_RECORD_FIELDS');
}
function strings(value: unknown): void {
  invariant(Array.isArray(value) && value.length <= 256, 'INVALID_RECORD');
  for (const v of value) string(v, 128);
}

export function validateArtifactRef(value: unknown): asserts value is ArtifactRef {
  invariant(value !== null && typeof value === 'object' && !Array.isArray(value), 'INVALID_ARTIFACT_REF');
  const v = value as Record<string, unknown>;
  fields(v, ['artifact_id', 'sha256', 'bytes', 'codec', 'stored_sha256', 'stored_bytes', 'media_type', 'sensitivity']);
  invariant(typeof v.artifact_id === 'string' && UUID.test(v.artifact_id), 'INVALID_ARTIFACT_REF');
  invariant(typeof v.sha256 === 'string' && HASH.test(v.sha256) && typeof v.stored_sha256 === 'string' && HASH.test(v.stored_sha256), 'INVALID_ARTIFACT_REF');
  invariant(Number.isSafeInteger(v.bytes) && (v.bytes as number) >= 0 && (v.bytes as number) <= MAX_ARTIFACT_BYTES, 'INVALID_ARTIFACT_REF');
  invariant(Number.isSafeInteger(v.stored_bytes) && (v.stored_bytes as number) > 0 && (v.stored_bytes as number) <= MAX_ARTIFACT_BYTES + 8 * 1024 * 1024, 'INVALID_ARTIFACT_REF');
  invariant(v.codec === 'zstd' && v.sensitivity === 'NORMAL', 'SECRET_UNSUPPORTED');
  string(v.media_type, 200);
  invariant(!/[\x00-\x1f\x7f]/.test(v.media_type), 'INVALID_ARTIFACT_REF');
}

function refs(value: unknown): void {
  invariant(Array.isArray(value) && value.length <= 256, 'INVALID_RECORD');
  for (const ref of value) validateArtifactRef(ref);
}

export function validateInput(domain: Domain, input: unknown): AuditInput | ContextInput | DecisionInput {
  // Canonicalize before property access: reject accessors, cycles, prototypes and large envelopes.
  const body = JSON.parse(boundedJson(input, MAX_FRAME_BYTES - 1024)) as Record<string, unknown>;
  invariant(body !== null && typeof body === 'object' && !Array.isArray(body), 'INVALID_RECORD');
  validateIdentity(body as unknown as AuditInput);
  for (const k of ['event_id', 'operation_id', 'observed_at']) string(body[k], 128);
  invariant(Number.isFinite(Date.parse(body.observed_at as string)), 'INVALID_RECORD_TIME');
  const base = ['agent_id', 'project_id', 'task_id', 'session_id', 'event_id', 'operation_id', 'observed_at'];
  if (domain === 'audit') {
    fields(body, [...base, 'operation_type', 'phase', 'cwd', 'parameters', 'parameters_ref', 'before_state_ref',
      'policy_decision_ref', 'authorization_ref', 'execution_status', 'exit_code', 'stdout_ref', 'stderr_ref',
      'after_state_ref', 'artifact_refs', 'context_event_refs', 'decision_refs', 'applicability', 'detail']);
    string(body.operation_type, 128); string(body.phase, 128); string(body.execution_status, 128);
    nullableString(body.cwd, 4096); nullableString(body.policy_decision_ref); nullableString(body.authorization_ref);
    invariant(body.exit_code === null || Number.isSafeInteger(body.exit_code), 'INVALID_RECORD');
    for (const k of ['parameters_ref', 'before_state_ref', 'stdout_ref', 'stderr_ref', 'after_state_ref'])
      if (body[k] !== null) validateArtifactRef(body[k]);
    refs(body.artifact_refs); strings(body.context_event_refs); strings(body.decision_refs);
  } else if (domain === 'context') {
    fields(body, [...base, 'kind', 'payload_ref', 'audit_event_refs']);
    string(body.kind, 128); validateArtifactRef(body.payload_ref); strings(body.audit_event_refs);
  } else {
    invariant(domain === 'decision', 'INVALID_DOMAIN');
    fields(body, [...base, 'decision_id', 'status', 'authority_ref', 'supersedes', 'evidence_refs', 'decision']);
    string(body.decision_id, 128); string(body.authority_ref); nullableString(body.supersedes, 128);
    invariant(['PROPOSED', 'ACCEPTED', 'SUPERSEDED', 'REJECTED'].includes(body.status as string), 'INVALID_RECORD');
    refs(body.evidence_refs);
  }
  return body as unknown as AuditInput | ContextInput | DecisionInput;
}

export function artifactRefs(domain: Domain, body: Json): ArtifactRef[] {
  const b = body as Record<string, Json>;
  if (domain === 'context') return [b.payload_ref as unknown as ArtifactRef];
  if (domain === 'decision') return b.evidence_refs as unknown as ArtifactRef[];
  return [b.parameters_ref, b.before_state_ref, b.stdout_ref, b.stderr_ref, b.after_state_ref,
    ...(b.artifact_refs as Json[])].filter(x => x !== null) as unknown as ArtifactRef[];
}

export function recordHash(record: Omit<StoredRecord, 'hash'>): string { return sha256(canonical(record)); }
export function frame(record: StoredRecord): Buffer {
  const bytes = Buffer.from(boundedJson(record, MAX_FRAME_BYTES - 1) + '\n');
  invariant(bytes.length <= MAX_FRAME_BYTES, 'FRAME_TOO_LARGE'); return bytes;
}
export function validateRecord(input: unknown): StoredRecord {
  const value = JSON.parse(boundedJson(input, MAX_FRAME_BYTES)) as StoredRecord;
  fields(value as unknown as Record<string, unknown>, ['seq', 'domain', 'event_id', 'operation_id', 'project_id', 'task_id', 'previous_hash', 'hash', 'body']);
  invariant(Number.isSafeInteger(value.seq) && value.seq > 0, 'RECORD_CORRUPT');
  invariant(['audit', 'context', 'decision'].includes(value.domain), 'RECORD_CORRUPT');
  invariant(HASH.test(value.previous_hash) && HASH.test(value.hash), 'RECORD_CORRUPT');
  const body = validateInput(value.domain, value.body);
  invariant(value.event_id === body.event_id && value.operation_id === body.operation_id && value.project_id === body.project_id && value.task_id === body.task_id, 'RECORD_CORRUPT');
  const { hash, ...withoutHash } = value;
  invariant(hash === recordHash(withoutHash), 'RECORD_CORRUPT');
  return value;
}
```
<!-- agentnexus-export-end -->

## src/agentnexus/types.ts

类别：`current_native_implementation`；原始字节数：6814。

源文件 SHA256：

```text
101cc13ca1bbb9ec34e7bb8dfdc8360da913829b99458cf3374cc6604fa15d75
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0010","path":"src/agentnexus/types.ts","bytes":6814,"sha256":"101cc13ca1bbb9ec34e7bb8dfdc8360da913829b99458cf3374cc6604fa15d75","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"current_native_implementation","kind":"original","origin":{"kind":"workspace","path":"src/agentnexus/types.ts"}} -->
```typescript
import { createHash, randomUUID } from 'node:crypto';

// Independently authored M1 contracts. Trusted library, not an OS authentication boundary.
export type Status = 'PASS' | 'FAIL' | 'NOT_RUN' | 'INCONCLUSIVE' | 'BLOCKED' | 'BYPASSED';
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Identity = { agent_id: string; project_id: string; task_id: string; session_id: string };
export type Scope = { project_id?: string; agent_id?: string; task_id?: string };
export type Domain = 'audit' | 'context' | 'decision';
export type ArtifactRef = {
  artifact_id: string; sha256: string; bytes: number; codec: 'zstd';
  stored_sha256: string; stored_bytes: number; media_type: string; sensitivity: 'NORMAL';
};
export type AuditInput = Identity & {
  operation_id: string; event_id: string; operation_type: string; phase: string;
  observed_at: string; cwd: string | null;
  parameters: Json; parameters_ref: ArtifactRef | null;
  before_state_ref: ArtifactRef | null; policy_decision_ref: string | null;
  authorization_ref: string | null; execution_status: string; exit_code: number | null;
  stdout_ref: ArtifactRef | null; stderr_ref: ArtifactRef | null;
  after_state_ref: ArtifactRef | null; artifact_refs: ArtifactRef[];
  context_event_refs: string[]; decision_refs: string[];
  applicability: Json; detail: Json;
};
export type ContextInput = Identity & {
  event_id: string; operation_id: string; observed_at: string; kind: string;
  payload_ref: ArtifactRef; audit_event_refs: string[];
};
export type DecisionInput = Identity & {
  event_id: string; operation_id: string; observed_at: string; decision_id: string;
  status: 'PROPOSED' | 'ACCEPTED' | 'SUPERSEDED' | 'REJECTED';
  authority_ref: string; supersedes: string | null; evidence_refs: ArtifactRef[]; decision: Json;
};
export type StoredRecord = {
  seq: number; domain: Domain; event_id: string; operation_id: string;
  project_id: string; task_id: string; previous_hash: string; hash: string; body: Json;
};
export type QueryOptions = { task_id?: string; project_id?: string; agent_id?: string; session_id?: string; after?: number; limit?: number };

export class NexusError extends Error {
  code: string;
  constructor(code: string, message = code) { super(message); this.name = 'NexusError'; this.code = code; }
}
export function invariant(ok: unknown, code: string, message = code): asserts ok {
  if (!ok) throw new NexusError(code, message);
}
export function canonical(value: unknown): string {
  const seen = new Set<object>();
  function normalize(v: unknown, depth: number): Json {
    invariant(depth <= 64, 'JSON_DEPTH');
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
    if (typeof v === 'number') { invariant(Number.isFinite(v), 'JSON_NUMBER'); return v; }
    invariant(typeof v === 'object' && v !== null, 'JSON_TYPE');
    invariant(!seen.has(v), 'JSON_CYCLE'); seen.add(v);
    let out: Json;
    if (Array.isArray(v)) out = v.map(x => normalize(x, depth + 1));
    else {
      invariant(Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null, 'JSON_PROTOTYPE');
      const result: { [key: string]: Json } = Object.create(null);
      const properties = Object.getOwnPropertyDescriptors(v);
      for (const k of Object.keys(properties).sort()) {
        const d = properties[k]; invariant('value' in d && d.enumerable, 'JSON_ACCESSOR');
        result[k] = normalize(d.value, depth + 1);
      }
      out = result;
    }
    seen.delete(v); return out;
  }
  return JSON.stringify(normalize(value, 0));
}
export function boundedJson(value: unknown, maxBytes = 65536): string {
  const body = canonical(value); invariant(Buffer.byteLength(body) <= maxBytes, 'FRAME_TOO_LARGE'); return body;
}
export function freezeJson<T extends Json>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freezeJson(child);
    Object.freeze(value);
  }
  return value;
}
export function sha256(value: string | Uint8Array): string { return createHash('sha256').update(value).digest('hex'); }
export function uid(): string { return randomUUID(); }
export function now(): string { return new Date().toISOString(); }
export function validateIdentity(identity: Identity): void {
  for (const k of ['agent_id', 'project_id', 'task_id', 'session_id'] as const)
    invariant(typeof identity[k] === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(identity[k]), 'INVALID_IDENTITY');
}
export function auditEvent(identity: Identity, data: Partial<AuditInput> & { operation_type: string; phase: string }): AuditInput {
  validateIdentity(identity);
  return {
    ...identity, operation_id: uid(), event_id: uid(), operation_type: data.operation_type, phase: data.phase,
    observed_at: now(), cwd: null, parameters: null, parameters_ref: null, before_state_ref: null,
    policy_decision_ref: null, authorization_ref: null, execution_status: 'NOT_STARTED', exit_code: null,
    stdout_ref: null, stderr_ref: null, after_state_ref: null, artifact_refs: [], context_event_refs: [], decision_refs: [],
    applicability: { nullable_fields: 'not applicable at this phase; terminal event supplies actual result or explicit uncertainty' },
    detail: null, ...data,
    // Never take identity from data supplied to this helper.
    ...identity,
  };
}

export type FeatureDefinition = {
  id: string; kind: 'CORE' | 'OPTIONAL' | 'MODE'; default: 'ON' | 'OFF'; scopes: string[];
  depends_on: string[]; conflicts: string[]; config_schema?: Json;
};
export type FeatureResolution = {
  id: string; desired: 'ON' | 'OFF'; effective: 'ON' | 'OFF' | 'BLOCKED';
  reason: string; revision: number; epoch: number; health: string;
};
export type PolicyDefinition = {
  id: string; level: 'L0' | 'L1' | 'L2' | 'L3'; degradable: boolean;
  enforcement_owner: string; modes: Record<string, string>;
};
export type Dimension = { status: Status; reason: string; coverage: string; applicable: boolean };
export type DiagnosticRequest = {
  language: string; source: string; document_uri: string; version: number; dialect?: string;
};
export type Diagnostic = {
  code: string; severity: 'error' | 'warning' | 'information'; message: string;
  range: { start: { line: number; character: number }; end: { line: number; character: number } } | null;
};
export type ValidationResult = {
  request_id: string; uri: string; version: number; source_sha256: string;
  checker_id: string; checker_version: string; feature_epoch: number; config_revision: number;
  dimensions: Record<'syntax' | 'args' | 'environment' | 'safety' | 'authorization', Dimension>;
  status: Status; reason: string; diagnostics: Diagnostic[]; evidence_refs: ArtifactRef[];
  timing: { started_at: string; elapsed_ms: number };
};
```
<!-- agentnexus-export-end -->

## src/agentnexus/integrity.ts

类别：`current_native_implementation`；原始字节数：18691。

源文件 SHA256：

```text
172a40c429c9e8a99f8cc1fcee2ef500adb4e7d378f0f6188fbbe7f792edfe66
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0011","path":"src/agentnexus/integrity.ts","bytes":18691,"sha256":"172a40c429c9e8a99f8cc1fcee2ef500adb4e7d378f0f6188fbbe7f792edfe66","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"current_native_implementation","kind":"original","origin":{"kind":"workspace","path":"src/agentnexus/integrity.ts"}} -->
```typescript
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import type { BigIntStats } from 'node:fs';
import { lstat, open, opendir, realpath } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { TextDecoder } from 'node:util';
import { canonical, NexusError, sha256 } from './types.ts';
import type { Status } from './types.ts';

// Independently authored. Only a trusted Host may select controlled_static after
// exclusively creating a local, quiescent staging tree (including trusted root
// ancestors, no reparse points/ADS). This library does not authenticate that fact.
// Do not use Node path checks as an adversarial filesystem/OS execution boundary.
export const INTEGRITY_LIMITS = Object.freeze({
  maxFiles: 256,
  maxTotalBytes: 16 * 1024 * 1024,
  maxFileBytes: 8 * 1024 * 1024,
  maxManifestBytes: 128 * 1024,
  maxDirectories: 256,
  maxEntries: 513,
  maxDepth: 12,
  maxComponentBytes: 64,
  maxRelativeBytes: 240,
  maxWindowsAbsoluteCharacters: 240,
  readBufferBytes: 64 * 1024,
  maxDetails: 32,
  maxDetailBytes: 8192,
  maxDurationMs: 10000,
  hashConcurrency: 1,
});

export type PackageEntry = { path: string; bytes: number; sha256: string };
export type PackageManifest = {
  schema: 'agentnexus/package/1'; profile: 'portable-ascii-v1'; files: PackageEntry[];
};
export type VerifyPackageOptions = {
  sourceMode: 'controlled_static' | 'mutable'; maxFiles?: number;
  maxTotalBytes?: number; signal?: AbortSignal;
};
export type IntegrityDetail = { code: string; path?: string };
export type IntegrityResult = {
  status: Status; reason: string; filesChecked: number; bytesChecked: number;
  manifest_sha256: string | null; details: IntegrityDetail[]; detailCount: number;
  detailsTruncated: boolean; checks: Record<string, string | boolean | number>;
};
type Inventory = { files: Map<string, BigIntStats>; directories: Map<string, BigIntStats> };

class Rejection extends NexusError {
  status: Status;
  path: string | undefined;
  constructor(status: Status, code: string, path?: string) {
    super(code); this.status = status; this.path = path;
  }
}

function reject(code: string, path?: string): never { throw new Rejection('FAIL', code, path); }
function budget(code: string, path?: string): never { throw new Rejection('INCONCLUSIVE', code, path); }
function objectWithKeys(value: unknown, keys: string[]): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}
function sameMetadata(a: BigIntStats, b: BigIntStats): boolean {
  return a.dev === b.dev && a.ino === b.ino && a.mode === b.mode && a.nlink === b.nlink
    && a.size === b.size && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs;
}
function identityAvailable(info: BigIntStats): boolean {
  return typeof info.ino === 'bigint' && info.ino > 0n && typeof info.dev === 'bigint';
}

// Includes ancestor components, so Dir/a + dir/b and file a + a/b conflict.
class PortablePaths {
  nodes = new Map<string, { path: string; kind: 'file' | 'directory' }>();
  add(path: string, kind: 'file' | 'directory'): void {
    if (path.length === 0 || path.length > INTEGRITY_LIMITS.maxRelativeBytes) reject('PATH_PROFILE', path);
    const parts = path.split('/');
    if (parts.length > INTEGRITY_LIMITS.maxDepth) budget('DEPTH_BUDGET', path);
    for (const part of parts) {
      if (part.length === 0 || part.length > INTEGRITY_LIMITS.maxComponentBytes
        || !/^[A-Za-z0-9._-]+$/.test(part) || part === '.' || part === '..' || part.endsWith('.')
        || /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part)) reject('PATH_PROFILE', path);
    }
    for (let i = 0; i < parts.length; i++) {
      const prefix = parts.slice(0, i + 1).join('/');
      const key = prefix.toLowerCase();
      const expectedKind = i === parts.length - 1 ? kind : 'directory';
      const prior = this.nodes.get(key);
      if (prior && prior.path !== prefix) reject('PATH_CASE_COLLISION', path);
      if (prior && prior.kind !== expectedKind) reject('PATH_PREFIX_CONFLICT', path);
      this.nodes.set(key, { path: prefix, kind: expectedKind });
    }
  }
}

export async function verifyPackage(root: string, options: VerifyPackageOptions): Promise<IntegrityResult> {
  const startedAt = performance.now();
  let startedWork = false;
  let filesChecked = 0;
  let bytesChecked = 0;
  let manifestHash: string | null = null;
  let detailCount = 0;
  const details: IntegrityDetail[] = [];
  const checks: Record<string, string | boolean | number> = {
    schema: false, canonical: false, portablePaths: false, bidirectional: false,
    fileContents: false, secondInventory: false,
    sourceMode: options?.sourceMode ?? 'INVALID',
    assurance: 'NO_OS_ADMISSION',
    hostPrecondition: 'trusted Host selects mode; controlled_static requires exclusive local staging, trusted ancestors, no hostile writer/reparse/ADS',
    allWindowsReparseTags: 'NOT_VERIFIED_BY_NODE',
    alternateDataStreams: 'NOT_ENUMERATED_BY_NODE',
    adversarialTOCTOU: 'NOT_CLOSED',
    deadlineEnforcement: 'COOPERATIVE_BETWEEN_FS_OPERATIONS',
    runtimeOrLicenseAdmission: 'NOT_EVALUATED',
    maxOpenFileHandles: 1,
  };
  const addDetail = (code: string, path?: string) => {
    detailCount++;
    const value: IntegrityDetail = path === undefined ? { code } : { code, path: path.slice(0, 240) };
    if (details.length < INTEGRITY_LIMITS.maxDetails
      && Buffer.byteLength(canonical([...details, value])) <= INTEGRITY_LIMITS.maxDetailBytes) details.push(value);
  };
  const finish = (status: Status, reason: string): IntegrityResult => ({
    status, reason, filesChecked, bytesChecked, manifest_sha256: manifestHash,
    details, detailCount, detailsTruncated: detailCount > details.length, checks,
  });

  try {
    if (!options || typeof options !== 'object'
      || Object.keys(options).some(key => !['sourceMode', 'maxFiles', 'maxTotalBytes', 'signal'].includes(key))
      || !['controlled_static', 'mutable'].includes(options.sourceMode)) reject('INVALID_OPTIONS');
    const maxFiles = options.maxFiles ?? INTEGRITY_LIMITS.maxFiles;
    const maxTotalBytes = options.maxTotalBytes ?? INTEGRITY_LIMITS.maxTotalBytes;
    if (!Number.isSafeInteger(maxFiles) || maxFiles < 0 || maxFiles > INTEGRITY_LIMITS.maxFiles
      || !Number.isSafeInteger(maxTotalBytes) || maxTotalBytes < 0 || maxTotalBytes > INTEGRITY_LIMITS.maxTotalBytes
      || (options.signal !== undefined && !(options.signal instanceof AbortSignal))) reject('INVALID_OPTIONS');
    checks.maxFiles = maxFiles; checks.maxTotalBytes = maxTotalBytes;
    const checkpoint = () => {
      if (options.signal?.aborted) throw new Rejection(startedWork ? 'INCONCLUSIVE' : 'NOT_RUN', 'CANCELLED');
      if (performance.now() - startedAt > INTEGRITY_LIMITS.maxDurationMs) budget('TIME_BUDGET');
    };
    checkpoint();
    if (typeof root !== 'string' || !isAbsolute(root) || root.includes('\0') || /^[/\\]{2}/.test(root)) reject('INVALID_ROOT');
    startedWork = true;
    let rootInfo: BigIntStats;
    try { rootInfo = await lstat(root, { bigint: true }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') reject('ROOT_NOT_FOUND'); throw error; }
    checkpoint();
    if (rootInfo.isSymbolicLink()) reject('LINK_PATH', '.');
    if (!rootInfo.isDirectory()) reject('ROOT_NOT_DIRECTORY');
    if (!identityAvailable(rootInfo)) budget('IDENTITY_UNAVAILABLE', '.');
    const base = await realpath(resolve(root));
    const absolute = (path: string): string => {
      const full = join(base, ...path.split('/'));
      const rel = relative(base, full);
      if (isAbsolute(rel) || rel === '..' || rel.startsWith('..' + sep)) reject('PATH_ESCAPE', path);
      if (process.platform === 'win32' && full.length > INTEGRITY_LIMITS.maxWindowsAbsoluteCharacters) reject('WINDOWS_PATH_LENGTH', path);
      return full;
    };
    const validateMetadata = (info: BigIntStats, path: string, kind: 'file' | 'directory') => {
      if (info.isSymbolicLink()) reject('LINK_PATH', path);
      if (kind === 'file' ? !info.isFile() : !info.isDirectory()) reject('NON_REGULAR_ENTRY', path);
      if (!identityAvailable(info)) budget('IDENTITY_UNAVAILABLE', path);
      if (info.dev !== rootInfo.dev) reject('CROSS_DEVICE', path);
      if (kind === 'file') {
        if (info.nlink > 1n) reject('HARDLINK_PATH', path);
        if (info.nlink !== 1n) budget('LINK_COUNT_UNAVAILABLE', path);
      }
    };
    const readRegular = async (path: string, expected: BigIntStats, cap: number, payload: boolean) => {
      checkpoint(); validateMetadata(expected, path, 'file');
      if (expected.size > BigInt(cap)) budget(payload ? 'FILE_BYTES_BUDGET' : 'MANIFEST_BYTES_BUDGET', path);
      let handle: FileHandle | undefined;
      try {
        const flags = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0);
        handle = await open(absolute(path), flags);
        const before = await handle.stat({ bigint: true });
        validateMetadata(before, path, 'file');
        if (!sameMetadata(before, expected)) reject('CHANGED_BEFORE_READ', path);
        const hash = createHash('sha256');
        const chunks: Buffer[] = [];
        const buffer = Buffer.allocUnsafe(INTEGRITY_LIMITS.readBufferBytes);
        let count = 0;
        while (true) {
          checkpoint();
          // A one-byte probe detects growth at a limit without reading a whole
          // extra chunk beyond either file or cumulative payload budgets.
          const length = Math.min(buffer.length, cap - count + 1,
            payload ? maxTotalBytes - bytesChecked + 1 : buffer.length);
          const read = await handle.read(buffer, 0, length, count);
          checkpoint();
          if (read.bytesRead === 0) break;
          count += read.bytesRead;
          if (payload) {
            bytesChecked += read.bytesRead;
            if (bytesChecked > maxTotalBytes) budget('TOTAL_BYTES_BUDGET', path);
          } else chunks.push(Buffer.from(buffer.subarray(0, read.bytesRead)));
          if (count > cap) budget(payload ? 'FILE_BYTES_BUDGET' : 'MANIFEST_BYTES_BUDGET', path);
          hash.update(buffer.subarray(0, read.bytesRead));
        }
        const after = await handle.stat({ bigint: true });
        validateMetadata(after, path, 'file');
        if (!sameMetadata(before, after) || BigInt(count) !== before.size) reject('CHANGED_DURING_READ', path);
        return { digest: hash.digest('hex'), raw: payload ? null : Buffer.concat(chunks), info: after };
      } finally { if (handle) await handle.close(); }
    };

    let manifestInfo: BigIntStats;
    try { manifestInfo = await lstat(absolute('manifest.json'), { bigint: true }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') reject('MANIFEST_MISSING'); throw error; }
    const manifestRead = await readRegular('manifest.json', manifestInfo, INTEGRITY_LIMITS.maxManifestBytes, false);
    const raw = manifestRead.raw!;
    manifestHash = sha256(raw);
    let manifest: unknown;
    try { manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw)); }
    catch { reject('MANIFEST_JSON'); }
    if (!objectWithKeys(manifest, ['schema', 'profile', 'files'])
      || manifest.schema !== 'agentnexus/package/1' || manifest.profile !== 'portable-ascii-v1'
      || !Array.isArray(manifest.files)) reject('MANIFEST_SCHEMA');
    if (manifest.files.length > maxFiles) budget('FILE_COUNT_BUDGET');
    const entries: PackageEntry[] = [];
    const listedPaths = new PortablePaths();
    const listed = new Set<string>();
    const wantedDirs = new Set<string>();
    let declaredBytes = 0;
    let previousPath: string | undefined;
    for (const item of manifest.files) {
      checkpoint();
      if (!objectWithKeys(item, ['path', 'bytes', 'sha256']) || typeof item.path !== 'string'
        || typeof item.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(item.sha256)
        || typeof item.bytes !== 'number' || !Number.isSafeInteger(item.bytes) || item.bytes < 0) reject('MANIFEST_ENTRY');
      if (item.path === 'manifest.json') reject('MANIFEST_LISTS_SELF', item.path);
      if (listed.has(item.path)) reject('DUPLICATE_PATH', item.path);
      listedPaths.add(item.path, 'file'); absolute(item.path);
      if (previousPath !== undefined && previousPath >= item.path) reject('MANIFEST_ORDER', item.path);
      previousPath = item.path;
      if (item.bytes > INTEGRITY_LIMITS.maxFileBytes) budget('FILE_BYTES_BUDGET', item.path);
      declaredBytes += item.bytes;
      if (declaredBytes > maxTotalBytes) budget('TOTAL_BYTES_BUDGET');
      listed.add(item.path);
      const components = item.path.split('/');
      for (let i = 1; i < components.length; i++) wantedDirs.add(components.slice(0, i).join('/'));
      entries.push({ path: item.path, bytes: item.bytes, sha256: item.sha256 });
    }
    checks.schema = true; checks.portablePaths = true;
    // Re-encoding the entire input, not just comparing parsed values, also rejects
    // duplicate JSON keys and alternative escapes that JSON.parse discards.
    if (!raw.equals(Buffer.from(canonical(manifest) + '\n', 'utf8'))) reject('MANIFEST_NONCANONICAL');
    checks.canonical = true;

    const inventory = async (): Promise<Inventory> => {
      const files = new Map<string, BigIntStats>();
      const directories = new Map<string, BigIntStats>();
      const seenIdentity = new Set<string>();
      const portable = new PortablePaths();
      const queue = [''];
      let count = 0;
      let actualBytes = 0n;
      for (let index = 0; index < queue.length; index++) {
        checkpoint();
        const current = queue[index];
        const directoryPath = current === '' ? base : absolute(current);
        const before = await lstat(directoryPath, { bigint: true });
        validateMetadata(before, current || '.', 'directory');
        if (current === '' && !sameMetadata(before, rootInfo)) reject('ROOT_CHANGED');
        const directory = await opendir(directoryPath, { bufferSize: 16 });
        try {
          while (true) {
            checkpoint();
            const entry = await directory.read();
            if (!entry) break;
            if (++count > INTEGRITY_LIMITS.maxEntries) budget('ENTRY_COUNT_BUDGET');
            const path = current === '' ? entry.name : current + '/' + entry.name;
            // Validate spelling before resolving or opening an entry.
            portable.add(path, entry.isDirectory() ? 'directory' : 'file');
            const info = await lstat(absolute(path), { bigint: true });
            if (info.isSymbolicLink()) reject('LINK_PATH', path);
            const kind = info.isDirectory() ? 'directory' : 'file';
            portable.add(path, kind);
            validateMetadata(info, path, kind);
            const identity = info.dev.toString() + ':' + info.ino.toString();
            if (seenIdentity.has(identity)) reject('REPEATED_FILE_IDENTITY', path);
            seenIdentity.add(identity);
            if (kind === 'directory') {
              directories.set(path, info);
              if (directories.size > INTEGRITY_LIMITS.maxDirectories) budget('DIRECTORY_COUNT_BUDGET');
              queue.push(path);
            } else {
              files.set(path, info);
              if (files.size - (files.has('manifest.json') ? 1 : 0) > maxFiles) budget('FILE_COUNT_BUDGET');
              if (path !== 'manifest.json' && info.size > BigInt(INTEGRITY_LIMITS.maxFileBytes)) budget('FILE_BYTES_BUDGET', path);
              if (path !== 'manifest.json') actualBytes += info.size;
              if (actualBytes > BigInt(maxTotalBytes)) budget('TOTAL_BYTES_BUDGET', path);
            }
          }
        } finally { await directory.close(); }
        const after = await lstat(directoryPath, { bigint: true });
        if (!sameMetadata(before, after)) reject('DIRECTORY_CHANGED', current || '.');
      }
      return { files, directories };
    };

    const actual = await inventory();
    if (!actual.files.has('manifest.json')) reject('MANIFEST_EXACT_PATH');
    if (!sameMetadata(actual.files.get('manifest.json')!, manifestRead.info)) reject('MANIFEST_CHANGED');
    for (const path of listed) if (!actual.files.has(path)) addDetail('MISSING_FILE', path);
    for (const path of actual.files.keys()) if (path !== 'manifest.json' && !listed.has(path)) addDetail('UNLISTED_FILE', path);
    for (const path of actual.directories.keys()) if (!wantedDirs.has(path)) addDetail('UNLISTED_DIRECTORY', path);
    for (const path of wantedDirs) if (!actual.directories.has(path)) addDetail('MISSING_DIRECTORY', path);
    if (detailCount > 0) return finish('FAIL', 'INVENTORY_MISMATCH');
    checks.bidirectional = true;
    for (const item of entries) {
      checkpoint();
      const expected = actual.files.get(item.path)!;
      if (expected.size !== BigInt(item.bytes)) reject('BYTES_MISMATCH', item.path);
      const content = await readRegular(item.path, expected, INTEGRITY_LIMITS.maxFileBytes, true);
      if (content.digest !== item.sha256) reject('HASH_MISMATCH', item.path);
      filesChecked++;
    }
    checks.fileContents = true;
    const again = await inventory();
    for (const [kind, first, second] of [
      ['file', actual.files, again.files], ['directory', actual.directories, again.directories],
    ] as const) {
      if (first.size !== second.size) reject('TREE_CHANGED', kind);
      for (const [path, info] of first) if (!second.has(path) || !sameMetadata(info, second.get(path)!)) reject('TREE_CHANGED', path);
    }
    checkpoint();
    checks.secondInventory = true;
    if (options.sourceMode === 'mutable') return finish('INCONCLUSIVE', 'TOCTOU_NOT_CLOSED');
    checks.assurance = 'CONTROLLED_STATIC_HOST_PRECONDITION_ONLY';
    return finish('PASS', 'CONTROLLED_STATIC_CONTENT_MATCH');
  } catch (error) {
    if (error instanceof Rejection) { addDetail(error.code, error.path); return finish(error.status, error.code); }
    if (error instanceof NexusError) { addDetail(error.code); return finish('FAIL', error.code); }
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT' || code === 'ENOTDIR') { addDetail('SOURCE_CHANGED'); return finish('FAIL', 'SOURCE_CHANGED'); }
    if (code === 'ELOOP') { addDetail('LINK_PATH'); return finish('FAIL', 'LINK_PATH'); }
    addDetail(typeof code === 'string' && /^[A-Z0-9_]{1,48}$/.test(code) ? code : 'IO_ERROR');
    return finish('INCONCLUSIVE', 'IO_ERROR');
  }
}
```
<!-- agentnexus-export-end -->

