# ServoSkull

A desktop companion application that combines computer vision, speech recognition, and AI to create an interactive assistant with a Warhammer 40k personality.

## Overview

ServoSkull observes the user through their webcam and microphone, processing the input to provide context-aware, sarcastic responses in the style of a 40k servo-skull.

### Core Features

- Webcam frame capture and analysis
- Voice activity detection and processing
- AI-powered responses with character
- Text-to-speech output

## Architecture

### Component Flow

```mermaid
sequenceDiagram
    participant User
    participant WebcamComponent
    participant AudioComponent
    participant StateService
    participant ApiClient
    participant ApiService
    participant OpenAI
    participant ImageAnalysis

    User->>WebcamComponent: Activates Camera
    WebcamComponent->>StateService: Update Camera State
    
    par Camera Stream
        WebcamComponent->>WebcamComponent: Stream Video
        WebcamComponent->>WebcamComponent: Capture Frame
    and Audio Stream
        AudioComponent->>AudioComponent: Monitor Audio
        AudioComponent->>AudioComponent: VAD Detection
        AudioComponent->>AudioComponent: Record Speech
    end

    WebcamComponent->>StateService: Frame Captured
    AudioComponent->>StateService: Audio Recorded
    StateService->>ApiClient: Submit Input
    
    ApiClient->>ApiService: POST /api/input
    
    par Backend Processing
        ApiService->>OpenAI: Transcribe Audio
        ApiService->>ImageAnalysis: Analyze Frame
    end
    
    OpenAI-->>ApiService: Speech Text
    ImageAnalysis-->>ApiService: Scene Analysis
    
    ApiService->>OpenAI: Generate Response
    OpenAI-->>ApiService: Response Text + Audio
    
    ApiService-->>ApiClient: Response Data
    ApiClient-->>StateService: Update State
    StateService-->>WebcamComponent: Update UI
    StateService-->>AudioComponent: Play Response
    WebcamComponent->>User: Display Response
    AudioComponent->>User: Play Audio

```

### Component Structure

```mermaid
graph TD
    A[App Module] --> B[Core Module]
    A --> C[Features Module]
    A --> D[Shared Module]
    
    B --> BA[State Service]
    B --> BB[API Client]
    B --> BC[Auth Service]
    
    C --> CA[Webcam Feature]
    C --> CB[Audio Feature]
    C --> CC[Chat Feature]
    
    CA --> CAA[Webcam Component]
    CA --> CAB[Frame Service]
    
    CB --> CBA[Audio Component]
    CB --> CBB[VAD Service]
    
    CC --> CCA[Chat Component]
    CC --> CCB[Response Service]
    
    D --> DA[UI Components]
    D --> DB[Pipes]
    D --> DC[Directives]
```

### Service Responsibilities

#### Frontend Services

- **StateService**: Manages application state using RxJS
  - Camera status
  - Audio status
  - Processing states
  - Response history

- **ApiClient**: Handles API communication
  - Request/response interceptors
  - Error handling
  - File uploads
  - Response streaming

- **FrameService**: Manages webcam operations
  - Stream initialization
  - Frame capture
  - Quality settings
  - Error handling

- **VADService**: Handles voice activity
  - Audio stream management
  - Speech detection
  - Recording control
  - Buffer management

#### Backend Services

- **InputController**: Handles input processing
  - File validation
  - Request routing
  - Response formatting

- **AudioService**: Manages audio processing
  - OpenAI Whisper integration
  - Audio format conversion
  - Speech-to-text processing

- **VisionService**: Handles image analysis
  - Frame processing
  - Object detection
  - Scene analysis

- **ResponseService**: Generates responses
  - Context analysis
  - Response generation
  - Text-to-speech conversion

## Project Structure

```text
/
├── .cursor/                  # Development rules and settings
│   └── rules/               # Project-specific rules
├── assets/                  # Shared assets
│   ├── audio/              # Audio resources
│   └── images/             # Image resources
├── ServoSkull.AppHost/      # .NET Aspire Host
│   └── Program.cs          # Service orchestration
├── ServoSkull.ServiceDefaults/ # Shared service configurations
├── ServoSkull.ApiService/   # .NET Backend
│   ├── Controllers/         # API endpoints
│   ├── Services/           # Business logic
│   └── Models/             # Data models
├── ServoSkull.Angular/      # Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/      # Core services
│   │   │   ├── shared/    # Shared components
│   │   │   └── features/  # Feature modules
│   │   ├── assets/        # Angular-specific assets
│   │   └── environments/  # Environment configurations
│   └── .cursor/rules/     # Angular-specific rules
└── docs/                  # Documentation
```

## Development

### Prerequisites

