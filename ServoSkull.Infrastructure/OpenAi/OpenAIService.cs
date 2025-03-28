using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ServoSkull.Core.Abstractions.Clients;
using ServoSkull.Core.Abstractions.Services;
using ServoSkull.Core.Configuration;
using ServoSkull.Core.Models.Api;

namespace ServoSkull.Infrastructure.OpenAi;

public class OpenAIService : IAIService
{
    private readonly IOpenAIClient _openAIClient;
    private readonly ILogger<OpenAIService> _logger;
    private readonly OpenAIOptions _options;

    public OpenAIService(
        IOpenAIClient openAIClient,
        ILogger<OpenAIService> logger,
        IOptions<OpenAIOptions> options)
    {
        _openAIClient = openAIClient;
        _logger = logger;
        _options = options.Value;
    }

    public async Task<string> ProcessMessageAsync(MultimodalRequest request)
    {
        try
        {
            // Create a new request with the system prompt included
            var enhancedRequest = new MultimodalRequest
            {
                Transcript = request.Transcript,
                ImageData = request.ImageData,
                PreviousContext = string.IsNullOrEmpty(request.PreviousContext)
                    ? _options.SystemPrompt
                    : $"{_options.SystemPrompt}\n\nConversation history:\n{request.PreviousContext}"
            };

            return await _openAIClient.ProcessMultimodalRequestAsync(enhancedRequest);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process message: {Message}", request.Transcript);
            throw;
        }
    }

    public async Task<string?> ProcessAudioAsync(string base64AudioString)
    {
        try
        {
            return await _openAIClient.TranscribeAudioAsync(base64AudioString);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process audio data");
            throw;
        }
    }

    public async Task<string> GenerateSpeechAsync(string text)
    {
        try
        {
            var audioData = await _openAIClient.GenerateSpeechAsync(text);
            return Convert.ToBase64String(audioData);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate speech for text: {Text}", text);
            throw;
        }
    }
} 