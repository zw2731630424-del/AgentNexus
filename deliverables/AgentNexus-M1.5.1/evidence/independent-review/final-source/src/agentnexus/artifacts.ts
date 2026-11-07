import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream, lstatSync, readFileSync } from 'node:fs';
import { mkdir, open, rename, lstat, opendir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Readable, Transform } from 'node:stream';
import type { TransformOptions } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createZstdCompress, createZstdDecompress, constants } from 'node:zlib';
import type { ZstdOptions } from 'node:zlib';
import { canonical, invariant, NexusError } from './types.ts';
import type { ArtifactRef } from './types.ts';
import { MAX_ARTIFACT_BYTES, validateArtifactRef } from './records.ts';

export const CHUNK_BYTES = 64 * 1024;
export type ArtifactOptions = { maxBytes?: number; media_type?: string; sensitivity?: 'NORMAL'; signal?: AbortSignal };
const IO_CODES = new Set(['EIO', 'ENOSPC', 'EDQUOT', 'EACCES', 'EPERM', 'EROFS', 'ENOENT', 'EMFILE', 'ENFILE', 'EISDIR', 'ENOTDIR', 'EEXIST', 'EBADF']);
export function isFileFailure(error: unknown): boolean { return IO_CODES.has((error as { code?: string })?.code ?? ''); }

export async function ensureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
  const info = await lstat(path);
  invariant(info.isDirectory() && !info.isSymbolicLink(), 'UNSAFE_STORAGE_PATH');
}

// Node on Windows does not expose a portable directory fsync handle. File syncs are
// real; hard-power-loss / directory durability remains an explicitly untested limit.
export async function syncDirectory(path: string): Promise<boolean> {
  if (process.platform === 'win32') return false;
  const handle = await open(path, 'r');
  try { await handle.sync(); } finally { await handle.close(); }
  return true;
}

export async function writeNewJson(path: string, value: unknown): Promise<void> {
  const handle = await open(path, 'wx', 0o600);
  try { await handle.writeFile(canonical(value) + '\n'); await handle.sync(); }
  finally { await handle.close(); }
}

export class ArtifactStore {
  readonly root: string;
  readonly objects: string;
  readonly partials: string;
  readonly stats = { activePuts: 0, maxActivePuts: 0, maxInputChunk: 0, drains: 0, inputBytes: 0, directorySyncSupported: process.platform !== 'win32' };
  private onFault: (error: unknown) => void;
  private beforeWrite: () => void;
  private active = new Set<Promise<ArtifactRef>>();
  private closed = false;

  constructor(root: string, options: { onFault?: (error: unknown) => void; beforeWrite?: () => void } = {}) {
    this.root = resolve(root); this.objects = join(this.root, 'objects'); this.partials = join(this.root, 'partials');
    this.onFault = options.onFault ?? (() => {}); this.beforeWrite = options.beforeWrite ?? (() => {});
  }
  async initialize(): Promise<void> { await ensureDirectory(this.objects); await ensureDirectory(this.partials); }

  put(source: AsyncIterable<Uint8Array> | Iterable<Uint8Array>, options: ArtifactOptions = {}): Promise<ArtifactRef> {
    try {
      invariant(!this.closed, 'STORE_CLOSED'); this.beforeWrite();
      invariant(this.active.size < 2, 'BACKPRESSURE', 'At most two artifact streams may be active; retry after a stream settles.');
      invariant(options.sensitivity === undefined || options.sensitivity === 'NORMAL', 'SECRET_UNSUPPORTED');
      const max = options.maxBytes ?? 64 * 1024 * 1024;
      invariant(Number.isSafeInteger(max) && max >= 0 && max <= MAX_ARTIFACT_BYTES, 'INVALID_ARTIFACT_LIMIT');
      const media = options.media_type ?? 'application/octet-stream';
      invariant(typeof media === 'string' && media.length > 0 && Buffer.byteLength(media) <= 200 && !/[\x00-\x1f\x7f]/.test(media), 'INVALID_MEDIA_TYPE');
      const pending = this.putStream(source, { ...options, maxBytes: max, media_type: media });
      this.active.add(pending); this.stats.activePuts = this.active.size; this.stats.maxActivePuts = Math.max(this.stats.maxActivePuts, this.active.size);
      void pending.then(() => { this.active.delete(pending); this.stats.activePuts = this.active.size; }, () => { this.active.delete(pending); this.stats.activePuts = this.active.size; });
      return pending;
    } catch (error) { return Promise.reject(error); }
  }

