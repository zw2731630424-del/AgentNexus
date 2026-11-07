import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, readFileSync } from 'node:fs';
import { mkdir, open, opendir, lstat, rename, unlink, rmdir } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { hostname } from 'node:os';
import { join, resolve } from 'node:path';
import { Transform, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createZstdCompress, createZstdDecompress, constants } from 'node:zlib';
import { ArtifactStore, CHUNK_BYTES, ensureDirectory, isFileFailure, syncDirectory, writeNewJson } from './artifacts.ts';
import { artifactRefs, frame, MAX_FRAME_BYTES, recordHash, validateInput, validateRecord, ZERO_HASH } from './records.ts';
import { canonical, invariant, NexusError, sha256 } from './types.ts';
import type { AuditInput, ContextInput, DecisionInput, Domain, Json, QueryOptions, StoredRecord } from './types.ts';

type Row = Record<string, unknown>;
type Options = { maxPendingBytes?: number; segmentBytes?: number };
type Segment = { name: string; index: number; bytes: number; first: number; last: number; count: number; rawHash: string; tailBytes: number };
type SegmentManifest = { schema: string; file: string; codec: string; node: string; first_seq: number; last_seq: number; records: number;
  bytes: number; sha256: string; stored_bytes: number; stored_sha256: string; previous_segment_hash: string; hash: string };
type Owner = { schema: string; pid: number; hostname: string; token: string; created_at: string };
const SEGMENT = /^segment-(\d{8})\.jsonl$/;
const DOMAINS: Domain[] = ['audit', 'context', 'decision'];

async function writeAll(handle: FileHandle, data: Uint8Array): Promise<void> {
  let offset = 0;
  while (offset < data.byteLength) {
    const { bytesWritten } = await handle.write(data, offset, data.byteLength - offset);
    invariant(bytesWritten > 0, 'STORAGE_IO'); offset += bytesWritten;
  }
}
function storageError(error: unknown): NexusError {
  if (error instanceof NexusError) return error;
  return new NexusError('STORAGE_FAILURE', (error as Error)?.message ?? 'Persistent storage failure');
}
function persistentFailure(error: unknown): boolean {
  if (isFileFailure(error)) return true;
  const e = error as { errcode?: number; code?: string };
  if (typeof e?.errcode === 'number') return ![5, 6, 19].includes(e.errcode & 255); // BUSY, LOCKED, CONSTRAINT are request failures.
  return e?.code === 'ERR_SQLITE_ERROR' || e?.code === 'ERR_INVALID_STATE';
}
async function readOwner(root: string): Promise<{ owner: Owner; raw: string }> {
  const directory = await lstat(join(root, 'writer.lock'));
  invariant(directory.isDirectory() && !directory.isSymbolicLink(), 'STORE_LOCKED');
  const path = join(root, 'writer.lock', 'owner.json'), stat = await lstat(path);
  invariant(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 4096, 'STORE_LOCKED');
  const raw = readFileSync(path, 'utf8'); let owner: Owner;
  try { owner = JSON.parse(raw) as Owner; } catch { throw new NexusError('STORE_LOCKED'); }
  invariant(owner.schema === 'agentnexus/writer-lock/1' && Number.isSafeInteger(owner.pid) && owner.pid > 0 &&
    typeof owner.token === 'string' && /^[a-f0-9-]{36}$/.test(owner.token) && typeof owner.hostname === 'string', 'STORE_LOCKED');
  invariant(raw === canonical(owner) + '\n', 'STORE_LOCKED'); return { owner, raw };
}

export class KernelStore {
  readonly root: string;
  readonly db: DatabaseSync;
  readonly artifacts: ArtifactStore;
  private owner: Owner;
  private pendingLimit: number;
  private segmentLimit: number;
  private inTransaction = false;
  private transactionContext = new AsyncLocalStorage<{ active: boolean }>();
  private closed = false;
  private closing = false;
  private closePromise: Promise<void> | null = null;
  private failure: unknown = null;
  private maintenance = false;
  private flushing: Promise<void> | null = null;
  private active: Segment | null = null;
  private activeHandle: FileHandle | null = null;
  private nextSegment = 1;
  private lastOnDisk = 0;
  private previousSegmentHash = ZERO_HASH;

