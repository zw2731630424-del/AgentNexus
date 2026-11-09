import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, Script } from 'node:vm';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { entryIntent } from '../../src/agentnexus/desktop/trusted-entry.ts';
import { openSyntheticRuntimeStack } from '../../src/agentnexus/credential-service/client.ts';

const runtime = fileURLToPath(new URL('../../../../../.workflow-kit/runtime/AgentNexus-M1.8.3-Q3/', import.meta.url));
const workerPath = join(runtime, 'native-helper-ui', 'synthetic-credential-ui.exe');
const driverPath = join(runtime, 'native-helper-ui', 'synthetic-ui-driver.exe');
const intent = () => entryIntent({ action: 'ADD', provider_id: 'deepseek', model_ids: ['deepseek-flash'], name: 'Q3 Synthetic UI Canary', operation_id: randomUUID() });
async function adapter(overrides: Record<string, unknown> = {}) {
  const source = (await readFile(new URL('../../desktop/trusted-entry.mjs', import.meta.url), 'utf8')).replace(/^import .*;\r?$/gm, '').replace(/\bexport /g, '');
  const context = createContext({ entryIntent, process, Buffer, existsSync, spawn, createHash, randomUUID, dirname, isAbsolute, setTimeout, clearTimeout, ...overrides });
  new Script(source + '\n;globalThis.adapter = { fixedTrustedEntryPort, syntheticTrustedEntryPort, SYNTHETIC_UI_NAME, SYNTHETIC_UI_CANARY };').runInContext(context);
  return context.adapter;
}
test('Q3 fixed entry reports unavailable without starting a process or UAC', async () => {
  let launches = 0;
  const value = await adapter({ existsSync: () => false, spawn() { launches++; throw Error('UNEXPECTED_LAUNCH'); } });
  const readiness = await value.fixedTrustedEntryPort().readiness();
  assert.equal(readiness.status, 'BLOCKED'); assert.equal(readiness.reason, 'TRUSTED_ENTRY_UNAVAILABLE'); assert.equal(readiness.uac_verified, false);
  assert.equal((await value.fixedTrustedEntryPort().open(intent())).status, 'IPC_BLOCKED'); assert.equal(launches, 0);
});
test('Q3 readiness uses only native read-only probe and preserves same-SID refusal', async () => {
  let args: string[] = [], options: any;
  const child: any = new EventEmitter(); child.stdout = new EventEmitter(); child.kill = () => {};
  const value = await adapter({ process: { platform: 'win32' }, existsSync: () => true, spawn(_path: string, a: string[], o: any) { args = a; options = o; return child; } });
  const pending = value.fixedTrustedEntryPort().readiness();
  child.stdout.emit('data', Buffer.from(JSON.stringify({ schema: 'agentnexus.trusted-entry-readiness.v1', status: 'BLOCKED', reason: 'SAME_SID_ELEVATION_UNAVAILABLE', same_sid_elevation_required: true, uac_verified: false })));
  child.emit('close', 0);
  const result = await pending;
  assert.equal(result.reason, 'SAME_SID_ELEVATION_UNAVAILABLE'); assert.deepEqual([...args], ['--readiness']); assert.equal(options.shell, false); assert.equal(options.stdio[0], 'ignore');
});
test('Q3 synthetic entry rejects production paths and expanded intents before spawn', async () => {
  let launches = 0;
  const value = await adapter({ process: { platform: 'win32' }, existsSync: () => true, spawn() { launches++; throw Error('UNEXPECTED_LAUNCH'); } });
  for (const path of ['C:\\Program Files\\AgentNexus\\trusted-credential-helper.exe', 'C:\\temp\\synthetic-credential-ui.exe']) assert.throws(() => value.syntheticTrustedEntryPort({ workerPath: path, invokeHelper() {}, disconnectHelper() {} }));
  const port = value.syntheticTrustedEntryPort({ workerPath, invokeHelper() {}, disconnectHelper() {} });
  assert.equal((await port.open({ ...intent(), name: 'Other Synthetic Name' })).status, 'IPC_BLOCKED');
  await assert.rejects(port.open({ ...intent(), secret: 'must not enter Host' })); assert.equal(launches, 0);
});

