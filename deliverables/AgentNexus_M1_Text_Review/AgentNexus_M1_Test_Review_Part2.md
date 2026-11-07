# AgentNexus M1 Test Review — Part 2

完整当前测试、辅助进程、夹具生成代码、配置、研发验证器/探针和保留的历史测试。开发工具及v1不是Host运行模块。历史日志使用合成输入/回调和部分时钟/spy；没有真实模型验证，不重新执行这些代码。

## tests/agentnexus/storage.test.ts

类别：`current_test_source_or_helper`；原始字节数：28870。

源文件 SHA256：

```text
d0cae519ebfce054002a51b10b292cc870f2bbe01c67706dd1fd9a203525a3da
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0024","path":"tests/agentnexus/storage.test.ts","bytes":28870,"sha256":"d0cae519ebfce054002a51b10b292cc870f2bbe01c67706dd1fd9a203525a3da","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"current_test_source_or_helper","kind":"original","origin":{"kind":"workspace","path":"tests/agentnexus/storage.test.ts"}} -->
```typescript
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

const evidenceRoot = resolve('.workflow-kit/runtime/AgentNexus-v0.4-M1/storage');
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
  let stderr = ''; processChild.stderr.on('data', x => { stderr += x; });
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
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/final_verify.py

类别：`development_only_M1_verification_or_probe`；原始字节数：22148。

源文件 SHA256：

