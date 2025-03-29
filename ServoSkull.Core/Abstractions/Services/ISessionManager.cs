using ServoSkull.Core.Models.Chat;

namespace ServoSkull.Core.Abstractions.Services;

public interface ISessionManager
{
    ConversationSession GetOrCreateSession(string connectionId);
    void RemoveSession(string connectionId);
    void AddMessage(string connectionId, string role, string content, string? imageData = null);
    IEnumerable<ConversationMessage> GetRecentMessages(string connectionId, int count = 10);
} 