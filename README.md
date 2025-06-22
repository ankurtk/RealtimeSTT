# Meeting Assistant

A real-time meeting assistance application built with Electron that provides speech-to-text transcription and AI-powered insights while maintaining privacy through a screen-sharing-proof overlay.

## Features

### 🎤 Real-time Speech-to-Text
- Continuous audio monitoring with noise filtering
- High-accuracy transcription using Google Cloud Speech-to-Text
- Support for multiple languages
- Automatic punctuation and formatting

### 🤖 AI-Powered Insights
- ChatGPT integration for contextual responses
- Action item identification
- Meeting summary generation
- Intelligent question suggestions
- Rate limiting and error handling

### 👁️ Screen-Sharing-Proof Overlay
- Floating window that bypasses screen capture
- Customizable position and opacity
- Auto-hide functionality
- Emergency hide shortcut
- Always-on-top behavior

### ⚡ Performance Optimized
- Low CPU and memory usage
- Efficient audio processing
- Concurrent operation handling
- Smart context management

## Installation

### Prerequisites
- Node.js 16 or higher
- npm or yarn
- OpenAI API key
- Google Cloud Speech-to-Text credentials (optional but recommended)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd meeting-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Set up Google Cloud Speech-to-Text (recommended)**
   - Create a Google Cloud project
   - Enable the Speech-to-Text API
   - Create a service account and download the JSON key
   - Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable

5. **Build and run**
   ```bash
   # Development mode
   npm run dev
   
   # Production build
   npm run build
   ```

## Usage

### Getting Started

1. **Launch the application**
   - The app will start minimized to the system tray
   - Click the tray icon to show the main window

2. **Start recording**
   - Click "Start Recording" or use `Ctrl+Shift+R`
   - Grant microphone permissions when prompted

3. **View AI insights**
   - Toggle the overlay with `Ctrl+Shift+O`
   - AI responses will appear in both the main window and overlay

### Keyboard Shortcuts

- `Ctrl+Shift+R` - Toggle recording
- `Ctrl+Shift+O` - Toggle overlay visibility
- `Ctrl+Shift+H` - Emergency hide overlay

### Settings

#### Audio Settings
- **Language**: Select transcription language
- **Silence Threshold**: Adjust sensitivity for speech detection

#### AI Response Settings
- **Response Delay**: Time to wait before generating AI response
- **Max Response Length**: Limit AI response token count

#### Overlay Settings
- **Position**: Choose overlay screen position
- **Opacity**: Adjust overlay transparency
- **Auto-hide**: Automatically hide overlay after inactivity

## Security Features

### Privacy Protection
- All audio processing happens locally when possible
- Minimal data sent to external APIs
- No persistent storage of sensitive data
- Encrypted API communications

### Screen Sharing Protection
- Overlay window uses special flags to avoid screen capture
- Multiple fallback methods for different operating systems
- Emergency hide functionality for instant privacy

### Data Handling
- Conversation context automatically limited
- Automatic cleanup of old transcriptions
- No logging of sensitive information in production

## Architecture

### Main Process (`src/main.js`)
- Application lifecycle management
- Window creation and management
- Global shortcuts and system tray
- IPC communication coordination

### Services
- **AudioProcessor** (`src/services/audioProcessor.js`)
  - Real-time audio capture and processing
  - Speech-to-text conversion
  - Noise filtering and voice activity detection

- **ChatGPTService** (`src/services/chatgptService.js`)
  - OpenAI API integration
  - Context management
  - Response generation and filtering

- **OverlayManager** (`src/services/overlayManager.js`)
  - Screen-sharing-proof overlay window
  - Position and visibility management
  - Auto-hide functionality

### Renderer Process
- Main UI (`src/renderer/`)
- Overlay UI (`src/renderer/overlay.html`)
- Settings management
- Real-time display updates

## Development

### Project Structure
```
src/
├── main.js                 # Main Electron process
├── preload.js             # Main window preload script
├── overlay-preload.js     # Overlay preload script
├── services/              # Core services
│   ├── audioProcessor.js  # Audio processing
│   ├── chatgptService.js  # ChatGPT integration
│   └── overlayManager.js  # Overlay management
└── renderer/              # UI components
    ├── index.html         # Main window
    ├── overlay.html       # Overlay window
    ├── styles.css         # Styles
    └── renderer.js        # UI logic
```

### Building

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

### Testing

```bash
# Run in development mode
npm run dev

# Test with different audio sources
# Test overlay visibility in screen sharing
# Test keyboard shortcuts
```

## Troubleshooting

### Common Issues

1. **Microphone not working**
   - Check system permissions
   - Verify audio device selection
   - Restart the application

2. **Overlay not hiding from screen share**
   - Try different overlay positions
   - Use emergency hide shortcut
   - Check OS-specific screen sharing settings

3. **AI responses not appearing**
   - Verify OpenAI API key
   - Check internet connection
   - Review rate limiting settings

4. **High CPU usage**
   - Adjust audio processing settings
   - Reduce transcription frequency
   - Close unnecessary applications

### Performance Optimization

- Use smaller AI models for faster responses
- Adjust silence threshold for your environment
- Limit conversation context length
- Enable auto-hide for overlay

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Disclaimer

This application is designed for legitimate meeting assistance purposes. Users are responsible for:
- Obtaining proper consent for recording
- Complying with local privacy laws
- Using the application ethically and legally
- Protecting sensitive information

The developers are not responsible for misuse of this software.