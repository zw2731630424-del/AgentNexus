const { contextBridge, ipcRenderer } = require('electron');
const methods = new Set(['snapshot', 'provider.save', 'provider.delete', 'model.save', 'model.delete', 'model.default', 'credential.entry', 'credential.state', 'credential.delete', 'connection.test', 'binding.save', 'selection.save', 'preference.save', 'chat.send']);
contextBridge.exposeInMainWorld('agentnexus', Object.freeze({
  async invoke(method, payload = {}) {
    if (!methods.has(method)) return { ok: false, error: 'METHOD_DENIED' };
    try { return await ipcRenderer.invoke('agentnexus:desktop', method, payload); }
    catch { return { ok: false, error: 'IPC_UNAVAILABLE' }; }
  },
}));
