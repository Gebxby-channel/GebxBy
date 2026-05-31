package gebxby.gebxbyblog.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record PublicUserResponse(
        UUID userID,
        String name,
        String picture,
        String designation,
        String moto,
        boolean suspensionMarked,
        LocalDateTime suspendedUntil,
        List<BadgeResponse> badges,
        ProfileCardResponse activeProfileCard
) {
    public PublicUserResponse(UUID userID,
                              String name,
                              String picture,
                              String designation,
                              String moto,
                              boolean suspensionMarked,
                              LocalDateTime suspendedUntil,
                              List<BadgeResponse> badges) {
        this(userID, name, picture, designation, moto, suspensionMarked, suspendedUntil, badges, null);
    }
}
