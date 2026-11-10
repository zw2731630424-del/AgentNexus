const { contextBridge, ipcRenderer } = require('electron');
const methods = new Set(['security.snapshot', 'security.export', 'security.preview', 'security.import', 'security.reset', 'security.commit', 'credential.save', 'snapshot', 'provider.save', 'provider.delete', 'model.save', 'model.delete', 'model.default', 'credential.entry', 'credential.state', 'credential.delete', 'connection.test', 'binding.save', 'selection.save', 'preference.save', 'chat.send']);
contextBridge.exposeInMainWorld('agentnexus', Object.freeze({
  onDelta(callback) {
    if (typeof callback !== 'function') return;
    const listener = (_event, value) => {
      if (value && typeof value.agent_id === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(value.agent_id) && typeof value.text === 'string' && value.text.length <= 32768) callback({ agent_id: value.agent_id, text: value.text });
    };
    ipcRenderer.on('agentnexus:delta', listener);
    return () => ipcRenderer.removeListener('agentnexus:delta', listener);
  },
  async invoke(method, payload = {}) {
    if (!methods.has(method)) return { ok: false, error: 'METHOD_DENIED' };
    try { return await ipcRenderer.invoke('agentnexus:desktop', method, payload); }
    catch { return { ok: false, error: 'IPC_UNAVAILABLE' }; }
  },
}));
