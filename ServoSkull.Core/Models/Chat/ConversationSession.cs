using System.Collections.Concurrent;

namespace ServoSkull.Core.Models.Chat;

public class ConversationMessage
{
    public required string Role { get; init; }
    public required string Content { get; init; }
    public required DateTimeOffset Timestamp { get; init; }
    public string? ImageData { get; init; }
}

public class ConversationSession
{
    public string Id { get; } = Guid.NewGuid().ToString();
    public DateTimeOffset CreatedAt { get; } = DateTimeOffset.UtcNow;
    public DateTimeOffset LastActivityAt { get; private set; } = DateTimeOffset.UtcNow;
    public List<ConversationMessage> Messages { get; } = new();
    
    public void AddMessage(string role, string content, string? imageData = null)
    {
        Messages.Add(new ConversationMessage
        {
            Role = role,
            Content = content,
            ImageData = imageData,
            Timestamp = DateTimeOffset.UtcNow
        });
        LastActivityAt = DateTimeOffset.UtcNow;
    }

    public IEnumerable<ConversationMessage> GetRecentMessages(int count = 10)
    {
        return Messages.OrderByDescending(m => m.Timestamp).Take(count).Reverse();
    }
} 