package gebxby.gebxbyblog.dto;

import java.util.List;

public record AnalyticsResponse(
        List<ContentResponse> mostRead,
        List<ContentResponse> mostUpvoted,
        List<LeaderboardEntryResponse> weeklyLeaderboard
) {
}
