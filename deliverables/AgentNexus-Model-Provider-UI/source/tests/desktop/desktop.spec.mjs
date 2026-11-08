import { test, expect, _electron as electron } from '@playwright/test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
const source = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const runtime = fileURLToPath(new URL('../../../../../.workflow-kit/runtime/AgentNexus-Model-Provider-UI/e2e/', import.meta.url));
const evidence = process.env.AGENTNEXUS_UI_EVIDENCE;
async function launch(root) {
  const env = { ...process.env, AGENTNEXUS_DESKTOP_E2E: '1', AGENTNEXUS_DESKTOP_TEST_ROOT: root }; delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: [source], env });
  const page = await app.firstWindow(); page.setDefaultTimeout(10000); await expect(page.getByRole('heading', { name: 'Model Providers', exact: true })).toBeVisible(); console.log('UI: Host and renderer ready'); return { app, page };
}
const closedApps = new WeakSet();
async function close(app) {
  if (closedApps.has(app)) return;
  const pid = await app.evaluate(() => process.pid);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close());
  const deadline = Date.now() + 10000;
  for (;;) {
    let alive = true;
    try { process.kill(pid, 0); } catch (error) { if (error.code === 'ESRCH') alive = false; else throw error; }
    if (!alive) break;
    if (Date.now() >= deadline) throw new Error('DESKTOP_CLOSE_TIMEOUT');
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  closedApps.add(app);
  await Promise.race([app.close().catch(() => {}), new Promise(resolve => setTimeout(resolve, 1000))]);
  console.log('UI: native Host exit observed');
}
async function screenshot(page, name) { await mkdir(evidence, { recursive: true }); await page.screenshot({ path: join(evidence, name + '.png'), fullPage: true }); }
async function nav(page, name) { await page.getByRole('button', { name, exact: false }).filter({ has: page.locator('.nav-icon') }).click(); }
async function addKey(page, name, secret) {
  await page.getByRole('button', { name: '＋ Add API Key', exact: true }).click();
  await page.locator('#key-form input[name=name]').fill(name); await page.locator('#secret').fill(secret);
  await page.getByRole('button', { name: 'Save Credential', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
}
test('SIMULATED native Desktop full visual configuration, Vault, routing, usage and restart', async () => {
  await mkdir(runtime, { recursive: true }); const root = await mkdtemp(join(runtime, 'full-'));
  let { app, page } = await launch(root); const issues = [], external = [];
  page.on('pageerror', error => issues.push(error.name)); page.on('request', request => { if (!request.url().startsWith('agentnexus://')) external.push(request.url()); });
  try {
    await screenshot(page, '01-empty'); console.log('UI: starting provider form');
    await page.getByRole('button', { name: '＋ Add Provider', exact: true }).first().click();
    await expect(page.locator('.preset').filter({ hasText: 'Anthropic' })).toBeDisabled();
    await page.locator('.preset').filter({ hasText: 'Custom Provider' }).click();
    const form = page.locator('#provider-add');
    await form.locator('[name=name]').fill('Integration Provider'); await form.locator('[name=id]').fill('integration'); await form.locator('[name=base_url]').fill('https://example.com/v1'); await form.locator('[name=model_id]').fill('org/model-v1'); await form.locator('[name=model_name]').fill('Coding Model');
    await page.getByRole('button', { name: 'Add Provider', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.provider-intro h2')).toHaveText('Integration Provider'); console.log('UI: provider created');
    await page.locator('#provider-form [name=name]').fill('Integration Edited'); await page.getByRole('button', { name: 'Save Changes', exact: true }).click(); await expect(page.locator('.provider-intro h2')).toHaveText('Integration Edited');
    await page.getByRole('button', { name: /API Key Pool/ }).click(); await page.getByRole('button', { name: '＋ Add API Key', exact: true }).click();
    await page.locator('#key-form [name=name]').fill('Key One'); const input = page.locator('#secret');
    await expect(input).toHaveAttribute('type', 'password'); await input.fill('synthetic-test-ui-private-canary-123456'); await page.getByRole('button', { name: '显示 Key', exact: true }).click(); await expect(input).toHaveAttribute('type', 'text'); await page.getByRole('button', { name: '隐藏 Key', exact: true }).click(); await expect(input).toHaveAttribute('type', 'password'); await page.getByRole('button', { name: '清空 Key', exact: true }).click(); await expect(input).toHaveValue('');
    await input.fill('sk-this-is-a-synthetic-invalid-prefix-00000'); await page.getByRole('button', { name: 'Save Credential', exact: true }).click(); await expect(page.locator('#form-error')).toContainText('真实 Key 录入尚未开放'); await expect(input).toHaveValue('');
    await input.fill('synthetic-test-ui-private-canary-123456'); await page.getByRole('button', { name: 'Save Credential', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.key-card')).toHaveCount(1);
    await addKey(page, 'Key Two', 'synthetic-test-ui-secondary-canary-123456'); await expect(page.locator('.key-card')).toHaveCount(2); console.log('UI: Vault stored two synthetic credentials');
    const card = page.locator('.key-card').filter({ hasText: 'Key One' }); await card.getByRole('button', { name: 'Disable', exact: true }).click(); await expect(card).toContainText('DISABLED'); await card.getByRole('button', { name: 'Enable', exact: true }).click(); await expect(card).toContainText('ACTIVE');
    await card.getByRole('button', { name: 'Rotate', exact: true }).click(); await page.locator('#secret').fill('synthetic-test-ui-rotated-canary-123456'); await page.getByRole('button', { name: 'Save Credential', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.key-card')).toHaveCount(3);
    await screenshot(page, '02-key-pool');
    await page.locator('.key-card').filter({ hasText: 'ROTATING' }).getByRole('button', { name: 'Delete', exact: true }).click(); await page.getByRole('button', { name: '确认', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.key-card')).toHaveCount(2);
    await page.getByRole('button', { name: /Models \(/ }).click(); await page.getByRole('button', { name: '＋ Add Model', exact: true }).click(); await page.locator('#model-form [name=model_id]').fill('org/reasoning'); await page.locator('#model-form [name=name]').fill('Reasoning Model'); await page.locator('#model-form [name=reasoning]').check(); await page.getByRole('button', { name: 'Save Model', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.model-row')).toHaveCount(2);
    await page.locator('.model-row').filter({ hasText: 'Coding Model' }).getByRole('button', { name: '设为默认', exact: true }).click();
    await screenshot(page, '03-models');
    await page.getByRole('button', { name: 'Connection', exact: true }).click(); await page.getByRole('button', { name: 'Test Connection', exact: true }).click(); await expect(page.locator('.success')).toContainText('CREDENTIAL_SERVICE_QUALIFICATION_BLOCKED'); await page.getByRole('button', { name: '运行合成测试', exact: true }).click(); await expect(page.locator('.success')).toContainText('SIMULATED_GATEWAY_PASSED_NO_NETWORK'); await screenshot(page, '04-connection');
    await nav(page, 'Agents'); await page.locator('.agent-card').filter({ has: page.getByRole('heading', { name: 'Development', exact: true }) }).locator('.select-model').click(); await page.getByRole('button', { name: '收藏 Reasoning Model', exact: true }).click(); await page.locator('#model-search').fill('Reasoning'); await expect(page.locator('.selector-item')).toHaveCount(1); await screenshot(page, '05-selector'); await page.locator('.pick').filter({ hasText: 'Reasoning Model' }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.locator('.agent-card').filter({ has: page.getByRole('heading', { name: 'Development', exact: true }) }).getByRole('button', { name: '路由设置 →', exact: true }).click(); await page.locator('#binding-form [name=budget_tokens]').fill('100000'); await page.getByRole('button', { name: 'Save Routing', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await screenshot(page, '06-agents');
    await nav(page, 'Messages'); await page.getByRole('button', { name: 'Task Model ⌄', exact: true }).click(); await page.locator('.pick').filter({ hasText: 'Coding Model' }).click(); await page.locator('[name=text]').fill('Synthetic routing check'); await page.getByRole('button', { name: 'Send · SIMULATED', exact: true }).click(); await expect(page.locator('.bubble').filter({ hasText: 'MODEL GATEWAY' })).toBeVisible(); await screenshot(page, '07-chat');
    await nav(page, 'Usage & Billing'); await expect(page.getByText('100,000,000', { exact: true })).toBeVisible(); await expect(page.locator('.budget')).toContainText('Used'); await screenshot(page, '08-usage');
    const safety = await page.evaluate(async () => { const s = await window.agentnexus.invoke('snapshot'); const denied = await window.agentnexus.invoke('credential.read', {}); return { storage: localStorage.length, required: typeof require, node: typeof process, leak: JSON.stringify(s).includes('synthetic-test-ui-'), denied, real: s.value.usage.global.used, keys: s.value.keys.length }; });
    expect(safety).toEqual({ storage: 0, required: 'undefined', node: 'undefined', leak: false, denied: { ok: false, error: 'METHOD_DENIED' }, real: 0, keys: 2 });
    expect(issues).toEqual([]); expect(external).toEqual([]);
    await page.reload(); await expect(page.locator('.provider-intro h2')).toHaveText('Integration Edited'); await close(app);
    ({ app, page } = await launch(root)); await page.getByRole('button', { name: /API Key Pool/ }).click(); await expect(page.locator('.key-card')).toHaveCount(2); await nav(page, 'Agents'); await expect(page.locator('.agent-card').filter({ has: page.getByRole('heading', { name: 'Development', exact: true }) })).toContainText('Reasoning Model');
    await writeFile(join(evidence, 'safety.json'), JSON.stringify({ ...safety, ui_errors: issues, external_requests: external, refresh_restore: 'PASS', host_restart_restore: 'PASS', credential_storage: 'DPAPI_SYNTHETIC_ONLY_OS_ISOLATION_BLOCKED' }, null, 2));
  } catch (error) { await screenshot(page, 'failure-context').catch(() => {}); await writeFile(join(evidence, 'primary-failure.txt'), error.message); throw error; } finally { await close(app); }
});

test('native IPC source spoofing and renderer claimed identity are denied', async () => {
  await mkdir(runtime, { recursive: true }); const root = await mkdtemp(join(runtime, 'ipc-')); const { app, page } = await launch(root);
  try {
    const forged = await page.evaluate(() => window.agentnexus.invoke('snapshot', { role: 'admin', identity: 'operator' })); expect(forged).toEqual({ ok: false, error: 'INVALID_INPUT' }); console.log('UI: claimed operator identity denied');
    const rogue = await app.evaluate(async ({ BrowserWindow }) => {
      const other = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true, sandbox: false, contextIsolation: false } });
      try { await other.loadURL('agentnexus://desktop/index.html'); return await other.webContents.executeJavaScript('require("electron").ipcRenderer.invoke("agentnexus:desktop", "snapshot", {})'); } finally { other.destroy(); }
    });
    expect(rogue).toEqual({ ok: false, error: 'IPC_SOURCE_DENIED' });
    await writeFile(join(evidence, 'ipc-denials.json'), JSON.stringify({ forged, rogue, scope: 'ACTUAL_ELECTRON_PROCESSES_NOT_OS_WORKER_QUALIFICATION' }, null, 2));
  } finally { await close(app); }
});
