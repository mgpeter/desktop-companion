using Microsoft.Extensions.Logging;
using ServoSkull.Core.Abstractions.Clients;
using ServoSkull.Core.Abstractions.Services;
using ServoSkull.Core.Models.Api;

namespace ServoSkull.Infrastructure.OpenAi;

public class OpenAIService : IAIService
{
    private readonly IOpenAIClient _openAIClient;
    private readonly ILogger<OpenAIService> _logger;

    public OpenAIService(
        IOpenAIClient openAIClient,
        ILogger<OpenAIService> logger)
    {
        _openAIClient = openAIClient;
        _logger = logger;
    }

    public async Task<string> ProcessMessageAsync(string message)
    {
        try
        {
            // For text-only messages, we'll create a multimodal request without image
            var request = new MultimodalRequest
            {
                Transcript = message,
                ImageData = string.Empty
            };

            return await _openAIClient.ProcessMultimodalRequestAsync(request);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process message: {Message}", message);
            throw;
        }
    }

    public async Task<string?> ProcessVideoFrameAsync(byte[] frameData)
    {
        try
        {
            // Convert frame data to base64
            var base64Image = Convert.ToBase64String(frameData);

            // Create request with empty transcript since this is image-only
            var request = new MultimodalRequest
            {
                Transcript = string.Empty,
                ImageData = base64Image
            };

            return await _openAIClient.ProcessMultimodalRequestAsync(request);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process video frame");
            throw;
        }
    }

    public async Task<string?> ProcessAudioAsync(byte[] audioData)
    {
        try
        {
            return await _openAIClient.TranscribeAudioAsync(audioData);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process audio data");
            throw;
        }
    }
} 