  private constructor(root: string, db: DatabaseSync, owner: Owner, options: Options) {
    this.root = root; this.db = db; this.owner = owner;
    this.pendingLimit = options.maxPendingBytes ?? 4 * 1024 * 1024;
    this.segmentLimit = options.segmentBytes ?? 16 * 1024 * 1024;
    this.artifacts = new ArtifactStore(join(root, 'artifacts'), { beforeWrite: () => this.assertWritable(), onFault: error => this.freeze(error) });
  }
  get faulted(): boolean { return this.failure !== null; }

  static async open(rootPath: string, options: Options = {}): Promise<KernelStore> {
    const pending = options.maxPendingBytes ?? 4 * 1024 * 1024, segment = options.segmentBytes ?? 16 * 1024 * 1024;
    invariant(Number.isSafeInteger(pending) && pending >= 4096 && pending <= 4 * 1024 * 1024, 'INVALID_STORAGE_LIMIT');
    invariant(Number.isSafeInteger(segment) && segment >= 4096 && segment <= 16 * 1024 * 1024, 'INVALID_STORAGE_LIMIT');
    const root = resolve(rootPath); await ensureDirectory(root);
    invariant(!existsSync(join(root, 'writer.recovery')), 'STORE_LOCKED');
    try { await mkdir(join(root, 'writer.lock')); } catch (error) {
      if ((error as { code?: string }).code === 'EEXIST') throw new NexusError('STORE_LOCKED', 'Existing writer lock requires explicit owner-death recovery.');
      throw error;
    }
    const owner: Owner = { schema: 'agentnexus/writer-lock/1', pid: process.pid, hostname: hostname(), token: randomUUID(), created_at: new Date().toISOString() };
    let db: DatabaseSync | undefined, store: KernelStore | undefined;
    try {
      await writeNewJson(join(root, 'writer.lock', 'owner.json'), owner); await syncDirectory(root);
      invariant(!existsSync(join(root, 'writer.recovery')), 'STORE_LOCKED');
      await ensureDirectory(join(root, 'segments')); await ensureDirectory(join(root, 'recovery'));
      db = new DatabaseSync(join(root, 'kernel.sqlite'));
      const version = String((db.prepare('SELECT sqlite_version() AS version').get() as Row).version).split('.').map(Number);
      invariant(version[0] > 3 || (version[0] === 3 && (version[1] > 51 || (version[1] === 51 && version[2] >= 3))), 'SQLITE_VERSION_BLOCKED');
      db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=1000; PRAGMA trusted_schema=OFF;
        CREATE TABLE IF NOT EXISTS anx_records (
          seq INTEGER PRIMARY KEY, domain TEXT NOT NULL CHECK(domain IN ('audit','context','decision')),
          event_id TEXT NOT NULL UNIQUE, operation_id TEXT NOT NULL, project_id TEXT NOT NULL, task_id TEXT NOT NULL,
          previous_hash TEXT NOT NULL, hash TEXT NOT NULL UNIQUE, body TEXT NOT NULL, frame_bytes INTEGER NOT NULL CHECK(frame_bytes>0)
        ) STRICT;
        CREATE INDEX IF NOT EXISTS anx_records_domain_seq ON anx_records(domain,seq);
        CREATE INDEX IF NOT EXISTS anx_records_task_seq ON anx_records(task_id,seq);
        CREATE INDEX IF NOT EXISTS anx_records_project_task_seq ON anx_records(project_id,task_id,seq);
        CREATE INDEX IF NOT EXISTS anx_records_identity_seq ON anx_records(domain,project_id,task_id,json_extract(body,'$.agent_id'),json_extract(body,'$.session_id'),seq);
        CREATE TABLE IF NOT EXISTS anx_outbox (seq INTEGER PRIMARY KEY REFERENCES anx_records(seq), frame_bytes INTEGER NOT NULL) STRICT;
        CREATE TABLE IF NOT EXISTS anx_exports (seq INTEGER PRIMARY KEY REFERENCES anx_records(seq), segment TEXT NOT NULL, end_offset INTEGER NOT NULL, hash TEXT NOT NULL) STRICT;
        CREATE TRIGGER IF NOT EXISTS anx_records_no_update BEFORE UPDATE ON anx_records BEGIN SELECT RAISE(ABORT,'append only'); END;
        CREATE TRIGGER IF NOT EXISTS anx_records_no_delete BEFORE DELETE ON anx_records BEGIN SELECT RAISE(ABORT,'append only'); END;`);
      await syncDirectory(root);
      store = new KernelStore(root, db, owner, options); await store.artifacts.initialize(); await store.recover(); return store;
    } catch (error) {
      if (store) { store.failure = error; await store.close().catch(() => {}); }
      else {
        db?.close();
        if (existsSync(join(root, 'writer.lock', 'owner.json'))) {
          const current = await readOwner(root).catch(() => null);
          if (current?.owner.token === owner.token) { await unlink(join(root, 'writer.lock', 'owner.json')); await rmdir(join(root, 'writer.lock')); }
        }
      }
      throw storageError(error);
    }
  }

  static async recoverAbandonedLock(rootPath: string): Promise<{ recovered: boolean; evidence_path?: string }> {
    const root = resolve(rootPath); await ensureDirectory(root);
    const guard = join(root, 'writer.recovery');
    try { await mkdir(guard); } catch { throw new NexusError('STORE_LOCKED', 'Another recovery or an uncertain recovery lock exists.'); }
    try {
      if (!existsSync(join(root, 'writer.lock'))) return { recovered: false };
      const first = await readOwner(root);
      invariant(first.owner.hostname === hostname() && first.owner.pid !== process.pid, 'STORE_LOCKED');
      let dead = false;
      try { process.kill(first.owner.pid, 0); } catch (error) { dead = (error as { code?: string }).code === 'ESRCH'; }
      invariant(dead, 'STORE_LOCKED', 'OS did not confirm that the recorded process is absent.');
      const second = await readOwner(root); invariant(first.raw === second.raw, 'STORE_LOCKED');
      const entries: string[] = []; for await (const e of await opendir(join(root, 'writer.lock'))) entries.push(e.name);
      invariant(entries.length === 1 && entries[0] === 'owner.json', 'STORE_LOCKED');
      await ensureDirectory(join(root, 'recovery'));
      const evidence = join(root, 'recovery', 'abandoned-lock-' + first.owner.token + '-' + randomUUID());
      await rename(join(root, 'writer.lock'), evidence); await syncDirectory(root);
      return { recovered: true, evidence_path: evidence };
    } finally { await rmdir(guard); }
  }

  private freeze(error: unknown): void { if (this.failure === null) this.failure = error; }
  private assertWritable(): void {
    const context = this.transactionContext.getStore(); invariant(!context || context.active, 'ASYNC_TRANSACTION');
    invariant(!this.closed && !this.closing, 'STORE_CLOSED'); invariant(!this.faulted, 'STORE_FAULTED');
    invariant(!this.maintenance, 'STORE_BUSY');
  }

  transaction<T>(fn: () => T): T {
    this.assertWritable(); invariant(!this.inTransaction, 'NESTED_TRANSACTION');
    invariant(fn.constructor.name !== 'AsyncFunction', 'ASYNC_TRANSACTION');
    let begun = false; const context = { active: true };
    try {
      this.db.exec('BEGIN IMMEDIATE'); begun = true; this.inTransaction = true;
      const result = this.transactionContext.run(context, fn);
      if (result !== null && (typeof result === 'object' || typeof result === 'function') && typeof (result as { then?: unknown }).then === 'function') {
        void Promise.resolve(result).catch(() => {}); throw new NexusError('ASYNC_TRANSACTION');
      }
      this.db.exec('COMMIT'); begun = false; return result;
    } catch (error) {
      if (begun) { try { this.db.exec('ROLLBACK'); } catch (rollbackError) { this.freeze(rollbackError); } }
      if (persistentFailure(error)) this.freeze(error); throw error;
    } finally { context.active = false; this.inTransaction = false; }
  }

  private append(domain: Domain, input: AuditInput | ContextInput | DecisionInput): StoredRecord {
    this.assertWritable(); const body = validateInput(domain, input);
    for (const ref of artifactRefs(domain, body as unknown as Json)) this.artifacts.assertPublished(ref);
    if (!this.inTransaction) return this.transaction(() => this.append(domain, body));
    const pending = Number((this.db.prepare('SELECT COALESCE(SUM(frame_bytes),0) AS n FROM anx_outbox').get() as Row).n);
    const seq = Number((this.db.prepare('SELECT COALESCE(MAX(seq),0)+1 AS seq FROM anx_records').get() as Row).seq);
    invariant(Number.isSafeInteger(seq) && seq > 0, 'SEQUENCE_EXHAUSTED');
    const tail = this.db.prepare('SELECT hash FROM anx_records WHERE domain=? ORDER BY seq DESC LIMIT 1').get(domain) as Row | undefined;
    const without = { seq, domain, event_id: body.event_id, operation_id: body.operation_id, project_id: body.project_id,
      task_id: body.task_id, previous_hash: String(tail?.hash ?? ZERO_HASH), body: body as unknown as Json };
    const record: StoredRecord = { ...without, hash: recordHash(without) }, encoded = frame(record);
    invariant(pending + encoded.length <= this.pendingLimit, 'BACKPRESSURE', 'Durable outbox budget is full; flush before admitting another record.');
    this.db.prepare('INSERT INTO anx_records(seq,domain,event_id,operation_id,project_id,task_id,previous_hash,hash,body,frame_bytes) VALUES(?,?,?,?,?,?,?,?,?,?)')
      .run(seq, domain, record.event_id, record.operation_id, record.project_id, record.task_id, record.previous_hash, record.hash, canonical(body), encoded.length);
    this.db.prepare('INSERT INTO anx_outbox(seq,frame_bytes) VALUES(?,?)').run(seq, encoded.length); return record;
  }
  audit(input: AuditInput): StoredRecord { return this.append('audit', input); }
  context(input: ContextInput): StoredRecord { return this.append('context', input); }
  decision(input: DecisionInput): StoredRecord { return this.append('decision', input); }

  private row(row: Row): StoredRecord {
    const body = JSON.parse(String(row.body)); invariant(canonical(body) === row.body, 'RECORD_CORRUPT');
    const record = validateRecord({ seq: row.seq, domain: row.domain, event_id: row.event_id, operation_id: row.operation_id,
      project_id: row.project_id, task_id: row.task_id, previous_hash: row.previous_hash, hash: row.hash, body });
    if (row.frame_bytes !== undefined) invariant(frame(record).length === Number(row.frame_bytes), 'RECORD_CORRUPT');
    return record;
  }

  query(domain: Domain, options: QueryOptions = {}): StoredRecord[] {
    invariant(!this.closed, 'STORE_CLOSED'); invariant(DOMAINS.includes(domain), 'INVALID_DOMAIN');
    return this.queryRows(domain, options);
  }
  private queryRows(domain: Domain | null, options: QueryOptions): StoredRecord[] {
    const limit = options.limit ?? 100, after = options.after ?? 0;
    invariant(Number.isSafeInteger(limit) && limit >= 1 && limit <= 100 && Number.isSafeInteger(after) && after >= 0, 'INVALID_QUERY');
    for (const key of ['task_id', 'project_id', 'agent_id', 'session_id'] as const) if (options[key] !== undefined)
      invariant(typeof options[key] === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(options[key]!), 'INVALID_QUERY');
    const clauses = ['seq>?'], values: (string | number)[] = [after];
    if (domain) { clauses.push('domain=?'); values.push(domain); }
    for (const key of ['task_id', 'project_id'] as const) if (options[key] !== undefined) { clauses.push(key + '=?'); values.push(options[key]!); }
    for (const key of ['agent_id', 'session_id'] as const) if (options[key] !== undefined) {
      clauses.push("json_extract(body,'$." + key + "')=?"); values.push(options[key]!);
    }
    values.push(limit);
    try { return (this.db.prepare('SELECT * FROM anx_records WHERE ' + clauses.join(' AND ') + ' ORDER BY seq LIMIT ?').all(...values) as Row[]).map(r => this.row(r)); }
    catch (error) { this.freeze(error); throw storageError(error); }
  }
  reconstructTask(taskId: string, options: { project_id?: string; after?: number; limit?: number } = {}): { records: StoredRecord[]; next_cursor: number | null } {
    invariant(!this.closed, 'STORE_CLOSED');
    const records = this.queryRows(null, { ...options, task_id: taskId });
    return { records, next_cursor: records.length ? records[records.length - 1].seq : null };
  }

  async flush(): Promise<void> {
    this.assertWritable(); invariant(!this.inTransaction, 'TRANSACTION_ACTIVE');
    const target = Number((this.db.prepare('SELECT COALESCE(MAX(seq),0) AS n FROM anx_records').get() as Row).n);
    await this.flushThrough(target);
  }
  private async flushThrough(target: number): Promise<void> {
    while (this.lastOnDisk < target) {
      invariant(!this.faulted, 'STORE_FAULTED');
      if (!this.flushing) {
        this.flushing = this.flushInternal(target).catch(error => { this.freeze(error); throw storageError(error); }).finally(() => { this.flushing = null; });
      }
      await this.flushing;
    }
  }
  private async flushInternal(target = Number.MAX_SAFE_INTEGER): Promise<void> {
    while (true) {
      const row = this.db.prepare('SELECT r.* FROM anx_outbox o JOIN anx_records r USING(seq) WHERE r.seq<=? ORDER BY r.seq LIMIT 1').get(target) as Row | undefined;
      if (!row) break;
      const record = this.row(row), data = frame(record);
      invariant(record.seq === this.lastOnDisk + 1, 'EXPORT_SEQUENCE_CORRUPT');
      if (this.active && this.active.bytes > 0 && this.active.bytes + data.length > this.segmentLimit) await this.sealActive();
      if (!this.active) {
        const name = 'segment-' + String(this.nextSegment).padStart(8, '0') + '.jsonl';
        invariant(this.nextSegment <= 99999999, 'STORAGE_SCAN_LIMIT');
        this.active = { name, index: this.nextSegment, bytes: 0, first: record.seq, last: record.seq - 1, count: 0, rawHash: '', tailBytes: 0 };
        this.activeHandle = await open(join(this.root, 'segments', name), 'ax', 0o600);
        await syncDirectory(join(this.root, 'segments'));
      } else if (!this.activeHandle) this.activeHandle = await open(join(this.root, 'segments', this.active.name), 'a');
      const stat = await this.activeHandle.stat(); invariant(stat.isFile() && stat.size === this.active.bytes, 'EXPORT_CHANGED');
      await writeAll(this.activeHandle, data); await this.activeHandle.sync();
      if (this.active.count === 0) this.active.first = record.seq;
      this.active.bytes += data.length; this.active.last = record.seq; this.active.count++;
      this.acknowledge(record, this.active.name, this.active.bytes); this.lastOnDisk = record.seq;
    }
  }
  private acknowledge(record: StoredRecord, segment: string, endOffset: number): void {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('INSERT INTO anx_exports(seq,segment,end_offset,hash) VALUES(?,?,?,?)').run(record.seq, segment, endOffset, record.hash);
      this.db.prepare('DELETE FROM anx_outbox WHERE seq=?').run(record.seq); this.db.exec('COMMIT');
    } catch (error) { try { this.db.exec('ROLLBACK'); } catch {} throw error; }
  }

  private async *rawFrames(path: string): AsyncGenerator<{ data: Buffer; offset: number }, Buffer> {
    let carry = Buffer.alloc(0), offset = 0;
    for await (const chunk of createReadStream(path, { highWaterMark: CHUNK_BYTES })) {
      let data = carry.length ? Buffer.concat([carry, chunk]) : chunk as Buffer;
      let start = 0, end: number;
      while ((end = data.indexOf(10, start)) >= 0) {
        invariant(end + 1 - start <= MAX_FRAME_BYTES, 'EXPORT_CORRUPT');
        const line = data.subarray(start, end + 1); offset += line.length; yield { data: line, offset }; start = end + 1;
      }
      carry = Buffer.from(data.subarray(start)); invariant(carry.length < MAX_FRAME_BYTES, 'EXPORT_CORRUPT');
    }
    return carry;
  }

  private async scanSegment(name: string, previousSeq: number, repair: boolean): Promise<Segment> {
    const path = join(this.root, 'segments', name), info = await lstat(path);
    invariant(info.isFile() && !info.isSymbolicLink(), 'EXPORT_CORRUPT');
    const hash = createHash('sha256'); let bytes = 0, first = 0, last = previousSeq, count = 0;
    const iterator = this.rawFrames(path); let tail = Buffer.alloc(0);
    try {
      while (true) {
        const item = await iterator.next();
        if (item.done) { tail = item.value; break; }
        const { data, offset } = item.value;
        const record = validateRecord(JSON.parse(data.subarray(0, -1).toString('utf8')));
        invariant(record.seq === last + 1 && frame(record).equals(data), 'EXPORT_CORRUPT');
        const dbRow = this.db.prepare('SELECT * FROM anx_records WHERE seq=?').get(record.seq) as Row | undefined;
        invariant(dbRow && frame(this.row(dbRow)).equals(data), 'EXPORT_CORRUPT');
        const receipt = this.db.prepare('SELECT * FROM anx_exports WHERE seq=?').get(record.seq) as Row | undefined;
        if (receipt) invariant(receipt.segment === name && Number(receipt.end_offset) === offset && receipt.hash === record.hash, 'EXPORT_CORRUPT');
        hash.update(data); bytes = offset; if (!count) first = record.seq; last = record.seq; count++;
      }
    } finally { await iterator.return(Buffer.alloc(0)); }
    if (tail.length) {
      const receipt = Number((this.db.prepare('SELECT COALESCE(MAX(end_offset),0) AS n FROM anx_exports WHERE segment=?').get(name) as Row).n);
      invariant(receipt <= bytes && !existsSync(path + '.manifest.json'), 'ACKNOWLEDGED_TAIL_CORRUPT');
      invariant(repair, 'RECOVERY_REQUIRED');
      const saved = await open(join(this.root, 'recovery', name + '.' + randomUUID() + '.tail'), 'wx', 0o600);
      try { await writeAll(saved, tail); await saved.sync(); } finally { await saved.close(); }
      const handle = await open(path, 'r+'); try { await handle.truncate(bytes); await handle.sync(); } finally { await handle.close(); }
    }
    return { name, index: Number(SEGMENT.exec(name)![1]), bytes, first, last, count, rawHash: hash.digest('hex'), tailBytes: tail.length };
  }

  private async verifyCompressed(path: string, expected: SegmentManifest): Promise<void> {
    const raw = createHash('sha256'), stored = createHash('sha256'); let bytes = 0, storedBytes = 0;
    await pipeline(createReadStream(path, { highWaterMark: CHUNK_BYTES }),
      new Transform({ highWaterMark: CHUNK_BYTES, transform(chunk, _encoding, callback) {
        storedBytes += chunk.length; if (storedBytes > expected.stored_bytes) return callback(new NexusError('SEGMENT_CORRUPT'));
        stored.update(chunk); callback(null, chunk);
      } }), createZstdDecompress({ chunkSize: CHUNK_BYTES }),
      new Writable({ highWaterMark: CHUNK_BYTES, write(chunk, _encoding, callback) {
        bytes += chunk.length; if (bytes > expected.bytes) return callback(new NexusError('SEGMENT_CORRUPT'));
        raw.update(chunk); callback();
      } }));
    invariant(bytes === expected.bytes && storedBytes === expected.stored_bytes && raw.digest('hex') === expected.sha256 && stored.digest('hex') === expected.stored_sha256, 'SEGMENT_CORRUPT');
  }

  private async scanSegments(repair: boolean): Promise<{ segments: number; tail_bytes: number }> {
    const names: string[] = []; let nameBytes = 0;
    for await (const entry of await opendir(join(this.root, 'segments'))) {
      invariant(entry.isFile() && !entry.isSymbolicLink(), 'EXPORT_CORRUPT');
      if (SEGMENT.test(entry.name)) { names.push(entry.name); nameBytes += entry.name.length; invariant(nameBytes <= 1024 * 1024, 'STORAGE_SCAN_LIMIT'); }
      else invariant(/^segment-\d{8}\.jsonl\.(?:zst|manifest\.json|[a-f0-9-]{36}\.part|zst\.[a-f0-9-]{36}\.part|manifest\.[a-f0-9-]{36}\.part)$/.test(entry.name), 'EXPORT_CORRUPT');
    }
    names.sort(); let last = 0, previous = ZERO_HASH, tails = 0; this.active = null;
    for (let i = 0; i < names.length; i++) {
      invariant(Number(SEGMENT.exec(names[i])![1]) === i + 1, 'EXPORT_CORRUPT');
      const segment = await this.scanSegment(names[i], last, repair); tails += segment.tailBytes;
      invariant(segment.tailBytes === 0 || i === names.length - 1, 'EXPORT_CORRUPT');
      const manifestPath = join(this.root, 'segments', segment.name + '.manifest.json');
      if (existsSync(manifestPath)) {
        const stat = await lstat(manifestPath); invariant(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 4096, 'SEGMENT_CORRUPT');
        const raw = readFileSync(manifestPath, 'utf8'), manifest = JSON.parse(raw) as SegmentManifest;
        const { hash, ...body } = manifest;
        invariant(raw === canonical(manifest) + '\n' && manifest.schema === 'agentnexus/segment/1' && manifest.codec === 'zstd' && manifest.file === segment.name &&
          manifest.first_seq === segment.first && manifest.last_seq === segment.last && manifest.records === segment.count &&
          manifest.bytes === segment.bytes && manifest.sha256 === segment.rawHash && manifest.previous_segment_hash === previous && hash === sha256(canonical(body)), 'SEGMENT_CORRUPT');
        await this.verifyCompressed(join(this.root, 'segments', segment.name + '.zst'), manifest); previous = hash;
      } else { invariant(i === names.length - 1, 'EXPORT_CORRUPT'); this.active = segment; }
      last = segment.last;
    }
    const receipt = Number((this.db.prepare('SELECT COALESCE(MAX(seq),0) AS n FROM anx_exports').get() as Row).n);
    invariant(receipt <= last, 'ACKNOWLEDGED_EXPORT_MISSING');
    this.lastOnDisk = last; this.previousSegmentHash = previous;
    this.nextSegment = this.active ? this.active.index : names.length + 1;
    return { segments: names.length, tail_bytes: tails };
  }

  private verifyDatabase(): number {
    const check = this.db.prepare('PRAGMA quick_check(1)').get() as Row;
    invariant(Object.values(check)[0] === 'ok', 'DATABASE_CORRUPT');
    const previous: Record<Domain, string> = { audit: ZERO_HASH, context: ZERO_HASH, decision: ZERO_HASH };
    let after = 0, count = 0;
    while (true) {
      const rows = this.db.prepare('SELECT * FROM anx_records WHERE seq>? ORDER BY seq LIMIT 32').all(after) as Row[];
      if (!rows.length) break;
      for (const row of rows) {
        const record = this.row(row);
        invariant(record.seq === after + 1 && record.previous_hash === previous[record.domain], 'RECORD_CHAIN_CORRUPT');
        previous[record.domain] = record.hash; after = record.seq; count++;
        for (const ref of artifactRefs(record.domain, record.body)) this.artifacts.assertPublished(ref);
        const outbox = this.db.prepare('SELECT frame_bytes FROM anx_outbox WHERE seq=?').get(record.seq) as Row | undefined;
        const receipt = this.db.prepare('SELECT hash FROM anx_exports WHERE seq=?').get(record.seq) as Row | undefined;
        invariant(Boolean(outbox) !== Boolean(receipt), 'OUTBOX_CORRUPT');
        if (outbox) invariant(Number(outbox.frame_bytes) === Number(row.frame_bytes), 'OUTBOX_CORRUPT');
        if (receipt) invariant(receipt.hash === record.hash, 'OUTBOX_CORRUPT');
      }
    }
    const total = Number((this.db.prepare('SELECT (SELECT COUNT(*) FROM anx_outbox)+(SELECT COUNT(*) FROM anx_exports) AS n').get() as Row).n);
    invariant(total === count, 'OUTBOX_CORRUPT'); return count;
  }

  async verify(): Promise<{ records: number; segments: number; pending: number; objects: number; incomplete: number }> {
    invariant(!this.closed && !this.inTransaction && !this.maintenance && !this.flushing, 'STORE_BUSY');
    this.maintenance = true;
    try {
      const records = this.verifyDatabase(), segments = await this.scanSegments(false), artifacts = await this.artifacts.verify();
      const pending = Number((this.db.prepare('SELECT COUNT(*) AS n FROM anx_outbox').get() as Row).n);
      return { records, segments: segments.segments, pending, objects: artifacts.objects, incomplete: artifacts.incomplete };
    } catch (error) { this.freeze(error); throw storageError(error); }
    finally { this.maintenance = false; }
  }

  async recover(): Promise<{ records: number; exported: number; recovered_tail_bytes: number; objects: number; incomplete: number }> {
    invariant(!this.closed && !this.closing && !this.inTransaction && !this.maintenance && !this.flushing, 'STORE_BUSY');
    this.maintenance = true;
    try {
      if (this.activeHandle) { await this.activeHandle.close(); this.activeHandle = null; }
      const records = this.verifyDatabase(), segments = await this.scanSegments(true), artifacts = await this.artifacts.verify();
      // A complete line may have reached the file before its SQLite receipt. Sync it
      // again before acknowledging; the DB outbox is the source of pending facts.
      const names: string[] = [];
      for await (const e of await opendir(join(this.root, 'segments'))) if (SEGMENT.test(e.name)) names.push(e.name);
      names.sort();
      for (const name of names) {
        const path = join(this.root, 'segments', name), handle = await open(path, 'r+');
        try { await handle.sync(); } finally { await handle.close(); }
        const iterator = this.rawFrames(path);
        try {
          while (true) {
            const next = await iterator.next(); if (next.done) break;
            const record = validateRecord(JSON.parse(next.value.data.subarray(0, -1).toString('utf8')));
            if (this.db.prepare('SELECT 1 FROM anx_outbox WHERE seq=?').get(record.seq)) this.acknowledge(record, name, next.value.offset);
          }
        } finally { await iterator.return(Buffer.alloc(0)); }
      }
      await this.flushInternal(); this.failure = null;
      return { records, exported: this.lastOnDisk, recovered_tail_bytes: segments.tail_bytes, objects: artifacts.objects, incomplete: artifacts.incomplete };
    } catch (error) { this.freeze(error); throw storageError(error); }
    finally { this.maintenance = false; }
  }

  private async sealActive(): Promise<void> {
    if (!this.active || !this.active.count) return;
    if (this.activeHandle) { await this.activeHandle.sync(); await this.activeHandle.close(); this.activeHandle = null; }
    const segment = this.active, path = join(this.root, 'segments', segment.name);
    const expected = await this.scanSegment(segment.name, segment.first - 1, false);
    const rawHash = createHash('sha256'), storedHash = createHash('sha256'); let rawBytes = 0, storedBytes = 0;
    const compressed = path + '.zst', temporary = compressed + '.' + randomUUID() + '.part';
    await pipeline(createReadStream(path, { highWaterMark: CHUNK_BYTES }),
      new Transform({ highWaterMark: CHUNK_BYTES, transform(chunk, _encoding, callback) { rawBytes += chunk.length; rawHash.update(chunk); callback(null, chunk); } }),
      createZstdCompress({ chunkSize: CHUNK_BYTES, params: { [constants.ZSTD_c_checksumFlag]: 1 } }),
      new Transform({ highWaterMark: CHUNK_BYTES, transform(chunk, _encoding, callback) { storedBytes += chunk.length; storedHash.update(chunk); callback(null, chunk); } }),
      createWriteStream(temporary, { flags: 'wx', mode: 0o600, highWaterMark: CHUNK_BYTES, flush: true }));
    const hashRaw = rawHash.digest('hex'); invariant(rawBytes === expected.bytes && hashRaw === expected.rawHash, 'EXPORT_CHANGED');
    if (existsSync(compressed)) await rename(compressed, join(this.root, 'recovery', segment.name + '.unacknowledged-' + randomUUID() + '.zst'));
    await rename(temporary, compressed); await syncDirectory(join(this.root, 'segments'));
    const body = { schema: 'agentnexus/segment/1', file: segment.name, codec: 'zstd', node: process.version,
      first_seq: expected.first, last_seq: expected.last, records: expected.count, bytes: rawBytes, sha256: hashRaw,
      stored_bytes: storedBytes, stored_sha256: storedHash.digest('hex'), previous_segment_hash: this.previousSegmentHash };
    const manifest = { ...body, hash: sha256(canonical(body)) };
    const pending = path + '.manifest.' + randomUUID() + '.part';
    await writeNewJson(pending, manifest); await rename(pending, path + '.manifest.json'); await syncDirectory(join(this.root, 'segments'));
    this.previousSegmentHash = manifest.hash; this.nextSegment = segment.index + 1; this.active = null;
  }

  close(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    this.closing = true; this.closePromise = this.closeInternal(); return this.closePromise;
  }
  private async closeInternal(): Promise<void> {
    let error: unknown = null;
    try {
      await this.artifacts.waitForIdle(); if (this.flushing) await this.flushing;
      if (!this.faulted) {
        const target = Number((this.db.prepare('SELECT COALESCE(MAX(seq),0) AS n FROM anx_records').get() as Row).n);
        await this.flushThrough(target); await this.sealActive();
      }
    } catch (e) { this.freeze(e); error = e; }
    finally {
      await this.activeHandle?.close().catch(() => {}); this.activeHandle = null; await this.artifacts.close();
      try { this.db.close(); } catch (e) { error ??= e; }
      this.closed = true;
      const current = await readOwner(this.root).catch(() => null);
      if (current?.owner.token === this.owner.token) {
        await unlink(join(this.root, 'writer.lock', 'owner.json')); await rmdir(join(this.root, 'writer.lock')); await syncDirectory(this.root);
      } else error ??= new NexusError('STORE_LOCK_CHANGED');
    }
    if (error) throw storageError(error);
  }
}