```text
75e7432a9978e52b575d995351335ef60a1e9675c6011e7556233ad66ea25910
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0025","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/final_verify.py","bytes":22148,"sha256":"75e7432a9978e52b575d995351335ef60a1e9675c6011e7556233ad66ea25910","language":"python","fence":"```","wrapper_padding_newline":false,"category":"development_only_M1_verification_or_probe","kind":"original","origin":{"kind":"workspace","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/final_verify.py"}} -->
```python
"""Reproducible local M1 acceptance; never executes upstream code, models or Git."""
import ast, datetime, hashlib, json, re, subprocess, sys, zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
RUN=Path(__file__).parent
DOC=ROOT/'.workflow-kit/tasks/AgentNexus-v0.4-M0.1'
BASE=json.loads((ROOT/'.workflow-kit/runtime/AgentNexus-v0.4-M0.1/baseline.json').read_text('utf-8'))
checks=[]
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(65536),b''):h.update(b)
 return h.hexdigest()
def write(p,v):
 p.parent.mkdir(parents=True,exist_ok=True)
 p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n','utf-8')
def check(name,ok,scope,detail=None):
 checks.append({'id':name,'status':'PASS' if ok else 'FAIL','scope':scope,'detail':detail})
def files():
 paths=[ROOT/'package.json']
 for rel in ['src/agentnexus','tests/agentnexus','config/agentnexus','tools/agentnexus']:
  paths.extend(p for p in (ROOT/rel).rglob('*') if p.is_file())
 return sorted(paths)
def manifest(paths):return [{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in paths]
if '--finalize-delivery' in sys.argv:
 result=json.loads((RUN/'final-verification.json').read_text('utf-8'))
 assert result['status']=='PASS'
 assert manifest(files())==result['candidate_files'], 'Final candidate changed after acceptance'
 control_review=json.loads((RUN/'reviews/control-review.json').read_text('utf-8'))
 storage_review=json.loads((RUN/'reviews/storage-integrity-review.v3.json').read_text('utf-8'))
 assert control_review['status'].startswith('PASS'), control_review['status']
 assert storage_review['status']=='PASS'
 for x in BASE['m0_files']+BASE['protected']:assert sha(ROOT/x['path'])==x['sha256'],x['path']
 totals=result['tests']
 for name,text in [('M1_report.md',f"\n\n<!-- final-results:start -->\n最终本地验收：**{totals['pass']} PASS、{totals['skipped']} NOT_RUN（OS链接权限）、0 FAIL**，共{totals['tests']} tests；{len(result['checks'])}项证据/源码/目录/治理检查通过，候选{len(result['candidate_files'])}文件。真实测试时间UTC：{result['test_run_utc']}；治理超时后仅续跑收尾，原测试日志及第一次源码ZIP均保留。受限本地切片PASS，完整安全部署BLOCKED。\n<!-- final-results:end -->\n"),('M0.1_report.md',f"\n\nM0.1准入后已实际推进[M1受限内核](M1_report.md)，最终真实计数为{totals['pass']}通过/{totals['skipped']}OS链接未运行/0失败；具体范围、未接入生产者和部署阻断见独立M1报告，未改写原M0。\n")]:
  p=DOC/'reports'/name
  body=p.read_text('utf-8')
  if name=='M1_report.md':body=re.sub(r'\n*<!-- final-results:start -->[\s\S]*?<!-- final-results:end -->\n*','',body)
  else:body=re.sub(r'\n*M0\.1准入后已实际推进\[M1受限内核\][\s\S]*$','',body)
  p.write_text(body+text,'utf-8')
 history={'schema':'agentnexus/m1-run-history/1','records':[{'phase':'module_initial_runs','status':'PASS','scope':'Original author module runs retained, not final integrated acceptance','paths':['storage/verification.json','diagnostics/verification.json','integrity/test-run.json']},{'phase':'gateway_initial_integration','status':'FAIL','observed_tests':15,'pass':14,'fail':1,'failure':'AT-REPLAY peer session saw two context records before SQL identity filters were connected','source':'Actual execution transcript chunk 88be73; root added regression and integrated Store filters. Not recast as PASS.'},{'phase':'first_complete_acceptance','status':'PASS','path':'final-run-1/final-verification.json','scope':'Before one-line Store-fault health display clarification; source ZIP and 8 logs preserved'},{'phase':'second_complete_tests','status':'PASS','test_run_utc':result['test_run_utc'],'tests':totals,'tap_sha256':sha(RUN/'all-tests.tap')},{'phase':'governance_60_second_budget','status':'INCONCLUSIVE','reason':'Actual subprocess timeout during final scanning; tests already completed, old final JSON was not used as new acceptance'},{'phase':'resume_governance_and_finalize','status':'PASS','verification_sha256':sha(RUN/'final-verification.json'),'exact_tested_candidate_rechecked':True,'tests_rerun':False,'governance_log_sha256':sha(RUN/'govern-final.log')},{'phase':'storage_v2','status':'NOT_RUN','reason':'Only empty paths were reserved; no test execution or PASS claimed'}]}
 write(RUN/'run-history.json',history)
 changes={'schema':'agentnexus/m01-m1-change-manifest/1','delivery_version':'0.4-m01-m1.1','catalog_revision':2,'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'m0_history_preserved':True,'baseline_manifest':{'path':'.workflow-kit/tasks/AgentNexus-v0.4-M0/reports/delivery_manifest.json','sha256':sha(ROOT/'.workflow-kit/tasks/AgentNexus-v0.4-M0/reports/delivery_manifest.json')},'initial_baseline':{'path':'.workflow-kit/runtime/AgentNexus-v0.4-M0.1/baseline.json','sha256':sha(ROOT/'.workflow-kit/runtime/AgentNexus-v0.4-M0.1/baseline.json')},'prior_design_snapshot':'.workflow-kit/runtime/AgentNexus-v0.4-M0.1/design-freeze-v1/admission.json','catalog_changes':{'old_features':108,'current_features':142,'old_policies':22,'current_policies':34,'details':'catalog_changes.json','revision_2_clarifications':['SQL prepare/PRAGMA exclusion consistent across plan/catalog','historical implementation status normalized to NOT_RUN for full current contracts; M0 unchanged']},'product_source_changes':[{'kind':'ADD',**x} for x in result['candidate_files']],'design_changes':['Four requested independent designs','Versioned catalogs and protocols/implementation plan','ADR006-009 and limited UUID artifact layout decision','Source/rights recheck and primary technical evidence'],'fixes':{'control_review':'.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-review.json','control_findings':8,'storage_review':'.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/storage-integrity-review.v3.json','storage_findings':3,'additional_root_guards':['Mode/Permit/Approval validity rechecked immediately before effect','Feature health BLOCKED/FAILED while required storage is faulted']},'prohibited_actions_performed':{'research_projects_modified_or_run':False,'formal_experiments':False,'git_commit_or_push':False,'hooks_installed':False,'api_key_scan':False,'os_accounts_acl_firewall_modified':False,'npm_install_or_third_party_product_source_copy':False},'run_history':'.workflow-kit/runtime/AgentNexus-v0.4-M1/run-history.json'}
 write(DOC/'reports/change_manifest.json',changes)
 # Append one final engineering checkpoint before hashing the journal into delivery.
 checkpoint=subprocess.run([sys.executable,'-X','utf8','.workflow-kit/runtime/AgentNexus-v0.4-M0.1/record_change.py','M01_M1_FINAL_ACCEPTANCE',
  '.workflow-kit/tasks/AgentNexus-v0.4-M0.1/architecture','.workflow-kit/tasks/AgentNexus-v0.4-M0.1/reports/M1_report.md','src/agentnexus','tests/agentnexus','config/agentnexus','package.json',
  '.workflow-kit/runtime/AgentNexus-v0.4-M1/final-verification.json','.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-review.json','.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/storage-integrity-review.v3.json'],cwd=ROOT,capture_output=True,text=True,check=True)
 evidence=[RUN/n for n in ['all-tests.tap','test-results.json','final-verification.json','syntax.json','demo.json','demo.stderr.txt','govern-final.log','license-closure.json','m1-source-final.zip','run-history.json','reviews/control-review.json','reviews/storage-integrity-review.json','reviews/storage-integrity-review.v3.json','storage/verification.json','storage/verification.v3.json','diagnostics/verification.json','diagnostics/verification.v2.json','integrity/implementation.json','integrity/test-run.json']]
 evidence += [ROOT/'.workflow-kit/runtime/AgentNexus-v0.4-M0.1'/n for n in ['baseline.json','admission.json','engineering-events.jsonl','design-freeze-v1/admission.json']]
 payload=[p for p in DOC.rglob('*') if p.is_file() and p!=DOC/'reports/delivery_manifest.json']+files()+evidence+[ROOT/'inputs/AgentNexus-v0.4-M0.1/user_request.txt']
 payload=sorted(set(payload))
 assert all(p.exists() for p in payload),[str(p) for p in payload if not p.exists()]
 delivery={'schema':'agentnexus/m01-m1-delivery/1','delivery_version':'0.4-m01-m1.1','utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'path_base':'I:/AI_AgentNexus','excludes':'Only this exact manifest path; not a basename exclusion','previous_manifest':changes['baseline_manifest'],'files':manifest(payload),'status':'PASS','scope':'Restricted local M0.1/M1 delivery; full deployment remains BLOCKED','deployment_status':'BLOCKED','tests':totals}
 write(DOC/'reports/delivery_manifest.json',delivery)
 assert all(sha(ROOT/x['path'])==x['sha256'] and (ROOT/x['path']).stat().st_size==x['bytes'] for x in delivery['files'])
 assert all(p.stat().st_size>0 for p in DOC.rglob('*') if p.is_file()),'Empty delivery document'
 errors=[]
 for p in DOC.rglob('*.md'):
  for target in re.findall(r'\]\(([^\)]+)\)',p.read_text('utf-8')):
   target=target.strip('<>')
   if re.match(r'(https?://|#)',target):continue
   target=re.sub(r':\d+$','',target.split('#')[0]);dest=Path(target) if re.match(r'^[A-Za-z]:[/\\]',target) else p.parent/target
   if not dest.exists():errors.append([str(p),target])
 assert not errors,errors
 print(json.dumps({'status':'PASS','payload_files':len(payload),'candidate_files':len(result['candidate_files']),'tests':totals,'manifest_sha256':sha(DOC/'reports/delivery_manifest.json'),'engineering_checkpoint':json.loads(checkpoint.stdout)},ensure_ascii=False))
 raise SystemExit(0)
stamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
reuse='--reuse-local-results' in sys.argv
version=subprocess.run(['node','-e','console.log(JSON.stringify({node:process.version,sqlite:process.versions.sqlite,zstd:process.versions.zstd,platform:process.platform}))'],cwd=ROOT,capture_output=True,text=True,check=True)
versions=json.loads(version.stdout)
check('RUNTIME',versions['node']=='v24.15.0' and tuple(map(int,versions['sqlite'].split('.'))) >= (3,51,3),'Actual installed binding, not a model or OS sandbox test',versions)
changed=[x['path'] for x in BASE['m0_files']+BASE['protected'] if not (ROOT/x['path']).is_file() or sha(ROOT/x['path'])!=x['sha256']]
check('M0_AND_PROTECTED_UNCHANGED',not changed,'24 historical deliverables + 112 original rules/inputs/Kit files',changed)
# Recheck the larger read-only M0 source cache if its frozen prior manifest is available.
preserve=ROOT/'.workflow-kit/runtime/AgentNexus-v0.4-M0.1/integrity/preservation_before.json'
pd=json.loads(preserve.read_text('utf-8'))
preserved_errors=[]
for rel,info in pd['files'].items():
 p=ROOT/rel
 if not p.is_file() or sha(p)!=info['sha256']:preserved_errors.append(rel)
check('COMPLETE_M0_EVIDENCE_UNCHANGED',not preserved_errors,'11,784 protected M0 source/cache/input/rule files, actual file hashes',{'checked':len(pd['files']),'errors':preserved_errors})
before=manifest(files())
if reuse:
 certificate=json.loads((RUN/'license-closure.json').read_text('utf-8'))
 frozen=[{k:x[k] for k in ['path','bytes','sha256']} for x in certificate['files']]
 check('CACHED_CANDIDATE_MATCH',frozen==before,'Resume only if the exact already-tested source candidate still matches its post-test closure certificate')
 if frozen!=before:raise SystemExit('Cannot resume: source candidate changed')
syntax=[]
for p in files():
 if p.suffix in ['.ts','.mjs','.js']:
  r=subprocess.run(['node','--check',str(p)],cwd=ROOT,capture_output=True,text=True)
  syntax.append({'path':p.relative_to(ROOT).as_posix(),'exit_code':r.returncode,'stderr':r.stderr[:4096]})
 elif p.suffix=='.py':
  try:ast.parse(p.read_text('utf-8'));syntax.append({'path':p.relative_to(ROOT).as_posix(),'exit_code':0,'scope':'Python AST of trusted checker only'})
  except Exception as e:syntax.append({'path':str(p),'exit_code':1,'error':str(e)})
write(RUN/'syntax.json',syntax)
check('SOURCE_SYNTAX',all(x['exit_code']==0 for x in syntax),'Node erasable TypeScript syntax and Python AST; static TypeScript type checking NOT_RUN',{'checked':len(syntax)})
tap=RUN/'all-tests.tap'
if reuse:
 cached_results=json.loads((RUN/'test-results.json').read_text('utf-8'))
 if sha(tap)!=cached_results['tap_sha256']:raise SystemExit('Cannot resume: test log hash mismatch')
 test_exit=cached_results['exit_code']
else:
 with tap.open('wb') as output:
  r=subprocess.run(['node','tools/agentnexus/run-tests.mjs'],cwd=ROOT,stdout=output,stderr=subprocess.STDOUT,timeout=60)
 test_exit=r.returncode
raw=tap.read_text('utf-8',errors='strict')
totals={name:int(re.search(r'^# '+name+r' (\d+)\s*$',raw,re.M).group(1)) for name in ['tests','pass','fail','cancelled','skipped','todo']}
cases=[]
for m in re.finditer(r'^( *)(ok|not ok) (\d+) - (.*)$',raw,re.M):
 tail=m.group(4);name,_,skip=tail.partition(' # SKIP')
 cases.append({'ordinal':len(cases)+1,'tap_local_ordinal':int(m.group(3)),'tap_indent':len(m.group(1)),'name':name,'status':'NOT_RUN' if skip else 'PASS' if m.group(2)=='ok' else 'FAIL','reason':skip.strip() or None})
check('LOCAL_M1_TESTS',test_exit==0 and totals['fail']==totals['cancelled']==totals['todo']==0 and totals['tests']==len(cases),'Real native code/SQLite/Zstd/filesystem/known parser/process tests with synthetic inputs; no real model'+('; reused exact recorded run' if reuse else ''),totals)
if not reuse:write(RUN/'test-results.json',{'utc':stamp,'command':['node','tools/agentnexus/run-tests.mjs'],'exit_code':test_exit,'totals':totals,'cases':cases,'tap_sha256':sha(tap),'scope':'Real local implementations with synthetic data; OS sandbox and models NOT_RUN'})
if reuse:
 demo_exit='recorded run, not rerun'
else:
 with (RUN/'demo.json').open('wb') as out, (RUN/'demo.stderr.txt').open('wb') as err:
  demo=subprocess.run(['node','src/agentnexus/cli.ts','demo'],cwd=ROOT,stdout=out,stderr=err,timeout=30)
 demo_exit=demo.returncode
try:
 d=json.loads((RUN/'demo.json').read_text('utf-8')); demo_ok=(reuse or demo_exit==0) and (RUN/'demo.stderr.txt').stat().st_size==0 and d['echo']['status']=='PASS' and d['diagnostics']['data']['status']=='FAIL' and d['verification']['pending']==0 and d['deployment']['status']=='BLOCKED'
except Exception:d={};demo_ok=False
check('NATIVE_DEMO',demo_ok,'Actual local Tool/Audit/Context/Artifact + JSON checker, explicitly no model/Shell'+('; recorded execution retained' if reuse else ''),{'exit_code':demo_exit,'root':d.get('root'),'verification':d.get('verification')})
after=manifest(files());check('CANDIDATE_STABLE',before==after,'Exact source candidate unchanged throughout all checks')
defs=json.loads((ROOT/'config/agentnexus/features.json').read_text('utf-8'))
policies=json.loads((ROOT/'config/agentnexus/policies.json').read_text('utf-8'))
check('CATALOG_COPY',sha(ROOT/'config/agentnexus/features.json')==sha(DOC/'architecture/feature_catalog.json') and sha(ROOT/'config/agentnexus/policies.json')==sha(DOC/'architecture/policy_catalog.json'),'Runtime receives the reviewed versioned definitions; executable availability separate',{'features':len(defs['features']),'policies':len(policies['policies'])})
pkg=json.loads((ROOT/'package.json').read_text('utf-8'))
imports=[];external=[];bad_local=[]
for p in files():
 if p.suffix not in ['.ts','.mjs','.js']:continue
 for spec in re.findall(r'(?:from\s*|import\s*\(|import\s*)[\'\"]([^\'\"]+)[\'\"]',p.read_text('utf-8')):
  imports.append({'file':p.relative_to(ROOT).as_posix(),'specifier':spec})
  if spec.startswith('.'):
   target=(p.parent/spec).resolve()
   if target not in files():bad_local.append({'file':str(p),'specifier':spec})
  elif not spec.startswith('node:'):external.append(spec)
closure={'schema':'agentnexus/m1-actual-candidate-provenance/1','status':'PASS' if not external and not bad_local and not pkg.get('dependencies') and not pkg.get('devDependencies') else 'FAIL','scope':'Complete introduced local source/test/config/tool/package candidate; no runtime binary redistribution','files':[{**x,'provenance':'independently authored AgentNexus source or generated own catalog','imported_third_party_source':False,'distribution_license':'NOT_SELECTED; no public grant inferred'} for x in after],'javascript_import_edges':imports,'unresolved_imports':external+bad_local,'external_runtime_edges':[{'component':'Node','version':versions['node'],'use':'Installed executable and node:* builtins; SQLite/Zstd embedded','bundled':False,'redistribution_admission':'BLOCKED_PENDING_FULL_DISTRIBUTION_CLOSURE'},{'component':'Python','version':'3.12.10','use':'Host-explicit installed parser; direct stdlib imports ast/json/platform/sys; -I -B -S startup','bundled':False},{'component':'PowerShell','version':'7.6.9','use':'Host-explicit installed Language.Parser/.NET assemblies','bundled':False}],'workflow_kit_code_or_templates_imported':False,'project_public_license_selected':False,'runtime_binary_distribution_closure':'BLOCKED','note':'Source ownership is not inferred from user-supplied Kit; no third-party product expression imported. This is source-candidate closure, not a legal opinion or whole installed runtime audit.'}
write(RUN/'license-closure.json',closure)
check('M1_SOURCE_DEPENDENCY_CLOSURE',closure['status']=='PASS','Zero npm dependencies, complete actually introduced source candidate and node:* edges; external runtime redistribution BLOCKED',{'files':len(after),'import_edges':len(imports),'unresolved':external+bad_local})
links=[]
for p in DOC.rglob('*.md'):
 for target in re.findall(r'\]\(([^\)]+)\)',p.read_text('utf-8')):
  target=target.strip('<>')
  if re.match(r'(https?://|#)',target):continue
  target=re.sub(r':\d+$','',target.split('#')[0])
  dest=Path(target) if re.match(r'^[A-Za-z]:[/\\]',target) else p.parent/target
  if not dest.exists():links.append({'file':p.relative_to(ROOT).as_posix(),'target':target})
check('DELIVERY_LINKS',not links,'Local references in new delivery',links)
with (RUN/'govern-final.log').open('wb') as out:
 gov=subprocess.run([sys.executable,'-X','utf8','ai-workflow-kit-v4/tools/govern.py','check','--target','.'],cwd=ROOT,stdout=out,stderr=subprocess.STDOUT,timeout=240)
check('GOVERNANCE',gov.returncode==0,'Existing lite gates only; no rule edits, hooks, commits or push',{'exit_code':gov.returncode,'log':str((RUN/'govern-final.log').relative_to(ROOT))})
# Candidate is reviewable/recoverable even without Git. Do not overwrite earlier frozen source evidence.
source_manifest={'schema':'agentnexus/m1-source-snapshot/1','utc':stamp,'files':after,'scope':'Only own product/test/config/tools/package source; excludes Kit, caches, runtime binaries and credentials'}
write(DOC/'reports/source_snapshot_manifest.json',source_manifest)
snapshot=RUN/'m1-source-final.zip'
with zipfile.ZipFile(snapshot,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for x in after:z.write(ROOT/x['path'],x['path'])
source_manifest['archive']={'path':snapshot.relative_to(ROOT).as_posix(),'sha256':sha(snapshot),'bytes':snapshot.stat().st_size}
write(DOC/'reports/source_snapshot_manifest.json',source_manifest)
testmap={'schema':'agentnexus/m1-test-matrix/1','scope':'Actual final cases and remaining full policy/OS contracts are separate','totals':totals,'actual_cases':cases,'catalog_policy_contracts':[{'policy_id':x['id'],'full_policy_status':'BLOCKED' if x['level']=='L0' else 'NOT_RUN','reason':'Full owner/OS/model/workflow acceptance not inferred from local kernel tests','test_ids':x['test_ids']} for x in policies['policies']],'not_run':[{'item':s,'status':'NOT_RUN'} for s in ['real provider/model/billing','OS administrator/worker identities','Windows/Ubuntu sandbox adversarial matrix','real external Harness','LSP/SQL/Roslyn/TS/Ruff/YAML/Dockerfile integration','hard power loss and long soak','static TypeScript compiler type check','real scientific experiments (not authorized)']]}
write(DOC/'reports/M1_test_matrix.json',testmap)
result={'schema':'agentnexus/m01-m1-final-verification/1','utc':stamp,'status':'PASS' if all(x['status']=='PASS' for x in checks) else 'FAIL','checks':checks,'tests':totals,'versions':versions,'candidate_files':after,'reused_recorded_tests':reuse,'test_run_utc':cached_results['utc'] if reuse else stamp,'scope':'M0.1 evidence and restricted local M1 kernel only; full deployment BLOCKED','blocked':['unlicensed Kit reuse/distribution','runtime binary redistribution','OS admin authentication and arbitrary execution'],'model_validation':'NOT_RUN','static_type_check':'NOT_RUN'}
write(RUN/'final-verification.json',result)
rows=['# M0.1 / M1 本轮验证','','本记录只验证列明的本地内核和设计证据。操作系统管理员身份、任意执行沙箱、真实模型及长期运行未通过准入。','',f"实际总计：{totals['tests']} tests；{totals['pass']} PASS、{totals['fail']} FAIL、{totals['skipped']} NOT_RUN（测试框架skip）。",'','| 检查 | 状态 | 范围 |','|---|---|---|']
for c in checks:rows.append(f"| {c['id']} | {c['status']} | {c['scope']} |")
rows+=['','四项链接用例若因OS权限未运行，只保留NOT_RUN，不折成PASS。完整日志和机器记录：', '', '- [TAP](../../../runtime/AgentNexus-v0.4-M1/all-tests.tap)', '- [逐项结果](../../../runtime/AgentNexus-v0.4-M1/test-results.json)', '- [总验证JSON](../../../runtime/AgentNexus-v0.4-M1/final-verification.json)', '- [真实本地演示](../../../runtime/AgentNexus-v0.4-M1/demo.json)', '- [实际源码依赖闭包](../../../runtime/AgentNexus-v0.4-M1/license-closure.json)', '- [源码快照](source_snapshot_manifest.json)', '- [测试矩阵与未测项](M1_test_matrix.json)', '', '独立审查发现及修前探针保留在runtime/reviews，修复和最终候选绑定另见M1报告。Node --check/原生类型擦除不是tsc类型检查；后者NOT_RUN。所有输入为自造数据，真实执行的是SQLite/文件/Zstd/固定解析器等，不含模型或正式科研实验。']
(DOC/'reports/verification.md').write_text('\n'.join(rows)+'\n','utf-8')
print(json.dumps({'status':result['status'],'tests':totals,'checks':[(x['id'],x['status']) for x in checks]},ensure_ascii=False))
raise SystemExit(result['status']!='PASS')
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/run_tests.py

类别：`development_only_M1_verification_or_probe`；原始字节数：2664。

源文件 SHA256：

```text
5e8073e5906254ee404373c22756bfcfb0bcd77b3c5e638a2c6a3d292e3e5b7e
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0026","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/run_tests.py","bytes":2664,"sha256":"5e8073e5906254ee404373c22756bfcfb0bcd77b3c5e638a2c6a3d292e3e5b7e","language":"python","fence":"```","wrapper_padding_newline":false,"category":"development_only_M1_verification_or_probe","kind":"original","origin":{"kind":"workspace","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/run_tests.py"}} -->
```python
"""Run the actual Node test entry and preserve bounded, structured evidence."""
import hashlib
import json
import os
import platform
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(r"I:\AI_AgentNexus")
OUT = ROOT / ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity"
COMMAND = [r"D:\Nodejs\node.exe", "--test", "--test-reporter=tap", "tests/agentnexus/integrity.test.ts"]
env = dict(os.environ)
env.pop("NODE_OPTIONS", None)
env.pop("NODE_PATH", None)
started = datetime.now(timezone.utc).isoformat()
clock = time.monotonic()
run = subprocess.run(COMMAND, cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=60)
elapsed = time.monotonic() - clock
tap = run.stdout.decode("utf-8", errors="strict")
(OUT / "integrity.tap").write_text(tap, encoding="utf-8", newline="\n")
summary = {}
for key, value in re.findall(r"^# (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms) ([0-9.]+)$", tap, re.M):
    summary[key] = float(value) if "." in value else int(value)
