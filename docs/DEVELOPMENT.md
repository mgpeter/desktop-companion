# ServoSkull Development Guide

**Complete Developer Guide for Contributing to the AI Desktop Companion**

---

## Development Environment Setup

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **.NET SDK** | 9.0+ | Backend services and Aspire orchestration |
| **Node.js** | 22+ | Angular frontend development |
| **Angular CLI** | 19+ | Frontend tooling and build system |
| **Visual Studio/VS Code** | Latest | IDE with C# and TypeScript support |
| **Git** | Latest | Version control |

### Development Tools Recommendations

- **C# Extension Pack** (VS Code)
- **Angular Language Service** (VS Code)
- **Tailwind CSS IntelliSense** (VS Code)
- **REST Client** (VS Code) - for API testing
- **GitLens** (VS Code) - enhanced Git integration

## Project Structure Deep Dive

```
ServoSkull/
├── ServoSkull.AppHost/          # 🏗️ Aspire orchestration
│   ├── Program.cs               # Service configuration and startup
│   └── appsettings.*.json       # Environment-specific settings
│
├── ServoSkull.ApiService/       # 🌐 Backend API service
│   ├── Hubs/
│   │   └── InteractionHub.cs    # SignalR real-time communication
│   ├── Program.cs               # API service entry point
│   └── appsettings.*.json       # API configuration
│
├── ServoSkull.Core/             # 🧠 Domain models and abstractions
│   ├── Abstractions/
│   │   ├── Clients/             # External service interfaces
│   │   └── Services/            # Business logic interfaces
│   ├── Configuration/           # Configuration POCOs
│   └── Models/                  # Domain entities and DTOs
│
├── ServoSkull.Infrastructure/   # 🔧 Service implementations
│   ├── OpenAi/                  # OpenAI service implementations
│   ├── Services/                # Core service implementations
│   └── StartupExtensions.cs     # Dependency injection setup
│
├── ServoSkull.ServiceDefaults/  # ⚙️ Shared service configuration
│   └── Extensions.cs            # Common service registrations
│
├── ServoSkull.Angular/          # 🎨 Frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/            # Singleton services and layout
│   │   │   ├── features/        # Feature modules (chat, home)
│   │   │   └── shared/          # Reusable components
│   │   └── assets/              # Static assets
│   ├── Dockerfile               # Production container
│   └── package.json             # Frontend dependencies
│
├── ServoSkull.Tests/            # 🧪 Test projects
└── ServoSkull.Web/              # 🌍 Blazor web application (secondary)
```

## Development Workflow

### 1. Local Development Setup

```bash
# Clone repository
git clone <repository-url>
cd desktop-companion

# Setup OpenAI API key
cd ServoSkull.ApiService
dotnet user-secrets init
dotnet user-secrets set "OpenAI:ApiKey" "<your-api-key-here>"
cd ..

# Install frontend dependencies
cd ServoSkull.Angular
npm install
cd ..

# Start development environment
dotnet run --project ServoSkull.AppHost
```

### 2. Development URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Aspire Dashboard** | `http://localhost:18888` | Service monitoring and logs |
| **Angular Frontend** | `http://localhost:4200` | Main application interface |
| **API Service** | `http://localhost:5000` | Backend API endpoints |
| **Blazor Web** | `http://localhost:5001` | Secondary web interface |

### 3. Hot Reload Development

```bash
# Backend changes - automatic reload via Aspire
dotnet watch run --project ServoSkull.AppHost

# Frontend changes - automatic reload via Angular CLI
cd ServoSkull.Angular
npm run start:devcontainer  # or ng serve
```

## Code Architecture Patterns

### Backend Patterns

#### 1. Clean Architecture Implementation

```csharp
// Domain Interface (ServoSkull.Core)
public interface IAIService
{
    Task<string> ProcessMessageAsync(MultimodalRequest request);
    Task<string?> ProcessAudioAsync(string base64AudioString);
    Task<string> GenerateSpeechAsync(string text);
}

// Implementation (ServoSkull.Infrastructure)
public class OpenAIService : IAIService
{
    private readonly IOpenAIClient _openAIClient;
    private readonly ILogger<OpenAIService> _logger;
    
    public OpenAIService(IOpenAIClient openAIClient, ILogger<OpenAIService> logger)
    {
        _openAIClient = openAIClient;
        _logger = logger;
    }
    
    // Implementation details...
}

// Registration (Program.cs)
builder.Services.AddScoped<IAIService, OpenAIService>();
```

#### 2. SignalR Hub Pattern

```csharp
public class InteractionHub : Hub
{
    private readonly ILogger<InteractionHub> _logger;
    private readonly IAIService _aiService;
    
    // Connection lifecycle management
    public override async Task OnConnectedAsync()
    {
        var connectionId = Context.ConnectionId;
        _sessionManager.GetOrCreateSession(connectionId);
        await base.OnConnectedAsync();
    }
    
    // Multimodal message processing
    public async Task SendMessage(string message, string? imageData)
    {
        // Process request with context
        // Send response to client
    }
}
```

