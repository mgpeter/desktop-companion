using ServoSkull.Core.Models.Api;

namespace ServoSkull.Core.Abstractions.Services;

/// <summary>
/// Service interface for AI-powered interactions including text, video, and audio processing.
/// </summary>
public interface IAIService
{
    /// <summary>
    /// Processes a multimodal request and returns an AI-generated response.
    /// </summary>
    /// <param name="request">The multimodal request containing text, optional image data, and conversation context.</param>
    /// <returns>The AI-generated response.</returns>
    Task<string> ProcessMessageAsync(MultimodalRequest request);

    /// <summary>
    /// Processes a video frame and returns any detected information or insights.
    /// </summary>
    /// <param name="frameData">The raw video frame data.</param>
    /// <returns>Analysis results if any information was detected, null otherwise.</returns>
    Task<string?> ProcessVideoFrameAsync(byte[] frameData);

    /// <summary>
    /// Processes an audio stream and returns the transcription or analysis results.
    /// </summary>
    /// <param name="audioData">The raw audio data.</param>
    /// <returns>Transcription or analysis results if successful, null otherwise.</returns>
    Task<string?> ProcessAudioAsync(byte[] audioData);
} 