  async putBytes(bytes: Uint8Array, options: ArtifactOptions = {}): Promise<ArtifactRef> {
    invariant(bytes instanceof Uint8Array, 'INVALID_ARTIFACT_CHUNK');
    function* chunks() { for (let i = 0; i < bytes.byteLength; i += CHUNK_BYTES) yield bytes.subarray(i, i + CHUNK_BYTES); }
    return this.put(chunks(), options);
  }

  private async putStream(source: AsyncIterable<Uint8Array> | Iterable<Uint8Array>, options: ArtifactOptions & { maxBytes: number; media_type: string }): Promise<ArtifactRef> {
    const id = randomUUID(), partial = join(this.partials, id + '.part');
    const object = join(this.objects, id + '.zst'), manifest = join(this.objects, id + '.json');
    const rawHash = createHash('sha256'), storedHash = createHash('sha256');
    let rawBytes = 0, storedBytes = 0, stage = 'PARTIAL';
    let inputDone = false, cleanupRequested = false, cleanupConfirmed = false, pendingNext = false, interruptedNext = false;
    let pipelineFailure: unknown = null;
    const iterable = source as AsyncIterable<Uint8Array> & Iterable<Uint8Array>;
    const iterator = iterable[Symbol.asyncIterator]?.() ?? iterable[Symbol.iterator]?.();
    invariant(iterator && typeof iterator.next === 'function', 'INVALID_ARTIFACT_SOURCE');
    const cancellation = new AbortController();
    const stop = (error: unknown) => {
      pipelineFailure ??= error;
      if (isFileFailure(error)) this.onFault(error);
      if (!cancellation.signal.aborted) cancellation.abort(error);
    };
    const forwardAbort = () => stop(options.signal!.reason);
    options.signal?.addEventListener('abort', forwardAbort, { once: true });
    if (options.signal?.aborted) forwardAbort();
    let rejectAbort!: () => void;
    const aborted = new Promise<never>((_resolve, reject) => {
      rejectAbort = () => { interruptedNext ||= pendingNext; reject(cancellation.signal.reason ?? new DOMException('Aborted', 'AbortError')); };
      if (cancellation.signal.aborted) rejectAbort(); else cancellation.signal.addEventListener('abort', rejectAbort, { once: true });
    });
    void aborted.catch(() => {});
    const requestCleanup = () => {
      if (inputDone || cleanupRequested) return;
      cleanupRequested = true;
      try {
        // Request iterator cleanup, but never let an uncontrolled return() hold a
        // Store file handle or close barrier forever. This is not OS process exit.
        const returned = iterator.return?.();
        if (returned) void Promise.resolve(returned).then(result => { cleanupConfirmed = result.done === true; }, () => {});
      } catch { /* INCOMPLETE metadata below preserves UNKNOWN cleanup. */ }
    };
    const owner = this;
    async function* bounded() {
      try {
        while (true) {
          cancellation.signal.throwIfAborted(); pendingNext = true;
          let next: IteratorResult<Uint8Array>;
          try { next = await Promise.race([Promise.resolve().then(() => iterator.next()), aborted]); }
          finally { pendingNext = false; }
          cancellation.signal.throwIfAborted();
          if (next.done) { inputDone = true; break; }
          const incoming = next.value;
          invariant(incoming instanceof Uint8Array && incoming.byteLength <= CHUNK_BYTES, 'INVALID_ARTIFACT_CHUNK');
          invariant(rawBytes + incoming.byteLength <= options.maxBytes, 'ARTIFACT_LIMIT');
          // Snapshot each bounded chunk before yielding across an asynchronous boundary.
          const chunk = Buffer.from(incoming); rawBytes += chunk.byteLength; rawHash.update(chunk);
          owner.stats.maxInputChunk = Math.max(owner.stats.maxInputChunk, chunk.byteLength); owner.stats.inputBytes += chunk.byteLength;
          yield chunk;
        }
      } finally { requestCleanup(); }
    }
    const storedLimit = options.maxBytes + Math.ceil(options.maxBytes / 128) + CHUNK_BYTES;
    const digest = new Transform({ highWaterMark: CHUNK_BYTES, transform(chunk, _encoding, callback) {
      storedBytes += chunk.length;
      if (storedBytes > storedLimit) { callback(new NexusError('ARTIFACT_STORED_LIMIT')); return; }
      storedHash.update(chunk); callback(null, chunk);
    } });
    const output = createWriteStream(partial, { flags: 'wx', mode: 0o600, highWaterMark: CHUNK_BYTES, flush: true });
    output.on('drain', () => { this.stats.drains++; });
    const input = Readable.from(bounded(), { objectMode: false, highWaterMark: CHUNK_BYTES });
    const compressionOptions: ZstdOptions & TransformOptions = { chunkSize: CHUNK_BYTES, readableHighWaterMark: CHUNK_BYTES, writableHighWaterMark: CHUNK_BYTES,
      params: { [constants.ZSTD_c_checksumFlag]: 1 } };
    const compression = createZstdCompress(compressionOptions);
    for (const stream of [input, compression, digest, output]) stream.once('error', stop);
    try {
      await pipeline(input, compression, digest, output, { signal: cancellation.signal });
      const ref: ArtifactRef = { artifact_id: id, sha256: rawHash.digest('hex'), bytes: rawBytes, codec: 'zstd',
        stored_sha256: storedHash.digest('hex'), stored_bytes: storedBytes, media_type: options.media_type, sensitivity: 'NORMAL' };
      validateArtifactRef(ref);
      await rename(partial, object); stage = 'OBJECT_WITHOUT_MANIFEST'; await syncDirectory(this.objects);
      const pendingManifest = join(this.partials, id + '.manifest.part');
      await writeNewJson(pendingManifest, ref); await rename(pendingManifest, manifest); await syncDirectory(this.objects);
      return ref;
    } catch (error) {
      requestCleanup(); const failure = pipelineFailure ?? error;
      if (isFileFailure(failure)) this.onFault(failure);
      if (interruptedNext && !cleanupConfirmed) this.onFault(new NexusError('SOURCE_CLEANUP_UNKNOWN', 'Store stream stopped; source iterator cleanup was not confirmed.'));
      // Never delete the only partial bytes or return a complete Ref after failure.
      try { await writeNewJson(join(this.partials, id + '.incomplete.json'), {
        artifact_id: id, status: 'INCOMPLETE', stage, input_bytes_observed: rawBytes,
        compressed_bytes_observed: storedBytes, durable_offset: null,
        reason: (failure as { code?: string })?.code ?? (failure as Error)?.name ?? 'STREAM_FAILED',
        store_output_closed: output.closed,
        producer_cleanup: inputDone ? 'ITERATION_COMPLETE' : cleanupConfirmed ? 'ITERATOR_RETURN_ACKNOWLEDGED' : 'UNKNOWN',
        producer_exit: 'NOT_VERIFIED',
      }); } catch (recordError) { this.onFault(recordError); }
      throw failure;
    } finally {
      options.signal?.removeEventListener('abort', forwardAbort); cancellation.signal.removeEventListener('abort', rejectAbort);
    }
  }

