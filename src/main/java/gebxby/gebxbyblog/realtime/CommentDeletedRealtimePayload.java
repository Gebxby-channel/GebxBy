package gebxby.gebxbyblog.realtime;

import java.util.UUID;

public record CommentDeletedRealtimePayload(
        UUID contentId,
        UUID commentId,
        long commentCount
) {
}
