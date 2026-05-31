package gebxby.gebxbyblog.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record AnnouncementResponse(
        UUID id,
        String title,
        String message,
        UUID adminUserId,
        String adminName,
        String adminPhoto,
        LocalDateTime createdAt
) {
}
