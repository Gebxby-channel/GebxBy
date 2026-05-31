package gebxby.gebxbyblog.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ProfileCardResponse(
        String id,
        String code,
        String name,
        String description,
        String backgroundImage,
        String orientation,
        ProfileCardLayoutResponse layout,
        String displayName,
        String displayPhoto,
        boolean custom,
        boolean template,
        LocalDateTime grantedAt,
        UUID sourceTemplateId
) {
    public ProfileCardResponse(String id,
                               String code,
                               String name,
                               String description,
                               String backgroundImage,
                               String orientation,
                               ProfileCardLayoutResponse layout,
                               boolean custom,
                               boolean template,
                               LocalDateTime grantedAt,
                               UUID sourceTemplateId) {
        this(id, code, name, description, backgroundImage, orientation, layout, null, null, custom, template, grantedAt, sourceTemplateId);
    }
}
