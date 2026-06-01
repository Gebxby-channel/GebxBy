package gebxby.gebxbyblog.realtime;

import gebxby.gebxbyblog.dto.NotificationResponse;

public record NotificationRealtimePayload(
        NotificationResponse notification,
        long unreadCount
) {
}
