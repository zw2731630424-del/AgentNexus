import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setImmediate as immediate } from 'node:timers/promises';
import { openHarness } from '../../src/agentnexus/harness/index.ts';
import { KernelStore } from '../../src/agentnexus/storage.ts';
import type { ResidentEventInput, ResidentEventKind } from '../../src/agentnexus/harness/event-loop.ts';
import { canonical, sha256 } from '../../src/agentnexus/types.ts';
import { limits, prepare, storageFixture } from './m161-storage-fixture.ts';

type Harness = Awaited<ReturnType<typeof openHarness>>;
const output = resolve(process.env.AGENTNEXUS_M17_EVENT_OUTPUT ?? '../../../../.workflow-kit/runtime/AgentNexus-M1.7/event-loop-agent/adhoc');
const base = resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT ?? join(output, 'test-data'), 'm17-events');
await mkdir(base, { recursive: true });
const observations: { name: string; status: 'PASS' | 'FAIL'; detail: unknown }[] = [];
async function root() { return mkdtemp(join(base, 'case-')); }
async function fixture(options: Parameters<typeof openHarness>[1] = {}) {
  const path = await root(), h = await openHarness(join(path, 'host'), { eventLoop: {}, ...options });
  await h.administration.createProject({ id: 'p', rules: ['Synthetic event integration rules; retain exact message provenance.'], budget: limits });
  return { path, h };
}
async function agent(h: Harness, id: string, dependencies: string[] = [], type: 'RESIDENT' | 'DEVELOPMENT' = 'RESIDENT') {
  await h.administration.createAgent({ id, task_id: id, project_id: 'p', type, budget: { ...limits, workers: 1 }, read_tasks: ['sender'] });
  return h.administration.createTask({ id, agent_id: id, goal: 'Handle explicitly admitted local events.', dependencies, wall_ms: 120000 });
}
function event(h: Harness, id: string, key: string, kind: ResidentEventKind = 'TASK_READY', extra: Partial<ResidentEventInput> = {}): ResidentEventInput {
  return { kind, target: h.inspectAgent(id).subject, dedup_key: key, payload_sha256: sha256(canonical({ task: id, event: key })), ...extra };
}
async function until(predicate: () => boolean, label: string) {
  const deadline = Date.now() + 15000;
  while (!predicate()) { if (Date.now() >= deadline) throw new Error('EVENT_TEST_DEADLINE:' + label); await immediate(); }
}
async function feature(h: Harness, id: string, state: 'ON' | 'OFF') {
  const m = h.administration.features.metadata(), p = await h.administration.features.previewFeatures([{ id, state, scope: {} }], m.feature_revision);
  await h.administration.features.commitFeatures(p.challenge_id, p.preview_hash);
}
function checked(name: string, fn: () => Promise<unknown>) {
  test(name, async () => { try { observations.push({ name, status: 'PASS', detail: (await fn()) ?? null }); }
    catch (error) { observations.push({ name, status: 'FAIL', detail: String(error) }); throw error; } });
}

