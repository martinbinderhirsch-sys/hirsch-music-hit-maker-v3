const { contextBridge, ipcRenderer } = require('electron');

// Sichere IPC-Brücke (v3.27.5)
// getApiKey() entfernt — Renderer erhält keine Keys mehr.
// aiRequest() sendet Prompts; Main-Prozess führt fetch aus und gibt nur Text zurück.
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isDesktop: true,

  // Update-Funktionen
  getVersion:  () => ipcRenderer.invoke('get-version'),
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  applyUpdate: () => ipcRenderer.invoke('apply-update'),

  // Update-Events empfangen
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (_event, data) => callback(data));
  },

  // AI-Requests über Main-Prozess (kein Key im Renderer)
  aiRequest: (payload) => ipcRenderer.invoke('ai-request', payload),
});
