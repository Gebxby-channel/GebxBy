package gebxby.gebxbyblog.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record CommentResponse(
        UUID id,
        UUID contentId,
        UUID parentId,
        PublicUserResponse user,
        String body,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        boolean deleted,
        boolean adminHighlighted,
        List<CommentResponse> replies
) {
}
