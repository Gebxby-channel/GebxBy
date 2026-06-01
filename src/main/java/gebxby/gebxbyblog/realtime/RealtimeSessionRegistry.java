package gebxby.gebxbyblog.realtime;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Collections;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
public class RealtimeSessionRegistry {
    private final ConcurrentMap<UUID, Set<WebSocketSession>> sessionsByUser = new ConcurrentHashMap<>();
    private final ConcurrentMap<UUID, Set<WebSocketSession>> sessionsByContent = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, UUID> userIdBySessionId = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Set<UUID>> contentIdsBySessionId = new ConcurrentHashMap<>();

    public void register(UUID userId, WebSocketSession session) {
        if (userId == null || session == null) {
            return;
        }
        userIdBySessionId.put(session.getId(), userId);
        sessionsByUser.computeIfAbsent(userId, ignored -> ConcurrentHashMap.newKeySet()).add(session);
    }

    public void unregister(WebSocketSession session) {
        if (session == null) {
            return;
        }
        String sessionId = session.getId();
        UUID userId = userIdBySessionId.remove(sessionId);
        if (userId != null) {
            removeSession(sessionsByUser, userId, session);
        }
        Set<UUID> contentIds = contentIdsBySessionId.remove(sessionId);
        if (contentIds != null) {
            contentIds.forEach(contentId -> removeSession(sessionsByContent, contentId, session));
        }
    }

    public void subscribeContent(WebSocketSession session, UUID contentId) {
        if (session == null || contentId == null || !userIdBySessionId.containsKey(session.getId())) {
            return;
        }
        contentIdsBySessionId.computeIfAbsent(session.getId(), ignored -> ConcurrentHashMap.newKeySet()).add(contentId);
        sessionsByContent.computeIfAbsent(contentId, ignored -> ConcurrentHashMap.newKeySet()).add(session);
    }

    public void unsubscribeContent(WebSocketSession session, UUID contentId) {
        if (session == null || contentId == null) {
            return;
        }
        Set<UUID> contentIds = contentIdsBySessionId.get(session.getId());
        if (contentIds != null) {
            contentIds.remove(contentId);
            if (contentIds.isEmpty()) {
                contentIdsBySessionId.remove(session.getId());
            }
        }
        removeSession(sessionsByContent, contentId, session);
    }

    public Set<WebSocketSession> sessionsForUser(UUID userId) {
        return Set.copyOf(sessionsByUser.getOrDefault(userId, Collections.emptySet()));
    }

    public Set<WebSocketSession> sessionsForContent(UUID contentId) {
        return Set.copyOf(sessionsByContent.getOrDefault(contentId, Collections.emptySet()));
    }

    private void removeSession(ConcurrentMap<UUID, Set<WebSocketSession>> registry, UUID key, WebSocketSession session) {
        Set<WebSocketSession> sessions = registry.get(key);
        if (sessions == null) {
            return;
        }
        sessions.remove(session);
        if (sessions.isEmpty()) {
            registry.remove(key);
        }
    }
}
