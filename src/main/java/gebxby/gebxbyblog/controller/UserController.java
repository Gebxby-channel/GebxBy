package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.dto.CurrentUserResponse;
import gebxby.gebxbyblog.dto.ContentResponse;
import gebxby.gebxbyblog.dto.ProfileUpdateRequest;
import gebxby.gebxbyblog.dto.PublicUserResponse;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.model.VoteDirection;
import gebxby.gebxbyblog.service.ForumMapper;
import gebxby.gebxbyblog.service.UserService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
public class UserController {
    private final UserService userService;
    private final ForumMapper mapper;
    private final String frontendUrl;
    private final boolean manualLoginEnabled;

    public UserController(UserService userService,
                          ForumMapper mapper,
                          @Value("${app.frontend-url}") String frontendUrl,
                          @Value("${app.manual-login-enabled:false}") boolean manualLoginEnabled) {
        this.userService = userService;
        this.mapper = mapper;
        this.frontendUrl = frontendUrl;
        this.manualLoginEnabled = manualLoginEnabled;
    }

    @PutMapping("/api/user/update")
    public ResponseEntity<CurrentUserResponse> updateProfile(
            @RequestBody ProfileUpdateRequest updates,
            @AuthenticationPrincipal OAuth2User principal) {
        User updatedUser = userService.updateProfile(principal, updates);
        return ResponseEntity.ok(mapper.toCurrentUser(updatedUser));
    }

    @GetMapping("/")
    public void redirectRoot(HttpServletResponse response) throws IOException {
        response.sendRedirect(frontendUrl);
    }

    @GetMapping("/api/user/me")
    public ResponseEntity<CurrentUserResponse> getCurrentUser(@AuthenticationPrincipal OAuth2User principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        User dbUser = userService.processUserLogin(principal);
        return ResponseEntity.ok(mapper.toCurrentUser(dbUser));
    }

    @PostMapping("/api/user/create")
    public ResponseEntity<CurrentUserResponse> createUser(@RequestBody User user) {
        if (!manualLoginEnabled) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Manual login dinonaktifkan di environment ini");
        }
        User newUser = userService.createManualUser(user);
        return ResponseEntity.ok(mapper.toCurrentUser(newUser));
    }

    @GetMapping("/api/user/{id}")
    public ResponseEntity<PublicUserResponse> getUserProfile(@PathVariable UUID id) {
        User dbUser = userService.getUserById(id);
        return ResponseEntity.ok(mapper.toPublicUser(dbUser));
    }

    @GetMapping("/api/user/bookmarks")
    public ResponseEntity<List<ContentResponse>> bookmarks(@AuthenticationPrincipal OAuth2User principal) {
        User user = userService.getCurrentUser(principal);
        return ResponseEntity.ok(userService.getBookmarkedContents(user).stream()
                .map(content -> mapper.toContentResponse(content, VoteDirection.NONE))
                .toList());
    }

    @PostMapping("/api/user/bookmarks/{contentId}")
    public ResponseEntity<CurrentUserResponse> bookmark(
            @PathVariable UUID contentId,
            @AuthenticationPrincipal OAuth2User principal) {
        User user = userService.getCurrentUser(principal);
        return ResponseEntity.ok(mapper.toCurrentUser(userService.bookmarkContent(contentId, user)));
    }

    @DeleteMapping("/api/user/bookmarks/{contentId}")
    public ResponseEntity<CurrentUserResponse> removeBookmark(
            @PathVariable UUID contentId,
            @AuthenticationPrincipal OAuth2User principal) {
        User user = userService.getCurrentUser(principal);
        return ResponseEntity.ok(mapper.toCurrentUser(userService.removeBookmark(contentId, user)));
    }

    @GetMapping("/api/user/following")
    public ResponseEntity<List<PublicUserResponse>> following(@AuthenticationPrincipal OAuth2User principal) {
        User user = userService.getCurrentUser(principal);
        return ResponseEntity.ok(userService.getFollowingUsers(user).stream()
                .map(mapper::toPublicUser)
                .toList());
    }

    @GetMapping("/api/user/followers")
    public ResponseEntity<List<PublicUserResponse>> followers(@AuthenticationPrincipal OAuth2User principal) {
        User user = userService.getCurrentUser(principal);
        return ResponseEntity.ok(userService.getFollowerUsers(user).stream()
                .map(mapper::toPublicUser)
                .toList());
    }

    @GetMapping("/api/user/{id}/following")
    public ResponseEntity<List<PublicUserResponse>> publicFollowing(@PathVariable UUID id) {
        userService.getUserById(id);
        return ResponseEntity.ok(userService.getFollowingUsers(id).stream()
                .map(mapper::toPublicUser)
                .toList());
    }

    @GetMapping("/api/user/{id}/followers")
    public ResponseEntity<List<PublicUserResponse>> publicFollowers(@PathVariable UUID id) {
        userService.getUserById(id);
        return ResponseEntity.ok(userService.getFollowerUsers(id).stream()
                .map(mapper::toPublicUser)
                .toList());
    }

    @PostMapping("/api/user/following/{targetUserId}")
    public ResponseEntity<CurrentUserResponse> follow(
            @PathVariable UUID targetUserId,
            @AuthenticationPrincipal OAuth2User principal) {
        User user = userService.getCurrentUser(principal);
        return ResponseEntity.ok(mapper.toCurrentUser(userService.followUser(targetUserId, user)));
    }

    @DeleteMapping("/api/user/following/{targetUserId}")
    public ResponseEntity<CurrentUserResponse> unfollow(
            @PathVariable UUID targetUserId,
            @AuthenticationPrincipal OAuth2User principal) {
        User user = userService.getCurrentUser(principal);
        return ResponseEntity.ok(mapper.toCurrentUser(userService.unfollowUser(targetUserId, user)));
    }
}
