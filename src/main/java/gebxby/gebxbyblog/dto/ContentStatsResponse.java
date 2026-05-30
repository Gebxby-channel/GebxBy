package gebxby.gebxbyblog.dto;

import gebxby.gebxbyblog.model.VoteDirection;

import java.util.UUID;

public record ContentStatsResponse(
        UUID idContent,
        long viewCount,
        int upCount,
        int downCount,
        long commentCount,
        VoteDirection userVote
) {
}
