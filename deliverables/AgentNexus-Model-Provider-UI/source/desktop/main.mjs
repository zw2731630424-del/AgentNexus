import { app, BrowserWindow, ipcMain, protocol, session } from 'electron';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { openDesktopService } from '../dist/src/agentnexus/desktop/service.js';
import { authorizedSender } from './sender.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const origin = 'agentnexus://desktop';
protocol.registerSchemesAsPrivileged([{ scheme: 'agentnexus', privileges: { standard: true, secure: true, supportFetchAPI: false, corsEnabled: false } }]);
app.setName('AgentNexus');
if (!app.requestSingleInstanceLock() && !process.env.AGENTNEXUS_DESKTOP_E2E) app.quit();
let host, operator, window, closing = false;
const root = process.env.AGENTNEXUS_DESKTOP_E2E && process.env.AGENTNEXUS_DESKTOP_TEST_ROOT
  ? process.env.AGENTNEXUS_DESKTOP_TEST_ROOT
  : join(here, '../../../../.workflow-kit/runtime/AgentNexus-Model-Provider-UI/desktop-data');
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
host = await openDesktopService(root);
if (process.env.AGENTNEXUS_DESKTOP_E2E) process.stderr.write('DESKTOP_BOOT_HOST_READY\n');
operator = host.openOperator();
window = new BrowserWindow({ width: 1440, height: 960, minWidth: 1024, minHeight: 720, title: 'AgentNexus', backgroundColor: '#f5f6f8', autoHideMenuBar: true, show: !process.env.AGENTNEXUS_DESKTOP_E2E,
  webPreferences: { preload: join(here, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, devTools: !!process.env.AGENTNEXUS_DESKTOP_E2E, spellcheck: false } });
window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
window.webContents.on('will-navigate', (event, url) => { if (url !== origin + '/index.html') event.preventDefault(); });
window.webContents.on('will-attach-webview', event => event.preventDefault());
ipcMain.handle('agentnexus:desktop', async (event, method, payload) => {
  if (!authorizedSender(event, window?.webContents, origin + '/index.html')) return { ok: false, error: 'IPC_SOURCE_DENIED' };
  try { return { ok: true, value: await operator.invoke(method, payload) }; }
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
  host.close().then(() => { closing = true; operator.revoke(); if (process.env.AGENTNEXUS_DESKTOP_E2E) process.stderr.write('DESKTOP_HOST_CLOSED\n'); app.exit(0); }).catch(() => {
    setTimeout(() => window?.close(), 250);
  });
});
app.on('window-all-closed', () => app.quit());
}
void start().catch(() => { process.stderr.write('AGENTNEXUS_DESKTOP_START_FAILED\n'); app.exit(1); });
