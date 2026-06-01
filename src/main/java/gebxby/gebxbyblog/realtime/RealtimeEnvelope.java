package gebxby.gebxbyblog.realtime;

import java.time.LocalDateTime;

public record RealtimeEnvelope(
        RealtimeEventType type,
        Object payload,
        LocalDateTime sentAt
) {
    public static RealtimeEnvelope of(RealtimeEventType type, Object payload) {
        return new RealtimeEnvelope(type, payload, LocalDateTime.now());
    }
}
