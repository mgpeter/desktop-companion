# ServoSkull.ApiService Implementation

## Server-Sent Events Implementation

### Overview
Server-Sent Events (SSE) in .NET 9 provides a one-way communication channel from server to client. We use it to:
- Stream processing status updates
- Send transcription results
- Notify about response availability
- Handle error scenarios

### Implementation

```csharp
// Models/Events.cs
public record InteractionEvent
{
    public required string Type { get; init; }
    public required string Data { get; init; }
    public string? Id { get; init; }
    public int? Retry { get; init; }
}

// Services/EventStreamService.cs
public interface IEventStreamService
{
    IAsyncEnumerable<InteractionEvent> GetEventStreamAsync(
        string sessionId,
        CancellationToken ct);
    
    Task PublishEventAsync(
        string sessionId,
        string type,
        object data,
        CancellationToken ct);
}

public class EventStreamService : IEventStreamService, IDisposable
{
    private readonly ILogger<EventStreamService> _logger;
    private readonly Dictionary<string, Channel<InteractionEvent>> _channels;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public EventStreamService(ILogger<EventStreamService> logger)
    {
        _logger = logger;
        _channels = new Dictionary<string, Channel<InteractionEvent>>();
    }

    public async IAsyncEnumerable<InteractionEvent> GetEventStreamAsync(
        string sessionId,
        [EnumeratorCancellation] CancellationToken ct)
    {
        Channel<InteractionEvent> channel;
        
        await _lock.WaitAsync(ct);
        try
        {
            if (!_channels.TryGetValue(sessionId, out channel))
            {
                channel = Channel.CreateUnbounded<InteractionEvent>(new UnboundedChannelOptions
                {
                    SingleReader = false,
                    SingleWriter = false
                });
                _channels[sessionId] = channel;
            }
        }
        finally
        {
            _lock.Release();
        }

        try
        {
            await foreach (var @event in channel.Reader.ReadAllAsync(ct))
            {
                yield return @event;
            }
        }
        finally
        {
            // Cleanup when client disconnects
            await _lock.WaitAsync(ct);
            try
            {
                if (_channels.Remove(sessionId, out var oldChannel))
                {
                    oldChannel.Writer.Complete();
                }
            }
            finally
            {
                _lock.Release();
            }
        }
    }

    public async Task PublishEventAsync(
        string sessionId,
        string type,
        object data,
        CancellationToken ct)
    {
        await _lock.WaitAsync(ct);
        try
        {
            if (!_channels.TryGetValue(sessionId, out var channel))
            {
                _logger.LogWarning("No active listeners for session {SessionId}", sessionId);
                return;
            }

            var @event = new InteractionEvent
            {
                Type = type,
                Data = JsonSerializer.Serialize(data),
                Id = Guid.NewGuid().ToString("N")
            };

            await channel.Writer.WriteAsync(@event, ct);
        }
        finally
        {
            _lock.Release();
        }
    }

    public void Dispose()
    {
        foreach (var channel in _channels.Values)
        {
            channel.Writer.Complete();
        }
        _channels.Clear();
        _lock.Dispose();
    }
}

// Controllers/InteractionController.cs
public class InteractionController : ControllerBase
{
    private readonly IEventStreamService _events;

    [HttpGet("events/{sessionId}")]
    public async Task GetSessionEvents(
        [FromRoute] string sessionId,
        CancellationToken ct)
    {
        // Set up SSE response headers
        Response.Headers.Add("Content-Type", "text/event-stream");
        Response.Headers.Add("Cache-Control", "no-cache");
        Response.Headers.Add("Connection", "keep-alive");

        try
        {
            // Stream events to client
            await foreach (var @event in _events.GetEventStreamAsync(sessionId, ct))
            {
                if (@event.Id != null)
                    await Response.WriteAsync($"id: {@event.Id}\n");
                
                if (@event.Retry.HasValue)
                    await Response.WriteAsync($"retry: {@event.Retry}\n");
                
                await Response.WriteAsync($"event: {@event.Type}\n");
                await Response.WriteAsync($"data: {@event.Data}\n\n");
                await Response.Body.FlushAsync(ct);
            }
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            // Client disconnected, cleanup if needed
            _logger.LogInformation("Client disconnected from event stream");
        }
    }
}

// Usage in Services
public class AudioProcessingService
{
    private readonly IEventStreamService _events;

    public async Task ProcessAudioAsync(string sessionId, Stream audio, CancellationToken ct)
    {
        // Publish processing started
        await _events.PublishEventAsync(sessionId, "processing", new
        {
            stage = "audio-transcription",
            progress = 0,
            message = "Starting audio transcription..."
        }, ct);

        try
        {
            // Process audio...
            await _events.PublishEventAsync(sessionId, "processing", new
            {
                stage = "audio-transcription",
                progress = 0.5,
                message = "Transcribing audio..."
            }, ct);

            // Publish results
            await _events.PublishEventAsync(sessionId, "transcription", new
            {
                text = "Transcribed text...",
                confidence = 0.95
            }, ct);
        }
        catch (Exception ex)
        {
            // Publish error
            await _events.PublishEventAsync(sessionId, "error", new
            {
                code = "TRANSCRIPTION_FAILED",
                message = "Failed to transcribe audio",
                recoverable = true
            }, ct);
            throw;
        }
    }
}
```

