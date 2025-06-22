const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Recording controls
  startRecording: () => ipcRenderer.invoke('start-recording'),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  
  // Overlay controls
  toggleOverlay: () => ipcRenderer.invoke('toggle-overlay'),
  
  // Status and settings
  getStatus: () => ipcRenderer.invoke('get-status'),
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),
  clearContext: () => ipcRenderer.invoke('clear-context'),
  
  // Event listeners
  onTranscription: (callback) => ipcRenderer.on('transcription', callback),
  onChatGPTResponse: (callback) => ipcRenderer.on('chatgpt-response', callback),
  onRecordingStarted: (callback) => ipcRenderer.on('recording-started', callback),
  onRecordingStopped: (callback) => ipcRenderer.on('recording-stopped', callback),
  onError: (callback) => ipcRenderer.on('error', callback),
  onAudioError: (callback) => ipcRenderer.on('audio-error', callback),
  onChatGPTError: (callback) => ipcRenderer.on('chatgpt-error', callback),
  onContextCleared: (callback) => ipcRenderer.on('context-cleared', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});