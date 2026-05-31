package gebxby.gebxbyblog.dto;

import gebxby.gebxbyblog.model.BadgeCode;

import java.util.UUID;

public record BadgeResponse(
        String id,
        BadgeCode code,
        String label,
        String description,
        String icon,
        boolean automatic,
        boolean custom
) {
    public BadgeResponse(BadgeCode code, String label, String description, String icon, boolean automatic) {
        this(code.name(), code, label, description, icon, automatic, false);
    }

    public static BadgeResponse custom(UUID id, String label, String description, String icon) {
        return new BadgeResponse(id.toString(), null, label, description, icon, false, true);
    }
}
