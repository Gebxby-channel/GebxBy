package gebxby.gebxbyblog.dto;

import java.util.List;

public record CommentPageResponse(
        List<CommentResponse> items,
        int page,
        int limit,
        boolean hasMore
) {
}
