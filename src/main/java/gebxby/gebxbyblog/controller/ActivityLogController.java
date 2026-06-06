package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.dto.ActivityLogResponse;
import gebxby.gebxbyblog.dto.ReportRequest;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.service.ActivityLogService;
import gebxby.gebxbyblog.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/logs")
public class ActivityLogController {
    private final ActivityLogService activityLogService;
    private final UserService userService;

    public ActivityLogController(ActivityLogService activityLogService, UserService userService) {
        this.activityLogService = activityLogService;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<ActivityLogResponse>> basis(
            @RequestParam(value = "limit", defaultValue = "80") int limit,
            @AuthenticationPrincipal OAuth2User principal) {
        User user = userService.getCurrentUser(principal);
        return ResponseEntity.ok(activityLogService.findBasis(user, limit));
    }

    @GetMapping("/reports")
    public ResponseEntity<List<ActivityLogResponse>> reports(
            @RequestParam(value = "limit", defaultValue = "80") int limit,
            @AuthenticationPrincipal OAuth2User principal) {
        User user = userService.getCurrentUser(principal);
        return ResponseEntity.ok(activityLogService.findReportQueue(user, limit, userService.isModerator(user)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ActivityLogResponse> detail(
            @PathVariable UUID id,
            @AuthenticationPrincipal OAuth2User principal) {
        User user = userService.getCurrentUser(principal);
        return ResponseEntity.ok(activityLogService.findOne(id, user, userService.isModerator(user)));
    }

    @PostMapping("/reports/{id}/resolve")
    public ResponseEntity<ActivityLogResponse> resolveReport(
            @PathVariable UUID id,
            @AuthenticationPrincipal OAuth2User principal) {
        User user = userService.getCurrentUser(principal);
        return ResponseEntity.ok(activityLogService.resolveReport(id, user, userService.isModerator(user)));
    }

    @DeleteMapping("/reports/{id}")
    public ResponseEntity<Void> rejectReport(
            @PathVariable UUID id,
            @AuthenticationPrincipal OAuth2User principal) {
        User user = userService.getCurrentUser(principal);
        activityLogService.rejectReport(id, user, userService.isAdmin(user));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Map<String, Long>> clearBasis(@AuthenticationPrincipal OAuth2User principal) {
        User user = userService.getCurrentUser(principal);
        return ResponseEntity.ok(Map.of("deleted", activityLogService.clearUserBasis(user)));
    }

    @PostMapping("/reports/content/{contentId}")
    public ResponseEntity<ActivityLogResponse> reportContent(
            @PathVariable UUID contentId,
            @RequestBody ReportRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        User reporter = userService.getCurrentUser(principal);
        UUID logId = activityLogService.recordUserReport(reporter, contentId, null, request).getId();
        return ResponseEntity.ok(activityLogService.findOne(logId, reporter, userService.isModerator(reporter)));
    }

    @PostMapping("/reports/content/{contentId}/comments/{commentId}")
    public ResponseEntity<ActivityLogResponse> reportComment(
            @PathVariable UUID contentId,
            @PathVariable UUID commentId,
            @RequestBody ReportRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        User reporter = userService.getCurrentUser(principal);
        UUID logId = activityLogService.recordUserReport(reporter, contentId, commentId, request).getId();
        return ResponseEntity.ok(activityLogService.findOne(logId, reporter, userService.isModerator(reporter)));
    }
}
