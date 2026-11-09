import { app, BrowserWindow, ipcMain, protocol, session } from 'electron';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { openDesktopService } from '../dist/src/agentnexus/desktop/service.js';
import { connectCredentialService, openSyntheticCredentialService, openSyntheticRuntimeStack, unavailableCredentialService } from '../dist/src/agentnexus/credential-service/client.js';
import { authorizedSender } from './sender.mjs';
import { fixedTrustedEntryPort, syntheticTrustedEntryPort } from './trusted-entry.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const origin = 'agentnexus://desktop';
protocol.registerSchemesAsPrivileged([{ scheme: 'agentnexus', privileges: { standard: true, secure: true, supportFetchAPI: false, corsEnabled: false } }]);
app.setName('AgentNexus');
if (!app.requestSingleInstanceLock() && !process.env.AGENTNEXUS_DESKTOP_E2E) app.quit();
let host, operator, window, closing = false;
const installedDesktop = here.toLowerCase() === 'c:\\program files\\agentnexus\\app\\desktop';
const root = process.env.AGENTNEXUS_DESKTOP_E2E && process.env.AGENTNEXUS_DESKTOP_TEST_ROOT
  ? process.env.AGENTNEXUS_DESKTOP_TEST_ROOT
  : join(app.getPath('appData'), 'AgentNexus');
mkdirSync(join(root, 'chromium-profile'), { recursive: true });
app.setPath('userData', join(root, 'chromium-profile'));
async function start() {
if (process.env.AGENTNEXUS_DESKTOP_E2E) process.stderr.write('DESKTOP_BOOT_WAITING_READY\n');
await app.whenReady();
if (process.env.AGENTNEXUS_DESKTOP_E2E) process.stderr.write('DESKTOP_BOOT_OPENING_HOST\n');
app.on('second-instance', () => { window?.show(); window?.focus(); });
const assets = new Map([['/index.html', ['index.html', 'text/html']], ['/app.js', ['app.js', 'text/javascript']], ['/style.css', ['style.css', 'text/css']]]);
protocol.handle('agentnexus', async request => {
  const url = new URL(request.url), asset = assets.get(url.pathname);
  if (url.protocol !== 'agentnexus:' || url.hostname !== 'desktop' || url.username || url.password || url.port || !asset || url.search || request.method !== 'GET') return new Response('', { status: 404 });
  return new Response(await readFile(join(here, 'renderer', asset[0])), { headers: { 'Content-Type': asset[1], 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'" } });
});
session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
session.defaultSession.setPermissionCheckHandler(() => false);
session.defaultSession.on('will-download', e => e.preventDefault());
session.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !details.url.startsWith(origin + '/') }));
// Synthetic subprocesses are an explicit E2E fixture. Installed desktops use only the fixed native service.
const q3Stack = !installedDesktop && process.env.AGENTNEXUS_DESKTOP_E2E === '1' && process.env.AGENTNEXUS_Q3_SYNTHETIC_STACK === '1'
  ? await openSyntheticRuntimeStack(join(root, 'synthetic-credential-service')) : undefined;
const credentialService = q3Stack?.daily ?? (process.env.AGENTNEXUS_DESKTOP_E2E && process.env.AGENTNEXUS_DESKTOP_SYNTHETIC_SERVICE === '1'
  ? await openSyntheticCredentialService(join(root, 'synthetic-credential-service'))
  : installedDesktop && !process.env.AGENTNEXUS_DESKTOP_E2E ? await connectCredentialService() : unavailableCredentialService());
const trustedEntry = q3Stack ? syntheticTrustedEntryPort({
  workerPath: join(here, '../../../../.workflow-kit/runtime/AgentNexus-M1.8.3-Q3/native-helper-ui/synthetic-credential-ui.exe'),
  invokeHelper: q3Stack.invokeHelper, disconnectHelper: q3Stack.disconnectHelper,
  onStarted: value => { process.stderr.write('Q3_HELPER_UI:' + JSON.stringify(value) + '\n'); },
  onEvent: value => { process.stderr.write('Q3_HELPER_EVENT:' + JSON.stringify(value) + '\n'); },
}) : fixedTrustedEntryPort();
host = await openDesktopService(root, { credentialService, trustedEntry,
  onDelta: async (subject, text) => { if (window && !window.isDestroyed()) window.webContents.send('agentnexus:delta', { agent_id: subject.agent_id, text }); },
});
if (q3Stack) process.stderr.write('Q3_STACK:' + JSON.stringify({ service_pid: q3Stack.service_pid, runtime_pid: q3Stack.runtime_pid, pipe: q3Stack.pipe }) + '\n');
if (process.env.AGENTNEXUS_DESKTOP_E2E) process.stderr.write('DESKTOP_BOOT_HOST_READY\n');
operator = host.openOperator();
window = new BrowserWindow({ width: 1440, height: 960, minWidth: 1024, minHeight: 720, title: 'AgentNexus', backgroundColor: '#f5f6f8', autoHideMenuBar: true, show: !process.env.AGENTNEXUS_DESKTOP_E2E,
  webPreferences: { preload: join(here, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, devTools: !!process.env.AGENTNEXUS_DESKTOP_E2E, spellcheck: false } });
window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
window.webContents.on('will-navigate', (event, url) => { if (url !== origin + '/index.html') event.preventDefault(); });
window.webContents.on('will-attach-webview', event => event.preventDefault());
ipcMain.handle('agentnexus:desktop', async (event, method, payload) => {
  if (!authorizedSender(event, window?.webContents, origin + '/index.html')) return { ok: false, error: 'IPC_SOURCE_DENIED' };
  if (method === 'credential.save') return { ok: false, error: 'TRUSTED_ENTRY_REQUIRED' };
  try {
    const value = await operator.invoke(method, payload);
    if (q3Stack && method === 'chat.send') process.stderr.write('Q3_CHAT_RESULT:' + JSON.stringify({ agent_id: payload.agent_id, result: value }) + '\n');
    return { ok: true, value };
  }
  catch (error) { return { ok: false, error: /^[A-Z][A-Z0-9_]{0,95}$/.test(error?.code) ? error.code : 'OPERATION_FAILED' }; }
});
await window.loadURL(origin + '/index.html');
// The hidden launcher can suppress the first native ShowWindow call on Windows.
if (!process.env.AGENTNEXUS_DESKTOP_E2E) { window.show(); window.focus(); }
if (process.env.AGENTNEXUS_DESKTOP_E2E) process.stderr.write('DESKTOP_BOOT_WINDOW_READY\n');
window.on('close', event => {
  if (closing) return;
  event.preventDefault();
  // A running operation must finish its durable result before the Host is closed.
  if (process.env.AGENTNEXUS_DESKTOP_E2E) process.stderr.write('DESKTOP_HOST_CLOSING\n');
  host.close().then(async () => { await q3Stack?.close(); closing = true; operator.revoke(); if (process.env.AGENTNEXUS_DESKTOP_E2E) process.stderr.write('DESKTOP_HOST_CLOSED\n'); app.exit(0); }).catch(() => {
    setTimeout(() => window?.close(), 250);
  });
});
app.on('window-all-closed', () => app.quit());
}
void start().catch(error => { if (process.env.AGENTNEXUS_DESKTOP_E2E) process.stderr.write('Q3_SYNTHETIC_START_ERROR:' + String(error?.stack ?? error) + '\n'); process.stderr.write('AGENTNEXUS_DESKTOP_START_FAILED\n'); app.exit(1); });
