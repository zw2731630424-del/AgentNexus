import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomFillSync } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile, readdir, open, appendFile, rename, unlink, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { CHUNK_BYTES } from '../../src/agentnexus/artifacts.ts';
import { auditEvent, NexusError, now, uid } from '../../src/agentnexus/types.ts';
import type { AuditInput, Json } from '../../src/agentnexus/types.ts';

const evidenceRoot = resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT ?? '.workflow-kit/runtime/AgentNexus-M1.2/test-data', 'storage');
const fixtureRoot = join(evidenceRoot, 'fixtures');
await mkdir(fixtureRoot, { recursive: true });
const results: { name: string; status: string; elapsed_ms: number }[] = [];
const measurements: Record<string, Json> = {};
const identity = { agent_id: 'worker', project_id: 'project', task_id: 'task', session_id: 'session' };
function event(phase = 'RECEIVED', detail: Json = null): AuditInput { return auditEvent(identity, { operation_type: 'synthetic-storage-test', phase, detail }); }
async function fixture(name: string): Promise<string> { return mkdtemp(join(fixtureRoot, name + '-')); }
function code(error: unknown, expected: string): boolean { return error instanceof NexusError && error.code === expected; }
function checked(name: string, fn: () => Promise<void>): void {
  test(name, async () => {
    const start = performance.now();
    try { await fn(); results.push({ name, status: 'PASS', elapsed_ms: performance.now() - start }); }
    catch (error) { results.push({ name, status: 'FAIL', elapsed_ms: performance.now() - start }); throw error; }
  });
}
after(async () => {
  const candidate = [];
  for (const path of ['src/agentnexus/storage.ts', 'src/agentnexus/artifacts.ts', 'src/agentnexus/records.ts', 'tests/agentnexus/storage.test.ts', 'tests/agentnexus/owned-storage-child.mjs']) {
    const bytes = await readFile(resolve(path)); candidate.push({ path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  await writeFile(join(evidenceRoot, 'verification.v3.json'), JSON.stringify({
    schema: 'agentnexus/storage-verification/3', observed_at: now(), command: 'node --test --test-reporter=tap --test-concurrency=1 tests/agentnexus/storage.test.ts',
    node: process.version, platform: process.platform, scope: 'Real Node SQLite/Zstd/filesystem/process restart with synthetic fixtures; no model or sandbox claim.',
    status: results.every(x => x.status === 'PASS') ? 'PASS' : 'FAIL', results, measurements, candidate,
    not_run: ['OS administrator/worker authentication', 'OS sandbox', 'hardware power interruption', 'real model', 'Provider credentials', 'scientific workloads'],
    limits: ['Windows directory fsync is unavailable through this portable Node path; file fsync and process crash recovery are exercised.',
      'Store is a trusted local library. Public DatabaseSync is not exposed to an Agent and cannot enforce OS isolation.'],
    baseline_snapshot: '.workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/snapshot.json',
    independent_review: '.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/storage-integrity-review.json',
  }, null, 2) + '\n');
});

async function withDeadline<T>(promise: Promise<T>, milliseconds = 2000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([promise, new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('Test deadline exceeded')), milliseconds); })]); }
  finally { if (timer) clearTimeout(timer); }
}

async function child(root: string, mode: string, ready = true) {
  const processChild = spawn(process.execPath, [fileURLToPath(new URL('./owned-storage-child.mjs', import.meta.url)), root, mode], {
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'], windowsHide: true,
  });
  let stderr = ''; processChild.stderr!.on('data', x => { stderr += x; });
  const exited = once(processChild, 'exit');
  if (ready) await Promise.race([
    once(processChild, 'message'), exited.then(() => { throw new Error('Child exited before ready: ' + stderr); }),
    new Promise((_resolve, reject) => { const timer = setTimeout(() => reject(new Error('Child fixture timeout: ' + stderr)), 10000); timer.unref(); }),
  ]);
  return { process: processChild, exited, stderr: () => stderr };
}

