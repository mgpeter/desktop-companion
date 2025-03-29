using System.ComponentModel.DataAnnotations;

namespace ServoSkull.Core.Configuration;

public class OpenAIOptions
{
    [Required]
    public required string ApiKey { get; init; }

    [Required]
    public required string AssistantModel { get; init; } = "gpt-4-vision-preview";

    [Required]
    public required string WhisperModel { get; init; } = "whisper-1";

    [Required]
    public required string TTSModel { get; init; } = "tts-1";

    [Required]
    public required string TTSVoice { get; init; } = "onyx";

    [Range(1, 4096)]
    public int MaxTokens { get; init; } = 1000;

    [Range(0.0, 2.0)]
    public float Temperature { get; init; } = 0.7f;
} 