source_paths = [ROOT / "src/agentnexus/integrity.ts", ROOT / "tests/agentnexus/integrity.test.ts", ROOT / "src/agentnexus/types.ts"]
result = {
    "schema": "agentnexus/m1/integrity-test-run/1",
    "started_utc": started, "ended_utc": datetime.now(timezone.utc).isoformat(),
    "command_argv": COMMAND, "cwd": str(ROOT), "exit_code": run.returncode,
    "elapsed_seconds": elapsed, "platform": platform.platform(),
    "node_version": subprocess.check_output([COMMAND[0], "--version"], env=env, text=True).strip(),
    "tap": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
    "tap_sha256": hashlib.sha256(run.stdout).hexdigest(), "tap_bytes": len(run.stdout),
    "summary": summary,
    "not_run_real_os_tests": [line.strip() for line in tap.splitlines() if "# SKIP" in line and "NOT_RUN" in line],
    "source_sha256": {str(path.relative_to(ROOT)).replace("\\", "/"): hashlib.sha256(path.read_bytes()).hexdigest() for path in source_paths},
    "scope": "actual local Node/fs/hash behavior on new owned synthetic fixtures; no models, Kit code, OS identity boundary, adversarial TOCTOU or bundled runtime license admission",
    "status": "PASS" if run.returncode == 0 and summary.get("fail") == 0 else "FAIL",
}
(OUT / "test-run.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(json.dumps({"status": result["status"], "exit_code": run.returncode, "summary": summary, "not_run": result["not_run_real_os_tests"]}, ensure_ascii=False))
if run.returncode:
    print(tap[-20000:])
sys.exit(run.returncode)
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes.ts

类别：`development_only_M1_verification_or_probe`；原始字节数：9855。

源文件 SHA256：

```text
de2381560f636824e80c135e97dd5ded48f4e1fae580238525676532da870368
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0027","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes.ts","bytes":9855,"sha256":"de2381560f636824e80c135e97dd5ded48f4e1fae580238525676532da870368","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"development_only_M1_verification_or_probe","kind":"original","origin":{"kind":"workspace","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-probes.ts"}} -->
```typescript
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

// Read-only product review; all state and clock overrides are synthetic/owned.
const root = resolve('.');
const out = resolve('.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews');
const names = ['types', 'control', 'features', 'policy', 'gateway', 'host', 'storage', 'diagnostics'];
async function fingerprints() {
  return Object.fromEntries(await Promise.all(names.map(async name => [
    `src/agentnexus/${name}.ts`, createHash('sha256').update(await readFile(join(root, `src/agentnexus/${name}.ts`))).digest('hex'),
  ])));
}
const before = await fingerprints();
const { openHost } = await import(pathToFileURL(join(root, 'src/agentnexus/host.ts')).href);
const { intentHash } = await import(pathToFileURL(join(root, 'src/agentnexus/gateway.ts')).href);
await mkdir(out, { recursive: true });
const observations: Record<string, unknown> = {};
const scopes = ['G','P','A','T'];
const def = (id: string, state = 'ON') => ({ id, kind: 'OPTIONAL', default: state, scopes, depends_on: [], conflicts: [] });
const identity = { agent_id: 'review-a', project_id: 'review-project', task_id: 'review-task', session_id: 'review-session' };
async function create(definitions: any[], policies: any[] = []) {
  const state = await mkdtemp(join(out, 'control-state-'));
  return { host: await openHost(state, { definitions, policies }), state };
}
async function change(host: any, changes: any[]) {
  const p = await host.administration.previewFeatures(changes, host.administration.metadata().feature_revision);
  await host.administration.commitFeatures(p.challenge_id, p.preview_hash);
}

{
  const { host, state } = await create([def('review.optional', 'OFF')]);
  let stops = 0;
  host.administration.registerModule('review.optional', { stop: async () => { stops++; } });
  await change(host, [{ id: 'review.optional', scope: {}, state: 'ON' }]);
  const lease = host.features.acquire('review.optional');
  let failure = '';
  try { await change(host, [{ id: 'review.optional', scope: {}, state: 'INHERIT' }]); }
  catch (error) { failure = (error as any).code ?? String(error); }
  observations.inherit_to_off = { state_store: state, failure, resolved: host.features.resolve('review.optional'),
    active_count: host.features.activeCount(), lease_aborted: lease.signal.aborted, stop_calls: stops };
  lease.release(); await host.close();
}

{
  const { host, state } = await create([def('tool.test'), def('devint.runtime')]);
  const agent = host.bindAgent(identity);
  const lease = host.features.acquire('devint.runtime');
  let failed = '';
  try { await change(host, [{ id: 'devint.runtime', scope: {}, state: 'OFF' }]); }
  catch (error) { failed = (error as any).code ?? String(error); }
  const failedState = host.features.resolve('devint.runtime'); lease.release();
  const result = await agent.request({ call_id: 'diagnostics-after-failure', tool_id: 'native.diagnostics', tool_version: '1', arguments: {
    language: 'json', source: '{"synthetic":true}', document_uri: 'review://runtime-blocked.json', version: 1,
  } });
  observations.diagnostics_after_failed_stop = { state_store: state, stop_failure: failed, runtime: failedState, result };
  await agent.close(); await host.close();
}

{
  const policy = { id: 'REVIEW.APPROVAL', level: 'L1', degradable: true, enforcement_owner: 'PDP', modes: {} };
  const { host, state } = await create([def('tool.test')], [policy]);
  let executions = 0;
  host.administration.registerTool({ id: 'review.approved', version: '1', feature_id: 'tool.test', policy_ids: ['REVIEW.APPROVAL'], requires_sandbox: false,
    schema: () => {}, execute: () => { executions++; return { data: { synthetic: true } }; } });
  const agent = host.bindAgent(identity);
  const request = { call_id: 'expired-unused-approval', tool_id: 'review.approved', tool_version: '1', arguments: null };
  const hash = intentHash(identity, request);
  const id = await host.administration.approve(hash, identity, 'Synthetic expiry review only', 100);
  const initiallyValid = host.policy.approvalValid(id, hash, identity);
  await delay(160);
  const expired = host.policy.approvalValid(id, hash, identity);
  const actualNow = Date.now; let revived = false, result: unknown;
  try {
    Date.now = () => actualNow() - 10000;
    revived = host.policy.approvalValid(id, hash, identity);
    result = await agent.request({ ...request, approval_id: id });
  } finally { Date.now = actualNow; }
  observations.expired_approval_clock_rollback = { state_store: state,
    clock_scope: 'logical Date.now override in owned probe process; not OS-clock verification',
    initially_valid: initiallyValid, valid_after_actual_expiry: expired, valid_after_clock_rollback: revived,
    handler_executions: executions, result };
  await agent.close(); await host.close();
}

{
  const { host, state } = await create([def('tool.test')]);
  const original = host.bindAgent(identity); await original.close();
  const replacement = host.bindAgent(identity);
  await replacement.request({ call_id: 'new-binding', tool_id: 'native.echo', tool_version: '1', arguments: { marker: 'new-binding-synthetic-data' } });
  let oldContext: any[] = [], oldAudit: any = { records: [] }, contextError = '', auditError = '';
  try { oldContext = original.context(); } catch (error) { contextError = (error as any).code ?? String(error); }
  try { oldAudit = original.reconstructTask(); } catch (error) { auditError = (error as any).code ?? String(error); }
  await original.close(); let replacementAfterOldClose: unknown;
  try { replacementAfterOldClose = await replacement.request({ call_id: 'after-old-close', tool_id: 'native.echo', tool_version: '1', arguments: null }); }
  catch (error) { replacementAfterOldClose = { code: (error as any).code ?? String(error) }; }
  observations.closed_facade = { state_store: state, old_context_rows: oldContext.length, old_audit_rows: oldAudit.records.length, context_error: contextError, audit_error: auditError,
    old_context_session_ids: oldContext.map((r: any) => r.body.session_id), replacement_after_old_close: replacementAfterOldClose };
  await host.close();
}

{
  const { host, state } = await create([def('tool.test')]);
  const a = host.bindAgent(identity);
  const b = host.bindAgent({ ...identity, agent_id: 'review-b', session_id: 'review-session-b' });
  await a.request({ call_id: 'agent-a-data', tool_id: 'native.echo', tool_version: '1', arguments: { marker: 'agent-a-synthetic-data' } });
  const context = b.context();
  observations.same_task_other_agent_read = { state_store: state, other_agent_context_rows: context.length,
    returned_agent_ids: context.map((r: any) => r.body.agent_id), classification: 'contract confirmation needed: task-wide sharing vs agent-private context' };
  await a.close(); await b.close(); await host.close();
}

{
  const { host, state } = await create([def('tool.test')]);
  const a = host.bindAgent(identity);
  const closing = a.close();
  let concurrent: unknown;
  try { concurrent = await a.request({ call_id: 'during-session-close', tool_id: 'native.echo', tool_version: '1', arguments: { synthetic: true } }); }
  catch (error) { concurrent = { code: (error as any).code ?? String(error) }; }
  await closing;
  observations.session_close_request_race = { state_store: state, request_after_close_started: concurrent };
  await host.close();
}

{
  const { host, state } = await create([def('tool.test')]);
  const a = host.bindAgent(identity);
  const actualNow = Date.now;
  let resolveOutput: (value: unknown) => void = () => {};
  let acknowledgeInvocation: () => void = () => {};
  const invocation = new Promise<void>(resolve => { acknowledgeInvocation = resolve; });
  let requestSettled = false;
  host.administration.registerTool({ id: 'review.timeout-clock', version: '1', feature_id: 'tool.test', policy_ids: [], requires_sandbox: false,
    timeout_ms: 20, schema: () => {}, execute: () => {
      Date.now = () => actualNow() - 10000;
      acknowledgeInvocation();
      return new Promise(resolve => { resolveOutput = resolve; });
    } });
  const pending = a.request({ call_id: 'timeout-clock-rollback', tool_id: 'review.timeout-clock', tool_version: '1', arguments: null })
    .then((value: unknown) => { requestSettled = true; return value; });
  let settledAfter80ms = false, result: unknown;
  try {
    await invocation; await delay(80); settledAfter80ms = requestSettled;
  } finally { Date.now = actualNow; resolveOutput({ data: { synthetic: true } }); }
  result = await pending; await delay(0);
  observations.handler_timeout_clock = { state_store: state,
    clock_scope: 'logical Date.now override in owned probe; not OS clock verification', timeout_ms: 20,
    request_settled_after_80ms: settledAfter80ms, result };
  await a.close(); await host.close();
}

const after = await fingerprints();
const changed = Object.keys(before).filter(key => before[key] !== after[key]);
const report = { schema: 'agentnexus/m1/control-review-probes/1', captured_utc: new Date().toISOString(),
  before_sha256: before, after_sha256: after, source_changed_during_probe: changed,
  observations, final_product_acceptance: 'PENDING_ROOT_FINAL_TESTS', product_files_modified: false };
await writeFile(join(out, 'control-probes.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ source_changed_during_probe: changed,
  inherit: observations.inherit_to_off,
  closed: observations.closed_facade,
  isolation: observations.same_task_other_agent_read,
  close_race: observations.session_close_request_race,
  timeout: observations.handler_timeout_clock,
}, null, 2));
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/final-control-probes.ts

