# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: desktop.spec.mjs >> native IPC source spoofing and renderer claimed identity are denied
- Location: tests\desktop\desktop.spec.mjs:80:1

# Error details

```
Error: electronApplication.evaluate: Error: Script failed to execute, this normally means an error was thrown. Check the renderer console for the error.
```

# Test source

```ts
  1  | import { test, expect, _electron as electron } from '@playwright/test';
  2  | import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
  3  | import { fileURLToPath } from 'node:url';
  4  | import { join, resolve } from 'node:path';
  5  | const source = resolve(fileURLToPath(new URL('../../', import.meta.url)));
  6  | const runtime = fileURLToPath(new URL('../../../../../.workflow-kit/runtime/AgentNexus-Model-Provider-UI/e2e/', import.meta.url));
  7  | const evidence = process.env.AGENTNEXUS_UI_EVIDENCE;
  8  | async function launch(root) {
  9  |   const env = { ...process.env, AGENTNEXUS_DESKTOP_E2E: '1', AGENTNEXUS_DESKTOP_TEST_ROOT: root }; delete env.ELECTRON_RUN_AS_NODE;
  10 |   const app = await electron.launch({ args: [source], env });
  11 |   const page = await app.firstWindow(); page.setDefaultTimeout(10000); await expect(page.getByRole('heading', { name: 'Model Providers', exact: true })).toBeVisible(); console.log('UI: Host and renderer ready'); return { app, page };
  12 | }
  13 | const closedApps = new WeakSet();
  14 | async function close(app) {
  15 |   if (closedApps.has(app)) return;
  16 |   const pid = await app.evaluate(() => process.pid);
  17 |   await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close());
  18 |   const deadline = Date.now() + 10000;
  19 |   for (;;) {
  20 |     let alive = true;
  21 |     try { process.kill(pid, 0); } catch (error) { if (error.code === 'ESRCH') alive = false; else throw error; }
  22 |     if (!alive) break;
  23 |     if (Date.now() >= deadline) throw new Error('DESKTOP_CLOSE_TIMEOUT');
  24 |     await new Promise(resolve => setTimeout(resolve, 50));
  25 |   }
  26 |   closedApps.add(app);
  27 |   // The execution host can keep a proxy process alive after Electron exits.
  28 |   // Terminate only that test-owned proxy, after actual Host exit is observed.
  29 |   if (app.process().pid !== pid) app.process().kill();
  30 |   await Promise.race([app.close().catch(() => {}), new Promise(resolve => setTimeout(resolve, 1000))]);
  31 |   console.log('UI: native Host exit observed');
  32 | }
  33 | async function screenshot(page, name) { await mkdir(evidence, { recursive: true }); await page.screenshot({ path: join(evidence, name + '.png'), fullPage: true }); }
  34 | async function nav(page, name) { await page.getByRole('button', { name, exact: false }).filter({ has: page.locator('.nav-icon') }).click(); }
  35 | async function addKey(page, name, secret) {
  36 |   await page.getByRole('button', { name: '＋ Add API Key', exact: true }).click();
  37 |   await page.locator('#key-form input[name=name]').fill(name); await page.locator('#secret').fill(secret);
  38 |   await page.getByRole('button', { name: 'Save Credential', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
  39 | }
  40 | test('SIMULATED native Desktop full visual configuration, Vault, routing, usage and restart', async () => {
  41 |   await mkdir(runtime, { recursive: true }); const root = await mkdtemp(join(runtime, 'full-'));
  42 |   let { app, page } = await launch(root); const issues = [], external = [];
  43 |   page.on('pageerror', error => issues.push(error.name)); page.on('request', request => { if (!request.url().startsWith('agentnexus://')) external.push(request.url()); });
  44 |   try {
  45 |     await screenshot(page, '01-empty'); console.log('UI: starting provider form');
  46 |     await page.getByRole('button', { name: '＋ Add Provider', exact: true }).first().click();
  47 |     await expect(page.locator('.preset').filter({ hasText: 'Anthropic' })).toBeDisabled();
  48 |     await page.locator('.preset').filter({ hasText: 'Custom Provider' }).click();
  49 |     const form = page.locator('#provider-add');
  50 |     await form.locator('[name=name]').fill('Integration Provider'); await form.locator('[name=id]').fill('integration'); await form.locator('[name=base_url]').fill('https://example.com/v1'); await form.locator('[name=model_id]').fill('org/model-v1'); await form.locator('[name=model_name]').fill('Coding Model');
  51 |     await page.getByRole('button', { name: 'Add Provider', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.provider-intro h2')).toHaveText('Integration Provider'); console.log('UI: provider created');
  52 |     await page.locator('#provider-form [name=name]').fill('Integration Edited'); await page.getByRole('button', { name: 'Save Changes', exact: true }).click(); await expect(page.locator('.provider-intro h2')).toHaveText('Integration Edited');
  53 |     await page.getByRole('button', { name: /API Key Pool/ }).click(); await page.getByRole('button', { name: '＋ Add API Key', exact: true }).click();
  54 |     await page.locator('#key-form [name=name]').fill('Key One'); const input = page.locator('#secret');
  55 |     await expect(input).toHaveAttribute('type', 'password'); await input.fill('synthetic-test-ui-private-canary-123456'); await page.getByRole('button', { name: '显示 Key', exact: true }).click(); await expect(input).toHaveAttribute('type', 'text'); await page.getByRole('button', { name: '隐藏 Key', exact: true }).click(); await expect(input).toHaveAttribute('type', 'password'); await page.getByRole('button', { name: '清空 Key', exact: true }).click(); await expect(input).toHaveValue('');
  56 |     await input.fill('sk-this-is-a-synthetic-invalid-prefix-00000'); await page.getByRole('button', { name: 'Save Credential', exact: true }).click(); await expect(page.locator('#form-error')).toContainText('真实 Key 录入尚未开放'); await expect(input).toHaveValue('');
  57 |     await input.fill('synthetic-test-ui-private-canary-123456'); await page.getByRole('button', { name: 'Save Credential', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.key-card')).toHaveCount(1);
  58 |     await addKey(page, 'Key Two', 'synthetic-test-ui-secondary-canary-123456'); await expect(page.locator('.key-card')).toHaveCount(2); console.log('UI: Vault stored two synthetic credentials');
  59 |     const card = page.locator('.key-card').filter({ hasText: 'Key One' }); await card.getByRole('button', { name: 'Disable', exact: true }).click(); await expect(card).toContainText('DISABLED'); await card.getByRole('button', { name: 'Enable', exact: true }).click(); await expect(card).toContainText('ACTIVE');
  60 |     await card.getByRole('button', { name: 'Rotate', exact: true }).click(); await page.locator('#secret').fill('synthetic-test-ui-rotated-canary-123456'); await page.getByRole('button', { name: 'Save Credential', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.key-card')).toHaveCount(3);
  61 |     await screenshot(page, '02-key-pool');
  62 |     await page.locator('.key-card').filter({ hasText: 'ROTATING' }).getByRole('button', { name: 'Delete', exact: true }).click(); await page.getByRole('button', { name: '确认', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.key-card')).toHaveCount(2);
  63 |     await page.getByRole('button', { name: /Models \(/ }).click(); await page.getByRole('button', { name: '＋ Add Model', exact: true }).click(); await page.locator('#model-form [name=model_id]').fill('org/reasoning'); await page.locator('#model-form [name=name]').fill('Reasoning Model'); await page.locator('#model-form [name=reasoning]').check(); await page.getByRole('button', { name: 'Save Model', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.model-row')).toHaveCount(2);
  64 |     await page.locator('.model-row').filter({ hasText: 'Coding Model' }).getByRole('button', { name: '设为默认', exact: true }).click();
  65 |     await screenshot(page, '03-models');
  66 |     await page.getByRole('button', { name: 'Connection', exact: true }).click(); await page.getByRole('button', { name: 'Test Connection', exact: true }).click(); await expect(page.locator('.success')).toContainText('CREDENTIAL_SERVICE_QUALIFICATION_BLOCKED'); await page.getByRole('button', { name: '运行合成测试', exact: true }).click(); await expect(page.locator('.success')).toContainText('SIMULATED_GATEWAY_PASSED_NO_NETWORK'); await screenshot(page, '04-connection');
  67 |     await nav(page, 'Agents'); await page.locator('.agent-card').filter({ has: page.getByRole('heading', { name: 'Development', exact: true }) }).locator('.select-model').click(); await page.getByRole('button', { name: '收藏 Reasoning Model', exact: true }).click(); await page.locator('#model-search').fill('Reasoning'); await expect(page.locator('.selector-item')).toHaveCount(1); await screenshot(page, '05-selector'); await page.locator('.pick').filter({ hasText: 'Reasoning Model' }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
  68 |     await page.locator('.agent-card').filter({ has: page.getByRole('heading', { name: 'Development', exact: true }) }).getByRole('button', { name: '路由设置 →', exact: true }).click(); await page.locator('#binding-form [name=budget_tokens]').fill('100000'); await page.getByRole('button', { name: 'Save Routing', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await screenshot(page, '06-agents');
  69 |     await nav(page, 'Messages'); await page.getByRole('button', { name: 'Task Model ⌄', exact: true }).click(); await page.locator('.pick').filter({ hasText: 'Coding Model' }).click(); await page.locator('[name=text]').fill('Synthetic routing check'); await page.getByRole('button', { name: 'Send · SIMULATED', exact: true }).click(); await expect(page.locator('.bubble').filter({ hasText: 'MODEL GATEWAY' })).toBeVisible(); await screenshot(page, '07-chat');
  70 |     await nav(page, 'Usage & Billing'); await expect(page.getByText('100,000,000', { exact: true })).toBeVisible(); await expect(page.locator('.budget')).toContainText('Used'); await screenshot(page, '08-usage');
  71 |     const safety = await page.evaluate(async () => { const s = await window.agentnexus.invoke('snapshot'); const denied = await window.agentnexus.invoke('credential.read', {}); return { storage: localStorage.length, required: typeof require, node: typeof process, leak: JSON.stringify(s).includes('synthetic-test-ui-'), denied, real: s.value.usage.global.used, keys: s.value.keys.length }; });
  72 |     expect(safety).toEqual({ storage: 0, required: 'undefined', node: 'undefined', leak: false, denied: { ok: false, error: 'METHOD_DENIED' }, real: 0, keys: 2 });
  73 |     expect(issues).toEqual([]); expect(external).toEqual([]);
  74 |     await page.reload(); await expect(page.locator('.provider-intro h2')).toHaveText('Integration Edited'); await close(app);
  75 |     ({ app, page } = await launch(root)); await page.getByRole('button', { name: /API Key Pool/ }).click(); await expect(page.locator('.key-card')).toHaveCount(2); await nav(page, 'Agents'); await expect(page.locator('.agent-card').filter({ has: page.getByRole('heading', { name: 'Development', exact: true }) })).toContainText('Reasoning Model');
  76 |     await writeFile(join(evidence, 'safety.json'), JSON.stringify({ ...safety, ui_errors: issues, external_requests: external, refresh_restore: 'PASS', host_restart_restore: 'PASS', credential_storage: 'DPAPI_SYNTHETIC_ONLY_OS_ISOLATION_BLOCKED' }, null, 2));
  77 |   } catch (error) { await screenshot(page, 'failure-context').catch(() => {}); await writeFile(join(evidence, 'primary-failure.txt'), error.message); throw error; } finally { await close(app); }
  78 | });
  79 | 
  80 | test('native IPC source spoofing and renderer claimed identity are denied', async () => {
  81 |   await mkdir(runtime, { recursive: true }); const root = await mkdtemp(join(runtime, 'ipc-')); const { app, page } = await launch(root);
  82 |   try {
  83 |     const forged = await page.evaluate(() => window.agentnexus.invoke('snapshot', { role: 'admin', identity: 'operator' })); expect(forged).toEqual({ ok: false, error: 'INVALID_INPUT' }); console.log('UI: claimed operator identity denied');
> 84 |     const rogue = await app.evaluate(async ({ BrowserWindow }) => {
     |                             ^ Error: electronApplication.evaluate: Error: Script failed to execute, this normally means an error was thrown. Check the renderer console for the error.
  85 |       const original = BrowserWindow.getAllWindows()[0];
  86 |       const other = new BrowserWindow({ show: false, webPreferences: { preload: original.webContents.getLastWebPreferences().preload, nodeIntegration: false, sandbox: true, contextIsolation: true } });
  87 |       try { await other.loadURL('agentnexus://desktop/index.html'); return await other.webContents.executeJavaScript('window.agentnexus.invoke("snapshot", {})'); } finally { other.destroy(); }
  88 |     });
  89 |     expect(rogue).toEqual({ ok: false, error: 'IPC_SOURCE_DENIED' });
  90 |     await writeFile(join(evidence, 'ipc-denials.json'), JSON.stringify({ forged, rogue, scope: 'ACTUAL_ELECTRON_PROCESSES_NOT_OS_WORKER_QUALIFICATION' }, null, 2));
  91 |   } finally { await close(app); }
  92 | });
  93 | 
```