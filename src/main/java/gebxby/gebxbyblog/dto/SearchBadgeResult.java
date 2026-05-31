package gebxby.gebxbyblog.dto;

import gebxby.gebxbyblog.model.BadgeCode;

import java.util.List;

public record SearchBadgeResult(
        String id,
        BadgeCode code,
        String label,
        String description,
        String icon,
        boolean automatic,
        boolean custom,
        List<PublicUserResponse> users
) {
    public SearchBadgeResult(BadgeCode code,
                             String label,
                             String description,
                             String icon,
                             boolean automatic,
                             List<PublicUserResponse> users) {
        this(code.name(), code, label, description, icon, automatic, false, users);
    }
}
