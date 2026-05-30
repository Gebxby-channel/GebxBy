package gebxby.gebxbyblog.dto;

public record LeaderboardEntryResponse(
        PublicUserResponse user,
        long upCount
) {
}