类别：`development_only_M1_verification_or_probe`；原始字节数：6521。

源文件 SHA256：

```text
3e76ca67b1f039436e75a331f2d2dd6d32f7a5c2b2942afb6364be2e00549ddd
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0028","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/final-control-probes.ts","bytes":6521,"sha256":"3e76ca67b1f039436e75a331f2d2dd6d32f7a5c2b2942afb6364be2e00549ddd","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"development_only_M1_verification_or_probe","kind":"original","origin":{"kind":"workspace","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/final-control-probes.ts"}} -->
```typescript
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

// Final read-only product review: only CTRL-008 is dynamically rerun. Earlier
// unchanged seven cases remain bound to their separate evidence snapshots.
const root = resolve('.');
const out = resolve('.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews');
const names = ['types', 'control', 'features', 'policy', 'gateway', 'host', 'storage', 'diagnostics'];
async function hashes() {
  return Object.fromEntries(await Promise.all(names.map(async name => [
    `src/agentnexus/${name}.ts`, createHash('sha256').update(await readFile(join(root, `src/agentnexus/${name}.ts`))).digest('hex'),
  ])));
}
await mkdir(out, { recursive: true });
const before = await hashes();
const { openHost } = await import(pathToFileURL(join(root, 'src/agentnexus/host.ts')).href);
const state = await mkdtemp(join(out, 'final-stop-recovery-'));
const definition = { id: 'review.lifecycle', kind: 'OPTIONAL', default: 'ON', scopes: ['G','P','A','T'], depends_on: [], conflicts: [] };
const host = await openHost(state, { definitions: [definition], policies: [] });
let releaseStop: () => void = () => {};
const stopDone = new Promise<void>(resolve => { releaseStop = resolve; });
let ready = true, preflights = 0, stopSettled = false;
host.administration.registerModule(definition.id, {
  stop: async () => { await stopDone; ready = false; stopSettled = true; },
  preflight: async () => { preflights++; ready = true; },
});
const observations: Record<string, unknown> = {};
let failure: unknown = null;
try {
  const prepared = await host.administration.previewFeatures([{ id: definition.id, scope: {}, state: 'OFF' }], 0);
  let stopFailure = '';
  try { await host.administration.commitFeatures(prepared.challenge_id, prepared.preview_hash); }
  catch (error) { stopFailure = (error as any).code ?? String(error); }
  assert.equal(stopFailure, 'DRAIN_TIMEOUT');
  assert.equal(host.features.resolve(definition.id).effective, 'BLOCKED');
  assert.equal(host.features.activeCount(), 1);
  let recoveryFailure = '';
  try { await host.administration.recoverModule(definition.id); }
  catch (error) { recoveryFailure = (error as any).code ?? String(error); }
  assert.equal(recoveryFailure, 'MODULE_STOP_PENDING');
  const enabling = await host.administration.previewFeatures([{ id: definition.id, scope: {}, state: 'ON' }], 0);
  let enablingFailure = '';
  try { await host.administration.commitFeatures(enabling.challenge_id, enabling.preview_hash); }
  catch (error) { enablingFailure = (error as any).code ?? String(error); }
  assert.equal(enablingFailure, 'MODULE_STOP_PENDING');
  assert.equal(preflights, 0);
  observations.pending = { stop_failure: stopFailure, recovery_failure: recoveryFailure,
    enabling_failure: enablingFailure, active_count: host.features.activeCount(), ready, preflights, stopSettled };
  releaseStop(); await delay(0); await host.store.flush();
  assert.equal(host.features.activeCount(), 0);
  assert.equal(host.features.resolve(definition.id).effective, 'BLOCKED', 'settlement must not automatically restore health');
  await host.administration.recoverModule(definition.id);
  await delay(0);
  assert.equal(host.features.resolve(definition.id).effective, 'ON');
  assert.equal(ready, true); assert.equal(preflights, 1); assert.equal(stopSettled, true);
  observations.recovered = { resolution: host.features.resolve(definition.id), ready, preflights, stopSettled };
} catch (error) { failure = { name: (error as any).name, code: (error as any).code, message: String(error) }; }
finally { releaseStop(); await delay(0); await host.close(); }