  assertPublished(ref: ArtifactRef): void {
    validateArtifactRef(ref);
    const manifest = join(this.objects, ref.artifact_id + '.json');
    let raw: string;
    try {
      const info = lstatSync(manifest);
      invariant(info.isFile() && !info.isSymbolicLink() && info.size <= 4096, 'ARTIFACT_NOT_PUBLISHED');
      raw = readFileSync(manifest, 'utf8');
      invariant(raw === canonical(ref) + '\n', 'ARTIFACT_REF_MISMATCH');
      const object = lstatSync(join(this.objects, ref.artifact_id + '.zst'));
      invariant(object.isFile() && !object.isSymbolicLink() && object.size === ref.stored_bytes, 'ARTIFACT_NOT_PUBLISHED');
    } catch (error) {
      if (error instanceof NexusError) throw error;
      throw new NexusError('ARTIFACT_NOT_PUBLISHED');
    }
  }

  async *read(ref: ArtifactRef): AsyncGenerator<Uint8Array, void> {
    invariant(!this.closed, 'STORE_CLOSED'); validateArtifactRef(ref);
    let source: ReturnType<typeof createReadStream> | undefined;
    let digest: Transform | undefined, decompressor: ReturnType<typeof createZstdDecompress> | undefined;
    let flow: Promise<void> | undefined, finished = false;
    const rawHash = createHash('sha256'), storedHash = createHash('sha256');
    let rawBytes = 0, storedBytes = 0;
    try {
      this.assertPublished(ref);
      source = createReadStream(join(this.objects, ref.artifact_id + '.zst'), { highWaterMark: CHUNK_BYTES });
      digest = new Transform({ highWaterMark: CHUNK_BYTES, transform(chunk, _encoding, callback) {
        storedBytes += chunk.length;
        if (storedBytes > ref.stored_bytes) { callback(new NexusError('ARTIFACT_CORRUPT')); return; }
        storedHash.update(chunk); callback(null, chunk);
      } });
      const decompressionOptions: ZstdOptions & TransformOptions = { chunkSize: CHUNK_BYTES, readableHighWaterMark: CHUNK_BYTES, writableHighWaterMark: CHUNK_BYTES };
      decompressor = createZstdDecompress(decompressionOptions);
      flow = pipeline(source, digest, decompressor); void flow.catch(() => {});
      for await (const chunk of decompressor) {
        invariant(chunk.byteLength <= CHUNK_BYTES && rawBytes + chunk.byteLength <= ref.bytes, 'ARTIFACT_CORRUPT');
        rawBytes += chunk.byteLength; rawHash.update(chunk); yield chunk;
      }
      await flow;
      invariant(rawBytes === ref.bytes && storedBytes === ref.stored_bytes && rawHash.digest('hex') === ref.sha256 && storedHash.digest('hex') === ref.stored_sha256, 'ARTIFACT_CORRUPT');
      finished = true;
    } catch (error) {
      this.onFault(error);
      throw new NexusError('ARTIFACT_CORRUPT', 'Artifact stream or hash validation failed; preserve the object and recover explicitly.');
    } finally {
      source?.destroy(); digest?.destroy(); decompressor?.destroy();
      if (flow) await flow.catch(() => {});
      // Early iterator return intentionally skips the final verification barrier.
      // Bytes already yielded must not be described as a verified complete object.
      if (!finished) { /* no verified completion is returned */ }
    }
  }

