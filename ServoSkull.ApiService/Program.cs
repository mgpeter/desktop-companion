using ServoSkull.Core;
using ServoSkull.Infrastructure;
using ServoSkull.ApiService.Hubs;
using ServoSkull.Core.Configuration;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();

// Add services to the container.
builder.Services.AddProblemDetails();

// Configure CORS with environment variable
var frontendUri = builder.Configuration["FRONTEND_URI"]
    ?? Environment.GetEnvironmentVariable("FRONTEND_URI")
    ?? throw new InvalidOperationException("FRONTEND_URI environment variable is required");

builder.Services.Configure<CorsOptions>(options =>
{
    options.AllowedOrigins = new[] { frontendUri };
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(frontendUri)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Configure SignalR
builder.Services
    .AddSignalR(options =>
    {
        options.EnableDetailedErrors = builder.Environment.IsDevelopment();
        options.MaximumReceiveMessageSize = 1024 * 1024; // 1MB for video frames
    });

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddOpenAIServices(builder.Configuration);

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();

// Map SignalR hub
app.MapHub<InteractionHub>("/interactionHub");

app.MapDefaultEndpoints();

app.Run();
