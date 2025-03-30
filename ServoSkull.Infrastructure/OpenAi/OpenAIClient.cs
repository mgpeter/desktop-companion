using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OpenAI;
using OpenAI.Audio;
using OpenAI.Chat;
using ServoSkull.Core.Abstractions.Clients;
using ServoSkull.Core.Models.Api;
using System;
using System.ClientModel;
using System.ClientModel.Primitives;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using ServoSkull.Core.Configuration;
using static System.Net.Mime.MediaTypeNames;

namespace ServoSkull.Infrastructure.OpenAi;

public class OpenAIClient : IOpenAIClient
{
    private readonly ChatClient _chatClient;
    private readonly AudioClient _transcribeClient;
    private readonly AudioClient _audioClient;
    private readonly OpenAIOptions _options;
    private readonly ILogger<OpenAIClient> _logger;

    public OpenAIClient(
        IOptions<OpenAIOptions> options,
        ILogger<OpenAIClient> logger)
    {
        _options = options.Value;
        _logger = logger;
        
        string apiKey = _options.ApiKey ?? throw new ArgumentNullException(nameof(_options.ApiKey));
        _chatClient = new ChatClient(_options.AssistantModel, apiKey);
        _audioClient = new AudioClient(_options.VoiceModel, apiKey);
        _transcribeClient = new AudioClient(_options.TranscriptionModel, apiKey);
        
        _logger.LogInformation(
            "OpenAIClient initialized with models: Assistant={AssistantModel}, Voice={VoiceModel}, Transcription={TranscriptionModel}",
            _options.AssistantModel,
            _options.VoiceModel,
            _options.TranscriptionModel);
    }

    public async Task<string> ProcessMultimodalRequestAsync(MultimodalRequest request)
    {
        try
        {
            _logger.LogInformation(
                "Processing multimodal request. Transcript={Transcript}, HasImage={HasImage}, ContextLength={ContextLength}",
                request.Transcript,
                !string.IsNullOrEmpty(request.ImageData),
                request.PreviousContext?.Length ?? 0);

            var messages = new List<ChatMessage>();

            if (!string.IsNullOrEmpty(request.PreviousContext))
            {
                _logger.LogDebug("Adding system prompt and context. Length: {Length}", 
                    request.PreviousContext.Length);
                messages.Add(new SystemChatMessage(request.PreviousContext));
            }

            if (!string.IsNullOrEmpty(request.ImageData))
            {
                _logger.LogDebug("Processing image data for request");
                string base64Data = StripDataUrlPrefix(request.ImageData);
                BinaryData binaryData = BinaryData.FromBytes(Convert.FromBase64String(base64Data));
                _logger.LogDebug("Image data processed. Size: {Size} bytes", binaryData.ToArray().Length);
                
                messages.Add(new UserChatMessage(new[]
                {
                    ChatMessageContentPart.CreateTextPart(request.Transcript),
                    ChatMessageContentPart.CreateImagePart(binaryData, "image/png")
                }));
            }
            else
            {
                _logger.LogDebug("Adding text-only message to request");
                messages.Add(new UserChatMessage(request.Transcript));
            }

            _logger.LogDebug("Sending request to OpenAI. Messages={Count}, Model={Model}", 
                messages.Count, 
                _options.AssistantModel);

            var completion = await _chatClient.CompleteChatAsync(messages);
            
            _logger.LogDebug("Received response from OpenAI. Content parts: {Count}", 
                completion.Value.Content.Count);

            var textParts = completion.Value.Content
                .Where(x => x.Kind == ChatMessageContentPartKind.Text)
                .Select(x => x.Text)
                .ToList();

            _logger.LogDebug("Extracted text parts from response. Count: {Count}", textParts.Count);

            if (textParts.Count == 0)
            {
                _logger.LogWarning(
                    "No text parts found in response. Model={Model}, Raw response: {@Response}", 
                    _options.AssistantModel,
                    completion.Value);
                return "The Machine Spirit is troubled. No coherent response could be generated. Please try again.";
            }

            var textResponse = textParts.Aggregate((a, b) => $"{a}{Environment.NewLine}{b}");
            
            _logger.LogInformation(
                "Successfully processed request. Response length: {Length}, Messages processed: {MessageCount}", 
                textResponse.Length,
                messages.Count);

            return textResponse;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, 
                "Error processing multimodal request. Model={Model}, HasImage={HasImage}", 
                _options.AssistantModel,
                !string.IsNullOrEmpty(request.ImageData));
            throw new Exception($"Error processing multimodal request: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// Strips the data URL prefix (e.g. "data:image/png;base64,") from a base64 image string
    /// </summary>
    private static string StripDataUrlPrefix(string dataUrl)
    {
        const string base64Prefix = ";base64,";
        int base64Index = dataUrl.IndexOf(base64Prefix, StringComparison.Ordinal);
        // Check if the prefix exists and return the substring after it
        return base64Index >= 0 ? dataUrl[(base64Index + base64Prefix.Length)..] : dataUrl;
    }


    public async Task<string> TranscribeAudioAsync(string base64audioData)
    {
        try
        {
            _logger.LogInformation(
                "Transcribing audio. Input length: {Length} bytes, Model: {Model}",
                base64audioData?.Length ?? 0,
                _options.TranscriptionModel);

            string base64Data = StripDataUrlPrefix(base64audioData);
            byte[] audioBytes = Convert.FromBase64String(base64Data);
            
            _logger.LogDebug("Audio data processed. Size: {Size} bytes", audioBytes.Length);

            using var stream = new MemoryStream(audioBytes);
            var result = await _transcribeClient.TranscribeAudioAsync(stream, "audio.webm");
            
            _logger.LogInformation(
                "Audio transcription completed. Text length: {Length}",
                result.Value.Text?.Length ?? 0);

            return result.Value.Text ?? string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, 
                "Error transcribing audio. Model={Model}, InputLength={Length}", 
                _options.TranscriptionModel,
                base64audioData?.Length ?? 0);
            throw new Exception($"Error transcribing audio: {ex.Message}", ex);
        }
    }

    public async Task<byte[]> GenerateSpeechAsync(string text)
    {
        try
        {
            _logger.LogInformation(
                "Generating speech. Text length: {Length}, Voice: {Voice}, Model: {Model}",
                text?.Length ?? 0,
                _options.Voice,
                _options.VoiceModel);

            var voice = new GeneratedSpeechVoice(_options.Voice.ToLower());
            ClientResult<BinaryData>? result = await _audioClient.GenerateSpeechAsync(text, voice);
            
            var audioData = result.Value.ToArray();
            _logger.LogInformation(
                "Speech generation completed. Audio size: {Size} bytes",
                audioData.Length);
            
            return audioData;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, 
                "Error generating speech. Model={Model}, Voice={Voice}, TextLength={Length}", 
                _options.VoiceModel,
                _options.Voice,
                text?.Length ?? 0);
            throw new Exception($"Error generating speech: {ex.Message}", ex);
        }
    }
}