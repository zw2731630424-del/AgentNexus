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