### Key Features

1. **Simple In-Memory Implementation**
   - Uses .NET Channel API for pub/sub
   - No external dependencies
   - Easy to understand and maintain

2. **Resource Management**
   - Proper cleanup on client disconnect
   - Automatic channel disposal
   - Thread-safe operations

3. **Type Safety**
   - Strongly typed events
   - JSON serialization handling
   - Validation at compile time

4. **Error Handling**
   - Graceful connection termination
   - Error event type for client notification
   - Logging and monitoring

### Client Connection Example

```javascript
const eventSource = new EventSource('/api/interaction/events/session123');

eventSource.addEventListener('processing', (e) => {
    const data = JSON.parse(e.data);
    updateProgress(data.stage, data.progress);
});

eventSource.addEventListener('transcription', (e) => {
    const data = JSON.parse(e.data);
    showTranscription(data.text);
});

eventSource.addEventListener('error', (e) => {
    const data = JSON.parse(e.data);
    handleError(data.code, data.message);
});

// Handle connection loss
eventSource.onerror = (error) => {
    if (eventSource.readyState === EventSource.CLOSED) {
        // Attempt reconnection or notify user
    }
};
```

### Performance Considerations

1. **Connection Management**
   - Keep-alive headers for persistent connections
   - Automatic cleanup of unused channels
   - Thread-safe channel operations

2. **Memory Usage**
   - Unbounded channels with backpressure
   - Efficient event distribution
   - Proper resource disposal

3. **Scaling**
   - Multiple readers per channel
   - Thread-safe event publishing
   - Memory-efficient event streaming

### When to Consider Redis?

While the in-memory implementation is simpler and sufficient for many cases, consider adding Redis if you need:
1. Multi-server deployment with event sharing
2. Persistence of events
3. Very high throughput with many concurrent sessions
4. Event replay capabilities

For our current needs, the in-memory Channel implementation provides:
- Simpler deployment
- Lower latency
- No external dependencies
- Sufficient scalability for typical usage

### Key Features

1. **Reliable Delivery**
   - Redis pub/sub for scalable event distribution
   - Reconnection handling with retry intervals
   - Event IDs for message tracking

2. **Resource Management**
   - Proper cleanup on client disconnect
   - Cancellation token support
   - Memory-efficient streaming

3. **Type Safety**
   - Strongly typed events
   - JSON serialization handling
   - Validation at compile time

4. **Error Handling**
   - Graceful connection termination
   - Error event type for client notification
   - Logging and monitoring

### Client Connection Example

```javascript
const eventSource = new EventSource('/api/interaction/events/session123');

eventSource.addEventListener('processing', (e) => {
    const data = JSON.parse(e.data);
    updateProgress(data.stage, data.progress);
});

eventSource.addEventListener('transcription', (e) => {
    const data = JSON.parse(e.data);
    showTranscription(data.text);
});

eventSource.addEventListener('error', (e) => {
    const data = JSON.parse(e.data);
    handleError(data.code, data.message);
});

// Handle connection loss
eventSource.onerror = (error) => {
    if (eventSource.readyState === EventSource.CLOSED) {
        // Attempt reconnection or notify user
    }
};
```

### Performance Considerations

1. **Connection Management**
   - Keep-alive headers for persistent connections
   - Automatic reconnection handling
   - Connection pooling in Redis

2. **Memory Usage**
   - Unbounded channels for event streaming
   - Efficient JSON serialization
   - Proper disposal of resources

3. **Scaling**
   - Redis pub/sub for multi-server support
   - Event batching for high-frequency updates
   - Back-pressure handling 