using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using ServoSkull.Core.Abstractions.Services;
using ServoSkull.Core.Models;
using ServoSkull.Core.Models.Api;

namespace ServoSkull.ApiService.Hubs;

public class InteractionHub : Hub
{
    private readonly ILogger<InteractionHub> _logger;
    private readonly IAIService _aiService;
    private readonly ISessionManager _sessionManager;
    private readonly JsonSerializerOptions _jsonOptions;

    public InteractionHub(
        ILogger<InteractionHub> logger,
        IAIService aiService,
        ISessionManager sessionManager)
    {
        _logger = logger;
        _aiService = aiService;
        _sessionManager = sessionManager;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        };
    }

    public override async Task OnConnectedAsync()
    {
        var connectionId = Context.ConnectionId;
        _sessionManager.GetOrCreateSession(connectionId);
        _logger.LogInformation("Client connected: {ConnectionId}", connectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var connectionId = Context.ConnectionId;
        _sessionManager.RemoveSession(connectionId);
        _logger.LogInformation("Client disconnected: {ConnectionId}", connectionId);
        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(string message, string? imageData)
    {
        try
        {
            var connectionId = Context.ConnectionId;
            var recentMessages = _sessionManager.GetRecentMessages(connectionId);
            
            // Create request with conversation history
            var request = new MultimodalRequest
            {
                Transcript = message,
                ImageData = imageData ?? string.Empty,
                PreviousContext = JsonSerializer.Serialize(recentMessages, _jsonOptions)
            };

            // Add user message to history
            _sessionManager.AddMessage(connectionId, "user", message);

            // Process request with full context
            var response = await _aiService.ProcessMessageAsync(request);

            // Add assistant response to history
            _sessionManager.AddMessage(connectionId, "assistant", response);

            await Clients.Caller.SendAsync("ReceiveResponse", response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing message");
            await SendErrorAsync("MESSAGE_PROCESSING_FAILED", "Failed to process message", ex.Message);
        }
    }

    public async Task ProcessVideoFrame(byte[] frameData)
    {
        try
        {
            var connectionId = Context.ConnectionId;
            var recentMessages = _sessionManager.GetRecentMessages(connectionId);
            
            // Create request with frame data and conversation history
            var request = new MultimodalRequest
            {
                Transcript = string.Empty,
                ImageData = Convert.ToBase64String(frameData),
                PreviousContext = JsonSerializer.Serialize(recentMessages, _jsonOptions)
            };

            var response = await _aiService.ProcessMessageAsync(request);
            if (response != null)
            {
                // Add the frame analysis to conversation history
                _sessionManager.AddMessage(connectionId, "user", "Video frame captured", request.ImageData);
                _sessionManager.AddMessage(connectionId, "assistant", response);
                
                await Clients.Caller.SendAsync("ReceiveResponse", response);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing video frame");
            await SendErrorAsync("VIDEO_PROCESSING_FAILED", "Failed to process video frame", ex.Message);
        }
    }

    public async Task ProcessAudioStream(byte[] audioData)
    {
        try
        {
            var response = await _aiService.ProcessAudioAsync(audioData);
            if (response != null)
            {
                await Clients.Caller.SendAsync("ReceiveTranscription", response);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing audio stream");
            await SendErrorAsync("AUDIO_PROCESSING_FAILED", "Failed to process audio stream", ex.Message);
        }
    }

    private async Task SendErrorAsync(string code, string message, string? details = null)
    {
        var error = new ErrorResponse
        {
            Code = code,
            Message = message,
            Details = details
        };

        await Clients.Caller.SendAsync("ReceiveError", error);
    }
}