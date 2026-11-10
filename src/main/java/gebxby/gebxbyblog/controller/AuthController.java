package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.dto.CurrentUserResponse;
import gebxby.gebxbyblog.dto.AuthChallengeResponse;
import gebxby.gebxbyblog.dto.EmailLoginRequest;
import gebxby.gebxbyblog.dto.SignupRequest;
import gebxby.gebxbyblog.dto.VerificationCodeRequest;
import gebxby.gebxbyblog.dto.UsernameCheckResponse;
import gebxby.gebxbyblog.dto.UsernameSuggestResponse;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.service.ForumMapper;
import gebxby.gebxbyblog.service.LoginRateLimiter;
import gebxby.gebxbyblog.service.LoginVerificationService;
import gebxby.gebxbyblog.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
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
import java.util.UUID;

@RestController
public class AuthController {
    private final UserService userService;
    private final ForumMapper mapper;
    private final LoginRateLimiter loginRateLimiter;
    private final LoginVerificationService verificationService;
    private final boolean verifyCustomAccounts;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    public AuthController(UserService userService, ForumMapper mapper, LoginRateLimiter loginRateLimiter,
                          LoginVerificationService verificationService,
                          @Value("${app.auth.verify-custom-accounts:false}") boolean verifyCustomAccounts) {
        this.userService = userService;
        this.mapper = mapper;
        this.loginRateLimiter = loginRateLimiter;
        this.verificationService = verificationService;
        this.verifyCustomAccounts = verifyCustomAccounts;
    }

    @PostMapping("/api/auth/email-login")
    public ResponseEntity<AuthChallengeResponse> emailLogin(
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
        if (isGoogleLinked(user) || verifyCustomAccounts) {
            verificationService.start(user, servletRequest);
            return ResponseEntity.ok(new AuthChallengeResponse(true, verificationService.emailHint(user.getEmail()), null));
        }
        establishSession(user, servletRequest, servletResponse);
        loginRateLimiter.reset(email, remoteAddress);
        return ResponseEntity.ok(new AuthChallengeResponse(false, null, mapper.toCurrentUser(user)));
    }

    @PostMapping("/api/auth/signup")
    public ResponseEntity<AuthChallengeResponse> signup(
            @RequestBody SignupRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        loginRateLimiter.check(request == null ? null : request.email(), clientAddress(servletRequest));
        User user = userService.registerWithEmail(request);
        if (verifyCustomAccounts) {
            verificationService.start(user, servletRequest);
            return ResponseEntity.ok(new AuthChallengeResponse(true, verificationService.emailHint(user.getEmail()), null));
        }
        establishSession(user, servletRequest, servletResponse);
        loginRateLimiter.reset(user.getEmail(), clientAddress(servletRequest));
        return ResponseEntity.ok(new AuthChallengeResponse(false, null, mapper.toCurrentUser(user)));
    }

    @PostMapping("/api/auth/verify-code")
    public ResponseEntity<CurrentUserResponse> verifyCode(
            @RequestBody VerificationCodeRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        LoginVerificationService.VerifiedLogin verified = verificationService.verify(request == null ? null : request.code(), servletRequest);
        User user = userService.getUserById(verified.userId());
        servletRequest.changeSessionId();
        saveSession(user, servletRequest, servletResponse);
        loginRateLimiter.reset(verified.email(), verified.remoteAddress());
        return ResponseEntity.ok(mapper.toCurrentUser(user));
    }

    @PostMapping("/api/auth/resend-code")
    public ResponseEntity<Void> resendCode(HttpServletRequest servletRequest) {
        verificationService.resend(servletRequest);
        return ResponseEntity.noContent().build();
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

    private void establishSession(User user, HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
        servletRequest.getSession(true);
        servletRequest.changeSessionId();
        saveSession(user, servletRequest, servletResponse);
    }

    private boolean isGoogleLinked(User user) {
        String googleId = user.getGoogleId();
        return googleId != null && !googleId.isBlank() && !googleId.startsWith("manual:");
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
        return request.getRemoteAddr();
    }
}
