package gebxby.gebxbyblog.realtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import gebxby.gebxbyblog.dto.CommentResponse;
import gebxby.gebxbyblog.dto.NotificationResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

@Component
public class WebSocketRealtimeGateway implements RealtimeGateway {
    private final RealtimeSessionRegistry registry;
    private final ObjectMapper objectMapper;

    public WebSocketRealtimeGateway(RealtimeSessionRegistry registry, ObjectMapper objectMapper) {
        this.registry = registry;
        this.objectMapper = objectMapper;
    }

    @Override
    public void notificationCreated(UUID userId, NotificationResponse notification, long unreadCount) {
        sendToUser(userId, RealtimeEnvelope.of(
                RealtimeEventType.NOTIFICATION_CREATED,
                new NotificationRealtimePayload(notification, unreadCount)
        ));
    }

    @Override
    public void unreadCountChanged(UUID userId, long unreadCount) {
        sendToUser(userId, RealtimeEnvelope.of(
                RealtimeEventType.UNREAD_COUNT,
                new UnreadCountRealtimePayload(unreadCount)
        ));
    }

    @Override
    public void notificationsRead(UUID userId, long unreadCount) {
        sendToUser(userId, RealtimeEnvelope.of(
                RealtimeEventType.NOTIFICATIONS_READ,
                new UnreadCountRealtimePayload(unreadCount)
        ));
    }

    @Override
    public void commentCreated(UUID contentId, CommentResponse comment) {
        sendToContent(contentId, RealtimeEnvelope.of(
                RealtimeEventType.COMMENT_CREATED,
                new CommentCreatedRealtimePayload(contentId, comment)
        ));
    }

    @Override
    public void commentDeleted(UUID contentId, UUID commentId, long commentCount) {
        sendToContent(contentId, RealtimeEnvelope.of(
                RealtimeEventType.COMMENT_DELETED,
                new CommentDeletedRealtimePayload(contentId, commentId, commentCount)
        ));
    }

    private void sendToUser(UUID userId, RealtimeEnvelope envelope) {
        send(registry.sessionsForUser(userId), envelope);
    }

    private void sendToContent(UUID contentId, RealtimeEnvelope envelope) {
        send(registry.sessionsForContent(contentId), envelope);
    }

    private void send(Set<WebSocketSession> sessions, RealtimeEnvelope envelope) {
        if (sessions.isEmpty()) {
            return;
        }
        String payload;
        try {
            payload = objectMapper.writeValueAsString(envelope);
        } catch (IOException ignored) {
            return;
        }
        TextMessage message = new TextMessage(payload);
        sessions.forEach(session -> send(session, message));
    }

    private void send(WebSocketSession session, TextMessage message) {
        if (session == null || !session.isOpen()) {
            registry.unregister(session);
            return;
        }
        try {
            synchronized (session) {
                if (session.isOpen()) {
                    session.sendMessage(message);
                }
            }
        } catch (IOException ignored) {
            registry.unregister(session);
        }
    }
}
