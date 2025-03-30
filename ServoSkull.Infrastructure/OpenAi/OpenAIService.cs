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
        
        _logger.LogInformation(
            "OpenAIService initialized with models: Assistant={AssistantModel}, Voice={VoiceModel}, Transcription={TranscriptionModel}",
            _options.AssistantModel,
            _options.VoiceModel,
            _options.TranscriptionModel);
    }

    public async Task<string> ProcessMessageAsync(MultimodalRequest request)
    {
        try
        {
            _logger.LogInformation(
                "Processing message request. HasImage={HasImage}, TranscriptLength={TranscriptLength}, HasPreviousContext={HasPreviousContext}",
                !string.IsNullOrEmpty(request.ImageData),
                request.Transcript?.Length ?? 0,
                !string.IsNullOrEmpty(request.PreviousContext));

            // Create a new request with the system prompt included
            var enhancedRequest = new MultimodalRequest
            {
                Transcript = request.Transcript,
                ImageData = request.ImageData,
                PreviousContext = string.IsNullOrEmpty(request.PreviousContext)
                    ? _options.SystemPrompt
                    : $"{_options.SystemPrompt}\n\nConversation history:\n{request.PreviousContext}"
            };

            _logger.LogDebug("Enhanced request created with system prompt. Total context length: {ContextLength}",
                enhancedRequest.PreviousContext?.Length ?? 0);

            var response = await _openAIClient.ProcessMultimodalRequestAsync(enhancedRequest);
            
            _logger.LogInformation(
                "Message processed successfully. Response length: {ResponseLength}",
                response?.Length ?? 0);

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, 
                "Failed to process message. Transcript={Transcript}, HasImage={HasImage}", 
                request.Transcript,
                !string.IsNullOrEmpty(request.ImageData));
            throw;
        }
    }

    public async Task<string?> ProcessAudioAsync(string base64AudioString)
    {
        try
        {
            _logger.LogInformation(
                "Processing audio data. Input length: {InputLength} bytes",
                base64AudioString?.Length ?? 0);

            var result = await _openAIClient.TranscribeAudioAsync(base64AudioString);
            
            _logger.LogInformation(
                "Audio processed successfully. Transcript length: {TranscriptLength}",
                result?.Length ?? 0);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, 
                "Failed to process audio data. Input length: {InputLength}",
                base64AudioString?.Length ?? 0);
            throw;
        }
    }

    public async Task<string> GenerateSpeechAsync(string text)
    {
        try
        {
            _logger.LogInformation(
                "Generating speech for text. Length: {TextLength}, Voice: {Voice}",
                text?.Length ?? 0,
                _options.Voice);

            var audioData = await _openAIClient.GenerateSpeechAsync(text);
            var base64Audio = Convert.ToBase64String(audioData);
            
            _logger.LogInformation(
                "Speech generated successfully. Audio data length: {AudioLength} bytes",
                audioData?.Length ?? 0);

            return base64Audio;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, 
                "Failed to generate speech. Text length: {TextLength}, Voice: {Voice}",
                text?.Length ?? 0,
                _options.Voice);
            throw;
        }
    }
} 