package gebxby.gebxbyblog.realtime;

import gebxby.gebxbyblog.dto.CommentResponse;
import gebxby.gebxbyblog.dto.NotificationResponse;

import java.util.UUID;

public interface RealtimeGateway {
    void notificationCreated(UUID userId, NotificationResponse notification, long unreadCount);

    void unreadCountChanged(UUID userId, long unreadCount);

    void notificationsRead(UUID userId, long unreadCount);

    void commentCreated(UUID contentId, CommentResponse comment);

    void commentDeleted(UUID contentId, UUID commentId, long commentCount);
}
