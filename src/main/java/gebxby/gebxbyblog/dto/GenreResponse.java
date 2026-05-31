package gebxby.gebxbyblog.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record GenreResponse(
        UUID id,
        String name,
        String color,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
