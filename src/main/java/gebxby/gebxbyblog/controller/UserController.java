package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.dto.CurrentUserResponse;
import gebxby.gebxbyblog.dto.ProfileUpdateRequest;
import gebxby.gebxbyblog.dto.PublicUserResponse;
import gebxby.gebxbyblog.model.User;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
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
}