checked('real SQLite, three independent domain chains and global pagination', async () => {
  const root = await fixture('domains'), store = await KernelStore.open(root, { segmentBytes: 4096 });
  try {
    measurements.sqlite = String((store.db.prepare('SELECT sqlite_version() AS version').get() as { version: string }).version);
    const ref = await store.artifacts.putBytes(Buffer.from('original conversation bytes'), { media_type: 'text/plain' });
    const one = store.audit(event());
    const context = store.context({ ...identity, event_id: uid(), operation_id: one.operation_id, observed_at: now(), kind: 'USER', payload_ref: ref, audit_event_refs: [one.event_id] });
    const decision = store.decision({ ...identity, event_id: uid(), operation_id: one.operation_id, observed_at: now(), decision_id: uid(), status: 'ACCEPTED', authority_ref: 'trusted-fixture', supersedes: null, evidence_refs: [ref], decision: { choice: 'synthetic' } });
    const two = store.audit(event('RESULT'));
    assert.deepEqual([one.seq, context.seq, decision.seq, two.seq], [1, 2, 3, 4]);
    assert.equal(two.previous_hash, one.hash); assert.equal(context.previous_hash, '0'.repeat(64)); assert.equal(decision.previous_hash, '0'.repeat(64));
    await store.flush();
    assert.deepEqual(store.query('audit', { after: 1 }).map(x => x.seq), [4]);
    const page = store.reconstructTask('task', { limit: 2 }); assert.deepEqual(page.records.map(x => x.seq), [1, 2]); assert.equal(page.next_cursor, 2);
    assert.deepEqual(store.reconstructTask('task', { after: page.next_cursor! }).records.map(x => x.seq), [3, 4]);
    assert.equal((await store.verify()).records, 4);
  } finally { await store.close(); }
  const again = await KernelStore.open(root); try { assert.equal((await again.verify()).records, 4); } finally { await again.close(); }
});

