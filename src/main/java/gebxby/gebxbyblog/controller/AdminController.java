package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.dto.CurrentUserResponse;
import gebxby.gebxbyblog.dto.AdminNotificationRequest;
import gebxby.gebxbyblog.dto.AnnouncementResponse;
import gebxby.gebxbyblog.dto.MediaSmokeTestResponse;
import gebxby.gebxbyblog.dto.NotificationResponse;
import gebxby.gebxbyblog.dto.SuspendUserRequest;
import gebxby.gebxbyblog.model.BadgeCode;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.service.BadgeService;
import gebxby.gebxbyblog.service.ActivityLogService;
import gebxby.gebxbyblog.service.AnnouncementService;
import gebxby.gebxbyblog.service.CommentService;
import gebxby.gebxbyblog.service.ContentService;
import gebxby.gebxbyblog.service.ForumMapper;
import gebxby.gebxbyblog.service.MediaPipelineService;
import gebxby.gebxbyblog.service.NotificationService;
import gebxby.gebxbyblog.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final UserService userService;
    private final ContentService contentService;
    private final CommentService commentService;
    private final NotificationService notificationService;
    private final AnnouncementService announcementService;
    private final BadgeService badgeService;
    private final ActivityLogService activityLogService;
    private final MediaPipelineService mediaPipelineService;
    private final ForumMapper mapper;

    public AdminController(UserService userService,
                           ContentService contentService,
                           CommentService commentService,
                           NotificationService notificationService,
                           AnnouncementService announcementService,
                           BadgeService badgeService,
                           ActivityLogService activityLogService,
                           MediaPipelineService mediaPipelineService,
                           ForumMapper mapper) {
        this.userService = userService;
        this.contentService = contentService;
        this.commentService = commentService;
        this.notificationService = notificationService;
        this.announcementService = announcementService;
        this.badgeService = badgeService;
        this.activityLogService = activityLogService;
        this.mediaPipelineService = mediaPipelineService;
        this.mapper = mapper;
    }

    @GetMapping("/users")
    public ResponseEntity<List<CurrentUserResponse>> listUsers(@AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        return ResponseEntity.ok(userService.getAllUsers(admin).stream()
                .map(mapper::toCurrentUser)
                .toList());
    }

    @PostMapping("/media/smoke-test")
    public ResponseEntity<MediaSmokeTestResponse> smokeTestMedia(@AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        if (!userService.isAdmin(admin)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only");
        }
        return ResponseEntity.ok(mediaPipelineService.smokeTest());
    }

    @PostMapping("/users/{userId}/suspend")
    public ResponseEntity<CurrentUserResponse> suspendUser(
            @PathVariable UUID userId,
            @RequestBody SuspendUserRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        long hours = request == null ? 0 : request.hours();
        User suspended = userService.suspendUser(userId, Duration.ofHours(hours), admin);
        activityLogService.recordSuspension(admin, suspended, Duration.ofHours(hours), true);
        return ResponseEntity.ok(mapper.toCurrentUser(suspended));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Void> deleteUser(
            @PathVariable UUID userId,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        userService.deleteUser(userId, admin);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/contents/{contentId}")
    public ResponseEntity<Void> deleteContent(
            @PathVariable UUID contentId,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        contentService.deleteContent(contentId, admin);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/contents/{contentId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable UUID contentId,
            @PathVariable UUID commentId,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        commentService.deleteComment(contentId, commentId, admin);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/users/{userId}/notifications")
    public ResponseEntity<NotificationResponse> sendNotification(
            @PathVariable UUID userId,
            @RequestBody AdminNotificationRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        return ResponseEntity.ok(notificationService.sendAdminMessage(userId, request, admin));
    }

    @PostMapping("/notifications/broadcast")
    public ResponseEntity<List<NotificationResponse>> broadcastNotification(
            @RequestBody AdminNotificationRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        List<NotificationResponse> notifications = notificationService.sendAdminBroadcast(request, admin);
        announcementService.publish(request, admin);
        return ResponseEntity.ok(notifications);
    }

    @PostMapping("/announcements")
    public ResponseEntity<AnnouncementResponse> publishAnnouncement(
            @RequestBody AdminNotificationRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        return ResponseEntity.ok(announcementService.publish(request, admin));
    }

    @DeleteMapping("/announcements/{announcementId}")
    public ResponseEntity<Void> deleteAnnouncement(
            @PathVariable UUID announcementId,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        announcementService.deleteOwn(announcementId, admin);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/users/{userId}/badges/{badge}")
    public ResponseEntity<CurrentUserResponse> grantBadge(
            @PathVariable UUID userId,
            @PathVariable BadgeCode badge,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        User updated = badgeService.grantBadge(userId, badge, admin);
        activityLogService.recordBadgeAction(admin, updated, badge, true);
        return ResponseEntity.ok(mapper.toCurrentUser(updated));
    }

    @DeleteMapping("/users/{userId}/badges/{badge}")
    public ResponseEntity<CurrentUserResponse> revokeBadge(
            @PathVariable UUID userId,
            @PathVariable BadgeCode badge,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        User updated = badgeService.revokeBadge(userId, badge, admin);
        activityLogService.recordBadgeAction(admin, updated, badge, false);
        return ResponseEntity.ok(mapper.toCurrentUser(updated));
    }
}
