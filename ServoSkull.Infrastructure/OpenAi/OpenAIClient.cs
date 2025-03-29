using Microsoft.Extensions.Configuration;
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
    private readonly AudioClient _audioClient;
    private readonly OpenAIOptions _options;

    public OpenAIClient(IOptions<OpenAIOptions> options)
    {
        _options = options.Value;
        
        string apiKey = _options.ApiKey ?? throw new ArgumentNullException(nameof(_options.ApiKey));
        _chatClient = new ChatClient(_options.AssistantModel, apiKey);
        _audioClient = new AudioClient(_options.WhisperModel, apiKey);
    }

    public async Task<string> ProcessMultimodalRequestAsync(MultimodalRequest request)
    {
        try
        {
            var messages = new List<ChatMessage>();

            if (!string.IsNullOrEmpty(request.PreviousContext))
            {
                messages.Add(new SystemChatMessage(request.PreviousContext));
            }

            if (!string.IsNullOrEmpty(request.ImageData))
            {
                string base64Data = StripDataUrlPrefix(request.ImageData);
                BinaryData binaryData = BinaryData.FromBytes(Convert.FromBase64String(base64Data));
                messages.Add(new UserChatMessage(new[]
                {
                    ChatMessageContentPart.CreateTextPart(request.Transcript),
                    ChatMessageContentPart.CreateImagePart(binaryData,"image/png")
                }));
            }
            else
            {
                messages.Add(new UserChatMessage(request.Transcript));
            }

            var completion = await _chatClient.CompleteChatAsync(messages);
            var textResponse = completion.Value.Content
                .Where(x => x.Kind == ChatMessageContentPartKind.Text)
                .Select(x => x.Text)
                .Aggregate((a, b) => $"{a}{Environment.NewLine}{b}");
            
            return textResponse;
        }
        catch (Exception ex)
        {
            throw new Exception($"Error processing multimodal request: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// Strips the data URL prefix (e.g. "data:image/png;base64,") from a base64 image string
    /// </summary>
    private static string StripDataUrlPrefix(string dataUrl)
    {
        const string prefix = "base64,";
        int index = dataUrl.IndexOf(prefix);
        return index >= 0 ? dataUrl[(index + prefix.Length)..] : dataUrl;
    }

    public async Task<string> TranscribeAudioAsync(string base64audioData)
    {
        try
        {
            string base64Data = StripDataUrlPrefix(base64audioData);
            byte[] audioBytes = Convert.FromBase64String(base64Data);
            using var stream = new MemoryStream(audioBytes);
            var result = await _audioClient.TranscribeAudioAsync(stream, "audio.webm");
            return result.Value.Text ?? string.Empty;
        }
        catch (Exception ex)
        {
            throw new Exception($"Error transcribing audio: {ex.Message}", ex);
        }
    }

    public async Task<byte[]> GenerateSpeechAsync(string text)
    {
        try
        {
            using var memoryStream = new MemoryStream();
            ClientResult<BinaryData>? result = await _audioClient.GenerateSpeechAsync(text, GeneratedSpeechVoice.Alloy);
            return result.Value.ToArray();
        }
        catch (Exception ex)
        {
            throw new Exception($"Error generating speech: {ex.Message}", ex);
        }
    }
}