namespace ServoSkull.Core.Models;

public class ErrorResponse
{
    public required string Code { get; init; }
    public required string Message { get; init; }
    public string? Details { get; init; }
} 