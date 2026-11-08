# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: desktop.spec.mjs >> native IPC source spoofing and renderer claimed identity are denied
- Location: tests\desktop\desktop.spec.mjs:60:1

# Error details

```
Error: electron.launch: Process failed to launch!
Call log:
  - <launching> "I:\AI_AgentNexus\deliverables\AgentNexus-Model-Provider-UI\source\node_modules\electron\dist\electron.exe" "-r" "I:\AI_AgentNexus\deliverables\AgentNexus-Model-Provider-UI\source\node_modules\playwright-core\lib\server\electron\loader.js" "--inspect=0" "--remote-debugging-port=0" "I:\AI_AgentNexus\deliverables\AgentNexus-Model-Provider-UI\source\"
  - <launched> pid=48748
  - [pid=48748][out]
  - [pid=48748][err] Debugger listening on ws://127.0.0.1:3780/e0332feb-4111-47fa-970b-57a9bf2802c2
  - [pid=48748][err] For help, see: https://nodejs.org/learn/getting-started/debugging
  - <ws connecting> ws://127.0.0.1:3780/e0332feb-4111-47fa-970b-57a9bf2802c2
  - <ws connected> ws://127.0.0.1:3780/e0332feb-4111-47fa-970b-57a9bf2802c2
  - [pid=48748][err] Debugger attached.
  - [pid=48748][err] (node:37144) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
  - [pid=48748][err] (Use `electron --trace-warnings ...` to show where the warning was created)
  - <ws disconnected> ws://127.0.0.1:3780/e0332feb-4111-47fa-970b-57a9bf2802c2 code=1006 reason=
  - [pid=48748] <kill>
  - [pid=48748] <will force kill>
  - [pid=48748] taskkill stderr: ERROR: The process "48748" not found.
  - [pid=48748] <process did exit: exitCode=1, signal=null>
  - [pid=48748] starting temporary directories cleanup
  - [pid=48748] finished temporary directories cleanup

```

# Test source

