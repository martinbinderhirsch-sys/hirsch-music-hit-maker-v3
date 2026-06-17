const { contextBridge, ipcRenderer } = require('electron');

// Sichere IPC-Brücke (v3.27.6)
// Renderer kennt keine API-Keys im Klartext.
// - aiRequest: Prompts senden, Main-Prozess fetcht (OpenAI/Gemini/OpenRouter)
// - setTopMediaiKey: User-Key einmalig an Main-Prozess übergeben (bleibt dort)
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

  // TopMediai: User-Key einmalig an Main-Prozess senden
  // Key verlässt main.js danach nicht mehr — Proxy nutzt _runtimeTmKey direkt
  setTopMediaiKey: (key) => ipcRenderer.invoke('set-topmediai-key', key),
});
