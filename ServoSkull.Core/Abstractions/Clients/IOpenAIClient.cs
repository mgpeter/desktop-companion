using ServoSkull.Core.Models.Api;

namespace ServoSkull.Core.Abstractions.Clients;

/// <summary>
/// Client interface for OpenAI API interactions.
/// </summary>
public interface IOpenAIClient
{
    /// <summary>
    /// Processes a multimodal request using GPT-4 Vision.
    /// </summary>
    /// <param name="request">The request containing text and image data.</param>
    /// <returns>The AI-generated response text.</returns>
    Task<string> ProcessMultimodalRequestAsync(MultimodalRequest request);

    /// <summary>
    /// Transcribes audio data using Whisper API.
    /// </summary>
    /// <param name="audioData">The raw audio data in bytes.</param>
    /// <returns>The transcribed text.</returns>
    Task<string> TranscribeAudioAsync(byte[] audioData);

    /// <summary>
    /// Generates speech from text using TTS API.
    /// </summary>
    /// <param name="text">The text to convert to speech.</param>
    /// <returns>The audio data in bytes.</returns>
    Task<byte[]> GenerateSpeechAsync(string text);
} 