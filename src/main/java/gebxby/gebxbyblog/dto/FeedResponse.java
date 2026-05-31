package gebxby.gebxbyblog.dto;

import java.util.List;

public record FeedResponse(
        List<ContentResponse> items,
        int page,
        int limit,
        boolean hasMore
) {
}
