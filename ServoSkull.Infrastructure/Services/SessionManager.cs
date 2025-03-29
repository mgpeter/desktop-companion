using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using ServoSkull.Core.Abstractions.Services;
using ServoSkull.Core.Models.Chat;

namespace ServoSkull.Infrastructure.Services;

public class SessionManager : ISessionManager
{
    private readonly ConcurrentDictionary<string, ConversationSession> _sessions = new();
    private readonly ILogger<SessionManager> _logger;

    public SessionManager(ILogger<SessionManager> logger)
    {
        _logger = logger;
    }

    public ConversationSession GetOrCreateSession(string connectionId)
    {
        return _sessions.GetOrAdd(connectionId, _ =>
        {
            var session = new ConversationSession();
            _logger.LogInformation("Created new session {SessionId} for connection {ConnectionId}", 
                session.Id, connectionId);
            return session;
        });
    }

    public void RemoveSession(string connectionId)
    {
        if (_sessions.TryRemove(connectionId, out var session))
        {
            _logger.LogInformation("Removed session {SessionId} for connection {ConnectionId}", 
                session.Id, connectionId);
        }
    }

    public void AddMessage(string connectionId, string role, string content, string? imageData = null)
    {
        var session = GetOrCreateSession(connectionId);
        session.AddMessage(role, content, imageData);
        _logger.LogDebug("Added {Role} message to session {SessionId}", role, session.Id);
    }

    public IEnumerable<ConversationMessage> GetRecentMessages(string connectionId, int count = 10)
    {
        var session = GetOrCreateSession(connectionId);
        return session.GetRecentMessages(count);
    }
} 