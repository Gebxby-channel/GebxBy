package gebxby.gebxbyblog.realtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.UUID;

@Component
public class RealtimeWebSocketHandler extends TextWebSocketHandler {
    private final RealtimeSessionRegistry registry;
    private final ObjectMapper objectMapper;

    public RealtimeWebSocketHandler(RealtimeSessionRegistry registry, ObjectMapper objectMapper) {
        this.registry = registry;
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Object userId = session.getAttributes().get(AuthenticatedUserHandshakeInterceptor.USER_ID_ATTRIBUTE);
        if (!(userId instanceof UUID uuid)) {
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Missing user identity"));
            return;
        }
        registry.register(uuid, session);
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(
                RealtimeEnvelope.of(RealtimeEventType.CONNECTED, null)
        )));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
        RealtimeClientMessage clientMessage;
        try {
            clientMessage = objectMapper.readValue(message.getPayload(), RealtimeClientMessage.class);
        } catch (IOException ignored) {
            return;
        }
        String type = clientMessage.type() == null ? "" : clientMessage.type().trim().toUpperCase();
        if ("PING".equals(type)) {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(
                    RealtimeEnvelope.of(RealtimeEventType.PONG, null)
            )));
            return;
        }
        UUID contentId = parseUuid(clientMessage.contentId());
        if (contentId == null) {
            return;
        }
        if ("SUBSCRIBE_CONTENT".equals(type)) {
            registry.subscribeContent(session, contentId);
        } else if ("UNSUBSCRIBE_CONTENT".equals(type)) {
            registry.unsubscribeContent(session, contentId);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        registry.unregister(session);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        registry.unregister(session);
    }

    private UUID parseUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }
}
