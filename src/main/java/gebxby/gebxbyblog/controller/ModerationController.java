package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.dto.AdminNotificationRequest;
import gebxby.gebxbyblog.dto.CurrentUserResponse;
import gebxby.gebxbyblog.dto.NotificationResponse;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.service.ForumMapper;
import gebxby.gebxbyblog.service.ActivityLogService;
import gebxby.gebxbyblog.service.NotificationService;
import gebxby.gebxbyblog.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.UUID;

@RestController
@RequestMapping("/api/moderation")
public class ModerationController {
    private final UserService userService;
    private final NotificationService notificationService;
    private final ActivityLogService activityLogService;
    private final ForumMapper mapper;

    public ModerationController(UserService userService,
                                NotificationService notificationService,
                                ActivityLogService activityLogService,
                                ForumMapper mapper) {
        this.userService = userService;
        this.notificationService = notificationService;
        this.activityLogService = activityLogService;
        this.mapper = mapper;
    }

    @PostMapping("/users/{userId}/suspend")
    public ResponseEntity<CurrentUserResponse> suspendForOneHour(
            @PathVariable UUID userId,
            @AuthenticationPrincipal OAuth2User principal) {
        User moderator = userService.getCurrentUser(principal);
        User suspended = userService.moderatorSuspendUser(userId, moderator);
        activityLogService.recordSuspension(moderator, suspended, Duration.ofHours(1), false);
        return ResponseEntity.ok(mapper.toCurrentUser(suspended));
    }

    @PostMapping("/admins/{adminUserId}/report")
    public ResponseEntity<NotificationResponse> reportToAdmin(
            @PathVariable UUID adminUserId,
            @RequestBody AdminNotificationRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        User moderator = userService.getCurrentUser(principal);
        return ResponseEntity.ok(notificationService.sendModeratorReport(adminUserId, request, moderator));
    }
}
