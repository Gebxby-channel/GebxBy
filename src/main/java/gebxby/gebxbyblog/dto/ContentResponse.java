package gebxby.gebxbyblog.dto;

import gebxby.gebxbyblog.model.VoteDirection;

import java.time.LocalDateTime;
import java.util.UUID;

public record ContentResponse(
        UUID idContent,
        String head,
        String subtitle,
        String paragrafs,
        PublicUserResponse user,
        String kategori,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        long viewCount,
        int upCount,
        int downCount,
        long commentCount,
        VoteDirection userVote
) {
}
