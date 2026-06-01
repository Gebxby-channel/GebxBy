package gebxby.gebxbyblog.realtime;

import gebxby.gebxbyblog.dto.CommentResponse;

import java.util.UUID;

public record CommentCreatedRealtimePayload(
        UUID contentId,
        CommentResponse comment
) {
}
