package gebxby.gebxbyblog.dto;

import java.util.List;

public record SearchResponse(
        String query,
        List<PublicUserResponse> users,
        List<SearchContentResult> contents,
        List<SearchBadgeResult> badges
) {
}