function drive(pid: number, testCase: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn(driverPath, ['--pid', String(pid), '--case', testCase], { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { SystemRoot: 'C:\\Windows', WINDIR: 'C:\\Windows' } });
    let out = '', error = false;
    const timer = setTimeout(() => { child.kill(); reject(Error('SYNTHETIC_UI_DRIVER_TIMEOUT')); }, 45000);
    child.stdout.on('data', bytes => { out += bytes.toString(); if (out.length > 4096) { child.kill(); error = true; } });
    child.stderr.on('data', bytes => { bytes.fill(0); error = true; });
    child.once('error', e => { clearTimeout(timer); reject(e); });
    child.once('close', code => { clearTimeout(timer); if (code !== 0 || error) { reject(Error('SYNTHETIC_UI_DRIVER_FAILED')); return; } try { resolve(JSON.parse(out)); } catch { reject(Error('SYNTHETIC_UI_DRIVER_OUTPUT_INVALID')); } });
  });
}
for (const testCase of ['save', 'cancel', 'review-cancel']) test('Q3 actual WinForms + service private channel ' + testCase, { skip: process.env.Q3_RUN_SYNTHETIC_HELPER_UI !== '1' || process.platform !== 'win32', timeout: 65000 }, async t => {
  assert.ok(existsSync(workerPath) && existsSync(driverPath), 'build-synthetic-ui.ps1 must run first');
  const base = join(runtime, 'helper-ui-tests'); await mkdir(base, { recursive: true });
  const root = await mkdtemp(join(base, testCase + '-'));
  const stack = await openSyntheticRuntimeStack(root); t.after(async () => { await stack.close(); });
  const value = await adapter(), events: any[] = [], calls: string[] = [];
  let driving: Promise<any> | undefined;
  const port = value.syntheticTrustedEntryPort({ workerPath,
    invokeHelper(channel: string, request: any) { calls.push(request.method); return stack.invokeHelper(channel, request); },
    disconnectHelper: stack.disconnectHelper,
    onStarted({ pid }: { pid: number }) { driving = drive(pid, testCase); return driving; },
    onEvent(event: any) { events.push(event); },
  });
  const result = await port.open(intent());
  const driver = await driving;
  assert.equal(driver?.result, 'PASS', JSON.stringify({ result, events, calls })); assert.equal(events[0]?.event, 'synthetic.ui.shown'); assert.equal(events[0]?.same_sid, true); assert.equal(events[0]?.elevated, false);
  const snapshot = await stack.control.snapshot();
  const saved = snapshot.keys.filter((key: any) => key.name === value.SYNTHETIC_UI_NAME);
  if (testCase === 'save') {
    assert.equal(result.status, 'CREDENTIAL_SAVED'); assert.equal(saved.length, 1); assert.equal(saved[0].classification, 'SYNTHETIC'); assert.deepEqual(saved[0].models, ['deepseek-flash']);
    assert.deepEqual(calls, ['snapshot', 'snapshot', 'credential.prepare', 'credential.save']); assert.equal(events.some(event => event.event === 'synthetic.ui.save.ack'), true);
  } else {
    assert.equal(result.status, 'INCONCLUSIVE'); assert.equal(saved.length, 0); assert.deepEqual(calls, ['snapshot']); assert.equal(events.some(event => event.event === 'synthetic.ui.save.ack'), false);
  }
  assert.equal(events.at(-1)?.event, 'synthetic.ui.closed');
  const audit = await stack.control.invoke('synthetic.audit');
  assert.equal(JSON.stringify({ result, snapshot, events, audit }).includes(value.SYNTHETIC_UI_CANARY), false);
  await writeFile(join(root, 'helper-ui-evidence.json'), JSON.stringify({ schema: 1, test_case: testCase, result, driver, events, methods: calls, keys_stored: saved.length, ui_launched: 'PASS', uac_verified: 'NOT_RUN', no_real_key_or_network: true }, null, 2));
});
