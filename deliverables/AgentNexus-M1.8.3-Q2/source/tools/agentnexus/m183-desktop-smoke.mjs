import { createRequire } from 'node:module';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
const source = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const previous = fileURLToPath(new URL('../../../../AgentNexus-Model-Provider-UI/source/package.json', import.meta.url));
const require = createRequire(previous), { _electron: electron } = require('playwright');
const executablePath = join(previous, '../node_modules/electron/dist/electron.exe');
const base = fileURLToPath(new URL('../../../../../.workflow-kit/runtime/AgentNexus-M1.8.3/native-desktop/', import.meta.url));
await mkdir(base, { recursive: true }); const output = await mkdtemp(join(base, 'run-'));
const build = spawnSync(process.execPath, ['tools/agentnexus/build-desktop.mjs'], { cwd: source, windowsHide: true, encoding: 'utf8' });
assert.equal(build.status, 0, build.stderr);
async function launch(synthetic, root) {
  const env = { ...process.env, AGENTNEXUS_DESKTOP_E2E: '1', AGENTNEXUS_DESKTOP_TEST_ROOT: root };
  delete env.ELECTRON_RUN_AS_NODE; delete env.AGENTNEXUS_DESKTOP_SYNTHETIC_SERVICE;
  if (synthetic) env.AGENTNEXUS_DESKTOP_SYNTHETIC_SERVICE = '1';
  const app = await electron.launch({ executablePath, args: [source], env }); const page = await app.firstWindow();
  await page.getByRole('heading', { name: 'Model Providers', exact: true }).waitFor(); page.setDefaultTimeout(10000); return { app, page };
}
const results = { schema: 1, scope: 'ACTUAL_ELECTRON_AND_SAME_SID_SYNTHETIC_SERVICE_ONLY', production_isolation: 'BLOCKED', real_credentials: 0, real_requests: 0, steps: [] };
const probeEnv = { ...process.env }; for (const key of Object.keys(probeEnv)) if (/electron_run_as_node|node_options/i.test(key)) delete probeEnv[key];
const runtimeProbe = spawnSync(executablePath, ['--version'], { env: probeEnv, windowsHide: true, encoding: 'utf8', timeout: 15000 });
if (runtimeProbe.status !== 0) {
  Object.assign(results, { status: 'BLOCKED', reason: 'ELECTRON_RUNTIME_EXITS_BEFORE_APPLICATION', runtime_probe: { status: runtimeProbe.status, signal: runtimeProbe.signal, error: runtimeProbe.error?.code ?? null, stdout: runtimeProbe.stdout, stderr: runtimeProbe.stderr }, application_window: 'NOT_RUN' });
  await writeFile(join(output, 'result.json'), JSON.stringify(results, null, 2) + '\n'); console.log(JSON.stringify({ output, ...results }, null, 2)); process.exit(2);
}
let app, page;
async function close() { if (app) { await app.close(); app = null; } }
try {
  ({ app, page } = await launch(false, join(output, 'blocked-host')));
  const blocked = await page.evaluate(() => window.agentnexus.invoke('snapshot'));
  assert.equal(blocked.value.credential_entry.synthetic, false); assert.equal(blocked.value.credential_entry.real, false);
  await page.screenshot({ path: join(output, '01-service-blocked.png'), fullPage: true }); results.steps.push('Installed-service absence shows BLOCKED; no synthetic fallback'); await close();
  ({ app, page } = await launch(true, join(output, 'synthetic-host')));
  await page.getByRole('button', { name: '＋ Add Provider', exact: true }).first().click();
  await page.locator('.preset').filter({ hasText: 'DeepSeek' }).click();
  await page.locator('#provider-add [name=model_id]').fill('deepseek-flash'); await page.locator('#provider-add [name=model_name]').fill('DeepSeek Flash');
  await page.getByRole('button', { name: 'Add Provider', exact: true }).click(); await page.getByRole('dialog').waitFor({ state: 'detached' });
  await page.getByRole('button', { name: /API Key Pool/ }).click(); await page.getByRole('button', { name: '＋ Add API Key', exact: true }).click();
  const input = page.locator('#secret'); assert.equal(await input.getAttribute('type'), 'password');
  await page.locator('#key-form [name=name]').fill('M1.8.3 Synthetic Key'); await input.fill('synthetic-test-native-m183-canary-123456789');
  await page.getByRole('button', { name: '显示 Key', exact: true }).click(); assert.equal(await input.getAttribute('type'), 'text');
  await page.getByRole('button', { name: '隐藏 Key', exact: true }).click(); await page.getByRole('button', { name: '清空 Key', exact: true }).click(); assert.equal(await input.inputValue(), '');
  await input.fill('synthetic-test-native-m183-canary-123456789'); await page.getByRole('button', { name: 'Save Credential', exact: true }).click(); await page.getByRole('dialog').waitFor({ state: 'detached' });
  assert.equal(await page.locator('.key-card').count(), 1); results.steps.push('Existing password entry/show/hide/clear/save uses separate credential process');
  await page.screenshot({ path: join(output, '02-key-pool.png'), fullPage: true });
  const card = page.locator('.key-card'); await card.getByRole('button', { name: 'Disable', exact: true }).click(); await page.getByText('DISABLED', { exact: true }).first().waitFor();
  await card.getByRole('button', { name: 'Enable', exact: true }).click(); await page.getByText('ACTIVE', { exact: true }).first().waitFor();
  await page.getByRole('button', { name: 'Connection', exact: true }).click(); assert.equal(await page.getByRole('button', { name: 'Test Connection', exact: true }).isDisabled(), true);
  await page.getByRole('button', { name: '运行合成测试', exact: true }).click(); await page.getByText('SIMULATED_GATEWAY_PASSED_NO_NETWORK', { exact: true }).waitFor();
  const safety = await page.evaluate(async () => ({ snapshot: (await window.agentnexus.invoke('snapshot')).value, node: typeof process, require: typeof require, local_storage: localStorage.length, saved_secret_input_count: document.querySelectorAll('#secret').length, read: await window.agentnexus.invoke('credential.read', {}) }));
  assert.equal(safety.node, 'undefined'); assert.equal(safety.require, 'undefined'); assert.equal(safety.local_storage, 0); assert.equal(safety.saved_secret_input_count, 0); assert.equal(safety.read.error, 'METHOD_DENIED');
  assert.equal(JSON.stringify(safety.snapshot).includes('synthetic-test-native-'), false); assert.equal(safety.snapshot.usage.global.owner, 'CREDENTIAL_SERVICE'); assert.equal(safety.snapshot.usage.global.used, 30); assert.notEqual(safety.snapshot.connections[0].status, 'CONNECTED');
  await page.screenshot({ path: join(output, '03-synthetic-connection.png'), fullPage: true });
  await page.reload(); await page.getByRole('heading', { name: 'Model Providers', exact: true }).waitFor(); results.steps.push('Key state changes, synthetic gateway, authoritative usage and reload pass without claiming CONNECTED');
  await writeFile(join(output, 'safety.json'), JSON.stringify(safety, null, 2) + '\n'); results.status = 'PASS';
} catch (error) {
  results.status = 'FAIL'; results.error = String(error?.message ?? 'DESKTOP_SMOKE_FAILED'); if (page) await page.screenshot({ path: join(output, 'failure.png') }).catch(() => {});
} finally { await close(); }
await writeFile(join(output, 'result.json'), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify({ output, ...results }, null, 2)); process.exitCode = results.status === 'PASS' ? 0 : 1;
