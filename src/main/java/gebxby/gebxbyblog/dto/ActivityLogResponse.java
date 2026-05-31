package gebxby.gebxbyblog.dto;

import gebxby.gebxbyblog.model.ActivityLogDirection;
import gebxby.gebxbyblog.model.ActivityLogType;
import gebxby.gebxbyblog.model.ActivityTargetType;

import java.time.LocalDateTime;
import java.util.UUID;

public record ActivityLogResponse(
        UUID id,
        ActivityLogType type,
        ActivityLogDirection direction,
        ActivityTargetType targetType,
        String title,
        String message,
        String reason,
        UUID actorUserId,
        String actorName,
        String actorPhoto,
        UUID targetUserId,
        String targetUserName,
        UUID contentId,
        String contentTitle,
        UUID commentId,
        boolean reportQueue,
        boolean resolved,
        LocalDateTime createdAt,
        LocalDateTime resolvedAt
) {
}
