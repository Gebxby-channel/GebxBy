package gebxby.gebxbyblog.dto;

import gebxby.gebxbyblog.model.BadgeCode;

public record BadgeResponse(
        BadgeCode code,
        String label,
        String description,
        String icon,
        boolean automatic
) {
}
