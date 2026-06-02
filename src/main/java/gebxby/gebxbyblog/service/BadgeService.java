package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.BadgeResponse;
import gebxby.gebxbyblog.dto.CustomBadgeRequest;
import gebxby.gebxbyblog.model.BadgeCode;
import gebxby.gebxbyblog.model.User;

import java.util.List;
import java.util.UUID;

public interface BadgeService {
    List<BadgeResponse> effectiveBadges(User user);
    boolean hasBadge(User user, BadgeCode badge);
    User grantBadge(UUID userId, BadgeCode badge, User admin);
    User revokeBadge(UUID userId, BadgeCode badge, User admin);
    BadgeResponse createCustomBadge(CustomBadgeRequest request, User admin);
    BadgeResponse updateCustomBadge(UUID badgeId, CustomBadgeRequest request, User admin);
    void deleteCustomBadge(UUID badgeId, User admin);
    User grantCustomBadge(UUID userId, UUID badgeId, User admin);
    User revokeCustomBadge(UUID userId, UUID badgeId, User admin);
    List<BadgeResponse> definitions();
}
