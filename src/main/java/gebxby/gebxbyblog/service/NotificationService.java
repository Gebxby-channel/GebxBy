package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.AdminNotificationRequest;
import gebxby.gebxbyblog.dto.NotificationResponse;
import gebxby.gebxbyblog.model.Comment;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.User;

import java.util.List;
import java.util.UUID;

public interface NotificationService {
    List<NotificationResponse> findForUser(User user, int limit);
    long countUnread(User user);
    NotificationResponse markRead(UUID notificationId, User user);
    void markAllRead(User user);
    void notifyCommentOnContent(Content content, Comment comment);
    NotificationResponse sendAdminMessage(UUID recipientUserId, AdminNotificationRequest request, User admin);
    List<NotificationResponse> sendAdminBroadcast(AdminNotificationRequest request, User admin);
    NotificationResponse sendModeratorReport(UUID adminUserId, AdminNotificationRequest request, User moderator);
    void deleteExpired();
}
