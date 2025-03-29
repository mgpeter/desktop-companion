using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using ServoSkull.Core.Abstractions.Services;
using ServoSkull.Core.Models;

namespace ServoSkull.ApiService.Hubs;

public class InteractionHub : Hub
{
    private readonly ILogger<InteractionHub> _logger;
    private readonly IAIService _aiService;

    public InteractionHub(
        ILogger<InteractionHub> logger,
        IAIService aiService)
    {
        _logger = logger;
        _aiService = aiService;
    }

    public override async Task OnConnectedAsync()
    {
        var connectionId = Context.ConnectionId;
        _logger.LogInformation("Client connected: {ConnectionId}", connectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var connectionId = Context.ConnectionId;
        _logger.LogInformation("Client disconnected: {ConnectionId}", connectionId);
        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(string message)
    {
        try
        {
            var response = await _aiService.ProcessMessageAsync(message);
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
            var response = await _aiService.ProcessVideoFrameAsync(frameData);
            if (response != null)
            {
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

    private async Task SendErrorAsync(string code, string message, string details)
    {
        var error = new ErrorResponse
        {
            Code = code,
            Message = message,
            Details = details
        };

        await Clients.Caller.SendAsync("Error", error);
    }
}