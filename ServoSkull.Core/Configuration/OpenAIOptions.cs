using System.ComponentModel.DataAnnotations;

namespace ServoSkull.Core.Configuration;

public class OpenAIOptions
{
    [Required]
    public required string ApiKey { get; init; }

    [Required]
    public required string AssistantModel { get; init; }

    [Required]
    public required string VoiceModel { get; init; }

    [Required]
    public required string TranscriptionModel { get; init; }

    [Required]
    public required string Voice { get; init; }

    [Required]
    public required string SystemPrompt { get; init; }


    [Required]
    public required string VoicePrompt { get; init; }

    [Range(1, 4096)]
    public int MaxTokens { get; init; } = 1000;

    [Range(0.0, 2.0)]
    public float Temperature { get; init; } = 0.7f;
} 