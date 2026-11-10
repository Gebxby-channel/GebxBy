package gebxby.gebxbyblog.dto;

import java.util.List;

public record UserRelationsPreviewResponse(
        List<PublicUserResponse> followers,
        List<PublicUserResponse> following,
        long followerCount,
        long followingCount
) {
}
