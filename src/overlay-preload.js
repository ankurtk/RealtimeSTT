const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayAPI', {
  onDisplayResponse: (callback) => ipcRenderer.on('display-response', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});