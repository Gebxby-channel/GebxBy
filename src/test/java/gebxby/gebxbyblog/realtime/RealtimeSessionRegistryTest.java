package gebxby.gebxbyblog.realtime;

import org.junit.jupiter.api.Test;
import org.springframework.web.socket.WebSocketSession;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RealtimeSessionRegistryTest {
    @Test
    void registerAndUnregisterKeepsUserSessionsIsolated() {
        RealtimeSessionRegistry registry = new RealtimeSessionRegistry();
        UUID userId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        WebSocketSession first = session("first");
        WebSocketSession second = session("second");

        registry.register(userId, first);
        registry.register(otherUserId, second);

        assertEquals(1, registry.sessionsForUser(userId).size());
        assertTrue(registry.sessionsForUser(userId).contains(first));

        registry.unregister(first);

        assertTrue(registry.sessionsForUser(userId).isEmpty());
        assertEquals(1, registry.sessionsForUser(otherUserId).size());
    }

    @Test
    void contentSubscriptionsAreRemovedWhenSessionCloses() {
        RealtimeSessionRegistry registry = new RealtimeSessionRegistry();
        UUID userId = UUID.randomUUID();
        UUID contentId = UUID.randomUUID();
        WebSocketSession session = session("reader");

        registry.register(userId, session);
        registry.subscribeContent(session, contentId);

        assertEquals(1, registry.sessionsForContent(contentId).size());

        registry.unregister(session);

        assertTrue(registry.sessionsForContent(contentId).isEmpty());
    }

    @Test
    void subscribeContentIgnoresUnknownSessions() {
        RealtimeSessionRegistry registry = new RealtimeSessionRegistry();
        UUID contentId = UUID.randomUUID();

        registry.subscribeContent(session("unknown"), contentId);

        assertTrue(registry.sessionsForContent(contentId).isEmpty());
    }

    private WebSocketSession session(String id) {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn(id);
        return session;
    }
}
