const { EventEmitter } = require('events');
const recorder = require('node-record-lpcm16');
const speech = require('@google-cloud/speech');

class AudioProcessor extends EventEmitter {
  constructor() {
    super();
    this.isRecording = false;
    this.recordingStream = null;
    this.speechClient = new speech.SpeechClient();
    this.recognizeStream = null;
    this.silenceTimeout = null;
    this.lastTranscriptionTime = 0;
    this.transcriptionBuffer = '';
    
    // Audio settings
    this.settings = {
      sampleRateHertz: 16000,
      encoding: 'LINEAR16',
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: false,
      model: 'latest_long',
      useEnhanced: true,
      silenceThreshold: 2000, // ms
      minTranscriptionLength: 10
    };
  }

  async startRecording() {
    if (this.isRecording) {
      throw new Error('Already recording');
    }

    try {
      await this.initializeSpeechRecognition();
      this.startAudioCapture();
      this.isRecording = true;
      console.log('Audio recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording() {
    if (!this.isRecording) return;

    this.isRecording = false;
    
    if (this.recordingStream) {
      this.recordingStream.stop();
      this.recordingStream = null;
    }

    if (this.recognizeStream) {
      this.recognizeStream.end();
      this.recognizeStream = null;
    }

    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }

    console.log('Audio recording stopped');
  }

  async initializeSpeechRecognition() {
    const request = {
      config: {
        encoding: this.settings.encoding,
        sampleRateHertz: this.settings.sampleRateHertz,
        languageCode: this.settings.languageCode,
        enableAutomaticPunctuation: this.settings.enableAutomaticPunctuation,
        enableWordTimeOffsets: this.settings.enableWordTimeOffsets,
        model: this.settings.model,
        useEnhanced: this.settings.useEnhanced,
        alternativeLanguageCodes: ['en-GB', 'en-AU'], // Fallback languages
        profanityFilter: false,
        speechContexts: [{
          phrases: [
            'meeting', 'agenda', 'action item', 'follow up', 'deadline',
            'project', 'timeline', 'budget', 'stakeholder', 'deliverable'
          ],
          boost: 10
        }]
      },
      interimResults: true,
      enableVoiceActivityEvents: true
    };

    this.recognizeStream = this.speechClient
      .streamingRecognize(request)
      .on('error', (error) => {
        console.error('Speech recognition error:', error);
        this.emit('error', error);
        this.restartRecognition();
      })
      .on('data', (data) => {
        this.handleSpeechData(data);
      })
      .on('end', () => {
        console.log('Speech recognition stream ended');
        if (this.isRecording) {
          this.restartRecognition();
        }
      });
  }

  startAudioCapture() {
    this.recordingStream = recorder.record({
      sampleRateHertz: this.settings.sampleRateHertz,
      threshold: 0.5,
      verbose: false,
      recordProgram: 'rec', // Use SoX for better audio quality
      silence: '1.0',
      device: null // Use default device
    });

    this.recordingStream.stream()
      .on('error', (error) => {
        console.error('Audio capture error:', error);
        this.emit('error', error);
      })
      .pipe(this.recognizeStream);
  }

  handleSpeechData(data) {
    const now = Date.now();
    
    if (data.results[0] && data.results[0].alternatives[0]) {
      const transcript = data.results[0].alternatives[0].transcript;
      const isFinal = data.results[0].isFinal;
      const confidence = data.results[0].alternatives[0].confidence || 0;

      // Filter out low-confidence transcriptions
      if (confidence < 0.7 && isFinal) {
        return;
      }

      if (isFinal) {
        // Reset silence timeout
        if (this.silenceTimeout) {
          clearTimeout(this.silenceTimeout);
        }

        // Only emit if transcript is meaningful
        if (transcript.trim().length >= this.settings.minTranscriptionLength) {
          this.transcriptionBuffer += transcript + ' ';
          this.lastTranscriptionTime = now;
          
          // Set timeout to emit buffered transcription after silence
          this.silenceTimeout = setTimeout(() => {
            if (this.transcriptionBuffer.trim()) {
              this.emit('transcription', this.transcriptionBuffer.trim());
              this.transcriptionBuffer = '';
            }
          }, this.settings.silenceThreshold);
        }
      }
    }

    // Handle voice activity events
    if (data.speechEventType) {
      console.log('Speech event:', data.speechEventType);
    }
  }

  async restartRecognition() {
    if (!this.isRecording) return;

    console.log('Restarting speech recognition...');
    
    try {
      if (this.recognizeStream) {
        this.recognizeStream.removeAllListeners();
        this.recognizeStream.end();
      }
      
      // Wait a bit before restarting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (this.isRecording) {
        await this.initializeSpeechRecognition();
        
        if (this.recordingStream && this.recordingStream.stream()) {
          this.recordingStream.stream().pipe(this.recognizeStream);
        }
      }
    } catch (error) {
      console.error('Failed to restart recognition:', error);
      this.emit('error', error);
    }
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    
    // Restart recording with new settings if currently recording
    if (this.isRecording) {
      this.stopRecording().then(() => {
        this.startRecording();
      });
    }
  }

  cleanup() {
    this.stopRecording();
    this.removeAllListeners();
  }
}

module.exports = { AudioProcessor };