#### 3. Configuration Pattern

```csharp
// Configuration class
public class OpenAIOptions
{
    public string ApiKey { get; set; } = string.Empty;
    public string AssistantModel { get; set; } = "gpt-4";
    public string VoiceModel { get; set; } = "tts-1";
    public string Voice { get; set; } = "alloy";
}

// Registration
builder.Services.Configure<OpenAIOptions>(
    builder.Configuration.GetSection("OpenAI"));
```

### Frontend Patterns

#### 1. Angular Service Pattern

```typescript
@Injectable({
  providedIn: 'root'
})
export class AudioService {
  // State management with BehaviorSubject
  private monitorState = new BehaviorSubject<AudioMonitorState>({
    isMonitoring: false,
    isRecording: false,
    voiceDetected: false,
    audioLevel: 0
  });
  
  // Public observable for components
  public monitorState$ = this.monitorState.asObservable();
  
  // Cleanup pattern
  private destroy$ = new Subject<void>();
  
  constructor() {
    // Service initialization
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupAudioResources();
  }
}
```

#### 2. Component Pattern

```typescript
@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  constructor(
    private signalRService: SignalRService,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    // Service subscriptions with takeUntil pattern
    this.signalRService.onMessageReceived()
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        this.messages.push(message);
        this.cdr.markForCheck(); // OnPush change detection
      });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

#### 3. Reactive State Management

```typescript
// Service state interface
interface AudioMonitorState {
  isMonitoring: boolean;
  isRecording: boolean;
  voiceDetected: boolean;
  audioLevel: number;
}

// State management
private monitorState = new BehaviorSubject<AudioMonitorState>(initialState);

// State updates
private updateState(updates: Partial<AudioMonitorState>): void {
  const currentState = this.monitorState.value;
  this.monitorState.next({ ...currentState, ...updates });
}

// Component subscription
this.audioService.monitorState$
  .pipe(takeUntil(this.destroy$))
  .subscribe(state => {
    this.isRecording = state.isRecording;
    this.cdr.markForCheck();
  });
```

## Testing Strategy

### Backend Testing

#### Unit Tests
```csharp
[Test]
public async Task ProcessMessageAsync_WithValidRequest_ReturnsResponse()
{
    // Arrange
    var mockClient = new Mock<IOpenAIClient>();
    var service = new OpenAIService(mockClient.Object, logger, options);
    var request = new MultimodalRequest { Transcript = "Hello" };
    
    mockClient.Setup(x => x.ProcessMultimodalRequestAsync(It.IsAny<MultimodalRequest>()))
            .ReturnsAsync("AI Response");
    
    // Act
    var result = await service.ProcessMessageAsync(request);
    
    // Assert
    Assert.That(result, Is.EqualTo("AI Response"));
}
```

#### Integration Tests
```csharp
[Test]
public async Task InteractionHub_SendMessage_ProcessesSuccessfully()
{
    // Arrange
    var hub = new InteractionHub(logger, aiService, sessionManager);
    
    // Act & Assert
    await hub.SendMessage("Test message", null);
    
    // Verify hub methods called correctly
}
```

### Frontend Testing

#### Component Tests
```typescript
describe('ChatComponent', () => {
  let component: ChatComponent;
  let mockSignalRService: jasmine.SpyObj<SignalRService>;
  
  beforeEach(() => {
    const spy = jasmine.createSpyObj('SignalRService', ['onMessageReceived']);
    
    TestBed.configureTestingModule({
      providers: [{ provide: SignalRService, useValue: spy }]
    });
    
    mockSignalRService = TestBed.inject(SignalRService) as jasmine.SpyObj<SignalRService>;
  });
  
  it('should handle received messages', () => {
    // Test implementation
  });
});
```

#### Service Tests
```typescript
describe('AudioService', () => {
  let service: AudioService;
  
  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AudioService);
  });
  
  it('should initialize with correct default state', () => {
    service.monitorState$.subscribe(state => {
      expect(state.isMonitoring).toBeFalse();
      expect(state.isRecording).toBeFalse();
    });
  });
});
```

### Test Commands

```bash
# Backend tests
dotnet test ServoSkull.Tests/

# Frontend tests
cd ServoSkull.Angular
npm test

# End-to-end tests (future implementation)
npm run e2e
```

## Common Development Tasks

### Adding New Features

#### 1. Backend Feature (New AI Service)

```csharp
// 1. Create interface in ServoSkull.Core
public interface INewAIService
{
    Task<string> ProcessNewFeatureAsync(NewFeatureRequest request);
}

