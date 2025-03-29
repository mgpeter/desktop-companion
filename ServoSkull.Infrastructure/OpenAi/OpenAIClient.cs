using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using ServoSkull.Core.Abstractions.Clients;
using ServoSkull.Core.Configuration;
using ServoSkull.Core.Models.Api;
using ServoSkull.Core.Models.Chat;

namespace ServoSkull.Infrastructure.OpenAi;

public class OpenAIClient : IOpenAIClient
{
    private readonly HttpClient _httpClient;
    private readonly IOptions<OpenAIOptions> _options;
    private readonly ILogger<OpenAIClient> _logger;
    private readonly JsonSerializerOptions _jsonOptions;

    private record ChatMessage(string Role, object Content);
    private record ImageUrl(string Url);
    private record ContentItem(string Type, string? Text = null, ImageUrl? ImageUrl = null);

    public OpenAIClient(
        HttpClient httpClient,
        IOptions<OpenAIOptions> options,
        ILogger<OpenAIClient> logger)
    {
        _httpClient = httpClient;
        _options = options;
        _logger = logger;

        _httpClient.BaseAddress = new Uri("https://api.openai.com/v1/");
        _httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", _options.Value.ApiKey);

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        };
    }

    public async Task<string> ProcessMultimodalRequestAsync(MultimodalRequest request)
    {
        try
        {
            var messages = new List<ChatMessage>
            {
                new(
                    Role: "system",
                    Content: "You are a sarcastic, theatrical British servo-skull assistant from Warhammer 40,000. Respond with dramatic flair and dry wit."
                )
            };

            // Add conversation history if available
            if (request.PreviousContext != null)
            {
                var previousMessages = JsonSerializer.Deserialize<List<ConversationMessage>>(
                    request.PreviousContext, _jsonOptions);
                
                if (previousMessages != null)
                {
                    messages.AddRange(previousMessages.Select(m => new ChatMessage(
                        Role: m.Role,
                        Content: m.ImageData != null
                            ? new ContentItem[]
                            {
                                new(Type: "text", Text: m.Content),
                                new(Type: "image_url", ImageUrl: new ImageUrl($"data:image/jpeg;base64,{m.ImageData}"))
                            }
                            : m.Content
                    )));
                }
            }

            // Add current request
            messages.Add(new ChatMessage(
                Role: "user",
                Content: string.IsNullOrEmpty(request.ImageData)
                    ? request.Transcript
                    : new ContentItem[]
                    {
                        new(Type: "text", Text: request.Transcript),
                        new(Type: "image_url", ImageUrl: new ImageUrl($"data:image/jpeg;base64,{request.ImageData}"))
                    }
            ));

            var requestBody = new
            {
                model = _options.Value.AssistantModel,
                messages,
                max_tokens = _options.Value.MaxTokens,
                temperature = _options.Value.Temperature
            };

            var response = await _httpClient.PostAsync("chat/completions",
                new StringContent(
                    JsonSerializer.Serialize(requestBody, _jsonOptions),
                    Encoding.UTF8,
                    "application/json"));

            response.EnsureSuccessStatusCode();

            var result = await JsonSerializer.DeserializeAsync<JsonElement>(
                await response.Content.ReadAsStreamAsync());

            return result.GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "By the Omnissiah, my circuits have failed me.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process multimodal request");
            throw;
        }
    }

    public async Task<string> TranscribeAudioAsync(byte[] audioData)
    {
        try
        {
            var content = new MultipartFormDataContent();
            content.Add(new ByteArrayContent(audioData), "file", "audio.webm");
            content.Add(new StringContent(_options.Value.WhisperModel), "model");

            var response = await _httpClient.PostAsync("audio/transcriptions", content);
            response.EnsureSuccessStatusCode();

            var result = await JsonSerializer.DeserializeAsync<JsonElement>(
                await response.Content.ReadAsStreamAsync());

            return result.GetProperty("text").GetString() ?? string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to transcribe audio");
            throw;
        }
    }

    public async Task<byte[]> GenerateSpeechAsync(string text)
    {
        try
        {
            var requestBody = new
            {
                model = _options.Value.TTSModel,
                input = text,
                voice = _options.Value.TTSVoice
            };

            var response = await _httpClient.PostAsync("audio/speech",
                new StringContent(
                    JsonSerializer.Serialize(requestBody, _jsonOptions),
                    Encoding.UTF8,
                    "application/json"));

            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsByteArrayAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate speech");
            throw;
        }
    }
}