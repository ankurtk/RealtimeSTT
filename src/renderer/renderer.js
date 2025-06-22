class MeetingAssistantUI {
    constructor() {
        this.isRecording = false;
        this.overlayVisible = false;
        this.transcriptions = [];
        this.responses = [];
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupElectronListeners();
        this.updateStatus();
    }

    initializeElements() {
        // Control elements
        this.recordBtn = document.getElementById('recordBtn');
        this.overlayBtn = document.getElementById('overlayBtn');
        this.clearBtn = document.getElementById('clearBtn');
        
        // Status elements
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        this.contextLength = document.getElementById('contextLength');
        
        // Content elements
        this.transcriptionContent = document.getElementById('transcriptionContent');
        this.responseContent = document.getElementById('responseContent');
        
        // Settings elements
        this.languageSelect = document.getElementById('languageSelect');
        this.silenceThreshold = document.getElementById('silenceThreshold');
        this.silenceValue = document.getElementById('silenceValue');
        this.responseDelay = document.getElementById('responseDelay');
        this.delayValue = document.getElementById('delayValue');
        this.maxTokens = document.getElementById('maxTokens');
        this.tokensValue = document.getElementById('tokensValue');
        this.overlayPosition = document.getElementById('overlayPosition');
        this.overlayOpacity = document.getElementById('overlayOpacity');
        this.opacityValue = document.getElementById('opacityValue');
        this.autoHide = document.getElementById('autoHide');
        
        // Modal elements
        this.errorModal = document.getElementById('errorModal');
        this.errorMessage = document.getElementById('errorMessage');
        this.closeModal = document.querySelector('.close');
    }

    setupEventListeners() {
        // Control buttons
        this.recordBtn.addEventListener('click', () => this.toggleRecording());
        this.overlayBtn.addEventListener('click', () => this.toggleOverlay());
        this.clearBtn.addEventListener('click', () => this.clearContext());
        
        // Settings
        this.silenceThreshold.addEventListener('input', (e) => {
            this.silenceValue.textContent = e.target.value;
            this.updateSettings();
        });
        
        this.responseDelay.addEventListener('input', (e) => {
            this.delayValue.textContent = e.target.value;
            this.updateSettings();
        });
        
        this.maxTokens.addEventListener('input', (e) => {
            this.tokensValue.textContent = e.target.value;
            this.updateSettings();
        });
        
        this.overlayOpacity.addEventListener('input', (e) => {
            this.opacityValue.textContent = e.target.value;
            this.updateSettings();
        });
        
        this.languageSelect.addEventListener('change', () => this.updateSettings());
        this.overlayPosition.addEventListener('change', () => this.updateSettings());
        this.autoHide.addEventListener('change', () => this.updateSettings());
        
        // Modal
        this.closeModal.addEventListener('click', () => this.hideError());
        window.addEventListener('click', (e) => {
            if (e.target === this.errorModal) {
                this.hideError();
            }
        });
    }

    setupElectronListeners() {
        // Transcription events
        window.electronAPI.onTranscription((event, text) => {
            this.addTranscription(text);
        });
        
        // ChatGPT response events
        window.electronAPI.onChatGPTResponse((event, response) => {
            this.addResponse(response);
        });
        
        // Recording events
        window.electronAPI.onRecordingStarted(() => {
            this.isRecording = true;
            this.updateRecordingUI();
            this.updateStatus('recording', 'Recording...');
        });
        
        window.electronAPI.onRecordingStopped(() => {
            this.isRecording = false;
            this.updateRecordingUI();
            this.updateStatus('ready', 'Ready');
        });
        
        // Error events
        window.electronAPI.onError((event, error) => {
            this.showError('General Error', error);
        });
        
        window.electronAPI.onAudioError((event, error) => {
            this.showError('Audio Error', error);
        });
        
        window.electronAPI.onChatGPTError((event, error) => {
            this.showError('ChatGPT Error', error);
        });
        
        // Context events
        window.electronAPI.onContextCleared(() => {
            this.clearUI();
        });
    }

    async toggleRecording() {
        try {
            if (this.isRecording) {
                await window.electronAPI.stopRecording();
            } else {
                await window.electronAPI.startRecording();
            }
        } catch (error) {
            this.showError('Recording Error', error.message);
        }
    }

    async toggleOverlay() {
        try {
            await window.electronAPI.toggleOverlay();
            this.overlayVisible = !this.overlayVisible;
            this.updateOverlayUI();
        } catch (error) {
            this.showError('Overlay Error', error.message);
        }
    }

    async clearContext() {
        try {
            await window.electronAPI.clearContext();
        } catch (error) {
            this.showError('Clear Context Error', error.message);
        }
    }

    updateRecordingUI() {
        if (this.isRecording) {
            this.recordBtn.innerHTML = '<span class="btn-icon">⏹️</span>Stop Recording';
            this.recordBtn.classList.remove('btn-primary');
            this.recordBtn.classList.add('btn-danger');
        } else {
            this.recordBtn.innerHTML = '<span class="btn-icon">🎤</span>Start Recording';
            this.recordBtn.classList.remove('btn-danger');
            this.recordBtn.classList.add('btn-primary');
        }
    }

    updateOverlayUI() {
        if (this.overlayVisible) {
            this.overlayBtn.innerHTML = '<span class="btn-icon">👁️</span>Hide Overlay';
        } else {
            this.overlayBtn.innerHTML = '<span class="btn-icon">👁️</span>Show Overlay';
        }
    }

    updateStatus(type = 'ready', text = 'Ready') {
        this.statusDot.className = `status-dot ${type}`;
        this.statusText.textContent = text;
    }

    addTranscription(text) {
        const timestamp = new Date().toLocaleTimeString();
        this.transcriptions.push({ text, timestamp });
        
        // Limit stored transcriptions
        if (this.transcriptions.length > 50) {
            this.transcriptions = this.transcriptions.slice(-40);
        }
        
        this.updateTranscriptionDisplay();
        this.updateContextLength();
    }

    addResponse(response) {
        const timestamp = new Date().toLocaleTimeString();
        this.responses.push({ text: response, timestamp });
        
        // Limit stored responses
        if (this.responses.length > 50) {
            this.responses = this.responses.slice(-40);
        }
        
        this.updateResponseDisplay();
        this.updateContextLength();
    }

    updateTranscriptionDisplay() {
        if (this.transcriptions.length === 0) {
            this.transcriptionContent.innerHTML = '<p class="placeholder">Transcribed speech will appear here...</p>';
            return;
        }
        
        const html = this.transcriptions.map(item => `
            <div class="transcription-item">
                <div class="item-timestamp">${item.timestamp}</div>
                <div>${this.escapeHtml(item.text)}</div>
            </div>
        `).join('');
        
        this.transcriptionContent.innerHTML = html;
        this.transcriptionContent.scrollTop = this.transcriptionContent.scrollHeight;
    }

    updateResponseDisplay() {
        if (this.responses.length === 0) {
            this.responseContent.innerHTML = '<p class="placeholder">AI responses and insights will appear here...</p>';
            return;
        }
        
        const html = this.responses.map(item => `
            <div class="response-item">
                <div class="item-timestamp">${item.timestamp}</div>
                <div>${this.escapeHtml(item.text)}</div>
            </div>
        `).join('');
        
        this.responseContent.innerHTML = html;
        this.responseContent.scrollTop = this.responseContent.scrollHeight;
    }

    updateContextLength() {
        const total = this.transcriptions.length + this.responses.length;
        this.contextLength.textContent = total;
    }

    clearUI() {
        this.transcriptions = [];
        this.responses = [];
        this.updateTranscriptionDisplay();
        this.updateResponseDisplay();
        this.updateContextLength();
    }

    async updateSettings() {
        const settings = {
            audio: {
                languageCode: this.languageSelect.value,
                silenceThreshold: parseInt(this.silenceThreshold.value)
            },
            chatgpt: {
                responseDelay: parseInt(this.responseDelay.value),
                maxTokens: parseInt(this.maxTokens.value)
            },
            overlay: {
                position: this.overlayPosition.value,
                opacity: parseFloat(this.overlayOpacity.value),
                autoHide: this.autoHide.checked
            }
        };
        
        try {
            await window.electronAPI.updateSettings(settings);
        } catch (error) {
            this.showError('Settings Error', error.message);
        }
    }

    showError(title, message) {
        this.errorMessage.innerHTML = `<strong>${title}:</strong> ${this.escapeHtml(message)}`;
        this.errorModal.style.display = 'block';
    }

    hideError() {
        this.errorModal.style.display = 'none';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async initialize() {
        try {
            const status = await window.electronAPI.getStatus();
            this.isRecording = status.isRecording;
            this.overlayVisible = status.overlayVisible;
            
            this.updateRecordingUI();
            this.updateOverlayUI();
            this.updateContextLength();
            
            if (this.isRecording) {
                this.updateStatus('recording', 'Recording...');
            }
        } catch (error) {
            this.showError('Initialization Error', error.message);
        }
    }
}

// Initialize the UI when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const ui = new MeetingAssistantUI();
    ui.initialize();
});