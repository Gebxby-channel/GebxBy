package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.dto.CurrentUserResponse;
import gebxby.gebxbyblog.dto.AdminNotificationRequest;
import gebxby.gebxbyblog.dto.AnnouncementResponse;
import gebxby.gebxbyblog.dto.BadgeResponse;
import gebxby.gebxbyblog.dto.CustomBadgeRequest;
import gebxby.gebxbyblog.dto.EmailDomainRequest;
import gebxby.gebxbyblog.dto.EmailDomainResponse;
import gebxby.gebxbyblog.dto.GenreRequest;
import gebxby.gebxbyblog.dto.GenreResponse;
import gebxby.gebxbyblog.dto.MediaSmokeTestResponse;
import gebxby.gebxbyblog.dto.NotificationResponse;
import gebxby.gebxbyblog.dto.ProfileCardRequest;
import gebxby.gebxbyblog.dto.ProfileCardResponse;
import gebxby.gebxbyblog.dto.SuspendUserRequest;
import gebxby.gebxbyblog.model.BadgeCode;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.service.BadgeService;
import gebxby.gebxbyblog.service.ActivityLogService;
import gebxby.gebxbyblog.service.AnnouncementService;
import gebxby.gebxbyblog.service.CommentService;
import gebxby.gebxbyblog.service.ContentService;
import gebxby.gebxbyblog.service.EmailDomainPolicyService;
import gebxby.gebxbyblog.service.ForumMapper;
import gebxby.gebxbyblog.service.GenreService;
import gebxby.gebxbyblog.service.MediaPipelineService;
import gebxby.gebxbyblog.service.NotificationService;
import gebxby.gebxbyblog.service.ProfileCardService;
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
    private final GenreService genreService;
    private final ProfileCardService profileCardService;
    private final EmailDomainPolicyService emailDomainPolicyService;
    private final ForumMapper mapper;

    public AdminController(UserService userService,
                           ContentService contentService,
                           CommentService commentService,
                           NotificationService notificationService,
                           AnnouncementService announcementService,
                           BadgeService badgeService,
                           ActivityLogService activityLogService,
                           MediaPipelineService mediaPipelineService,
                           GenreService genreService,
                           ProfileCardService profileCardService,
                           EmailDomainPolicyService emailDomainPolicyService,
                           ForumMapper mapper) {
        this.userService = userService;
        this.contentService = contentService;
        this.commentService = commentService;
        this.notificationService = notificationService;
        this.announcementService = announcementService;
        this.badgeService = badgeService;
        this.activityLogService = activityLogService;
        this.mediaPipelineService = mediaPipelineService;
        this.genreService = genreService;
        this.profileCardService = profileCardService;
        this.emailDomainPolicyService = emailDomainPolicyService;
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

    @GetMapping("/custom-badges")
    public ResponseEntity<List<BadgeResponse>> listCustomBadges(@AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        if (!userService.isAdmin(admin)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only");
        }
        return ResponseEntity.ok(badgeService.definitions());
    }

    @PostMapping("/custom-badges")
    public ResponseEntity<BadgeResponse> createCustomBadge(
            @RequestBody CustomBadgeRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(badgeService.createCustomBadge(request, admin));
    }

    @PostMapping("/custom-badges/{badgeId}")
    public ResponseEntity<BadgeResponse> updateCustomBadge(
            @PathVariable UUID badgeId,
            @RequestBody CustomBadgeRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        return ResponseEntity.ok(badgeService.updateCustomBadge(badgeId, request, admin));
    }

    @DeleteMapping("/custom-badges/{badgeId}")
    public ResponseEntity<Void> deleteCustomBadge(
            @PathVariable UUID badgeId,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        badgeService.deleteCustomBadge(badgeId, admin);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/users/{userId}/custom-badges/{badgeId}")
    public ResponseEntity<CurrentUserResponse> grantCustomBadge(
            @PathVariable UUID userId,
            @PathVariable UUID badgeId,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        String label = customBadgeLabel(badgeId);
        User updated = badgeService.grantCustomBadge(userId, badgeId, admin);
        activityLogService.recordCustomBadgeAction(admin, updated, label, true);
        return ResponseEntity.ok(mapper.toCurrentUser(updated));
    }

    @DeleteMapping("/users/{userId}/custom-badges/{badgeId}")
    public ResponseEntity<CurrentUserResponse> revokeCustomBadge(
            @PathVariable UUID userId,
            @PathVariable UUID badgeId,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        String label = customBadgeLabel(badgeId);
        User updated = badgeService.revokeCustomBadge(userId, badgeId, admin);
        activityLogService.recordCustomBadgeAction(admin, updated, label, false);
        return ResponseEntity.ok(mapper.toCurrentUser(updated));
    }

    private String customBadgeLabel(UUID badgeId) {
        return badgeService.definitions().stream()
                .filter(badge -> badge.id().equals(badgeId.toString()))
                .map(BadgeResponse::label)
                .findFirst()
                .orElse(badgeId.toString());
    }

    @GetMapping("/email-domains")
    public ResponseEntity<List<EmailDomainResponse>> listEmailDomains(@AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        return ResponseEntity.ok(emailDomainPolicyService.findAll(admin));
    }

    @PostMapping("/email-domains")
    public ResponseEntity<EmailDomainResponse> createEmailDomain(
            @RequestBody EmailDomainRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(emailDomainPolicyService.create(request, admin));
    }

    @DeleteMapping("/email-domains/{domainId}")
    public ResponseEntity<Void> deleteEmailDomain(
            @PathVariable UUID domainId,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        emailDomainPolicyService.delete(domainId, admin);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/genres")
    public ResponseEntity<List<GenreResponse>> listGenres(@AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        if (!userService.isAdmin(admin)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only");
        }
        return ResponseEntity.ok(genreService.findAll());
    }

    @PostMapping("/genres")
    public ResponseEntity<GenreResponse> createGenre(
            @RequestBody GenreRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(genreService.create(request, admin));
    }

    @PostMapping("/genres/{genreId}")
    public ResponseEntity<GenreResponse> updateGenre(
            @PathVariable UUID genreId,
            @RequestBody GenreRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        return ResponseEntity.ok(genreService.update(genreId, request, admin));
    }

    @DeleteMapping("/genres/{genreId}")
    public ResponseEntity<Void> deleteGenre(
            @PathVariable UUID genreId,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        genreService.delete(genreId, admin);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/profile-card-templates")
    public ResponseEntity<List<ProfileCardResponse>> listProfileCardTemplates(@AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        return ResponseEntity.ok(profileCardService.findTemplates(admin));
    }

    @PostMapping("/profile-card-templates")
    public ResponseEntity<ProfileCardResponse> createProfileCardTemplate(
            @RequestBody ProfileCardRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(profileCardService.createTemplate(request, admin));
    }

    @PostMapping("/profile-card-templates/{templateId}")
    public ResponseEntity<ProfileCardResponse> updateProfileCardTemplate(
            @PathVariable UUID templateId,
            @RequestBody ProfileCardRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        return ResponseEntity.ok(profileCardService.updateTemplate(templateId, request, admin));
    }

    @DeleteMapping("/profile-card-templates/{templateId}")
    public ResponseEntity<Void> deleteProfileCardTemplate(
            @PathVariable UUID templateId,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        profileCardService.deleteTemplate(templateId, admin);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/users/{userId}/profile-cards/{templateId}")
    public ResponseEntity<ProfileCardResponse> grantProfileCard(
            @PathVariable UUID userId,
            @PathVariable UUID templateId,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        ProfileCardResponse card = profileCardService.grantCard(templateId, userId, admin);
        notificationService.sendAdminMessage(userId, new AdminNotificationRequest(
                "Profile card granted",
                "Admin memberikan profile card baru: %s".formatted(card.name())
        ), admin);
        return ResponseEntity.ok(card);
    }

    @DeleteMapping("/users/{userId}/profile-cards/{cardId}")
    public ResponseEntity<Void> revokeProfileCard(
            @PathVariable UUID userId,
            @PathVariable UUID cardId,
            @AuthenticationPrincipal OAuth2User principal) {
        User admin = userService.getCurrentUser(principal);
        profileCardService.deleteUserCardForAdmin(cardId, userId, admin);
        return ResponseEntity.noContent().build();
    }
}
