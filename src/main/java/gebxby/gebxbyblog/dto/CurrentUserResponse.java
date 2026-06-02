package gebxby.gebxbyblog.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public record CurrentUserResponse(
        UUID userID,
        String name,
        String username,
        String email,
        String picture,
        String designation,
        String moto,
        String role,
        boolean suspensionMarked,
        LocalDateTime suspendedUntil,
        List<BadgeResponse> badges,
        Set<UUID> bookmarkedContentIds,
        Set<UUID> followingUserIds,
        ProfileCardResponse activeProfileCard,
        List<ProfileCardResponse> profileCards,
        boolean onboardingComplete,
        boolean customEmailDomainTrusted
) {
    public CurrentUserResponse(UUID userID,
                               String name,
                               String email,
                               String picture,
                               String designation,
                               String moto,
                               String role,
                               boolean suspensionMarked,
                               LocalDateTime suspendedUntil,
                               List<BadgeResponse> badges,
                               Set<UUID> bookmarkedContentIds,
                               Set<UUID> followingUserIds) {
        this(userID, name, null, email, picture, designation, moto, role, suspensionMarked, suspendedUntil,
                badges, bookmarkedContentIds, followingUserIds, null, List.of(), true, false);
    }

    public CurrentUserResponse(UUID userID,
                               String name,
                               String email,
                               String picture,
                               String designation,
                               String moto,
                               String role,
                               boolean suspensionMarked,
                               LocalDateTime suspendedUntil,
                               List<BadgeResponse> badges,
                               Set<UUID> bookmarkedContentIds,
                               Set<UUID> followingUserIds,
                               ProfileCardResponse activeProfileCard,
                               List<ProfileCardResponse> profileCards) {
        this(userID, name, null, email, picture, designation, moto, role, suspensionMarked, suspendedUntil,
                badges, bookmarkedContentIds, followingUserIds, activeProfileCard, profileCards, true, false);
    }
}