checked('synchronous cross-table transaction, rollback, UNIQUE and business errors do not fault', async () => {
  const store = await KernelStore.open(await fixture('transaction'));
  try {
    store.db.exec('CREATE TABLE test_claims (id TEXT PRIMARY KEY) STRICT');
    store.transaction(() => { store.audit(event()); store.db.prepare('INSERT INTO test_claims VALUES(?)').run('one'); });
    assert.throws(() => store.transaction(() => { store.audit(event()); store.db.prepare('INSERT INTO test_claims VALUES(?)').run('one'); }));
    assert.throws(() => store.transaction(() => { store.audit(event()); throw new NexusError('PERMIT_REPLAY'); }), e => code(e, 'PERMIT_REPLAY'));
    assert.throws(() => store.transaction(() => store.transaction(() => 1)), e => code(e, 'NESTED_TRANSACTION'));
    assert.throws(() => store.transaction(async () => { store.audit(event()); }), e => code(e, 'ASYNC_TRANSACTION'));
    assert.throws(() => store.transaction(() => { store.audit(event()); return Promise.resolve(1); }), e => code(e, 'ASYNC_TRANSACTION'));
    assert.throws(() => store.transaction(() => Promise.resolve().then(() => store.audit(event()))), e => code(e, 'ASYNC_TRANSACTION'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(store.query('audit').length, 1); assert.equal(store.faulted, false);
    assert.throws(() => store.db.prepare('UPDATE anx_records SET body=?').run('{}')); assert.equal(store.faulted, false);
    await store.flush();
  } finally { await store.close(); }
});

checked('agent and session SQL filters apply before LIMIT and preserve global cursor pages', async () => {
  const store = await KernelStore.open(await fixture('identity-query'));
  try {
    for (let i = 0; i < 110; i++) store.audit(auditEvent({ ...identity, agent_id: 'other-agent', session_id: 'other-session' }, { operation_type: 'synthetic-query', phase: 'OTHER' }));
    const first = store.audit(event('OWN'));
    store.audit(auditEvent({ ...identity, session_id: 'old-session' }, { operation_type: 'synthetic-query', phase: 'OLD_SESSION' }));
    const second = store.audit(event('OWN'));
    store.audit(auditEvent({ ...identity, project_id: 'other-project' }, { operation_type: 'synthetic-query', phase: 'OTHER_PROJECT' }));
    const third = store.audit(event('OWN'));
    const scope = { project_id: identity.project_id, task_id: identity.task_id, agent_id: identity.agent_id, session_id: identity.session_id };
    assert.deepEqual(store.query('audit', { ...scope, limit: 2 }).map(x => x.seq), [first.seq, second.seq]);
    assert.deepEqual(store.query('audit', { ...scope, after: second.seq, limit: 2 }).map(x => x.seq), [third.seq]);
    assert.equal(store.reconstructTask('task', { project_id: 'other-project' }).records.length, 1);
    assert.throws(() => store.query('audit', { agent_id: "x' OR 1=1" }), e => code(e, 'INVALID_QUERY'));
    assert.throws(() => store.query('audit', { session_id: '' }), e => code(e, 'INVALID_QUERY'));
    const plan = store.db.prepare("EXPLAIN QUERY PLAN SELECT * FROM anx_records WHERE domain=? AND project_id=? AND task_id=? AND json_extract(body,'$.agent_id')=? AND json_extract(body,'$.session_id')=? AND seq>? ORDER BY seq LIMIT ?")
      .all('audit', 'project', 'task', 'worker', 'session', 0, 2) as { detail: string }[];
    assert.ok(plan.some(x => x.detail.includes('anx_records_identity_seq'))); assert.equal(store.faulted, false); await store.flush();
    measurements.identity_query = { rows_before_match: 110, matching_sequences: [first.seq, second.seq, third.seq], index_used: true };
  } finally { await store.close(); }
});

checked('flush covers its captured target after an empty or older shared flush', async () => {
  const store = await KernelStore.open(await fixture('flush-target'));
  try {
    const empty = store.flush(), first = store.audit(event('AFTER_EMPTY')), required = store.flush();
    await Promise.all([empty, required]);
    assert.equal(Number((store.db.prepare('SELECT COUNT(*) AS n FROM anx_exports WHERE seq=?').get(first.seq) as { n: number }).n), 1);
    const olderRecord = store.audit(event('OLDER')), older = store.flush(), newerRecord = store.audit(event('NEWER')), newer = store.flush();
    await Promise.all([older, newer]);
    assert.equal(Number((store.db.prepare('SELECT COUNT(*) AS n FROM anx_exports WHERE seq=?').get(newerRecord.seq) as { n: number }).n), 1);
    assert.equal((await store.verify()).pending, 0); measurements.flush_barriers = { empty_then_target: first.seq, older_target: olderRecord.seq, joined_newer_target: newerRecord.seq };
  } finally { await store.close(); }
});

checked('required fields, malformed refs, oversized envelopes and query budgets reject without fault', async () => {
  const store = await KernelStore.open(await fixture('validation'));
  try {
    const bad = { ...event() } as Partial<AuditInput>; delete bad.applicability;
    assert.throws(() => store.audit(bad as AuditInput));
    assert.throws(() => store.audit(event('LARGE', 'x'.repeat(70000))), e => code(e, 'FRAME_TOO_LARGE'));
    assert.throws(() => store.audit({ ...event(), exit_code: 1.5 }));
    assert.throws(() => store.query('audit', { limit: 101 }), e => code(e, 'INVALID_QUERY'));
    assert.throws(() => store.query('audit', { after: -1 }), e => code(e, 'INVALID_QUERY'));
    assert.equal(store.faulted, false); store.audit(event()); await store.flush();
  } finally { await store.close(); }
});

checked('outbox high water rejects new records, then drains without unbounded queues', async () => {
  const store = await KernelStore.open(await fixture('outbox-budget'), { maxPendingBytes: 8192 });
  try {
    let admitted = 0;
    for (; admitted < 100; admitted++) {
      try { store.audit(event('PENDING', 'x'.repeat(900))); }
      catch (error) { assert.ok(code(error, 'BACKPRESSURE')); break; }
    }
    assert.ok(admitted > 0 && admitted < 100); assert.equal(store.faulted, false);
    const pending = Number((store.db.prepare('SELECT SUM(frame_bytes) AS n FROM anx_outbox').get() as { n: number }).n);
    assert.ok(pending <= 8192); await store.flush(); store.audit(event()); await store.flush();
    assert.equal((await store.verify()).pending, 0); measurements.outbox = { admitted, pending_bytes: pending, configured_bytes: 8192 };
  } finally { await store.close(); }
});

checked('second writer and live lock recovery are blocked; real owner death is explicit', async () => {
  const root = await fixture('lock'), owned = await child(root, 'hold');
  try {
    await assert.rejects(KernelStore.open(root), e => code(e, 'STORE_LOCKED'));
    await assert.rejects(KernelStore.recoverAbandonedLock(root), e => code(e, 'STORE_LOCKED'));
  } finally { owned.process.kill('SIGKILL'); await owned.exited; }
  await assert.rejects(KernelStore.open(root), e => code(e, 'STORE_LOCKED'));
  assert.equal((await KernelStore.recoverAbandonedLock(root)).recovered, true);
  const store = await KernelStore.open(root); try { assert.equal(store.query('audit').length, 1); assert.equal((await store.verify()).pending, 0); } finally { await store.close(); }
});

checked('process crash after file fsync and before receipt reexports no duplicate', async () => {
  const root = await fixture('crash-window'), owned = await child(root, 'file-before-receipt', false);
  const [exit, signal] = await owned.exited; assert.ok(signal || exit !== 0, owned.stderr());
  await KernelStore.recoverAbandonedLock(root); const store = await KernelStore.open(root);
  try {
    assert.equal(store.query('audit').length, 1); assert.equal((await store.verify()).pending, 0);
    const files = (await readdir(join(root, 'segments'))).filter(x => x.endsWith('.jsonl'));
    const lines = (await readFile(join(root, 'segments', files[0]), 'utf8')).trim().split('\n'); assert.equal(lines.length, 1);
  } finally { await store.close(); }
});

checked('unacknowledged crash tail is preserved then repaired from durable outbox', async () => {
  const root = await fixture('tail'), owned = await child(root, 'partial-tail'); owned.process.kill('SIGKILL'); await owned.exited;
  await KernelStore.recoverAbandonedLock(root); const store = await KernelStore.open(root);
  try {
    assert.deepEqual(store.query('audit').map(x => x.seq), [1, 2]); assert.equal((await store.verify()).pending, 0);
    const tails = (await readdir(join(root, 'recovery'))).filter(x => x.endsWith('.tail')); assert.equal(tails.length, 1);
    assert.ok((await stat(join(root, 'recovery', tails[0]))).size > 0);
  } finally { await store.close(); }
  const emptyRoot = await fixture('first-tail'), first = await child(emptyRoot, 'first-partial-tail'); first.process.kill('SIGKILL'); await first.exited;
  await KernelStore.recoverAbandonedLock(emptyRoot); const repaired = await KernelStore.open(emptyRoot);
  assert.equal(repaired.query('audit').length, 1); await repaired.close();
  const reopened = await KernelStore.open(emptyRoot); try { assert.equal((await reopened.verify()).records, 1); } finally { await reopened.close(); }
});

checked('actual export I/O failure freezes writes and preserves outbox until explicit recovery', async () => {
  const root = await fixture('io-fault'), store = await KernelStore.open(root);
  try {
    store.audit(event()); await rename(join(root, 'segments'), join(root, 'segments.saved')); await writeFile(join(root, 'segments'), 'not a directory');
    await assert.rejects(store.flush()); assert.equal(store.faulted, true);
    assert.equal(Number((store.db.prepare('SELECT COUNT(*) AS n FROM anx_outbox').get() as { n: number }).n), 1);
    assert.throws(() => store.audit(event()), e => code(e, 'STORE_FAULTED'));
    await assert.rejects(store.artifacts.putBytes(Buffer.from('no new object while faulted')), e => code(e, 'STORE_FAULTED'));
    assert.equal(store.reconstructTask('task').records.length, 1);
    await unlink(join(root, 'segments')); await rename(join(root, 'segments.saved'), join(root, 'segments'));
    await assert.rejects(store.flush(), e => code(e, 'STORE_FAULTED'));
    await store.recover(); assert.equal(store.faulted, false); assert.equal((await store.verify()).pending, 0);
  } finally { await store.close(); }
});

checked('acknowledged truncation is never silently discarded or rebuilt as success', async () => {
  const root = await fixture('acked-tail'), store = await KernelStore.open(root); store.audit(event()); await store.flush();
  const name = (await readdir(join(root, 'segments'))).find(x => x.endsWith('.jsonl'))!;
  const path = join(root, 'segments', name), original = await readFile(path);
  await writeFile(path, original.subarray(0, original.length - 1));
  await assert.rejects(store.verify(), e => e instanceof NexusError); assert.equal(store.faulted, true);
  await assert.rejects(store.recover(), e => code(e, 'ACKNOWLEDGED_TAIL_CORRUPT'));
  assert.equal((await stat(path)).size, original.length - 1); await store.close();
});

checked('actual artifact publication I/O failure retains bytes and freezes both record and object admission', async () => {
  const root = await fixture('artifact-io'), store = await KernelStore.open(root);
  try {
    const objects = join(root, 'artifacts', 'objects'), saved = join(root, 'artifacts', 'objects.saved');
    await rename(objects, saved); await writeFile(objects, 'not a directory');
    await assert.rejects(store.artifacts.putBytes(Buffer.from('retain me'))); assert.equal(store.faulted, true);
    assert.throws(() => store.audit(event()), e => code(e, 'STORE_FAULTED'));
    await assert.rejects(store.artifacts.putBytes(Buffer.from('blocked')), e => code(e, 'STORE_FAULTED'));
    await unlink(objects); await rename(saved, objects);
    assert.ok((await readdir(join(root, 'artifacts', 'partials'))).some(x => x.endsWith('.part')));
    await store.recover(); assert.equal(store.faulted, false); await store.artifacts.putBytes(Buffer.from('recovered'));
  } finally { await store.close(); }
});

checked('database hash tampering throws, freezes writes and does not fake repair', async () => {
  const store = await KernelStore.open(await fixture('db-tamper')); store.audit(event()); await store.flush();
  store.db.exec('DROP TRIGGER anx_records_no_update'); store.db.prepare('UPDATE anx_records SET hash=? WHERE seq=1').run('f'.repeat(64));
  await assert.rejects(store.verify(), e => e instanceof NexusError); assert.equal(store.faulted, true);
  assert.throws(() => store.audit(event()), e => code(e, 'STORE_FAULTED'));
  assert.deepEqual(store.query('context'), []); await assert.rejects(store.recover()); await store.close();
});

checked('32 MiB randomized artifact roundtrip streams with real backpressure and two hashes', async () => {
  const store = await KernelStore.open(await fixture('large-stream'));
  try {
    const expected = createHash('sha256'), total = 32 * 1024 * 1024; let peakRss = process.memoryUsage().rss;
    async function* chunks() {
      for (let n = 0; n < total; n += CHUNK_BYTES) {
        const chunk = randomFillSync(Buffer.alloc(CHUNK_BYTES)); expected.update(chunk);
        peakRss = Math.max(peakRss, process.memoryUsage().rss); yield chunk;
      }
    }
    const startRss = process.memoryUsage().rss, ref = await store.artifacts.put(chunks(), { maxBytes: total });
    const actual = createHash('sha256'); let bytes = 0;
    for await (const chunk of store.artifacts.read(ref)) { assert.ok(chunk.length <= CHUNK_BYTES); actual.update(chunk); bytes += chunk.length; peakRss = Math.max(peakRss, process.memoryUsage().rss); }
    assert.equal(bytes, total); assert.equal(actual.digest('hex'), expected.digest('hex')); assert.equal(ref.bytes, total);
    assert.ok(store.artifacts.stats.drains > 0); assert.ok(store.artifacts.stats.maxInputChunk <= CHUNK_BYTES);
    measurements.stream = { input_bytes: total, stored_bytes: ref.stored_bytes, drains: store.artifacts.stats.drains,
      max_input_chunk: store.artifacts.stats.maxInputChunk, max_active_puts: store.artifacts.stats.maxActivePuts,
      observed_peak_rss: peakRss, observed_rss_delta: peakRss - startRss, raw_sha256: ref.sha256, stored_sha256: ref.stored_sha256 };
  } finally { await store.close(); }
});

checked('cancelled, over-budget and invalid-chunk objects remain incomplete; secret is rejected', async () => {
  const root = await fixture('incomplete'), store = await KernelStore.open(root);
  try {
    await assert.rejects(store.artifacts.putBytes(Buffer.from('secret'), { sensitivity: 'SECRET' as 'NORMAL' }), e => code(e, 'SECRET_UNSUPPORTED'));
    await assert.rejects(store.artifacts.put([Buffer.alloc(CHUNK_BYTES + 1)]), e => code(e, 'INVALID_ARTIFACT_CHUNK'));
    await assert.rejects(store.artifacts.put([Buffer.alloc(5), Buffer.alloc(5)], { maxBytes: 9 }), e => code(e, 'ARTIFACT_LIMIT'));
    const controller = new AbortController();
    async function* cancelled() { yield Buffer.alloc(1024); controller.abort(); yield Buffer.alloc(1024); }
    await assert.rejects(store.artifacts.put(cancelled(), { signal: controller.signal }));
    assert.equal((await readdir(join(root, 'artifacts', 'objects'))).length, 0);
    const parts = await readdir(join(root, 'artifacts', 'partials')); assert.ok(parts.some(x => x.endsWith('.part'))); assert.ok(parts.some(x => x.endsWith('.incomplete.json')));
    if (store.faulted) await store.recover();
    await store.artifacts.putBytes(Buffer.alloc(0));
  } finally { await store.close(); }
});

checked('early artifact iterator return is not verification; full corrupted stream fails closed', async () => {
  const root = await fixture('artifact-tamper'), store = await KernelStore.open(root);
  const ref = await store.artifacts.putBytes(randomFillSync(Buffer.alloc(2 * 1024 * 1024)));
  const path = join(root, 'artifacts', 'objects', ref.artifact_id + '.zst'), file = await open(path, 'r+');
  const byte = Buffer.alloc(1); await file.read(byte, 0, 1, ref.stored_bytes - 1); byte[0] ^= 1; await file.write(byte, 0, 1, ref.stored_bytes - 1); await file.sync(); await file.close();
  for await (const chunk of store.artifacts.read(ref)) { assert.ok(chunk.length > 0); break; }
  assert.equal(store.faulted, false);
  await assert.rejects(async () => { for await (const _chunk of store.artifacts.read(ref)) {} }, e => code(e, 'ARTIFACT_CORRUPT'));
  assert.equal(store.faulted, true); await assert.rejects(store.artifacts.putBytes(Buffer.from('no')), e => code(e, 'STORE_FAULTED')); await store.close();
});

checked('concurrent artifact admission is bounded and rejects a third stream without queueing', async () => {
  const store = await KernelStore.open(await fixture('stream-slots'));
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  async function* slow() { await gate; yield Buffer.from('bounded'); }
  try {
    const first = store.artifacts.put(slow()), second = store.artifacts.put(slow());
    await assert.rejects(store.artifacts.put(slow()), e => code(e, 'BACKPRESSURE'));
    assert.equal(store.artifacts.stats.activePuts, 2); release(); await Promise.all([first, second]);
    assert.equal(store.artifacts.stats.maxActivePuts, 2); assert.equal(store.faulted, false);
  } finally { release(); await store.close(); }
});

checked('abort races a permanently pending source.next without retaining Store writers or accepting late bytes', async () => {
  const root = await fixture('stalled-abort'), store = await KernelStore.open(root);
  let started!: () => void, releaseNext!: () => void, returns = 0;
  const entered = new Promise<void>(resolve => { started = resolve; });
  const source: AsyncIterable<Uint8Array> = { [Symbol.asyncIterator]() { return {
    next() { started(); return new Promise<IteratorResult<Uint8Array>>(resolve => { releaseNext = () => resolve({ done: false, value: Buffer.from('late source bytes') }); }); },
    return() { returns++; return new Promise<IteratorResult<Uint8Array>>(() => {}); },
  }; } };
  const controller = new AbortController(), pending = store.artifacts.put(source, { signal: controller.signal });
  const outcome = pending.then(() => null, error => error); await withDeadline(entered); controller.abort();
  const error = await withDeadline(outcome); assert.ok(error); assert.equal(returns, 1); assert.equal(store.artifacts.stats.activePuts, 0);
  assert.equal(store.faulted, true); assert.throws(() => store.audit(event()), e => code(e, 'STORE_FAULTED'));
  const files = await readdir(join(root, 'artifacts', 'partials')), partial = files.find(x => x.endsWith('.part'))!;
  const before = await readFile(join(root, 'artifacts', 'partials', partial));
  const marker = JSON.parse(await readFile(join(root, 'artifacts', 'partials', files.find(x => x.endsWith('.incomplete.json'))!), 'utf8'));
  assert.equal(marker.producer_cleanup, 'UNKNOWN'); assert.equal(marker.producer_exit, 'NOT_VERIFIED'); assert.equal(marker.store_output_closed, true);
  await withDeadline(store.close()); releaseNext(); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(await readFile(join(root, 'artifacts', 'partials', partial)), before);
  assert.equal((await readdir(join(root, 'artifacts', 'objects'))).length, 0);
  assert.equal(await stat(join(root, 'writer.lock')).then(() => true, () => false), false);
  measurements.stalled_source = { put_settled_before_source_release: true, iterator_return_requested: returns, producer_exit: 'NOT_VERIFIED', store_output_closed: true, late_bytes_written: false };
});

checked('concurrent close calls share the real drain and lock-release promise', async () => {
  const root = await fixture('shared-close'), store = await KernelStore.open(root);
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  async function* source() { await gate; yield Buffer.from('finish before close'); }
  const put = store.artifacts.put(source()), first = store.close(), second = store.close();
  let firstDone = false, secondDone = false; void first.then(() => { firstDone = true; }); void second.then(() => { secondDone = true; });
  try {
    assert.strictEqual(first, second); await new Promise(resolve => setImmediate(resolve));
    assert.equal(firstDone, false); assert.equal(secondDone, false); assert.equal(store.artifacts.stats.activePuts, 1);
    assert.equal(await stat(join(root, 'writer.lock')).then(() => true, () => false), true);
  } finally { release(); await withDeadline(put); await withDeadline(Promise.all([first, second])); }
  assert.equal(firstDone, true); assert.equal(secondDone, true); assert.equal(store.artifacts.stats.activePuts, 0);
  assert.equal(await stat(join(root, 'writer.lock')).then(() => true, () => false), false);
});

checked('sealed segments are compressed, chained and verified; stored bit flip is detected', async () => {
  const root = await fixture('segments'), store = await KernelStore.open(root, { segmentBytes: 4096 });
  for (let i = 0; i < 12; i++) { store.audit(event('ROTATE', { i })); await store.flush(); }
  await store.close();
  const manifests = (await readdir(join(root, 'segments'))).filter(x => x.endsWith('.manifest.json')).sort(); assert.ok(manifests.length > 1);
  let previous = '0'.repeat(64);
  for (const name of manifests) { const manifest = JSON.parse(await readFile(join(root, 'segments', name), 'utf8')); assert.equal(manifest.previous_segment_hash, previous); previous = manifest.hash; }
  const reopened = await KernelStore.open(root); assert.equal((await reopened.verify()).records, 12);
  const name = manifests[0].replace('.manifest.json', '.zst'), path = join(root, 'segments', name), bytes = await readFile(path); bytes[bytes.length - 1] ^= 1; await writeFile(path, bytes);
  await assert.rejects(reopened.verify(), e => e instanceof NexusError); assert.equal(reopened.faulted, true); await reopened.close();
});

checked('process-killed partial artifact remains retained without a complete object reference', async () => {
  const root = await fixture('artifact-crash'), owned = await child(root, 'partial-artifact'); owned.process.kill('SIGKILL'); await owned.exited;
  await KernelStore.recoverAbandonedLock(root); const store = await KernelStore.open(root);
  try {
    assert.equal((await readdir(join(root, 'artifacts', 'objects'))).length, 0);
    assert.ok((await readdir(join(root, 'artifacts', 'partials'))).some(x => x.endsWith('.part')));
    const verified = await store.verify(); assert.equal(verified.objects, 0); assert.ok(verified.incomplete >= 1);
  } finally { await store.close(); }
});
