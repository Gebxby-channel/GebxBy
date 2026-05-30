package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.BadgeResponse;
import gebxby.gebxbyblog.model.BadgeCode;
import gebxby.gebxbyblog.model.User;

import java.util.List;
import java.util.UUID;

public interface BadgeService {
    List<BadgeResponse> effectiveBadges(User user);
    boolean hasBadge(User user, BadgeCode badge);
    User grantBadge(UUID userId, BadgeCode badge, User admin);
    User revokeBadge(UUID userId, BadgeCode badge, User admin);
    List<BadgeResponse> definitions();
}
