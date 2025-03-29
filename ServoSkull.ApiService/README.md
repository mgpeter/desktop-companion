# ServoSkull.ApiService Implementation

## Architecture Overview

ServoSkull is built using a clean architecture approach with the following projects:

1. **ServoSkull.Core**
   - Contains domain models, interfaces, and business logic
   - Defines contracts for AI services and data processing
   - Platform and framework independent

2. **ServoSkull.Infrastructure**
   - Implements core interfaces
   - Handles external service integration (OpenAI, etc.)
   - Manages data persistence and caching

3. **ServoSkull.ApiService**
   - Hosts SignalR hub for real-time communication
   - Manages client connections and message routing
   - Handles video/audio streaming

4. **ServoSkull.ServiceDefaults**
   - Contains shared service configuration
   - Defines logging and monitoring setup
   - Manages cross-cutting concerns

## Real-Time Communication

We use SignalR for bi-directional real-time communication between the Angular client and .NET backend. This enables:

- Real-time video frame processing
- Audio streaming for speech recognition
- Instant chat responses
- Connection state management

### Core Components

```csharp
// Core/Abstractions/IAiService.cs
public interface IAiService
{
    Task<string> ProcessMessageAsync(string message);
    Task<string?> ProcessVideoFrameAsync(byte[] frameData);
    Task<string?> ProcessAudioAsync(byte[] audioData);
}

// Core/Models/ErrorResponse.cs
public class ErrorResponse
{
    public required string Code { get; init; }
    public required string Message { get; init; }
    public string? Details { get; init; }
}

// ApiService/Hubs/InteractionHub.cs
public class InteractionHub : Hub
{
    private readonly IAiService _aiService;

    public InteractionHub(IAiService aiService) => _aiService = aiService;

    public async Task SendMessage(string message)
    {
        var response = await _aiService.ProcessMessageAsync(message);
        await Clients.Caller.SendAsync("ReceiveResponse", response);
    }

    public async Task ProcessVideoFrame(byte[] frameData)
    {
        var response = await _aiService.ProcessVideoFrameAsync(frameData);
        if (response != null)
        {
            await Clients.Caller.SendAsync("ReceiveResponse", response);
        }
    }
}
```

### Key Features

1. **Clean Architecture**
   - Clear separation of concerns
   - Dependency inversion
   - Testable components
   - Modular design

2. **Efficient Communication**
   - Binary data support for video/audio
   - Bi-directional messaging
   - Automatic reconnection
   - Error handling

3. **Easy Scaling**
   - Built-in Azure support
   - Simple local development
   - Containerized deployment

### Getting Started

1. **Install Required Packages**
   ```bash
   dotnet restore
   ```

2. **Configure Services**
   ```csharp
   // Program.cs
   builder.AddServiceDefaults();
   builder.Services.AddSignalR();
   builder.Services.AddInfrastructureServices();
   
   app.MapHub<InteractionHub>("/interactionHub");
   ```

3. **Run the Application**
   ```bash
   dotnet run
   ```

### Next Steps

1. Implement OpenAI integration in Infrastructure:
   - Chat completion API
   - Vision API for video frames
   - Whisper API for audio

2. Add authentication/authorization:
   - JWT authentication
   - Role-based authorization
   - Connection validation

3. Implement monitoring:
   - OpenTelemetry integration
   - Performance metrics
   - Error tracking

4. Add automated tests:
   - Unit tests for core logic
   - Integration tests for SignalR
   - Load tests for streaming
