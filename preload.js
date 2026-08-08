const { contextBridge, ipcRenderer } = require('electron');

// Expose safe desktop APIs to renderer process (React UI)
contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  printPass: (content) => ipcRenderer.invoke('print-pass', content),
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});
