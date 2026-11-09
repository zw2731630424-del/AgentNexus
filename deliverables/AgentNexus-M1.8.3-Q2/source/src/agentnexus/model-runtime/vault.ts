// Host authority only. DPAPI encryption is not same-account Agent isolation.
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { constants, closeSync, lstatSync, mkdirSync, openSync, readSync, realpathSync } from 'node:fs';
import { isAbsolute, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { assertServiceBoundary, SERVICE_DATA_ROOT } from '../credential-service/boundary.ts';
import type { ServiceBoundary } from '../credential-service/boundary.ts';

export interface CredentialProviderInterface {
  readonly id: string;
  readonly protection: string;
  protect(bytes: Uint8Array): Promise<Uint8Array>;
  unprotect(bytes: Uint8Array): Promise<Uint8Array>;
}
export class VaultError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.name = 'VaultError'; this.code = code; }
}
function fail(code: string): never { throw new VaultError(code); }
function check(ok: unknown, code: string): asserts ok { if (!ok) fail(code); }

/** The random master key is never persisted. Reopen requires this same object. */
export class SyntheticMemoryProtector implements CredentialProviderInterface {
  readonly id = 'synthetic-memory-aes256gcm-v1';
  readonly protection = 'SYNTHETIC_MEMORY_AES_256_GCM';
  #key = randomBytes(32);
  #destroyed = false;
  async protect(bytes: Uint8Array): Promise<Uint8Array> {
    check(!this.#destroyed, 'VAULT_PROTECTOR_CLOSED');
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.#key, iv);
    const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
    return Buffer.concat([Buffer.from('ANV1'), iv, cipher.getAuthTag(), ciphertext]);
  }
  async unprotect(bytes: Uint8Array): Promise<Uint8Array> {
    check(!this.#destroyed, 'VAULT_PROTECTOR_CLOSED');
    try {
      const data = Buffer.from(bytes);
      check(data.length >= 32 && data.subarray(0, 4).equals(Buffer.from('ANV1')), 'VAULT_UNPROTECT_FAILED');
      const decipher = createDecipheriv('aes-256-gcm', this.#key, data.subarray(4, 16));
      decipher.setAuthTag(data.subarray(16, 32));
      return Buffer.concat([decipher.update(data.subarray(32)), decipher.final()]);
    } catch { fail('VAULT_UNPROTECT_FAILED'); }
  }
  destroy(): void { this.#key.fill(0); this.#destroyed = true; }
}

/** Fixed helper, anonymous binary pipes, shell=false, and no inherited env. */
export class WindowsCurrentUserDpapiProtector implements CredentialProviderInterface {
  readonly id = 'windows-current-user-dpapi-v1';
  readonly protection = 'WINDOWS_DPAPI_CURRENT_USER';
  #powershell: string;
  #helpers = 0;
  #poisoned = false;
  constructor(options: { powershell?: string } = {}) {
    this.#powershell = options.powershell ?? 'C:\\Program Files\\PowerShell\\7\\pwsh.exe';
    check(isAbsolute(this.#powershell) && /(?:pwsh|powershell)\.exe$/i.test(this.#powershell), 'VAULT_DPAPI_EXECUTABLE');
  }
  protect(bytes: Uint8Array): Promise<Uint8Array> { return this.#run('Protect', bytes); }
  unprotect(bytes: Uint8Array): Promise<Uint8Array> { return this.#run('Unprotect', bytes); }
  async #run(operation: 'Protect' | 'Unprotect', bytes: Uint8Array): Promise<Uint8Array> {
    check(process.platform === 'win32', 'VAULT_DPAPI_WINDOWS_REQUIRED');
    check(!this.#poisoned, 'VAULT_DPAPI_REQUALIFICATION_REQUIRED');
    check(this.#helpers < 2, 'VAULT_DPAPI_BUSY');
    check(bytes.byteLength > 0 && bytes.byteLength <= 64 * 1024, 'VAULT_DPAPI_INPUT');
    const input = Buffer.from(bytes), helper = fileURLToPath(new URL('./dpapi.ps1', import.meta.url));
    this.#helpers++;
    return new Promise<Uint8Array>((accept, reject) => {
      let child: ReturnType<typeof spawn>;
      try {
        child = spawn(this.#powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', helper, '-Operation', operation], {
          shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
          env: { SystemRoot: 'C:\\Windows', WINDIR: 'C:\\Windows', POWERSHELL_TELEMETRY_OPTOUT: '1' },
        });
      } catch { this.#helpers--; input.fill(0); reject(new VaultError('VAULT_DPAPI_FAILED')); return; }
      const chunks: Buffer[] = []; let size = 0, failed = false, finished = false;
      let operationTimer: NodeJS.Timeout | undefined, terminationTimer: NodeJS.Timeout | undefined;
      const finish = (status: 'SUCCESS' | 'FAILED' | 'UNCONFIRMED') => {
        if (finished) return; finished = true;
        if (status === 'UNCONFIRMED') this.#poisoned = true;
        else this.#helpers--;
        clearTimeout(operationTimer); clearTimeout(terminationTimer); input.fill(0);
        const output = status === 'SUCCESS' && !failed && size > 0 && size <= 128 * 1024 ? Buffer.concat(chunks) : undefined;
        for (const chunk of chunks) chunk.fill(0); chunks.length = 0;
        if (output) accept(output);
        else reject(new VaultError(status === 'UNCONFIRMED' ? 'VAULT_DPAPI_TERMINATION_UNCONFIRMED' : 'VAULT_DPAPI_FAILED'));
      };
      const terminate = () => {
        failed = true; if (finished || terminationTimer) return;
        // A successful kill() call is not evidence of exit. Only close confirms it.
        terminationTimer = setTimeout(() => {
          for (const stream of [child.stdin, child.stdout, child.stderr]) { try { stream?.destroy(); } catch { /* Static failure below. */ } }
          try { child.unref(); } catch { /* Exit remains unconfirmed. */ }
          finish('UNCONFIRMED');
        }, 2_000);
        try { child.kill(); } catch { /* No native error text is retained. */ }
      };
      // Keep all error listeners installed even after rejection: delayed ENOTCONN
      // and pipe errors must never become uncaught Host exceptions.
      child.on('error', terminate);
      child.stdin?.on('error', terminate); child.stdout?.on('error', terminate); child.stderr?.on('error', terminate);
      child.stdout?.on('data', (chunk: Buffer) => {
        if (finished || failed) { chunk.fill(0); return; }
        size += chunk.length;
        if (size > 128 * 1024) { chunk.fill(0); terminate(); } else chunks.push(chunk);
      });
      child.stderr?.on('data', (chunk: Buffer) => { chunk.fill(0); terminate(); });
      child.once('close', code => finish(code === 0 ? 'SUCCESS' : 'FAILED'));
      operationTimer = setTimeout(terminate, 15_000);
      try { if (!child.stdin || !child.stdout || !child.stderr) terminate(); else child.stdin.end(input); }
      catch { terminate(); }
    });
  }
}

const ADMIN = Symbol('host-vault-admin'), admins = new WeakSet<object>();
export type VaultAdminCapability = Readonly<{ readonly [ADMIN]: true }>;
export function createVaultAdminCapability(): VaultAdminCapability {
  const capability: VaultAdminCapability = Object.freeze({ [ADMIN]: true as const });
  admins.add(capability); return capability;
}
export type CredentialState = 'ACTIVE' | 'DISABLED' | 'INVALID' | 'RATE_LIMITED' | 'EXPIRED' | 'ROTATING' | 'QUARANTINED';
const STATES: CredentialState[] = ['ACTIVE', 'DISABLED', 'INVALID', 'RATE_LIMITED', 'EXPIRED', 'ROTATING', 'QUARANTINED'];
export type CredentialSpec = {
  key_id: string; provider_id: string; models: string[]; secret: Uint8Array;
  max_concurrency: number; requests_per_minute: number; expires_at?: number | string; cost_limit_micros?: number;
};
export type CredentialLease = Readonly<{ lease_id: string; key_handle_id: string }>;
export type AcquireCredential = { provider_id: string; model_id: string; request_id: string; estimated_cost_micros: number; subject_key: string; key_handle_id?: string };
export type CredentialSettlement = { outcome: 'SUCCESS' | 'AUTH' | 'RATE_LIMIT' | 'NOT_SENT' | 'UNKNOWN'; cost_micros: number; usage_source: 'SIMULATED' | 'PROVIDER'; retry_after_ms?: number };
export type VaultSecurityEvent = { code: 'KNOWN_SECRET_BLOCKED'; channel: 'VAULT_GUARD'; at: number };
export type CredentialInfo = {
  key_id: string; key_handle_id: string; provider_id: string; models: string[]; state: CredentialState;
  max_concurrency: number; requests_per_minute: number; cost_limit_micros: number;
  spent_micros: number; reserved_micros: number; in_flight: number; expires_at?: number;
  protection: string; classification: 'SYNTHETIC';
};
export interface KnownSecretGuard { assertSafe(value: string | Uint8Array, channel: string): void; streamHoldbackChars(): number; }
type Row = Record<string, any>;
const PREFIX = 'synthetic-test-';
const MAX_KEYS = 128, MAX_IMPORTS = 1024, MAX_REQUEST_RECORDS = 4096, MAX_EVENTS = 256;
function integer(value: unknown, minimum = 0): value is number { return Number.isSafeInteger(value) && Number(value) >= minimum; }
function identifier(value: unknown): value is string { return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/.test(value); }
function normalizeEscapes(text: string): string {
  return text.replace(/\\u([a-f0-9]{4})/gi, (_all, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\(["\\/bfnrt])/g, (_all, char: string) => ({ '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' }[char]!));
}
function secretVariants(bytes: Uint8Array): string[] {
  const raw = Buffer.from(bytes).toString('utf8');
  return [...new Set([raw, JSON.stringify(raw).slice(1, -1), encodeURIComponent(raw), encodeURI(raw),
    Buffer.from(bytes).toString('base64'), Buffer.from(bytes).toString('base64url')])];
}
function guardForms(value: string | Uint8Array): string[] {
  let current = typeof value === 'string' ? value : Buffer.from(value).toString('utf8');
  const forms = new Set([current]);
  for (let pass = 0; pass < 3; pass++) {
    current = normalizeEscapes(current); forms.add(current);
    try { current = decodeURIComponent(current); forms.add(current); } catch { /* Check malformed URL verbatim. */ }
  }
  return [...forms];
}
/** Scan an incoming secret against metadata before that secret is registered or
 * any intent/audit is persisted. This exposes no information about stored keys. */
export function assertPendingSecretMetadataSafe(bytes: Uint8Array, metadata: string): void {
  const variants = secretVariants(bytes);
  check(!guardForms(metadata).some(form => variants.some(variant => form.includes(variant))), 'VAULT_KNOWN_SECRET_BLOCKED');
}
class VaultGuard implements KnownSecretGuard {
  #closed=false;
  #known = new Map<string, { key_id: string; variants: string[] }>();
  #leak: (ids: string[]) => void;
  #fresh: () => void;
  constructor(leak: (ids: string[]) => void, fresh: () => void) { this.#leak = leak; this.#fresh = fresh; }
  add(id: string, bytes: Uint8Array, handle: string): void {
    check(!this.#closed, 'VAULT_GUARD_CLOSED');
    const variants = secretVariants(bytes), old = this.#known.get(handle);
    if (old) { check(old.key_id === id && JSON.stringify(old.variants) === JSON.stringify(variants), 'VAULT_GUARD_INTEGRITY'); return; }
    check(this.#known.size < MAX_IMPORTS, 'VAULT_IMPORT_CAPACITY');
    this.#known.set(handle, { key_id: id, variants });
  }
  assertImportSafe(id: string, bytes: Uint8Array, metadata: string): void {
    this.assertSafe(metadata, 'VAULT_METADATA');
    const variants = secretVariants(bytes);
    if (guardForms(metadata).some(form => variants.some(variant => form.includes(variant)))) {
      this.#leak([id]); fail('VAULT_KNOWN_SECRET_BLOCKED');
    }
  }
  assertSafe(value: string | Uint8Array, _channel: string): void {
    check(!this.#closed,'VAULT_GUARD_CLOSED');
    this.#fresh();
    check(typeof value === 'string' || value instanceof Uint8Array, 'VAULT_GUARD_INPUT');
    const forms = guardForms(value), leaked = new Set<string>();
    for (const { key_id, variants } of this.#known.values()) if (forms.some(form => variants.some(variant => form.includes(variant)))) leaked.add(key_id);
    if (leaked.size) { this.#leak([...leaked]); fail('VAULT_KNOWN_SECRET_BLOCKED'); }
  }
  streamHoldbackChars(): number {
    let limit = 32;
    for (const { variants } of this.#known.values()) for (const value of variants) limit = Math.max(limit, value.length * 6);
    return limit;
  }
  clear(): void { this.#closed=true;this.#known.clear(); }
}

const APPLICATION_ID = 0x414e5638;
function present(path: string): boolean {
  try { lstatSync(path); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; fail('VAULT_UNSAFE_PATH'); }
}
function safeExisting(path: string, directory: boolean): void {
  const stat = lstatSync(path);
  check(!stat.isSymbolicLink() && (directory ? stat.isDirectory() : stat.isFile()), 'VAULT_UNSAFE_PATH');
  if (!directory) check(stat.nlink === 1, 'VAULT_UNSAFE_PATH');
  if (process.platform !== 'win32') {
    check(typeof process.getuid !== 'function' || stat.uid === process.getuid(), 'VAULT_UNSAFE_OWNER');
    check((stat.mode & 0o077) === 0, 'VAULT_UNSAFE_PERMISSIONS');
  }
}
function checkAncestors(path: string): void {
  const absolute = resolve(path), root = parse(absolute).root;
  let current = root;
  for (const part of absolute.slice(root.length).split(/[\\/]+/).filter(Boolean)) {
    current = join(current, part);
    if (!present(current)) continue;
    const stat = lstatSync(current);
    check(stat.isDirectory() && !stat.isSymbolicLink(), 'VAULT_UNSAFE_PATH');
    const actual = realpathSync.native(current);
    check(process.platform === 'win32' ? actual.toLowerCase() === current.toLowerCase() : actual === current, 'VAULT_UNSAFE_PATH');
  }
}
function checkDatabaseFiles(root: string): void {
  checkAncestors(root); safeExisting(root, true);
  for (const name of ['vault.sqlite', 'vault.sqlite-wal', 'vault.sqlite-shm', 'vault.sqlite-journal']) {
    const path = join(root, name); if (present(path)) safeExisting(path, false);
  }
}
function sqliteHeader(path: string): void {
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try { const bytes = Buffer.alloc(16); check(readSync(fd, bytes, 0, 16, 0) === 16 && bytes.equals(Buffer.from('SQLite format 3\0')), 'VAULT_INVALID_DATABASE'); }
  finally { closeSync(fd); }
}

export class CredentialVault {
  readonly assurance: 'SIMULATED' | 'REAL';
  readonly guard: KnownSecretGuard;
  #root: string;
  #admin: VaultAdminCapability;
  #db: DatabaseSync;
  #protector: CredentialProviderInterface;
  #guard: VaultGuard;
  #loadedGeneration = -1;
  #closed = false;
  #activeCallbacks = new Set<string>();
  #events: VaultSecurityEvent[] = [];
  #eventCount = 0;
  private constructor(root: string, admin: VaultAdminCapability, db: DatabaseSync, protector: CredentialProviderInterface, mode: 'SYNTHETIC' | 'LIVE') {
    this.assurance = mode === 'LIVE' ? 'REAL' : 'SIMULATED';
    this.#root = root; this.#admin = admin; this.#db = db; this.#protector = protector;
    this.#guard = new VaultGuard(ids => {
      this.#eventCount = Math.min(Number.MAX_SAFE_INTEGER, this.#eventCount + 1);
      this.#events.push(Object.freeze({ code: 'KNOWN_SECRET_BLOCKED', channel: 'VAULT_GUARD', at: Date.now() }));
      if (this.#events.length > MAX_EVENTS) this.#events.shift();
      if (!this.#closed) this.#transaction(() => { for (const id of ids) this.#db.prepare("UPDATE credentials SET state='QUARANTINED' WHERE key_id=?").run(id); });
    }, () => this.#assertGuardFresh());
    this.guard = this.#guard;
  }
  static async open(options: { root: string; admin: VaultAdminCapability; protector?: CredentialProviderInterface; mode: 'SYNTHETIC' | 'LIVE'; powershell?: string; serviceBoundary?: ServiceBoundary }): Promise<CredentialVault> {
    check(options && options.admin && admins.has(options.admin), 'VAULT_ADMIN_REQUIRED');
    if (options.mode === 'LIVE') {
      check(options.serviceBoundary, 'VAULT_LIVE_IMPORT_BLOCKED');
      assertServiceBoundary(options.serviceBoundary);
      check(options.serviceBoundary.mode === 'QUALIFIED' && resolve(options.root).toLowerCase() === resolve(SERVICE_DATA_ROOT, 'credentials').toLowerCase() && !options.protector, 'VAULT_LIVE_IMPORT_BLOCKED');
    } else check(options.mode === 'SYNTHETIC', 'VAULT_LIVE_IMPORT_BLOCKED');
    check(typeof options.root === 'string' && options.root.length > 0 && !/[\x00-\x1f]/.test(options.root), 'VAULT_UNSAFE_PATH');
    const root = resolve(options.root), protector = options.protector ?? new WindowsCurrentUserDpapiProtector({ powershell: options.powershell });
    check(identifier(protector.id) && identifier(protector.protection) && typeof protector.protect === 'function' && typeof protector.unprotect === 'function', 'VAULT_PROTECTOR_INVALID');
    let db: DatabaseSync | undefined;
    try {
      checkAncestors(root); mkdirSync(root, { recursive: true, mode: 0o700 }); checkDatabaseFiles(root);
      const database = join(root, 'vault.sqlite'), existing = present(database);
      if (existing) sqliteHeader(database);
      else closeSync(openSync(database, constants.O_CREAT | constants.O_EXCL | constants.O_RDWR | (constants.O_NOFOLLOW ?? 0), 0o600));
      db = new DatabaseSync(database, { timeout: 5_000 });
      if (existing) {
        check((db.prepare('PRAGMA application_id').get() as Row).application_id === APPLICATION_ID, 'VAULT_INVALID_DATABASE');
        check((db.prepare('PRAGMA user_version').get() as Row).user_version === 1, 'VAULT_SCHEMA_MISMATCH');
      }
      db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA trusted_schema=OFF;');
      if (!existing) {
        db.exec(`PRAGMA application_id=${APPLICATION_ID}; PRAGMA user_version=1;
          CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
          CREATE TABLE credentials(key_id TEXT PRIMARY KEY, key_handle_id TEXT UNIQUE NOT NULL, provider_id TEXT NOT NULL,
            models_json TEXT NOT NULL, ciphertext BLOB NOT NULL, state TEXT NOT NULL, max_concurrency INTEGER NOT NULL,
            requests_per_minute INTEGER NOT NULL, expires_at INTEGER, cost_limit_micros INTEGER NOT NULL,
            spent_micros INTEGER NOT NULL DEFAULT 0, reserved_micros INTEGER NOT NULL DEFAULT 0,
            cooldown_until INTEGER NOT NULL DEFAULT 0, selected_order INTEGER NOT NULL DEFAULT 0, failures INTEGER NOT NULL DEFAULT 0) STRICT;
          CREATE TABLE leases(lease_id TEXT PRIMARY KEY, key_id TEXT NOT NULL REFERENCES credentials(key_id), request_id TEXT UNIQUE NOT NULL, model_id TEXT NOT NULL,
            subject_key TEXT NOT NULL, estimated_cost_micros INTEGER NOT NULL, state TEXT NOT NULL,
            created_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0, outcome TEXT, cost_micros INTEGER, usage_source TEXT) STRICT;
          CREATE INDEX lease_key_state ON leases(key_id,state);
          CREATE INDEX lease_window ON leases(key_id,created_at);
          CREATE TABLE request_tombstones(request_id TEXT PRIMARY KEY,subject_key TEXT NOT NULL) STRICT;`);
        const insert = db.prepare('INSERT INTO metadata(key,value) VALUES (?,?)');
        insert.run('protection', protector.protection); insert.run('protector', protector.id); insert.run('mode', options.mode); insert.run('generation', '0');
      }
      check((db.prepare("SELECT value FROM metadata WHERE key='protector'").get() as Row)?.value === protector.id &&
        (db.prepare("SELECT value FROM metadata WHERE key='protection'").get() as Row)?.value === protector.protection &&
        ['SYNTHETIC', 'LIVE'].includes((db.prepare("SELECT value FROM metadata WHERE key='mode'").get() as Row)?.value) &&
        (db.prepare("SELECT value FROM metadata WHERE key='mode'").get() as Row)?.value === options.mode, 'VAULT_PROTECTOR_MISMATCH');
      check((db.prepare('PRAGMA quick_check').get() as Row).quick_check === 'ok', 'VAULT_INVALID_DATABASE');
      checkDatabaseFiles(root);
      const vault = new CredentialVault(root, options.admin, db, protector, options.mode);
      // Reopen cannot establish whether a request reached a provider. Never reissue it.
      db.prepare("UPDATE leases SET state='UNKNOWN',outcome='UNKNOWN' WHERE state='INFLIGHT'").run();
      await vault.refreshGuard(options.admin);
      return vault;
    } catch (error) {
      try { db?.close(); } catch { /* Preserve static error only. */ }
      if (error instanceof VaultError) throw error; fail('VAULT_OPEN_FAILED');
    }
  }
  #check(admin: VaultAdminCapability, fresh = true): void {
    check(admin === this.#admin && admins.has(admin), 'VAULT_ADMIN_REQUIRED'); check(!this.#closed, 'VAULT_CLOSED');
    try { checkDatabaseFiles(this.#root); } catch { fail('VAULT_UNSAFE_PATH'); }
    if (fresh) this.#assertGuardFresh();
  }
  #generation(): number {
    try {
      const row = this.#db.prepare("SELECT value FROM metadata WHERE key='generation'").get() as Row | undefined;
      check(typeof row?.value === 'string' && /^(0|[1-9][0-9]*)$/.test(row.value), 'VAULT_GUARD_STALE');
      const value = Number(row.value); check(integer(value) && value <= MAX_IMPORTS, 'VAULT_GUARD_STALE'); return value;
    } catch { return fail('VAULT_GUARD_STALE'); }
  }
  #assertGuardFresh(): void { check(!this.#closed, 'VAULT_GUARD_CLOSED'); check(this.#generation() === this.#loadedGeneration, 'VAULT_GUARD_STALE'); }
  #preflightImport(key_id: string): void {
    check(!this.#db.prepare('SELECT 1 FROM credentials WHERE key_id=?').get(key_id), 'VAULT_KEY_EXISTS');
    check(Number((this.#db.prepare('SELECT count(*) AS n FROM credentials').get() as Row).n) < MAX_KEYS, 'VAULT_KEY_CAPACITY');
    check(this.#generation() < MAX_IMPORTS, 'VAULT_IMPORT_CAPACITY');
  }
  #advanceGeneration(): number {
    const generation = this.#generation(); check(generation < MAX_IMPORTS, 'VAULT_IMPORT_CAPACITY');
    this.#db.prepare("UPDATE metadata SET value=? WHERE key='generation'").run(String(generation + 1)); return generation + 1;
  }
  /** Owner-only refresh. Existing patterns remain installed throughout all awaits. */
  async refreshGuard(admin: VaultAdminCapability): Promise<void> {
    this.#check(admin, false);
    const staged: { id: string; handle: string; bytes: Uint8Array }[] = [];
    try {
      const generation = this.#generation();
      const sizes = this.#db.prepare('SELECT count(*) AS n,COALESCE(max(length(ciphertext)),0) AS bytes FROM credentials').get() as Row;
      check(sizes.n <= MAX_KEYS && sizes.bytes <= 128 * 1024, 'VAULT_IMPORT_CAPACITY');
      const rows = this.#db.prepare('SELECT key_id,key_handle_id,ciphertext FROM credentials').all() as Row[];
      for (const row of rows) {
        let clear: Uint8Array | undefined;
        try {
          clear = await this.#protector.unprotect(row.ciphertext as Uint8Array); this.#assertSynthetic(clear);
          staged.push({ id: row.key_id, handle: row.key_handle_id, bytes: clear }); clear = undefined;
        } catch { fail('VAULT_UNPROTECT_FAILED'); } finally { clear?.fill(0); }
      }
      this.#check(admin, false); check(this.#generation() === generation, 'VAULT_GUARD_STALE');
      for (const row of staged) this.#guard.add(row.id, row.bytes, row.handle);
      this.#loadedGeneration = generation;
    } catch (error) {
      this.#loadedGeneration = -1;
      if (error instanceof VaultError) throw error; fail('VAULT_GUARD_REFRESH_FAILED');
    } finally { for (const row of staged) row.bytes.fill(0); }
  }
  #transaction<T>(action: () => T): T {
    try { this.#db.exec('BEGIN IMMEDIATE'); const result = action(); this.#db.exec('COMMIT'); return result; }
    catch (error) { try { this.#db.exec('ROLLBACK'); } catch { /* Fail closed. */ } if (error instanceof VaultError) throw error; fail('VAULT_STORAGE_FAILED'); }
  }
  #assertSynthetic(bytes: Uint8Array): void {
    if (this.assurance === 'REAL') {
      check(bytes instanceof Uint8Array && bytes.length >= 24 && bytes.length <= 4096 && [...bytes].every(byte => byte >= 33 && byte <= 126), 'VAULT_SECRET_FORMAT'); return;
    }
    check(bytes instanceof Uint8Array && bytes.length > PREFIX.length && bytes.length <= 4096, 'VAULT_SYNTHETIC_SECRET_REQUIRED');
    check(Buffer.from(bytes).subarray(0, PREFIX.length).toString('ascii') === PREFIX && [...bytes].every(byte => byte >= 33 && byte <= 126), 'VAULT_SYNTHETIC_SECRET_REQUIRED');
  }
  #spec(spec: CredentialSpec): { expires: number | null; limit: number } {
    check(spec && identifier(spec.key_id) && identifier(spec.provider_id) && Array.isArray(spec.models) && spec.models.length > 0 &&
      spec.models.length <= 128 && spec.models.every(identifier) && new Set(spec.models).size === spec.models.length, 'VAULT_INVALID_SPEC');
    check(integer(spec.max_concurrency, 1) && spec.max_concurrency <= 1024 && integer(spec.requests_per_minute, 1) && spec.requests_per_minute <= 1_000_000, 'VAULT_INVALID_LIMIT');
    const expires = spec.expires_at === undefined ? null : typeof spec.expires_at === 'string' ? Date.parse(spec.expires_at) : spec.expires_at;
    const limit = spec.cost_limit_micros ?? Number.MAX_SAFE_INTEGER;
    check((expires === null || integer(expires, 1)) && integer(limit), 'VAULT_INVALID_LIMIT');
    this.#assertSynthetic(spec.secret); return { expires, limit };
  }
  async #encrypt(spec: CredentialSpec): Promise<Uint8Array> {
    const clear = Buffer.from(spec.secret);
    try {
      const encrypted = await this.#protector.protect(clear);
      check(encrypted instanceof Uint8Array && encrypted.length > 0 && encrypted.length <= 128 * 1024 && !Buffer.from(encrypted).includes(clear), 'VAULT_PROTECT_FAILED');
      return encrypted;
    } catch { fail('VAULT_PROTECT_FAILED'); } finally { clear.fill(0); }
  }
  #insert(spec: CredentialSpec, parsed: { expires: number | null; limit: number }, encrypted: Uint8Array): string {
    this.#preflightImport(spec.key_id); const handle = randomUUID();
    this.#db.prepare(`INSERT INTO credentials(key_id,key_handle_id,provider_id,models_json,ciphertext,state,max_concurrency,requests_per_minute,expires_at,cost_limit_micros)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(spec.key_id, handle, spec.provider_id, JSON.stringify(spec.models), encrypted,
        parsed.expires !== null && parsed.expires <= Date.now() ? 'EXPIRED' : 'ACTIVE', spec.max_concurrency, spec.requests_per_minute, parsed.expires, parsed.limit);
    return handle;
  }
  async add(admin: VaultAdminCapability, spec: CredentialSpec, beforeCommit?: () => void): Promise<CredentialInfo> {
    this.#check(admin); this.#spec(spec);
    this.#preflightImport(spec.key_id);
    spec = { ...spec, models: [...spec.models], secret: Buffer.from(spec.secret) };
    const parsed = this.#spec(spec); let encrypted: Uint8Array | undefined;
    try {
      this.#guard.assertImportSafe(spec.key_id, spec.secret, JSON.stringify({ ...spec, secret: undefined }));
      encrypted = await this.#encrypt(spec);
      beforeCommit?.();
      this.#check(admin);
      this.#guard.assertImportSafe(spec.key_id, spec.secret, JSON.stringify({ ...spec, secret: undefined }));
      const committed = this.#transaction(() => {
        this.#assertGuardFresh(); const handle = this.#insert(spec, parsed, encrypted!);
        return { handle, generation: this.#advanceGeneration() };
      });
      this.#guard.add(spec.key_id, spec.secret, committed.handle); this.#loadedGeneration = committed.generation;
    } finally { encrypted?.fill(0); spec.secret.fill(0); }
    return this.list(admin).find(key => key.key_id === spec.key_id)!;
  }
  setState(admin: VaultAdminCapability, key_id: string, state: CredentialState): void {
    this.#check(admin); check(identifier(key_id) && STATES.includes(state), 'VAULT_INVALID_STATE');
    const row = this.#db.prepare('SELECT expires_at FROM credentials WHERE key_id=?').get(key_id) as Row | undefined;
    check(row, 'VAULT_KEY_NOT_FOUND'); check(state !== 'ACTIVE' || row.expires_at === null || row.expires_at > Date.now(), 'VAULT_KEY_EXPIRED');
    this.#db.prepare('UPDATE credentials SET state=?,cooldown_until=? WHERE key_id=?').run(state, state === 'RATE_LIMITED' ? Number.MAX_SAFE_INTEGER : 0, key_id);
  }
  /** Host-only metadata update. New leases see the current configured model scope. */
  setModels(admin: VaultAdminCapability, key_id: string, models: string[]): void {
    this.#check(admin);
    check(identifier(key_id) && Array.isArray(models) && models.length <= 128 && models.every(identifier) && new Set(models).size === models.length, 'VAULT_INVALID_SPEC');
    this.#guard.assertSafe(JSON.stringify(models), 'VAULT_METADATA');
    check(this.#db.prepare('UPDATE credentials SET models_json=? WHERE key_id=?').run(JSON.stringify(models), key_id).changes === 1, 'VAULT_KEY_NOT_FOUND');
  }
  async rotate(admin: VaultAdminCapability, oldId: string, spec: CredentialSpec, beforeCommit?: () => void): Promise<CredentialInfo> {
    this.#check(admin); check(oldId !== spec.key_id, 'VAULT_ROTATION_ID_REQUIRED');
    const old = this.#db.prepare('SELECT provider_id,key_handle_id FROM credentials WHERE key_id=?').get(oldId) as Row | undefined;
    check(old && old.provider_id === spec.provider_id, 'VAULT_ROTATION_PROVIDER_MISMATCH');
    this.#spec(spec); this.#preflightImport(spec.key_id); spec = { ...spec, models: [...spec.models], secret: Buffer.from(spec.secret) };
    const parsed = this.#spec(spec); let encrypted: Uint8Array | undefined;
    try {
      this.#guard.assertImportSafe(spec.key_id, spec.secret, JSON.stringify({ ...spec, secret: undefined }));
      encrypted = await this.#encrypt(spec);
      beforeCommit?.();
      this.#check(admin); this.#guard.assertImportSafe(spec.key_id, spec.secret, JSON.stringify({ ...spec, secret: undefined }));
      const committed = this.#transaction(() => {
      this.#assertGuardFresh();
      const current=this.#db.prepare('SELECT provider_id,key_handle_id FROM credentials WHERE key_id=?').get(oldId) as Row|undefined;
      check(current&&current.provider_id===old.provider_id&&current.key_handle_id===old.key_handle_id,'VAULT_ROTATION_STALE');
      const handle = this.#insert(spec, parsed, encrypted!);
      this.#db.prepare("UPDATE credentials SET state=CASE WHEN state='ACTIVE' THEN 'ROTATING' WHEN state='RATE_LIMITED' THEN 'DISABLED' ELSE state END WHERE key_id=?").run(oldId);
      return { handle, generation: this.#advanceGeneration() };
    });
      this.#guard.add(spec.key_id, spec.secret, committed.handle); this.#loadedGeneration = committed.generation;
    } finally { encrypted?.fill(0); spec.secret.fill(0); }
    return this.list(admin).find(key => key.key_id === spec.key_id)!;
  }
  remove(admin: VaultAdminCapability, key_id: string): void {
    this.#check(admin); check(identifier(key_id), 'VAULT_KEY_NOT_FOUND'); this.#transaction(() => {
      check(!!this.#db.prepare('SELECT 1 FROM credentials WHERE key_id=?').get(key_id), 'VAULT_KEY_NOT_FOUND');
      check(!this.#db.prepare("SELECT 1 FROM leases WHERE key_id=? AND state IN ('INFLIGHT','UNKNOWN')").get(key_id), 'VAULT_KEY_IN_USE');
      this.#db.prepare('INSERT OR IGNORE INTO request_tombstones(request_id,subject_key) SELECT request_id,subject_key FROM leases WHERE key_id=?').run(key_id);
      this.#db.prepare('DELETE FROM leases WHERE key_id=?').run(key_id); this.#db.prepare('DELETE FROM credentials WHERE key_id=?').run(key_id);
    });
  }
  list(admin: VaultAdminCapability): CredentialInfo[] {
    this.#check(admin); this.#refresh(Date.now());
    const result = (this.#db.prepare(`SELECT c.*, (SELECT count(*) FROM leases l WHERE l.key_id=c.key_id AND l.state IN ('INFLIGHT','UNKNOWN')) AS in_flight FROM credentials c ORDER BY key_id`).all() as Row[]).map(row => ({
      key_id: row.key_id, key_handle_id: row.key_handle_id, provider_id: row.provider_id, models: JSON.parse(row.models_json), state: row.state,
      max_concurrency: row.max_concurrency, requests_per_minute: row.requests_per_minute, cost_limit_micros: row.cost_limit_micros,
      spent_micros: row.spent_micros, reserved_micros: row.reserved_micros, in_flight: row.in_flight,
      ...(row.expires_at === null ? {} : { expires_at: row.expires_at }), protection: this.#protector.protection, classification: 'SYNTHETIC' as const,
    }));
    this.#guard.assertSafe(JSON.stringify(result), 'VAULT_METADATA'); return result;
  }
  #refresh(now: number): void {
    this.#db.prepare("UPDATE credentials SET state='EXPIRED' WHERE expires_at IS NOT NULL AND expires_at<=? AND state NOT IN ('QUARANTINED','INVALID','DISABLED')").run(now);
    this.#db.prepare("UPDATE credentials SET state='ACTIVE',cooldown_until=0 WHERE state='RATE_LIMITED' AND cooldown_until<=? AND (expires_at IS NULL OR expires_at>?)").run(now, now);
  }
  acquire(admin: VaultAdminCapability, request: AcquireCredential): CredentialLease {
    this.#check(admin);
    check(request && identifier(request.provider_id) && identifier(request.model_id) && identifier(request.request_id) && integer(request.estimated_cost_micros) &&
      typeof request.subject_key === 'string' && request.subject_key.length > 0 && request.subject_key.length <= 16384, 'VAULT_INVALID_REQUEST');
    this.#guard.assertSafe(JSON.stringify(request), 'VAULT_REQUEST');
    return this.#transaction(() => {
      const tombstone = this.#db.prepare('SELECT subject_key FROM request_tombstones WHERE request_id=?').get(request.request_id) as Row | undefined;
      if (tombstone) { check(tombstone.subject_key === request.subject_key, 'VAULT_SUBJECT_MISMATCH'); fail('VAULT_REQUEST_ALREADY_SETTLED'); }
      const previous = this.#db.prepare('SELECT l.*,c.provider_id,c.models_json,c.key_handle_id FROM leases l JOIN credentials c USING(key_id) WHERE request_id=?').get(request.request_id) as Row | undefined;
      if (previous) {
        check(previous.subject_key === request.subject_key, 'VAULT_SUBJECT_MISMATCH');
        check(previous.state === 'INFLIGHT', previous.state === 'UNKNOWN' ? 'VAULT_UNKNOWN_OUTCOME' : 'VAULT_REQUEST_ALREADY_SETTLED');
        check(previous.provider_id === request.provider_id && previous.model_id === request.model_id && previous.estimated_cost_micros === request.estimated_cost_micros, 'VAULT_REQUEST_CONFLICT');
        return Object.freeze({ lease_id: previous.lease_id, key_handle_id: previous.key_handle_id });
      }
      const records = this.#db.prepare('SELECT (SELECT count(*) FROM leases)+(SELECT count(*) FROM request_tombstones) AS n').get() as Row;
      check(records.n < MAX_REQUEST_RECORDS, 'VAULT_REQUEST_CAPACITY');
      const now = Date.now(); this.#refresh(now);
      const candidates = this.#db.prepare(`SELECT c.*,
        (SELECT count(*) FROM leases l WHERE l.key_id=c.key_id AND l.state IN ('INFLIGHT','UNKNOWN')) AS in_flight,
        (SELECT count(*) FROM leases l WHERE l.key_id=c.key_id AND l.created_at>? AND (l.outcome IS NULL OR l.outcome!='NOT_SENT')) AS recent
        FROM credentials c WHERE c.provider_id=? AND c.state='ACTIVE'
        ORDER BY failures ASC,spent_micros+reserved_micros ASC,selected_order ASC,key_id ASC`).all(now - 60_000, request.provider_id) as Row[];
      const key = candidates.find(row => (!request.key_handle_id || row.key_handle_id === request.key_handle_id) && JSON.parse(row.models_json).includes(request.model_id) && row.in_flight < row.max_concurrency &&
        row.recent < row.requests_per_minute && request.estimated_cost_micros <= row.cost_limit_micros - row.spent_micros - row.reserved_micros);
      check(key, 'VAULT_NO_ELIGIBLE_KEY'); const lease_id = randomUUID();
      this.#db.prepare("INSERT INTO leases(lease_id,key_id,request_id,model_id,subject_key,estimated_cost_micros,state,created_at) VALUES (?,?,?,?,?,?,'INFLIGHT',?)")
        .run(lease_id, key.key_id, request.request_id, request.model_id, request.subject_key, request.estimated_cost_micros, now);
      this.#db.prepare('UPDATE credentials SET reserved_micros=reserved_micros+?,selected_order=(SELECT COALESCE(MAX(selected_order),0)+1 FROM credentials) WHERE key_id=?')
        .run(request.estimated_cost_micros, key.key_id);
      return Object.freeze({ lease_id, key_handle_id: key.key_handle_id });
    });
  }
  #lease(lease_id: string, subject_key?: string): Row {
    check(typeof lease_id === 'string' && /^[a-f0-9-]{36}$/.test(lease_id), 'VAULT_LEASE_NOT_FOUND');
    const lease = this.#db.prepare('SELECT * FROM leases WHERE lease_id=?').get(lease_id) as Row | undefined;
    check(lease, 'VAULT_LEASE_NOT_FOUND'); if (subject_key !== undefined) check(lease.subject_key === subject_key, 'VAULT_SUBJECT_MISMATCH'); return lease;
  }
  async withCredential<T>(admin: VaultAdminCapability, lease_id: string, callback: (authorization: string) => Promise<T>, subject_key?: string): Promise<T> {
    this.#check(admin); check(typeof callback === 'function', 'VAULT_INVALID_CALLBACK');
    const lease = this.#transaction(() => {
      this.#refresh(Date.now());
      const row = this.#lease(lease_id, subject_key); check(row.state === 'INFLIGHT' && row.used === 0, 'VAULT_LEASE_NOT_SENDABLE');
      const key = this.#db.prepare('SELECT state,expires_at FROM credentials WHERE key_id=?').get(row.key_id) as Row;
      check(key && ['ACTIVE','ROTATING'].includes(key.state) && (key.expires_at===null||key.expires_at>Date.now()), 'VAULT_KEY_NOT_SENDABLE');
      this.#db.prepare('UPDATE leases SET used=1 WHERE lease_id=?').run(lease_id); return row;
    });
    const row = this.#db.prepare('SELECT ciphertext,key_handle_id FROM credentials WHERE key_id=?').get(lease.key_id) as Row;
    this.#activeCallbacks.add(lease_id); let bytes: Uint8Array | undefined;
    try {
      try { bytes = await this.#protector.unprotect(row.ciphertext); this.#assertSynthetic(bytes); this.#guard.add(lease.key_id, bytes, row.key_handle_id); } catch { fail('VAULT_UNPROTECT_FAILED'); }
      // Protection may be asynchronous; revocation/expiry during it still wins.
      this.#check(admin); this.#refresh(Date.now());
      const current = this.#db.prepare('SELECT state,expires_at FROM credentials WHERE key_id=?').get(lease.key_id) as Row;
      check(current && ['ACTIVE', 'ROTATING'].includes(current.state) && (current.expires_at===null||current.expires_at>Date.now()) && this.#lease(lease_id, subject_key).state === 'INFLIGHT', 'VAULT_KEY_NOT_SENDABLE');
      const result = await callback('Bearer ' + Buffer.from(bytes).toString('utf8'));
      this.guard.assertSafe(typeof result === 'string' || result instanceof Uint8Array ? result : JSON.stringify(result) ?? '', 'VAULT_CALLBACK_RESULT');
      return result;
    } catch (error) {
      try { this.guard.assertSafe(error instanceof Error ? error.message : String(error), 'VAULT_CALLBACK_ERROR'); }
      catch (guardError) {
        if (guardError instanceof VaultError && ['VAULT_GUARD_STALE','VAULT_GUARD_CLOSED'].includes(guardError.code)) return fail(guardError.code);
        fail('VAULT_KNOWN_SECRET_BLOCKED');
      }
      if (error instanceof VaultError) throw error; return fail('VAULT_CREDENTIAL_OPERATION_FAILED');
    } finally { bytes?.fill(0); this.#activeCallbacks.delete(lease_id); }
  }
  settle(admin: VaultAdminCapability, lease_id: string, result: CredentialSettlement, subject_key?: string): void {
    this.#check(admin);
    check(result && ['SUCCESS', 'AUTH', 'RATE_LIMIT', 'NOT_SENT', 'UNKNOWN'].includes(result.outcome) && integer(result.cost_micros) &&
      ['SIMULATED', 'PROVIDER'].includes(result.usage_source) && (result.retry_after_ms === undefined || integer(result.retry_after_ms)) &&
      (result.outcome !== 'NOT_SENT' || result.cost_micros === 0), 'VAULT_INVALID_SETTLEMENT');
    this.#transaction(() => {
      const lease = this.#lease(lease_id, subject_key);
      if (lease.state === 'SETTLED') { check(lease.outcome === result.outcome && lease.cost_micros === result.cost_micros && lease.usage_source === result.usage_source, 'VAULT_SETTLEMENT_CONFLICT'); return; }
      check(result.outcome!=='NOT_SENT'||(lease.used===0&&lease.state==='INFLIGHT'),'VAULT_SENT_RELEASE_BLOCKED');
      check(lease.state!=='UNKNOWN'||result.outcome==='UNKNOWN','VAULT_RECONCILIATION_REQUIRED');
      const key = this.#db.prepare('SELECT spent_micros,reserved_micros FROM credentials WHERE key_id=?').get(lease.key_id) as Row;
      check(integer(key.spent_micros + result.cost_micros) && integer(key.reserved_micros - lease.estimated_cost_micros + Math.max(lease.estimated_cost_micros, result.cost_micros)), 'VAULT_COST_OVERFLOW');
      if (result.outcome === 'UNKNOWN') {
        const reserved = Math.max(lease.estimated_cost_micros, result.cost_micros);
        this.#db.prepare('UPDATE credentials SET reserved_micros=reserved_micros+? WHERE key_id=?').run(reserved - lease.estimated_cost_micros, lease.key_id);
        this.#db.prepare("UPDATE leases SET state='UNKNOWN',outcome='UNKNOWN',estimated_cost_micros=?,cost_micros=?,usage_source=? WHERE lease_id=?")
          .run(reserved, result.cost_micros, result.usage_source, lease_id); return;
      }
      this.#db.prepare("UPDATE leases SET state='SETTLED',outcome=?,cost_micros=?,usage_source=? WHERE lease_id=?").run(result.outcome, result.cost_micros, result.usage_source, lease_id);
      this.#db.prepare('UPDATE credentials SET reserved_micros=reserved_micros-?,spent_micros=spent_micros+?,failures=failures+? WHERE key_id=?')
        .run(lease.estimated_cost_micros, result.cost_micros, result.outcome === 'AUTH' || result.outcome === 'RATE_LIMIT' ? 1 : 0, lease.key_id);
      if (result.outcome === 'AUTH') this.#db.prepare("UPDATE credentials SET state='INVALID' WHERE key_id=? AND state!='QUARANTINED'").run(lease.key_id);
      if (result.outcome === 'RATE_LIMIT') this.#db.prepare("UPDATE credentials SET state='RATE_LIMITED',cooldown_until=? WHERE key_id=? AND state NOT IN ('QUARANTINED','ROTATING','DISABLED','INVALID')")
        .run(Math.min(Number.MAX_SAFE_INTEGER, Date.now() + (result.retry_after_ms ?? 60_000)), lease.key_id);
    });
  }
  securityEvents(admin: VaultAdminCapability): VaultSecurityEvent[] { this.#check(admin, false); return this.#events.map(event => ({ ...event })); }
  /** Lifetime counter saturates at MAX_SAFE_INTEGER; only the last 256 events are retained. */
  securityEventCount(admin: VaultAdminCapability): number { this.#check(admin, false); return this.#eventCount; }
  close(): void {
    if (this.#closed) return; check(this.#activeCallbacks.size === 0, 'VAULT_OPERATIONS_IN_FLIGHT');
    try { this.#db.prepare("UPDATE leases SET state='UNKNOWN',outcome='UNKNOWN' WHERE state='INFLIGHT'").run(); this.#db.close(); }
    catch { fail('VAULT_CLOSE_FAILED'); } finally { this.#closed = true; this.#guard.clear(); }
  }
}
