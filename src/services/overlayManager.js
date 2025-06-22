const { BrowserWindow, screen } = require('electron');
const path = require('path');

class OverlayManager {
  constructor() {
    this.overlayWindow = null;
    this.isVisible = false;
    this.settings = {
      width: 400,
      height: 300,
      opacity: 0.9,
      position: 'top-right',
      alwaysOnTop: true,
      skipTaskbar: true,
      autoHide: false,
      autoHideDelay: 10000 // 10 seconds
    };
    this.autoHideTimeout = null;
  }

  async createOverlay() {
    if (this.overlayWindow) {
      return;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    // Calculate position based on settings
    const position = this.calculatePosition(screenWidth, screenHeight);

    this.overlayWindow = new BrowserWindow({
      width: this.settings.width,
      height: this.settings.height,
      x: position.x,
      y: position.y,
      frame: false,
      transparent: true,
      alwaysOnTop: this.settings.alwaysOnTop,
      skipTaskbar: this.settings.skipTaskbar,
      resizable: false,
      movable: true,
      minimizable: false,
      maximizable: false,
      closable: false,
      focusable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../overlay-preload.js')
      },
      show: false,
      opacity: this.settings.opacity
    });

    // Load overlay HTML
    await this.overlayWindow.loadFile(path.join(__dirname, '../renderer/overlay.html'));

    // Prevent overlay from being captured in screen sharing
    this.overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.overlayWindow.setAlwaysOnTop(true, 'screen-saver');

    // Handle window events
    this.overlayWindow.on('closed', () => {
      this.overlayWindow = null;
      this.isVisible = false;
    });

    // Make window click-through when not focused
    this.overlayWindow.setIgnoreMouseEvents(true, { forward: true });

    console.log('Overlay window created');
  }

  calculatePosition(screenWidth, screenHeight) {
    const margin = 20;
    let x, y;

    switch (this.settings.position) {
      case 'top-left':
        x = margin;
        y = margin;
        break;
      case 'top-right':
        x = screenWidth - this.settings.width - margin;
        y = margin;
        break;
      case 'bottom-left':
        x = margin;
        y = screenHeight - this.settings.height - margin;
        break;
      case 'bottom-right':
        x = screenWidth - this.settings.width - margin;
        y = screenHeight - this.settings.height - margin;
        break;
      case 'center':
        x = (screenWidth - this.settings.width) / 2;
        y = (screenHeight - this.settings.height) / 2;
        break;
      default:
        x = screenWidth - this.settings.width - margin;
        y = margin;
    }

    return { x, y };
  }

  async showOverlay() {
    if (!this.overlayWindow) {
      await this.createOverlay();
    }

    this.overlayWindow.show();
    this.isVisible = true;

    // Set auto-hide timer if enabled
    if (this.settings.autoHide) {
      this.setAutoHideTimer();
    }
  }

  hideOverlay() {
    if (this.overlayWindow && this.isVisible) {
      this.overlayWindow.hide();
      this.isVisible = false;
      this.clearAutoHideTimer();
    }
  }

  async toggleOverlay() {
    if (this.isVisible) {
      this.hideOverlay();
    } else {
      await this.showOverlay();
    }
  }

  async displayResponse(response) {
    if (!this.overlayWindow) {
      await this.createOverlay();
    }

    // Send response to overlay renderer
    this.overlayWindow.webContents.send('display-response', {
      text: response,
      timestamp: Date.now()
    });

    // Show overlay if hidden
    if (!this.isVisible) {
      await this.showOverlay();
    }

    // Reset auto-hide timer
    if (this.settings.autoHide) {
      this.setAutoHideTimer();
    }
  }

  setAutoHideTimer() {
    this.clearAutoHideTimer();
    this.autoHideTimeout = setTimeout(() => {
      this.hideOverlay();
    }, this.settings.autoHideDelay);
  }

  clearAutoHideTimer() {
    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
      this.autoHideTimeout = null;
    }
  }

  updateSettings(newSettings) {
    const oldSettings = { ...this.settings };
    this.settings = { ...this.settings, ...newSettings };

    if (this.overlayWindow) {
      // Update opacity
      if (newSettings.opacity !== undefined) {
        this.overlayWindow.setOpacity(this.settings.opacity);
      }

      // Update size
      if (newSettings.width || newSettings.height) {
        this.overlayWindow.setSize(this.settings.width, this.settings.height);
      }

      // Update position
      if (newSettings.position && newSettings.position !== oldSettings.position) {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
        const position = this.calculatePosition(screenWidth, screenHeight);
        this.overlayWindow.setPosition(position.x, position.y);
      }

      // Update always on top
      if (newSettings.alwaysOnTop !== undefined) {
        this.overlayWindow.setAlwaysOnTop(this.settings.alwaysOnTop, 'screen-saver');
      }
    }

    // Update auto-hide timer if settings changed
    if (this.settings.autoHide && this.isVisible) {
      this.setAutoHideTimer();
    } else if (!this.settings.autoHide) {
      this.clearAutoHideTimer();
    }
  }

  isOverlayVisible() {
    return this.isVisible;
  }

  cleanup() {
    this.clearAutoHideTimer();
    
    if (this.overlayWindow) {
      this.overlayWindow.close();
      this.overlayWindow = null;
    }
  }
}

module.exports = { OverlayManager };