package gebxby.gebxbyblog.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record SearchContentResult(
        UUID idContent,
        String head,
        String subtitle,
        String kategori,
        PublicUserResponse user,
        long viewCount,
        int upCount,
        long commentCount,
        LocalDateTime createdAt
) {
}