```ts
  1  | import { test, expect, _electron as electron } from '@playwright/test';
  2  | import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
  3  | import { fileURLToPath } from 'node:url';
  4  | import { join } from 'node:path';
  5  | const source = fileURLToPath(new URL('../../', import.meta.url));
  6  | const runtime = fileURLToPath(new URL('../../../../../.workflow-kit/runtime/AgentNexus-Model-Provider-UI/e2e/', import.meta.url));
  7  | const evidence = process.env.AGENTNEXUS_UI_EVIDENCE;
  8  | async function launch(root) {
  9  |   const env = { ...process.env, AGENTNEXUS_DESKTOP_E2E: '1', AGENTNEXUS_DESKTOP_TEST_ROOT: root }; delete env.ELECTRON_RUN_AS_NODE;
> 10 |   const app = await electron.launch({ args: [source], env });
     |               ^ Error: electron.launch: Process failed to launch!
  11 |   const page = await app.firstWindow(); await expect(page.getByRole('heading', { name: 'Model Providers', exact: true })).toBeVisible(); return { app, page };
  12 | }
  13 | async function screenshot(page, name) { await mkdir(evidence, { recursive: true }); await page.screenshot({ path: join(evidence, name + '.png'), fullPage: true }); }
  14 | async function nav(page, name) { await page.getByRole('button', { name, exact: false }).filter({ has: page.locator('.nav-icon') }).click(); }
  15 | async function addKey(page, name, secret) {
  16 |   await page.getByRole('button', { name: '＋ Add API Key', exact: true }).click();
  17 |   await page.locator('#key-form input[name=name]').fill(name); await page.locator('#secret').fill(secret);
  18 |   await page.getByRole('button', { name: 'Save Credential', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
  19 | }
  20 | test('SIMULATED native Desktop full visual configuration, Vault, routing, usage and restart', async () => {
  21 |   await mkdir(runtime, { recursive: true }); const root = await mkdtemp(join(runtime, 'full-'));
  22 |   let { app, page } = await launch(root); const issues = [], external = [];
  23 |   page.on('pageerror', error => issues.push(error.name)); page.on('request', request => { if (!request.url().startsWith('agentnexus://')) external.push(request.url()); });
  24 |   try {
  25 |     await screenshot(page, '01-empty');
  26 |     await page.getByRole('button', { name: '＋ Add Provider', exact: true }).first().click();
  27 |     await expect(page.locator('.preset').filter({ hasText: 'Anthropic' })).toBeDisabled();
  28 |     await page.locator('.preset').filter({ hasText: 'Custom Provider' }).click();
  29 |     const form = page.locator('#provider-add');
  30 |     await form.locator('[name=name]').fill('Integration Provider'); await form.locator('[name=id]').fill('integration'); await form.locator('[name=base_url]').fill('https://example.com/v1'); await form.locator('[name=model_id]').fill('org/model-v1'); await form.locator('[name=model_name]').fill('Coding Model');
  31 |     await page.getByRole('button', { name: 'Add Provider', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.provider-intro h2')).toHaveText('Integration Provider');
  32 |     await page.locator('#provider-form [name=name]').fill('Integration Edited'); await page.getByRole('button', { name: 'Save Changes', exact: true }).click(); await expect(page.locator('.provider-intro h2')).toHaveText('Integration Edited');
  33 |     await page.getByRole('button', { name: /API Key Pool/ }).click(); await page.getByRole('button', { name: '＋ Add API Key', exact: true }).click();
  34 |     await page.locator('#key-form [name=name]').fill('Key One'); const input = page.locator('#secret');
  35 |     await expect(input).toHaveAttribute('type', 'password'); await input.fill('synthetic-test-ui-private-canary-123456'); await page.getByRole('button', { name: '显示 Key', exact: true }).click(); await expect(input).toHaveAttribute('type', 'text'); await page.getByRole('button', { name: '隐藏 Key', exact: true }).click(); await expect(input).toHaveAttribute('type', 'password'); await page.getByRole('button', { name: '清空 Key', exact: true }).click(); await expect(input).toHaveValue('');
  36 |     await input.fill('sk-this-is-a-synthetic-invalid-prefix-00000'); await page.getByRole('button', { name: 'Save Credential', exact: true }).click(); await expect(page.locator('#form-error')).toContainText('真实 Key 录入尚未开放'); await expect(input).toHaveValue('');
  37 |     await input.fill('synthetic-test-ui-private-canary-123456'); await page.getByRole('button', { name: 'Save Credential', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.key-card')).toHaveCount(1);
  38 |     await addKey(page, 'Key Two', 'synthetic-test-ui-secondary-canary-123456'); await expect(page.locator('.key-card')).toHaveCount(2);
  39 |     const card = page.locator('.key-card').filter({ hasText: 'Key One' }); await card.getByRole('button', { name: 'Disable', exact: true }).click(); await expect(card).toContainText('DISABLED'); await card.getByRole('button', { name: 'Enable', exact: true }).click(); await expect(card).toContainText('ACTIVE');
  40 |     await card.getByRole('button', { name: 'Rotate', exact: true }).click(); await page.locator('#secret').fill('synthetic-test-ui-rotated-canary-123456'); await page.getByRole('button', { name: 'Save Credential', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.key-card')).toHaveCount(3);
  41 |     await screenshot(page, '02-key-pool');
  42 |     await page.locator('.key-card').filter({ hasText: 'ROTATING' }).getByRole('button', { name: 'Delete', exact: true }).click(); await page.getByRole('button', { name: '确认', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.key-card')).toHaveCount(2);
  43 |     await page.getByRole('button', { name: /Models \(/ }).click(); await page.getByRole('button', { name: '＋ Add Model', exact: true }).click(); await page.locator('#model-form [name=model_id]').fill('org/reasoning'); await page.locator('#model-form [name=name]').fill('Reasoning Model'); await page.locator('#model-form [name=reasoning]').check(); await page.getByRole('button', { name: 'Save Model', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.model-row')).toHaveCount(2);
  44 |     await page.locator('.model-row').filter({ hasText: 'Coding Model' }).getByRole('button', { name: '设为默认', exact: true }).click();
  45 |     await screenshot(page, '03-models');
  46 |     await page.getByRole('button', { name: 'Connection', exact: true }).click(); await page.getByRole('button', { name: 'Test Connection', exact: true }).click(); await expect(page.locator('.success')).toContainText('CREDENTIAL_SERVICE_QUALIFICATION_BLOCKED'); await page.getByRole('button', { name: '运行合成测试', exact: true }).click(); await expect(page.locator('.success')).toContainText('SIMULATED_GATEWAY_PASSED_NO_NETWORK'); await screenshot(page, '04-connection');
  47 |     await nav(page, 'Agents'); await page.locator('.agent-card').filter({ has: page.getByRole('heading', { name: 'Development', exact: true }) }).locator('.select-model').click(); await page.getByRole('button', { name: '收藏 Reasoning Model', exact: true }).click(); await page.locator('#model-search').fill('Reasoning'); await expect(page.locator('.selector-item')).toHaveCount(1); await screenshot(page, '05-selector'); await page.locator('.pick').filter({ hasText: 'Reasoning Model' }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
  48 |     await page.locator('.agent-card').filter({ has: page.getByRole('heading', { name: 'Development', exact: true }) }).getByRole('button', { name: '路由设置 →', exact: true }).click(); await page.locator('#binding-form [name=budget_tokens]').fill('100000'); await page.getByRole('button', { name: 'Save Routing', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await screenshot(page, '06-agents');
  49 |     await nav(page, 'Messages'); await page.getByRole('button', { name: 'Task Model ⌄', exact: true }).click(); await page.locator('.pick').filter({ hasText: 'Coding Model' }).click(); await page.locator('[name=text]').fill('Synthetic routing check'); await page.getByRole('button', { name: 'Send · SIMULATED', exact: true }).click(); await expect(page.locator('.bubble').filter({ hasText: 'MODEL GATEWAY' })).toBeVisible(); await screenshot(page, '07-chat');
  50 |     await nav(page, 'Usage & Billing'); await expect(page.getByText('100,000,000', { exact: true })).toBeVisible(); await expect(page.locator('.budget')).toContainText('Used'); await screenshot(page, '08-usage');
  51 |     const safety = await page.evaluate(async () => { const s = await window.agentnexus.invoke('snapshot'); const denied = await window.agentnexus.invoke('credential.read', {}); return { storage: localStorage.length, required: typeof require, node: typeof process, leak: JSON.stringify(s).includes('synthetic-test-ui-'), denied, real: s.value.usage.global.used, keys: s.value.keys.length }; });
  52 |     expect(safety).toEqual({ storage: 0, required: 'undefined', node: 'undefined', leak: false, denied: { ok: false, error: 'METHOD_DENIED' }, real: 0, keys: 2 });
  53 |     expect(issues).toEqual([]); expect(external).toEqual([]);
  54 |     await page.reload(); await expect(page.locator('.provider-intro h2')).toHaveText('Integration Edited'); await app.close();
  55 |     ({ app, page } = await launch(root)); await page.getByRole('button', { name: /API Key Pool/ }).click(); await expect(page.locator('.key-card')).toHaveCount(2); await nav(page, 'Agents'); await expect(page.locator('.agent-card').filter({ has: page.getByRole('heading', { name: 'Development', exact: true }) })).toContainText('Reasoning Model');
  56 |     await writeFile(join(evidence, 'safety.json'), JSON.stringify({ ...safety, ui_errors: issues, external_requests: external, refresh_restore: 'PASS', host_restart_restore: 'PASS', credential_storage: 'DPAPI_SYNTHETIC_ONLY_OS_ISOLATION_BLOCKED' }, null, 2));
  57 |   } finally { await app.close(); }
  58 | });
  59 | 
  60 | test('native IPC source spoofing and renderer claimed identity are denied', async () => {
  61 |   await mkdir(runtime, { recursive: true }); const root = await mkdtemp(join(runtime, 'ipc-')); const { app, page } = await launch(root);
  62 |   try {
  63 |     const forged = await page.evaluate(() => window.agentnexus.invoke('snapshot', { role: 'admin', identity: 'operator' })); expect(forged).toEqual({ ok: false, error: 'INVALID_INPUT' });
  64 |     const rogue = await app.evaluate(async ({ BrowserWindow }) => {
  65 |       const other = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true, sandbox: false, contextIsolation: false } });
  66 |       try { return await other.webContents.executeJavaScript('require("electron").ipcRenderer.invoke("agentnexus:desktop", "snapshot", {})'); } finally { other.destroy(); }
  67 |     });
  68 |     expect(rogue).toEqual({ ok: false, error: 'IPC_SOURCE_DENIED' });
  69 |     await writeFile(join(evidence, 'ipc-denials.json'), JSON.stringify({ forged, rogue, scope: 'ACTUAL_ELECTRON_PROCESSES_NOT_OS_WORKER_QUALIFICATION' }, null, 2));
  70 |   } finally { await app.close(); }
  71 | });
  72 | 
```