package gebxby.gebxbyblog.dto;

import gebxby.gebxbyblog.model.NotificationType;

import java.time.LocalDateTime;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        NotificationType type,
        String title,
        String message,
        UUID actorUserId,
        String actorName,
        String actorPhoto,
        UUID contentId,
        String contentTitle,
        UUID commentId,
        UUID logId,
        boolean read,
        LocalDateTime createdAt,
        LocalDateTime expiresAt
) {
}
