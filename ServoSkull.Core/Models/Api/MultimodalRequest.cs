namespace ServoSkull.Core.Models.Api;

/// <summary>
/// Represents a multimodal request containing both text and image data.
/// </summary>
public class MultimodalRequest
{
    /// <summary>
    /// The transcribed text from audio input.
    /// </summary>
    public required string Transcript { get; init; }

    /// <summary>
    /// The base64-encoded image data from video frame(s).
    /// </summary>
    public required string ImageData { get; init; }

    /// <summary>
    /// Optional context from previous interactions.
    /// </summary>
    public string? PreviousContext { get; init; }
} 