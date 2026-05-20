const { contextBridge, ipcRenderer } = require('electron');

// Sichere API-Brücke zwischen Electron und der Web-App
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isDesktop: true,
  
  // Update-Funktionen
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  applyUpdate: () => ipcRenderer.invoke('apply-update'),
  getVersion:  () => ipcRenderer.invoke('get-version'),
  
  // Update-Events empfangen
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (event, data) => callback(data));
  }
});
