using Microsoft.Extensions.Configuration;
using OpenAI;
using OpenAI.Audio;
using OpenAI.Chat;
using ServoSkull.Core.Abstractions.Clients;
using ServoSkull.Core.Models.Api;
using System;
using System.ClientModel;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

using static System.Net.Mime.MediaTypeNames;

namespace ServoSkull.Infrastructure.OpenAi;

public class OpenAIClient : IOpenAIClient
{
    private readonly ChatClient _chatClient;
    private readonly AudioClient _audioClient;
    private readonly string _apiKey;

    public OpenAIClient(IConfiguration configuration)
    {
        _apiKey = configuration["OpenAI:ApiKey"] ?? throw new ArgumentNullException("OpenAI:ApiKey");
        _chatClient = new ChatClient("gpt-4o", _apiKey);
        _audioClient = new AudioClient("whisper-1", _apiKey);
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
                BinaryData binaryData = BinaryData.FromBytes(Convert.FromBase64String(request.ImageData));
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

    public async Task<string> TranscribeAudioAsync(byte[] audioData)
    {
        try
        {
            var content = BinaryContent.Create(BinaryData.FromBytes(audioData));
            ClientResult? result = await _audioClient.TranscribeAudioAsync(content, "audio/mp3");
            return result?.ToString() ?? string.Empty;

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