- .NET 9.0 SDK
- Node.js 22+ and npm
- Angular CLI 19+
- Visual Studio 2022 or VS Code
- Docker Desktop (for Aspire containers)

### Quick Start

1. Clone and setup:

   ```bash
   git clone https://github.com/mgpeter/desktop-companion.git
   cd desktop-companion
   ```

2. Start the Aspire host (this will start all backend services):

   ```bash
   cd ServoSkull.AppHost
   dotnet run
   ```

## Communication Protocol

### Overview
The application uses a hybrid communication approach:
- REST endpoints for initiating interactions and sending data
- Server-Sent Events (SSE) for real-time status updates and streaming responses
- WebSocket for continuous audio streaming (future enhancement)

### Flow Sequence
1. Frontend detects voice activity and starts recording
2. On speech completion (silence detection):
   - Captures latest video frame(s)
   - Packages audio and frames
   - Initiates interaction with backend
3. Backend processes input and streams updates
4. Frontend receives and plays response

## API Endpoints

### Interaction Endpoints

#### POST /api/interaction/start
Initiates a new interaction session.
```json
{
  "sessionId": "uuid",
  "timestamp": "2024-03-28T14:37:00Z",
  "settings": {
    "responseStyle": "sarcastic|helpful|angry",
    "audioQuality": "high|medium|low"
  }
}
```
Response:
```json
{
  "sessionId": "uuid",
  "eventStreamUrl": "/api/interaction/events/{sessionId}",
  "status": "ready"
}
```

#### POST /api/interaction/{sessionId}/input
Sends user input for processing.
```json
{
  "audio": {
    "format": "webm|wav",
    "data": "<base64>",
    "duration": 2.5
  },
  "frames": [
    {
      "timestamp": "2024-03-28T14:37:00Z",
      "data": "<base64>",
      "format": "jpeg",
      "quality": 0.8
    }
  ],
  "metadata": {
    "deviceInfo": {
      "camera": "Built-in Webcam",
      "microphone": "Built-in Mic"
    }
  }
}
```

#### GET /api/interaction/events/{sessionId}
SSE endpoint for receiving real-time updates.

Event Types:
```typescript
interface ProcessingUpdate {
  type: 'processing';
  stage: 'audio-transcription' | 'image-analysis' | 'response-generation' | 'speech-synthesis';
  progress: number;
  message: string;
}

interface TranscriptionComplete {
  type: 'transcription';
  text: string;
  confidence: number;
}

interface ResponseReady {
  type: 'response';
  text: string;
  audioUrl: string;
  emotions: {
    tone: string;
    confidence: number;
  };
}

interface ErrorEvent {
  type: 'error';
  code: string;
  message: string;
  recoverable: boolean;
}
```

Example SSE Stream:
```
event: processing
data: {"stage": "audio-transcription", "progress": 0.3, "message": "Transcribing audio..."}

event: transcription
data: {"text": "What's the status of the project?", "confidence": 0.95}

event: processing
data: {"stage": "response-generation", "progress": 0.6, "message": "Generating response..."}

event: response
data: {"text": "By the Omnissiah's grace, your project appears to be...", "audioUrl": "/api/audio/response/123"}
```

#### GET /api/audio/response/{id}
Retrieves generated audio response as a streaming audio file.
- Content-Type: audio/mpeg
- Transfer-Encoding: chunked

### Error Handling

All endpoints follow a consistent error response format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {
      "field": "specific_field",
      "reason": "validation_failed"
    }
  }
}
```

Common Error Codes:
- `INVALID_INPUT`: Malformed request data
- `PROCESSING_FAILED`: Backend processing error
- `SERVICE_UNAVAILABLE`: External service unavailable
- `SESSION_EXPIRED`: Interaction session timeout
- `RATE_LIMITED`: Too many requests

### Performance Considerations

1. **Audio Processing**
   - Maximum audio duration: 30 seconds
   - Supported formats: WebM, WAV
   - Recommended sample rate: 16kHz

2. **Image Processing**
   - Maximum frame size: 1920x1080
   - Recommended format: JPEG
   - Quality range: 0.7-0.9
   - Maximum frames per input: 3

3. **Response Times**
   - Audio transcription: 1-3 seconds
   - Response generation: 2-5 seconds
   - Speech synthesis: 1-2 seconds

4. **Rate Limiting**
   - Maximum 30 interactions per minute
   - Maximum 100 frames per minute
   - Maximum 5 concurrent sessions per user

## Contributing

1. Follow the development rules in `.cursor/rules/`
2. Ensure tests pass
3. Submit PRs with clear descriptions

## License

MIT License - see [LICENSE](LICENSE) file for details.
