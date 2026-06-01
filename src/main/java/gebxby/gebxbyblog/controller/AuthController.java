package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.dto.CurrentUserResponse;
import gebxby.gebxbyblog.dto.EmailLoginRequest;
import gebxby.gebxbyblog.dto.SignupRequest;
import gebxby.gebxbyblog.dto.UsernameCheckResponse;
import gebxby.gebxbyblog.dto.UsernameSuggestResponse;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.service.ForumMapper;
import gebxby.gebxbyblog.service.LoginRateLimiter;
import gebxby.gebxbyblog.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class AuthController {
    private final UserService userService;
    private final ForumMapper mapper;
    private final LoginRateLimiter loginRateLimiter;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    public AuthController(UserService userService, ForumMapper mapper, LoginRateLimiter loginRateLimiter) {
        this.userService = userService;
        this.mapper = mapper;
        this.loginRateLimiter = loginRateLimiter;
    }

    @PostMapping("/api/auth/email-login")
    public ResponseEntity<CurrentUserResponse> emailLogin(
            @RequestBody EmailLoginRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        String email = request == null ? null : request.email();
        String remoteAddress = clientAddress(servletRequest);
        loginRateLimiter.check(email, remoteAddress);
        User user = userService.loginWithEmailPassword(
                email,
                request == null ? null : request.password()
        );
        loginRateLimiter.reset(email, remoteAddress);
        saveSession(user, servletRequest, servletResponse);
        return ResponseEntity.ok(mapper.toCurrentUser(user));
    }

    @PostMapping("/api/auth/signup")
    public ResponseEntity<CurrentUserResponse> signup(
            @RequestBody SignupRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        User user = userService.registerWithEmail(request);
        saveSession(user, servletRequest, servletResponse);
        return ResponseEntity.ok(mapper.toCurrentUser(user));
    }

    @GetMapping("/api/usernames/check")
    public ResponseEntity<UsernameCheckResponse> checkUsername(@RequestParam String username) {
        return ResponseEntity.ok(userService.checkUsername(username));
    }

    @GetMapping("/api/usernames/suggest")
    public ResponseEntity<UsernameSuggestResponse> suggestUsername(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String email) {
        String seed = (name == null ? "" : name) + " " + (email == null ? "" : email);
        return ResponseEntity.ok(new UsernameSuggestResponse(userService.suggestUsernames(seed, 5)));
    }

    private void saveSession(User user, HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
        OAuth2User principal = toPrincipal(user);
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                principal,
                null,
                principal.getAuthorities()
        );
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, servletRequest, servletResponse);
    }

    private OAuth2User toPrincipal(User user) {
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("sub", user.getGoogleId());
        attributes.put("email", user.getEmail());
        attributes.put("name", user.getName());
        attributes.put("username", user.getUsername());
        attributes.put("picture", user.getPhoto());
        String authority = user.isAdmin() ? "ROLE_ADMIN" : "ROLE_USER";
        return new DefaultOAuth2User(List.of(new SimpleGrantedAuthority(authority)), attributes, "sub");
    }

    private String clientAddress(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
