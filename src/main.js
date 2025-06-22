const { app, BrowserWindow, ipcMain, screen, globalShortcut, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const { AudioProcessor } = require('./services/audioProcessor');
const { ChatGPTService } = require('./services/chatgptService');
const { OverlayManager } = require('./services/overlayManager');

class MeetingAssistant {
  constructor() {
    this.mainWindow = null;
    this.overlayWindow = null;
    this.tray = null;
    this.audioProcessor = null;
    this.chatGPTService = null;
    this.overlayManager = null;
    this.isRecording = false;
    this.conversationContext = [];
  }

  async initialize() {
    await this.createMainWindow();
    this.createTray();
    this.setupGlobalShortcuts();
    this.setupIPC();
    
    // Initialize services
    this.audioProcessor = new AudioProcessor();
    this.chatGPTService = new ChatGPTService();
    this.overlayManager = new OverlayManager();
    
    // Setup event listeners
    this.setupEventListeners();
  }

  async createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, '../assets/icon.png'),
      show: false
    });

    await this.mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
    
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.mainWindow.on('minimize', (event) => {
      event.preventDefault();
      this.mainWindow.hide();
    });
  }

  createTray() {
    const icon = nativeImage.createFromPath(path.join(__dirname, '../assets/tray-icon.png'));
    this.tray = new Tray(icon.resize({ width: 16, height: 16 }));
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show/Hide Main Window',
        click: () => {
          if (this.mainWindow.isVisible()) {
            this.mainWindow.hide();
          } else {
            this.mainWindow.show();
          }
        }
      },
      {
        label: 'Toggle Recording',
        click: () => this.toggleRecording()
      },
      {
        label: 'Toggle Overlay',
        click: () => this.toggleOverlay()
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        }
      }
    ]);
    
    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip('Meeting Assistant');
  }

  setupGlobalShortcuts() {
    // Toggle recording with Ctrl+Shift+R
    globalShortcut.register('CommandOrControl+Shift+R', () => {
      this.toggleRecording();
    });

    // Toggle overlay with Ctrl+Shift+O
    globalShortcut.register('CommandOrControl+Shift+O', () => {
      this.toggleOverlay();
    });

    // Emergency hide overlay with Ctrl+Shift+H
    globalShortcut.register('CommandOrControl+Shift+H', () => {
      this.overlayManager.hideOverlay();
    });
  }

  setupIPC() {
    ipcMain.handle('start-recording', () => this.startRecording());
    ipcMain.handle('stop-recording', () => this.stopRecording());
    ipcMain.handle('toggle-overlay', () => this.toggleOverlay());
    ipcMain.handle('get-status', () => this.getStatus());
    ipcMain.handle('update-settings', (event, settings) => this.updateSettings(settings));
    ipcMain.handle('clear-context', () => this.clearContext());
  }

  setupEventListeners() {
    // Audio transcription events
    this.audioProcessor.on('transcription', (text) => {
      this.handleTranscription(text);
    });

    this.audioProcessor.on('error', (error) => {
      console.error('Audio processing error:', error);
      this.sendToRenderer('audio-error', error.message);
    });

    // ChatGPT response events
    this.chatGPTService.on('response', (response) => {
      this.handleChatGPTResponse(response);
    });

    this.chatGPTService.on('error', (error) => {
      console.error('ChatGPT error:', error);
      this.sendToRenderer('chatgpt-error', error.message);
    });
  }

  async startRecording() {
    if (this.isRecording) return;
    
    try {
      await this.audioProcessor.startRecording();
      this.isRecording = true;
      this.sendToRenderer('recording-started');
      this.updateTrayIcon('recording');
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.sendToRenderer('error', 'Failed to start recording: ' + error.message);
    }
  }

  async stopRecording() {
    if (!this.isRecording) return;
    
    try {
      await this.audioProcessor.stopRecording();
      this.isRecording = false;
      this.sendToRenderer('recording-stopped');
      this.updateTrayIcon('idle');
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }

  toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  toggleOverlay() {
    this.overlayManager.toggleOverlay();
  }

  async handleTranscription(text) {
    console.log('Transcription received:', text);
    
    // Send to renderer for display
    this.sendToRenderer('transcription', text);
    
    // Add to conversation context
    this.conversationContext.push({
      role: 'user',
      content: text,
      timestamp: Date.now()
    });

    // Limit context size to prevent token overflow
    if (this.conversationContext.length > 20) {
      this.conversationContext = this.conversationContext.slice(-15);
    }

    // Process with ChatGPT
    try {
      await this.chatGPTService.processTranscription(text, this.conversationContext);
    } catch (error) {
      console.error('Failed to process transcription with ChatGPT:', error);
    }
  }

  handleChatGPTResponse(response) {
    console.log('ChatGPT response:', response);
    
    // Add to conversation context
    this.conversationContext.push({
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    });

    // Send to renderer
    this.sendToRenderer('chatgpt-response', response);
    
    // Display in overlay
    this.overlayManager.displayResponse(response);
  }

  sendToRenderer(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  getStatus() {
    return {
      isRecording: this.isRecording,
      overlayVisible: this.overlayManager.isVisible(),
      contextLength: this.conversationContext.length
    };
  }

  updateSettings(settings) {
    // Update audio processor settings
    if (settings.audio) {
      this.audioProcessor.updateSettings(settings.audio);
    }

    // Update ChatGPT settings
    if (settings.chatgpt) {
      this.chatGPTService.updateSettings(settings.chatgpt);
    }

    // Update overlay settings
    if (settings.overlay) {
      this.overlayManager.updateSettings(settings.overlay);
    }
  }

  clearContext() {
    this.conversationContext = [];
    this.sendToRenderer('context-cleared');
  }

  updateTrayIcon(status) {
    let iconPath;
    switch (status) {
      case 'recording':
        iconPath = path.join(__dirname, '../assets/tray-icon-recording.png');
        break;
      case 'processing':
        iconPath = path.join(__dirname, '../assets/tray-icon-processing.png');
        break;
      default:
        iconPath = path.join(__dirname, '../assets/tray-icon.png');
    }
    
    const icon = nativeImage.createFromPath(iconPath);
    this.tray.setImage(icon.resize({ width: 16, height: 16 }));
  }

  cleanup() {
    if (this.audioProcessor) {
      this.audioProcessor.cleanup();
    }
    
    if (this.overlayManager) {
      this.overlayManager.cleanup();
    }
    
    globalShortcut.unregisterAll();
  }
}

// App event handlers
app.whenReady().then(async () => {
  const meetingAssistant = new MeetingAssistant();
  await meetingAssistant.initialize();
  
  app.on('before-quit', () => {
    meetingAssistant.cleanup();
  });
});

app.on('window-all-closed', () => {
  // Keep app running in background
});

app.on('activate', () => {
  // Re-create window on macOS when dock icon is clicked
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});