const childAt = process.argv.indexOf('--m17-event-crash-child');
if (childAt >= 0) {
  const path = process.argv[childAt + 1], h = await openHarness(join(path, 'host'), { eventLoop: {} });
  await h.administration.createProject({ id: 'p', rules: ['Synthetic durable dispatch crash barrier.'], budget: limits });
  await agent(h, 'resident'); await h.administration.enqueueEvent(event(h, 'resident', 'crash-intent'));
  const flush = h.store.flush.bind(h.store); let held = false;
  h.store.flush = async () => {
    await flush();
    if (!held && h.state.count('RESIDENT_EVENT', { state: 'DISPATCHING' }) === 1) {
      held = true; process.stdout.write(JSON.stringify({ phase: 'REAL_DURABLE_EVENT_INTENT', requests: h.state.count('MODEL_REQUEST') }) + '\n');
      setInterval(() => {}, 1000); await new Promise(() => {});
    }
  };
  await h.administration.startEvents(); await h.administration.idleEvents();
} else {
  after(async () => {
    await mkdir(output, { recursive: true });
    await writeFile(join(output, 'event-observations-' + process.pid + '.json'), JSON.stringify({ schema: 'agentnexus/m17/event-tests/1',
      node: process.version, platform: process.platform,
      assurance: 'REAL_LOCAL_SQLITE_ZSTD_AND_EXISTING_HARNESS_DISPATCH; MOCK_PROVIDER_SIMULATED; NAMED_SCHEDULING_BARRIERS_SIMULATED; SHORT_TESTS_NOT_TWO_HOUR_OR_OS_REBOOT_QUALIFICATION', observations }, null, 2) + '\n', { flag: 'wx' });
  });

  checked('M17 EVENT durable admission, exact dedup, bounded queue/history and zero idle model calls', async () => {
    const { h } = await fixture({ eventLoop: { maxRecords: 2, maxPending: 1 } });
    try {
      for (const id of ['one', 'two', 'three']) await agent(h, id);
      const input = event(h, 'one', 'first'), first = await h.administration.enqueueEvent(input), duplicate = await h.administration.enqueueEvent(input);
      assert.equal(first.id, duplicate.id); assert.equal(h.administration.listEvents().length, 1); assert.equal(h.state.count('MODEL_REQUEST'), 0);
      assert.ok(h.store.db.prepare("SELECT 1 FROM anx_records r JOIN anx_exports e USING(seq) WHERE r.operation_id=? AND json_extract(r.body,'$.phase')='WORKFLOW_EVENT_ADMITTED'").get(first.id));
      await assert.rejects(h.administration.enqueueEvent({ ...input, payload_sha256: sha256('changed') }), /EVENT_DEDUP_CONFLICT/);
      await assert.rejects(h.administration.enqueueEvent({ ...event(h, 'two', 'external'), effect: 'EXTERNAL' } as never), /EVENT_EXTERNAL_EFFECT/);
      await assert.rejects(h.administration.enqueueEvent(event(h, 'two', 'second')), /EVENT_QUEUE_BACKPRESSURE/);
      await h.administration.startEvents(); await h.administration.idleEvents(); assert.equal(h.inspectTask('one').state, 'SUCCEEDED');
      await h.administration.enqueueEvent(event(h, 'two', 'second')); await h.administration.idleEvents(); assert.equal(h.inspectTask('two').state, 'SUCCEEDED');
      await assert.rejects(h.administration.enqueueEvent(event(h, 'three', 'third')), /EVENT_HISTORY_CAPACITY/);
      const requests = h.state.count('MODEL_REQUEST'); for (let n = 0; n < 5; n++) await immediate();
      assert.equal(h.state.count('MODEL_REQUEST'), requests); assert.equal(requests, 2); assert.equal(h.administration.eventStatus().active, 0);
      await h.store.verify(); return { requests, events: h.administration.listEvents(), status: h.administration.eventStatus() };
    } finally { await h.close(); }
  });

  checked('M17 EVENT three real concurrent Harness tasks obey priority, dependencies and one execution per task', async () => {
    const { h } = await fixture(); let release!: () => void;
    const original = h.context.assemble.bind(h.context), calls: string[] = []; let active = 0, peak = 0;
    try {
      for (const id of ['low', 'high', 'middle', 'fourth']) await agent(h, id);
      await agent(h, 'dependent', ['high']); const gate = new Promise<void>(resolve => release = resolve);
      h.context.assemble = async (...args: Parameters<typeof original>) => {
        calls.push(args[0].task_id); active++; peak = Math.max(peak, active);
        try { if (calls.length <= 3) await gate; return await original(...args); } finally { active--; }
      };
      for (const [id, priority] of [['low', 1], ['high', 9], ['middle', 5], ['fourth', 0], ['dependent', 8]] as const)
        await h.administration.enqueueEvent(event(h, id, 'run-' + id, 'TASK_READY', { priority }));
      await h.administration.startEvents(); await until(() => calls.length === 3, 'three-running');
      assert.deepEqual(calls, ['high', 'middle', 'low']); assert.equal(h.state.count('TASK', { state: 'RUNNING' }), 3);
      assert.equal(h.state.count('MODEL_REQUEST'), 0); assert.equal(h.administration.eventStatus().active, 3); release();
      await h.administration.idleEvents(); assert.equal(peak, 3); assert.equal(new Set(calls).size, 5); assert.equal(calls.length, 5);
      for (const id of ['low', 'high', 'middle', 'fourth', 'dependent']) assert.equal(h.inspectTask(id).state, 'SUCCEEDED');
      assert.equal(h.administration.eventStatus().peak_active, 3); await h.store.verify(); return { calls, peak, status: h.administration.eventStatus() };
    } finally { release?.(); h.context.assemble = original; await h.close(); }
  });

  checked('M17 EVENT real durable message wakes WAIT, atomically adopts payload and does not model while idle', async () => {
    const { h } = await fixture({ mocks: { 'mock-main': [{ reply: { kind: 'WAIT' } }, { reply: { kind: 'FINAL', text: 'Received actual message' } }] } });
    try {
      await agent(h, 'sender', [], 'DEVELOPMENT'); await agent(h, 'resident');
      await h.administration.enqueueEvent(event(h, 'resident', 'initial')); await h.administration.startEvents(); await h.administration.idleEvents();
      assert.equal(h.inspectTask('resident').state, 'WAITING'); assert.equal(h.inspectTask('resident').reason, 'WAIT'); assert.equal(h.state.count('MODEL_REQUEST'), 1);
      for (let n = 0; n < 5; n++) await immediate(); assert.equal(h.state.count('MODEL_REQUEST'), 1);
      const message = await h.bindAgent('sender').sendText({ receiver_agent_id: 'resident', message_type: 'INPUT', text: 'Exact local message', dedup_key: 'wake' });
      await h.administration.idleEvents(); const task = h.inspectTask('resident'); assert.equal(task.state, 'SUCCEEDED'); assert.deepEqual(task.received_message_ids, [message.message_id]);
      assert.equal(h.state.count('MESSAGE_HANDOFF'), 1); assert.equal(h.state.count('MODEL_REQUEST'), 2);
      assert.equal(h.administration.listEvents().filter(record => record.input.message_id === message.message_id)[0].state, 'SETTLED');
      await h.store.verify(); return { message_id: message.message_id, task_state: task.state, requests: 2, received: task.received_message_ids };
    } finally { await h.close(); }
  });

  checked('M17 EVENT message admitted during a real active dispatch survives until the subsequent WAIT turn', async () => {
    const { h } = await fixture({ mocks: { 'mock-main': [{ reply: { kind: 'WAIT' } }, { reply: { kind: 'FINAL', text: 'Later message adopted' } }] } });
    const original = h.context.assemble.bind(h.context); let release!: () => void, entered = false;
    try {
      await agent(h, 'sender', [], 'DEVELOPMENT'); await agent(h, 'resident'); const gate = new Promise<void>(resolve => release = resolve);
      h.context.assemble = async (...args: Parameters<typeof original>) => { if (!entered) { entered = true; await gate; } return original(...args); };
      await h.administration.enqueueEvent(event(h, 'resident', 'first-turn')); await h.administration.startEvents(); await until(() => entered, 'active-before-late-message');
      const message = await h.bindAgent('sender').sendText({ receiver_agent_id: 'resident', message_type: 'INPUT', text: 'Admitted after inbox lease scan', dedup_key: 'during-active' });
      assert.equal(h.inspectTask('resident').state, 'RUNNING'); assert.equal(h.inspectTask('resident').received_message_ids.length, 0);
      assert.equal(h.administration.listEvents().filter(record => record.input.message_id === message.message_id)[0].state, 'PENDING'); release();
      await h.administration.idleEvents(); assert.equal(h.inspectTask('resident').state, 'SUCCEEDED'); assert.deepEqual(h.inspectTask('resident').received_message_ids, [message.message_id]);
      assert.equal(h.state.count('MODEL_REQUEST'), 2); assert.equal(h.state.count('MESSAGE_HANDOFF'), 1);
      await h.store.verify(); return { message_id: message.message_id, adoption_count: 1, requests: 2 };
    } finally { release?.(); h.context.assemble = original; await h.close(); }
  });

  checked('M17 EVENT resource wait is not busy retried and known completion releases the next task once', async () => {
    const { h } = await fixture({ platform_limits: { ...limits, workers: 1 } }); const original = h.context.assemble.bind(h.context); let release!: () => void, held = false;
    try {
      await agent(h, 'first'); await agent(h, 'second'); const gate = new Promise<void>(resolve => release = resolve);
      h.context.assemble = async (...args: Parameters<typeof original>) => { if (args[0].task_id === 'first' && !held) { held = true; await gate; } return original(...args); };
      await h.administration.enqueueEvent(event(h, 'first', 'first', 'TASK_READY', { priority: 9 })); await h.administration.enqueueEvent(event(h, 'second', 'second'));
      await h.administration.startEvents(); await until(() => h.inspectTask('second').state === 'WAITING_RESOURCES', 'resource-wait');
      for (let n = 0; n < 8; n++) await immediate();
      assert.equal(h.administration.listEvents().find(record => record.input.target.task_id === 'second')!.attempts, 1); assert.equal(h.state.count('MODEL_REQUEST'), 0);
      release(); await h.administration.idleEvents(); assert.equal(h.inspectTask('first').state, 'SUCCEEDED'); assert.equal(h.inspectTask('second').state, 'SUCCEEDED');
      assert.equal(h.inspectTask('second').attempts, 1); assert.equal(h.state.count('MODEL_REQUEST'), 2); await h.store.verify();
      return { scheduler_reservations: h.inspectTask('second').attempts, event_attempts: h.administration.listEvents().find(record => record.input.target.task_id === 'second')!.attempts };
    } finally { release?.(); h.context.assemble = original; await h.close(); }
  });

  checked('M17 EVENT capacity completion arriving before the waiting dispatch returns is retained', async () => {
    const { h } = await fixture({ platform_limits: { ...limits, workers: 1 } });
    const assemble = h.context.assemble.bind(h.context), flush = h.store.flush.bind(h.store);
    let releaseFirst!: () => void, releaseWaiter!: () => void, firstHeld = false, waiterHeld = false;
    try {
      await agent(h, 'first'); await agent(h, 'second');
      const firstGate = new Promise<void>(resolve => releaseFirst = resolve), waiterGate = new Promise<void>(resolve => releaseWaiter = resolve);
      h.context.assemble = async (...args: Parameters<typeof assemble>) => { if (args[0].task_id === 'first') { firstHeld = true; await firstGate; } return assemble(...args); };
      h.store.flush = async () => { await flush(); if (!waiterHeld && firstHeld && h.inspectTask('second').state === 'WAITING_RESOURCES') { waiterHeld = true; await waiterGate; } };
      await h.administration.enqueueEvent(event(h, 'first', 'first', 'TASK_READY', { priority: 9 })); await h.administration.enqueueEvent(event(h, 'second', 'second'));
      await h.administration.startEvents(); await until(() => waiterHeld, 'waiter-return-barrier'); releaseFirst();
      await until(() => h.administration.eventStatus().active === 1 && h.administration.listEvents().some(record => record.input.target.task_id === 'first' && record.state === 'SETTLED'), 'capacity-completion-before-return');
      releaseWaiter(); await h.administration.idleEvents(); assert.equal(h.inspectTask('second').state, 'SUCCEEDED');
      const record = h.administration.listEvents().find(record => record.input.target.task_id === 'second')!; assert.equal(record.attempts, 2);
      assert.equal(h.inspectTask('second').attempts, 1); await h.store.verify(); return { event_attempts: record.attempts, resource_reservations: 1, completion_signal_retained: true };
    } finally { releaseFirst?.(); releaseWaiter?.(); h.context.assemble = assemble; h.store.flush = flush; await h.close(); }
  });

  checked('M17 EVENT stop waits for known active work and leaves later events durable for explicit restart', async () => {
    const { h } = await fixture(); const assemble = h.context.assemble.bind(h.context); let release!: () => void, held = false;
    try {
      await agent(h, 'first'); await agent(h, 'later'); const gate = new Promise<void>(resolve => release = resolve);
      h.context.assemble = async (...args: Parameters<typeof assemble>) => { if (args[0].task_id === 'first') { held = true; await gate; } return assemble(...args); };
      await h.administration.enqueueEvent(event(h, 'first', 'first')); await h.administration.startEvents(); await until(() => held, 'stop-active');
      let stopped = false; const stopping = h.administration.stopEvents().then(() => { stopped = true; });
      await h.administration.enqueueEvent(event(h, 'later', 'later')); await immediate(); assert.equal(stopped, false); assert.equal(h.administration.eventStatus().active, 1);
      release(); await stopping; assert.equal(h.inspectTask('first').state, 'SUCCEEDED'); assert.equal(h.inspectTask('later').state, 'QUEUED');
      assert.equal(h.state.count('MODEL_REQUEST'), 1); assert.equal(h.administration.eventStatus().pending, 1);
      await h.administration.startEvents(); await h.administration.idleEvents(); assert.equal(h.inspectTask('later').state, 'SUCCEEDED'); assert.equal(h.state.count('MODEL_REQUEST'), 2);
      await h.store.verify(); return { stopped_after_active_settled: true, pending_preserved: 1, requests_after_explicit_restart: 2 };
    } finally { release?.(); h.context.assemble = assemble; await h.close(); }
  });

  checked('M17 EVENT resident role OFF during durable intent blocks dispatch until an explicit enabled restart', async () => {
    const { h } = await fixture(); const flush = h.store.flush.bind(h.store); let held = false, release!: () => void;
    try {
      await agent(h, 'resident'); await h.administration.enqueueEvent(event(h, 'resident', 'feature-close'));
      const gate = new Promise<void>(resolve => release = resolve);
      h.store.flush = async () => { await flush(); if (!held && h.state.count('RESIDENT_EVENT', { state: 'DISPATCHING' }) === 1) { held = true; await gate; } };
      await h.administration.startEvents(); await until(() => held, 'feature-close-intent'); await feature(h, 'runtime.role.resident', 'OFF'); release();
      await h.administration.idleEvents(); assert.equal(h.inspectTask('resident').state, 'QUEUED'); assert.equal(h.state.count('MODEL_REQUEST'), 0);
      assert.equal(h.administration.listEvents()[0].state, 'PENDING'); assert.match(h.administration.listEvents()[0].reason, /FEATURE_BLOCKED/);
      await h.administration.stopEvents(); await h.administration.recoverEvents(); await feature(h, 'runtime.role.resident', 'ON');
      await h.administration.startEvents(); await h.administration.idleEvents(); assert.equal(h.inspectTask('resident').state, 'SUCCEEDED'); assert.equal(h.state.count('MODEL_REQUEST'), 1);
      await h.store.verify(); return { close_during_intent: true, requests_before_reenable: 0, requests_after_explicit_restart: 1 };
    } finally { release?.(); h.store.flush = flush; await h.close(); }
  });

  checked('M17 EVENT approvals stay waiting and role OFF fences new dispatch while stop/recover remain usable', async () => {
    const path = await root(), h = await storageFixture(path, { eventLoop: {} });
    try {
      await prepare(h, Buffer.from('owned output'), 12); assert.equal(h.inspectTask('task').reason, 'APPROVAL_REQUIRED');
      await h.administration.enqueueEvent(event(h, 'writer', 'do-not-approve', 'MESSAGE_DELIVERABLE', { message_id: 'synthetic-approved-lane-negative-case' }));
      await h.administration.startEvents(); await h.administration.idleEvents(); assert.equal(h.inspectTask('task').state, 'WAITING'); assert.equal(h.inspectTask('task').reason, 'APPROVAL_REQUIRED');
      assert.equal(h.state.count('MODEL_REQUEST'), 0); assert.equal(h.state.count('STORAGE_OPERATION'), 0);
      await h.administration.stopEvents(); await feature(h, 'runtime.role.resident', 'OFF'); await h.administration.recoverEvents();
      await assert.rejects(h.administration.enqueueEvent(event(h, 'writer', 'off')), /EVENT_FEATURE_BLOCKED/);
      await h.administration.startEvents(); await h.administration.idleEvents(); assert.equal(h.state.count('MODEL_REQUEST'), 0); await h.administration.stopEvents();
      return { approval: h.inspectTask('task').reason, requests: 0, status: h.administration.eventStatus() };
    } finally { await h.close(); }
  });

  checked('M17 EVENT cancelled and UNKNOWN Tasks are not replayed or automatically released', async () => {
    const { h } = await fixture({ mocks: { 'mock-main': [{ failure: 'UNKNOWN' }] } });
    try {
      await agent(h, 'cancelled'); await h.administration.cancelTask('cancelled'); await agent(h, 'unknown');
      await h.administration.enqueueEvent(event(h, 'cancelled', 'cancelled')); await h.administration.enqueueEvent(event(h, 'unknown', 'first'));
      await h.administration.startEvents(); await h.administration.idleEvents(); assert.equal(h.inspectTask('cancelled').state, 'CANCELLED'); assert.equal(h.inspectTask('unknown').state, 'UNKNOWN_QUARANTINED');
      assert.equal(h.state.count('MODEL_REQUEST'), 1); const held = h.inspectTask('unknown').reservation_id; assert.ok(held);
      await h.administration.enqueueEvent(event(h, 'unknown', 'no-replay')); await h.administration.idleEvents(); assert.equal(h.state.count('MODEL_REQUEST'), 1); assert.equal(h.inspectTask('unknown').reservation_id, held);
      assert.equal(h.administration.listEvents().find(record => record.input.dedup_key === 'no-replay')!.state, 'INDETERMINATE');
      await h.administration.stopEvents(); return { requests: 1, unknown_reservation_retained: held, events: h.administration.listEvents() };
    } finally { await h.close(); }
  });

  checked('M17 EVENT real close/reopen retains PENDING and requires explicit event start', async () => {
    const { path, h } = await fixture(); await agent(h, 'resident'); const record = await h.administration.enqueueEvent(event(h, 'resident', 'restart-pending')); await h.close();
    const again = await openHarness(join(path, 'host'), { eventLoop: {} });
    try {
      assert.equal(again.state.count('MODEL_REQUEST'), 0); assert.equal(again.administration.listEvents().find(event => event.id === record.id)!.state, 'PENDING');
      assert.equal(again.administration.eventStatus().running, false); await again.administration.idleEvents(); assert.equal(again.state.count('MODEL_REQUEST'), 0);
      await again.administration.startEvents(); await again.administration.idleEvents(); assert.equal(again.inspectTask('resident').state, 'SUCCEEDED'); assert.equal(again.state.count('MODEL_REQUEST'), 1);
      await again.store.verify(); return { event_id: record.id, real_close_reopen: true, explicit_start: true, os_reboot: false };
    } finally { await again.close(); }
  });

  checked('M17 EVENT REAL_PROCESS_KILL durable DISPATCHING intent recovers INDETERMINATE without replay', async () => {
    const path = await root(), child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--m17-event-crash-child', path], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const exited = once(child, 'exit'); let stdout = '', stderr = '', timer: ReturnType<typeof setTimeout> | undefined;
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-65536); });
    try {
      const ready = new Promise<Record<string, unknown>>((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Event child deadline: ' + stderr)), 15000);
        child.once('error', reject); child.once('exit', () => { if (!stdout.includes('\n')) reject(new Error('Event child exited: ' + stderr)); });
        child.stdout.on('data', chunk => { stdout += chunk; if (stdout.length > 65536) reject(new Error('Event child output limit')); const end = stdout.indexOf('\n'); if (end >= 0) { try { resolve(JSON.parse(stdout.slice(0, end))); } catch (error) { reject(error); } } });
      });
      const marker = await ready; clearTimeout(timer); child.kill('SIGKILL'); const exit = await exited;
      assert.equal((await KernelStore.recoverAbandonedLock(join(path, 'host'))).recovered, true);
      const h = await openHarness(join(path, 'host'), { eventLoop: {} });
      try {
        assert.equal(h.administration.listEvents()[0].state, 'DISPATCHING'); await assert.rejects(h.administration.startEvents(), /EVENT_RECOVERY_REQUIRED/);
        const recovered = await h.administration.recoverEvents(); assert.equal(recovered.indeterminate, 1);
        assert.equal(h.administration.listEvents()[0].state, 'INDETERMINATE'); await h.administration.startEvents(); await h.administration.idleEvents();
        assert.equal(h.state.count('MODEL_REQUEST'), 0); assert.equal(h.administration.listEvents()[0].attempts, 1); await h.store.verify();
        return { marker, exit, real_process_kill: true, barrier: 'SIMULATED_WAIT_AFTER_REAL_DURABLE_INTENT', replayed_requests: 0, os_reboot: false };
      } finally { await h.close(); }
    } finally { clearTimeout(timer); if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await exited; } }
  });
}
