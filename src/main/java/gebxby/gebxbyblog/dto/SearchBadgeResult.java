package gebxby.gebxbyblog.dto;

import gebxby.gebxbyblog.model.BadgeCode;

import java.util.List;

public record SearchBadgeResult(
        BadgeCode code,
        String label,
        String description,
        String icon,
        boolean automatic,
        List<PublicUserResponse> users
) {
}