const gateway = await readFile(join(root, 'src/agentnexus/gateway.ts'), 'utf8');
const policy = await readFile(join(root, 'src/agentnexus/policy.ts'), 'utf8');
const guardCalls = gateway.split('\n').map((line, index) => ({ line: index + 1, text: line }))
  .filter(item => item.text.includes('this.#policy.assertModesCurrent('));
const policyMethod = policy.slice(policy.indexOf('  assertModesCurrent('), policy.indexOf('  approvalValid('));
const staticInspection = {
  mode_guard_call_lines: guardCalls.map(item => item.line),
  mode_guard_call_count: guardCalls.length,
  first_guard_before_claim_transaction: gateway.indexOf('this.#policy.assertModesCurrent(') < gateway.indexOf("UPDATE control_operations SET state='CLAIMED'"),
  second_guard_after_start_intent_flush: gateway.lastIndexOf('this.#policy.assertModesCurrent(') > gateway.indexOf("emit('START_INTENT'"),
  no_await_between_last_guard_and_handler: !gateway.slice(gateway.lastIndexOf('this.#policy.assertModesCurrent('), gateway.indexOf('completion = Promise.resolve(def.execute')).split('\n').some(line => /^\s*await\b/.test(line)),
  assert_modes_body_uses_modeFor_and_epoch: policyMethod.includes('this.modeFor(') && policyMethod.includes('policy_epoch'),
  assert_modes_body_does_not_call_PDP: !policyMethod.includes('#evaluator') && !policyMethod.includes('.evaluate('),
  consumed_permit_rechecked_before_handler: gateway.includes("'PERMIT_EXPIRED_BEFORE_START'"),
  consumed_approval_rechecked_before_handler: gateway.includes("'APPROVAL_EXPIRED_BEFORE_START'"),
  scope: 'static control-flow inspection only; root owns delayed-flush execution regressions',
};
const after = await hashes();
const changed = Object.keys(before).filter(key => before[key] !== after[key]);
const staticOk = guardCalls.length === 2 && Object.entries(staticInspection).every(([key, value]) => key === 'scope' || typeof value !== 'boolean' || value);
const report = { schema: 'agentnexus/m1/final-control-probes/1', captured_utc: new Date().toISOString(),
  status: !failure && staticOk && changed.length === 0 ? 'PASS' : 'FAIL',
  scope: 'CTRL-008 controlled Node/SQLite lifecycle plus static final expiry fences; not full product or OS admission',
  state_store: state, source_sha256_before: before, source_sha256_after: after, source_changed: changed,
  observations, failure, static_expiry_fence_inspection: staticInspection,
  root_final_suite: 'PENDING_ROOT_FINAL_RESULT', product_source_modified: false };