// 2. Implement in ServoSkull.Infrastructure
public class NewAIService : INewAIService
{
    public async Task<string> ProcessNewFeatureAsync(NewFeatureRequest request)
    {
        // Implementation
    }
}

// 3. Register in Program.cs
builder.Services.AddScoped<INewAIService, NewAIService>();

// 4. Add to InteractionHub
public async Task ProcessNewFeature(NewFeatureRequest request)
{
    var result = await _newAIService.ProcessNewFeatureAsync(request);
    await Clients.Caller.SendAsync("ReceiveNewFeature", result);
}
```

#### 2. Frontend Feature (New Component)

```bash
# Generate component
ng generate component features/new-feature

# Generate service
ng generate service core/services/new-feature
```

```typescript
// Service implementation
@Injectable({
  providedIn: 'root'
})
export class NewFeatureService {
  private featureState = new BehaviorSubject<FeatureState>(initialState);
  public featureState$ = this.featureState.asObservable();
  
  // Service methods
}

// Component implementation
@Component({
  selector: 'app-new-feature',
  templateUrl: './new-feature.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewFeatureComponent implements OnInit, OnDestroy {
  // Component implementation
}
```

### Debugging and Troubleshooting

#### Backend Debugging

1. **Aspire Dashboard**: Monitor service health and logs
2. **Application Logs**: Structured logging with appropriate levels
3. **SignalR Connection**: Use browser dev tools WebSocket tab
4. **API Testing**: Use REST Client or Postman for direct API calls

#### Frontend Debugging

1. **Browser Dev Tools**: Console, Network, and Application tabs
2. **Angular DevTools**: Chrome extension for Angular debugging
3. **RxJS Debugging**: Use `tap` operator for observable debugging
4. **State Inspection**: Subscribe to service observables in components

### Performance Optimization

#### Backend Optimizations

```csharp
// HTTP client reuse
builder.Services.AddHttpClient<IOpenAIClient, OpenAIClient>(client =>
{
    client.BaseAddress = new Uri("https://api.openai.com/");
    client.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
});

// Caching (future implementation)
builder.Services.AddMemoryCache();
```

#### Frontend Optimizations

```typescript
// OnPush change detection
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})

// Lazy loading
const routes: Routes = [
  {
    path: 'feature',
    loadComponent: () => import('./features/feature/feature.component')
      .then(m => m.FeatureComponent)
  }
];

// Resource cleanup
ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
  this.cleanupResources();
}
```

## Code Style and Standards

### Backend Standards (C#)

- **Naming**: PascalCase for public members, camelCase for private
- **Async**: Always use async/await for I/O operations
- **Logging**: Use structured logging with appropriate levels
- **Exception Handling**: Wrap external calls in try-catch blocks
- **Dependency Injection**: Use constructor injection

### Frontend Standards (TypeScript)

- **Naming**: camelCase for variables and methods, PascalCase for classes
- **Observables**: Use `$` suffix for observable properties
- **Change Detection**: Use OnPush strategy where possible
- **Resource Management**: Always unsubscribe from observables
- **Type Safety**: Enable strict TypeScript compiler options

### General Standards

- **Git Commits**: Use conventional commit format
- **Documentation**: Document public APIs and complex logic
- **Testing**: Write tests for new features and bug fixes
- **Code Reviews**: All changes require review before merge

## Deployment and Production

### Local Production Build

```bash
# Build all services
dotnet build --configuration Release

# Build Angular for production
cd ServoSkull.Angular
npm run build
cd ..

# Run production build
dotnet run --project ServoSkull.AppHost --configuration Release
```

### Docker Deployment

```bash
# Build containers
docker build -t servoskull-api ./ServoSkull.ApiService
docker build -t servoskull-angular ./ServoSkull.Angular

# Run with docker-compose (future implementation)
docker-compose up -d
```

### Environment Configuration

```json
// appsettings.Production.json
{
  "OpenAI": {
    "ApiKey": "${OPENAI_API_KEY}",
    "AssistantModel": "gpt-4",
    "VoiceModel": "tts-1"
  },
  "Aspire": {
    "Telemetry": {
      "Endpoint": "${TELEMETRY_ENDPOINT}"
    }
  }
}
```

## Contributing Guidelines

### Pull Request Process

1. **Fork and Branch**: Create feature branch from main
2. **Implement**: Follow code standards and patterns
3. **Test**: Ensure all tests pass and add new tests
4. **Document**: Update documentation as needed
5. **Review**: Submit PR with clear description

### Code Review Checklist

- [ ] Code follows established patterns
- [ ] Tests added for new functionality
- [ ] Documentation updated
- [ ] No breaking changes without discussion
- [ ] Performance considerations addressed
- [ ] Security implications reviewed

---

*This development guide provides the foundation for contributing to ServoSkull and extending its capabilities toward full robotics integration.*