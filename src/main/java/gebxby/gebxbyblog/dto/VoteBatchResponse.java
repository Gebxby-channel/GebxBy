package gebxby.gebxbyblog.dto;

import java.util.List;

public record VoteBatchResponse(
        List<ContentStatsResponse> items
) {
}