await writeFile(join(out, 'final-control-probes.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'PASS') process.exitCode = 1;
```
<!-- agentnexus-export-end -->

## package.json

类别：`current_package_metadata`；原始字节数：293。

源文件 SHA256：

```text
e23288d939a3706e522bf34a1d87802242b418749c37f1e54c5b481562ffd809
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0029","path":"package.json","bytes":293,"sha256":"e23288d939a3706e522bf34a1d87802242b418749c37f1e54c5b481562ffd809","language":"json","fence":"```","wrapper_padding_newline":false,"category":"current_package_metadata","kind":"original","origin":{"kind":"workspace","path":"package.json"}} -->
```json
{
  "name": "agentnexus",
  "version": "0.4.0-m1.1",
  "private": true,
  "type": "module",
  "engines": { "node": "24.15.0" },
  "scripts": {
    "test": "node tools/agentnexus/run-tests.mjs",
    "demo": "node src/agentnexus/cli.ts demo"
  },
  "dependencies": {},
  "devDependencies": {}
}
```
<!-- agentnexus-export-end -->

## tools/agentnexus/run-tests.mjs

类别：`current_test_bootstrap`；原始字节数：667。

源文件 SHA256：

```text
7b1b45b072e55e4c2e079e90aa963d94584a871496945ed88b737cb42dd4c0b7
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0030","path":"tools/agentnexus/run-tests.mjs","bytes":667,"sha256":"7b1b45b072e55e4c2e079e90aa963d94584a871496945ed88b737cb42dd4c0b7","language":"javascript","fence":"```","wrapper_padding_newline":false,"category":"current_test_bootstrap","kind":"original","origin":{"kind":"workspace","path":"tools/agentnexus/run-tests.mjs"}} -->
```javascript
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../../', import.meta.url));
const files = readdirSync(new URL('../../tests/agentnexus/', import.meta.url))
  .filter(name => name.endsWith('.test.ts')).sort().map(name => `tests/agentnexus/${name}`);
if (!files.length) throw new Error('No AgentNexus tests found');
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', '--test-reporter=tap', ...files], { cwd: root, stdio: 'inherit', shell: false });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/owned-storage-child.mjs

类别：`historical_test_or_helper`；原始字节数：1885。

源文件 SHA256：

```text
7a469bfa662d98f39f06b4483eaa1f49809e490817679cce5f7f1fa366133139
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0031","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/owned-storage-child.mjs","bytes":1885,"sha256":"7a469bfa662d98f39f06b4483eaa1f49809e490817679cce5f7f1fa366133139","language":"javascript","fence":"```","wrapper_padding_newline":false,"category":"historical_test_or_helper","kind":"original","origin":{"kind":"workspace","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/owned-storage-child.mjs"}} -->
```javascript
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { auditEvent } from '../../src/agentnexus/types.ts';
import { frame } from '../../src/agentnexus/records.ts';
import { open, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const [root, mode] = process.argv.slice(2);
const identity = { agent_id: 'child', project_id: 'project', task_id: 'task', session_id: 'child-session' };
const store = await KernelStore.open(root, { segmentBytes: 4096 });
const event = phase => auditEvent(identity, { operation_type: 'synthetic-child-fixture', phase });

if (mode === 'file-before-receipt') {
  const original = store.db.prepare.bind(store.db);
  store.db.prepare = function (sql) {
    if (sql.startsWith('INSERT INTO anx_exports')) process.kill(process.pid, 'SIGKILL');
    return original(sql);
  };
  store.audit(event('CLAIMED'));
  await store.flush();
  throw new Error('Crash injection did not fire');
} else if (mode === 'partial-tail' || mode === 'first-partial-tail') {
  if (mode === 'partial-tail') { store.audit(event('FIRST')); await store.flush(); }
  const second = store.audit(event('SECOND'));
  const name = (await readdir(join(root, 'segments'))).find(x => x.endsWith('.jsonl')) ?? 'segment-00000001.jsonl';
  const handle = await open(join(root, 'segments', name), 'a');
  const data = frame(second); await handle.write(data.subarray(0, Math.floor(data.length / 2))); await handle.sync(); await handle.close();
} else if (mode === 'partial-artifact') {
  async function* endlessButBounded() {
    for (let i = 0; i < 8; i++) yield Buffer.alloc(65536, i);
    process.send?.({ ready: true });
    await new Promise(() => {});
  }
  void store.artifacts.put(endlessButBounded()).catch(() => {});
} else store.audit(event('OUTBOX_ONLY'));

if (mode !== 'partial-artifact') process.send?.({ ready: true });
setInterval(() => {}, 1000);
```
<!-- agentnexus-export-end -->