  async verify(): Promise<{ objects: number; bytes: number; incomplete: number }> {
    let objects = 0, bytes = 0, entries = 0;
    const incompleteIds = new Set<string>(), compressedIds = new Set<string>(), completeIds = new Set<string>();
    const directory = await opendir(this.objects);
    for await (const entry of directory) {
      invariant(++entries <= 200000, 'STORAGE_SCAN_LIMIT');
      invariant(entry.isFile() && !entry.isSymbolicLink(), 'ARTIFACT_CORRUPT');
      if (entry.name.endsWith('.zst')) {
        invariant(/^[a-f0-9-]{36}\.zst$/.test(entry.name), 'ARTIFACT_CORRUPT');
        compressedIds.add(entry.name.slice(0, 36)); continue;
      }
      invariant(/^[a-f0-9-]{36}\.json$/.test(entry.name), 'ARTIFACT_CORRUPT');
      const path = join(this.objects, entry.name), info = await lstat(path);
      invariant(info.size <= 4096, 'ARTIFACT_CORRUPT');
      const ref = JSON.parse(readFileSync(path, 'utf8')) as ArtifactRef; validateArtifactRef(ref);
      invariant(entry.name === ref.artifact_id + '.json', 'ARTIFACT_CORRUPT');
      for await (const _chunk of this.read(ref)) { /* streamed verification */ }
      completeIds.add(ref.artifact_id); objects++; bytes += ref.bytes;
    }
    const partialDirectory = await opendir(this.partials);
    for await (const entry of partialDirectory) {
      invariant(++entries <= 200000 && entry.isFile() && !entry.isSymbolicLink(), 'STORAGE_SCAN_LIMIT');
      invariant(/^[a-f0-9-]{36}\.(?:part|manifest\.part|incomplete\.json)$/.test(entry.name), 'ARTIFACT_CORRUPT');
      incompleteIds.add(entry.name.slice(0, 36));
    }
    for (const id of compressedIds) if (!completeIds.has(id)) incompleteIds.add(id);
    return { objects, bytes, incomplete: incompleteIds.size };
  }

  async waitForIdle(): Promise<void> { await Promise.allSettled([...this.active]); }
  async close(): Promise<void> { this.closed = true; await this.waitForIdle(); }
}
