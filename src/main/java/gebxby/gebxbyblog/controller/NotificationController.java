package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.dto.NotificationResponse;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.service.NotificationService;
import gebxby.gebxbyblog.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notificationService;
    private final UserService userService;

    public NotificationController(NotificationService notificationService, UserService userService) {
        this.notificationService = notificationService;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> listNotifications(
            @RequestParam(value = "limit", defaultValue = "30") int limit,
            @AuthenticationPrincipal OAuth2User principal) {
        User user = userService.getCurrentUser(principal);
        return ResponseEntity.ok(notificationService.findForUser(user, limit));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(@AuthenticationPrincipal OAuth2User principal) {
        User user = userService.getCurrentUser(principal);
        return ResponseEntity.ok(Map.of("count", notificationService.countUnread(user)));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markRead(
            @PathVariable UUID id,
            @AuthenticationPrincipal OAuth2User principal) {
        User user = userService.getCurrentUser(principal);
        return ResponseEntity.ok(notificationService.markRead(id, user));
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal OAuth2User principal) {
        User user = userService.getCurrentUser(principal);
        notificationService.markAllRead(user);
        return ResponseEntity.noContent().build();
    }
}
