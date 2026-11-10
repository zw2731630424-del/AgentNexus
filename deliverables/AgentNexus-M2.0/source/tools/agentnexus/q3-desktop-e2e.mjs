import { createRequire } from 'node:module';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

const source = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const workspace = resolve(source, '../../..');
const require = createRequire(join(workspace, 'deliverables/AgentNexus-Model-Provider-UI/source/package.json'));
const { _electron: electron } = require('playwright');
const executablePath = join(workspace, 'deliverables/AgentNexus-Model-Provider-UI/source/node_modules/electron/dist/electron.exe');
const runtime = join(workspace, '.workflow-kit/runtime/AgentNexus-M1.8.3-Q3');
await mkdir(join(runtime, 'desktop-e2e'), { recursive: true });
const output = await mkdtemp(join(runtime, 'desktop-e2e/run-')), hostRoot = join(output, 'host');
const results = { schema: 'agentnexus.q3.desktop-e2e.v1', output, scope: 'ACTUAL_MEDIUM_ELECTRON_AND_SAME_SID_SYNTHETIC_WINFORMS_RUNTIME_PIPE_SERVICE', status: 'RUNNING', uac_verified: 'NOT_RUN', production_os_qualified: false, live_provider_ready: false, real_keys: 0, real_requests: 0, steps: [], helper_events: [], helper_drivers: [], chat_results: [], stream_events: 0 };
const compiler = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
const observer = join(runtime, 'process-observer.exe');
const compiled = spawnSync(compiler, ['/nologo', '/target:exe', '/platform:x64', '/langversion:5', '/warn:4', '/warnaserror+', '/r:System.Core.dll', '/r:System.Security.dll', '/r:System.Web.Extensions.dll', '/r:System.ServiceProcess.dll', '/out:' + observer, join(source, 'native/credential-service/Common.cs'), join(source, 'tools/agentnexus/ObserveProcesses.cs')], { windowsHide: true, encoding: 'utf8' });
assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
function observe(pids) {
  const r = spawnSync(observer, pids.map(String), { windowsHide: true, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout);
}
const driving = [];
function drive(pid) {
  const promise = new Promise((res, rej) => {
    const driver = spawn(join(runtime, 'native-helper-ui/synthetic-ui-driver.exe'), ['--pid', String(pid), '--case', 'save'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { SystemRoot: 'C:\\Windows', WINDIR: 'C:\\Windows' } });
    let out = '', err = '';
    driver.stdout.on('data', b => out += b); driver.stderr.on('data', b => err += b);
    const timer = setTimeout(() => { driver.kill(); rej(Error('DRIVER_TIMEOUT')); }, 45000);
    driver.once('error', rej); driver.once('close', code => { clearTimeout(timer); if (code !== 0) { rej(Error('DRIVER_FAILED:' + err)); return; } const value = JSON.parse(out); results.helper_drivers.push(value); res(); });
  });
  void promise.catch(() => {}); driving.push(promise);
}
let app, page, stderr = '', currentLine = '', helperStarts = 0, stack;
try {
  const env = { ...process.env, AGENTNEXUS_DESKTOP_E2E: '1', AGENTNEXUS_Q3_SYNTHETIC_STACK: '1', AGENTNEXUS_DESKTOP_TEST_ROOT: hostRoot };
  for (const key of Object.keys(env)) if (/^(ELECTRON_RUN_AS_NODE|NODE_OPTIONS|AGENTNEXUS_DESKTOP_SYNTHETIC_SERVICE)$/i.test(key)) delete env[key];
  app = await electron.launch({ executablePath, args: [source], env });
  app.process().stderr.on('data', bytes => {
    const chunk = bytes.toString(); stderr += chunk; currentLine += chunk;
    for (;;) {
      const end = currentLine.indexOf('\n'); if (end < 0) break;
      const line = currentLine.slice(0, end); currentLine = currentLine.slice(end + 1);
      try {
        if (line.startsWith('Q3_HELPER_UI:')) { const value = JSON.parse(line.slice(13)); helperStarts++; drive(value.pid); }
        if (line.startsWith('Q3_HELPER_EVENT:')) results.helper_events.push(JSON.parse(line.slice(16)));
        if (line.startsWith('Q3_STACK:')) stack = JSON.parse(line.slice(9));
        if (line.startsWith('Q3_CHAT_RESULT:')) results.chat_results.push(JSON.parse(line.slice(15)));
      } catch (e) { results.log_parse_error = String(e); }
    }
  });
  page = await app.firstWindow(); page.setDefaultTimeout(20000);
  // Exercise a visible ordinary desktop window; hidden Chromium can stop
  // producing screenshot frames after the separate native form takes focus.
  await app.evaluate(({ BrowserWindow }) => { for (const window of BrowserWindow.getAllWindows()) { window.show(); window.focus(); } });
  page.on('pageerror', error => { (results.page_errors ??= []).push(String(error)); });
  await page.getByRole('heading', { name: 'Model Providers', exact: true }).waitFor();
  results.electron_token = observe([app.process().pid]);
  assert.equal(results.electron_token.observations[0].integrity, 8192); assert.equal(results.electron_token.observations[0].elevated, false);
  assert.equal(results.electron_token.observations[0].appcontainer, false);
  results.steps.push('Electron actual process Medium, non-elevated');
  await page.getByRole('button', { name: '＋ Add Provider', exact: true }).first().click();
  await page.locator('.preset').filter({ hasText: 'DeepSeek' }).click();
  await page.locator('#provider-add [name=name]').fill('Synthetic Provider');
  await page.locator('#provider-add [name=model_id]').fill('deepseek-flash');
  await page.locator('#provider-add [name=model_name]').fill('Synthetic Test Model');
  await page.getByRole('button', { name: 'Add Provider', exact: true }).click(); await page.getByRole('dialog').waitFor({ state: 'detached' });
  await page.getByRole('button', { name: /API Key Pool/ }).click(); await page.getByRole('button', { name: '＋ Add API Key', exact: true }).click();
  assert.equal(await page.locator('#secret,input[type=password]').count(), 0);
  await page.locator('#key-form [name=name]').fill('Q3 Synthetic UI Canary');
  await page.screenshot({ path: join(output, '01-add-key-intent.png'), fullPage: true });
  await page.getByRole('button', { name: 'Open Trusted Window', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 65000 }); await Promise.all(driving);
  assert.equal(helperStarts, 1, JSON.stringify(results));
  await page.locator('.key-card').first().waitFor();
  await page.bringToFront();
  assert.equal(results.helper_events.some(e => e.event === 'synthetic.ui.save.ack'), true);
  assert.equal(results.helper_events.find(e => e.event === 'synthetic.ui.shown').integrity, 'MEDIUM');
  assert.equal(results.helper_events.at(-1).event, 'synthetic.ui.closed');
  results.steps.push('Add Key launched real separate WinForms; UIA entered fixed canary, explicit review, original Ticket saved to same service, helper exited');
  const afterSave = (await page.evaluate(() => window.agentnexus.invoke('snapshot'))).value;
  assert.equal(afterSave.keys.length, 1); assert.equal(afterSave.service_status, 'AVAILABLE');
  assert.equal(afterSave.credential_statuses[0].status, 'CREDENTIAL_SAVED'); assert.equal(afterSave.usage.global.owner, 'CREDENTIAL_SERVICE');
  await page.screenshot({ path: join(output, '02-credential-saved.png'), fullPage: true });
  await page.evaluate(() => { window.__q3Deltas = []; window.agentnexus.onDelta(value => window.__q3Deltas.push(value)); });
  await page.locator('[data-action=navigate][data-view=chat]').click();
  await page.locator('[data-action=chat-agent][data-agent=development]').click();
  const request = 'Synthetic Q3 full desktop end-to-end request. Return a short FINAL response.';
  await page.locator('.composer textarea').fill(request); await page.locator('.composer button[type=submit]').click();
  await page.locator('.bubble:not(.user)').filter({ hasText: 'SIMULATED · isolated credential process, no network.' }).waitFor();
  await page.waitForFunction(() => document.querySelector('.composer button')?.disabled === false);
  const deltas = await page.evaluate(() => window.__q3Deltas); results.stream_events = deltas.length; assert.ok(deltas.length > 0);
  const afterRequest = (await page.evaluate(() => window.agentnexus.invoke('snapshot'))).value;
  assert.equal(afterRequest.usage.global.used, 30); assert.equal(afterRequest.usage.global.held, 0);
  assert.equal(afterRequest.usage.records.length, 1); assert.equal(afterRequest.usage.records[0].state, 'SETTLED');
  assert.equal(helperStarts, 1, 'Daily request must not launch helper/UAC path');
  assert.equal(results.chat_results[0]?.result?.outcome, 'SUCCEEDED');
  assert.equal(await page.locator('#secret,input[type=password]').count(), 0);
  const safety = await page.evaluate(() => ({ node: typeof process, require: typeof require, local_storage: localStorage.length, read: window.agentnexus.invoke('credential.read', {}) }));
  assert.equal(safety.node, 'undefined'); assert.equal(safety.require, 'undefined'); assert.equal(safety.local_storage, 0);
  assert.equal(JSON.stringify(afterRequest).includes('synthetic-test-q3-'), false);
  await page.screenshot({ path: join(output, '03-development-response.png'), fullPage: true });
  await page.locator('[data-action=navigate][data-view=usage]').click(); await page.screenshot({ path: join(output, '04-usage-settled.png'), fullPage: true });
  results.steps.push('Development Agent -> existing Router/Gateway -> Runtime -> daily Named Pipe -> same Credential Service -> Synthetic Provider -> stream -> original UI; 20+10 tokens settled; no new Helper launch');
  if (stack) results.stack_tokens = observe([stack.service_pid, stack.runtime_pid]);
  await writeFile(join(output, 'request-response-usage.json'), JSON.stringify({ request: { agent_id: 'development', text: request }, helper_events: results.helper_events, responses: results.chat_results, streaming: deltas, after_save: afterSave, after_request: afterRequest, safety }, null, 2));
  results.status = 'PASS';
} catch (error) {
  results.status = 'FAIL'; results.error = String(error?.stack ?? error);
  if (page) {
    await writeFile(join(output, 'failure-dom.html'), await page.content().catch(() => 'UNAVAILABLE'));
    await page.screenshot({ path: join(output, 'failure.png'), fullPage: true, timeout: 5000 }).catch(e => { results.screenshot_error = String(e.message); });
  }
} finally {
  if (app) await app.close().catch(() => {});
  await writeFile(join(output, 'electron.stderr.log'), stderr);
}
try {
  const db = new DatabaseSync(join(hostRoot, 'synthetic-credential-service/ledger.sqlite'), { readOnly: true });
  results.service_audit_rows = db.prepare('SELECT count(*) n FROM audit').get().n;
  await writeFile(join(output, 'service-audit.json'), JSON.stringify(db.prepare('SELECT * FROM audit ORDER BY seq').all(), null, 2)); db.close();
} catch (error) { results.audit_export = String(error.message); }
await writeFile(join(output, 'result.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ output, status: results.status, steps: results.steps, error: results.error }));
process.exitCode = results.status === 'PASS' ? 0 : 1;
