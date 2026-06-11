package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.ProfileUpdateRequest;
import gebxby.gebxbyblog.dto.SignupRequest;
import gebxby.gebxbyblog.model.BadgeCode;
import gebxby.gebxbyblog.model.Comment;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.CommentRepository;
import gebxby.gebxbyblog.repository.ContentRepository;
import gebxby.gebxbyblog.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {
    @Mock
    private UserRepository userRepository;
    @Mock
    private ContentRepository contentRepository;
    @Mock
    private CommentRepository commentRepository;
    @Mock
    private EmailDomainPolicyService emailDomainPolicyService;

    private UserServiceImpl userService;
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        userService = new UserServiceImpl(
                userRepository,
                contentRepository,
                commentRepository,
                "admin@example.com",
                "admin@example.com",
                passwordEncoder.encode("secret"),
                passwordEncoder
        );
    }

    @Test
    void processUserLoginCreatesAdminFromConfiguredEmail() {
        OAuth2User principal = principal("google-1", "admin@example.com", "Admin", "photo.png");
        when(userRepository.findByGoogleId("google-1")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("admin@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User user = userService.processUserLogin(principal);

        assertNotNull(user.getUserID());
        assertEquals("ADMIN", user.getRole());
        assertEquals("RECONNAISSANCE OFFICER", user.getDesignation());
        assertNotNull(user.getUsername());
        assertFalse(user.isOnboardingComplete());
    }

    @Test
    void registerWithEmailMarksTrustedCustomEmailDomain() {
        UserServiceImpl serviceWithDomainPolicy = new UserServiceImpl(
                userRepository,
                contentRepository,
                commentRepository,
                "",
                "",
                "",
                passwordEncoder,
                new UsernameService(userRepository),
                new UserProfileProjectionService(contentRepository, commentRepository, new UserSnapshotService()),
                null,
                null,
                emailDomainPolicyService
        );
        when(userRepository.findByEmail("writer@g.com")).thenReturn(Optional.empty());
        when(userRepository.findByUsernameNormalized(anyString())).thenReturn(Optional.empty());
        when(emailDomainPolicyService.isTrustedCustomDomain("writer@g.com")).thenReturn(true);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User user = serviceWithDomainPolicy.registerWithEmail(new SignupRequest(
                "Writer",
                "writer@g.com",
                "safe-password",
                "writer"
        ));

        assertTrue(user.isCustomEmailDomainTrusted());
    }

    @Test
    void updateProfileCanCompleteGoogleOnboardingWithRequestedUsername() {
        OAuth2User principal = principal("google-onboard", "new@example.com", "New User", "photo.png");
        User existing = new User();
        existing.setUserID(UUID.randomUUID());
        existing.setGoogleId("google-onboard");
        existing.setEmail("new@example.com");
        existing.setName("New User");
        existing.setOnboardingComplete(false);

        when(userRepository.findByGoogleId("google-onboard")).thenReturn(Optional.of(existing));
        when(userRepository.findByUsernameNormalized(anyString())).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User updated = userService.updateProfile(principal, new ProfileUpdateRequest(
                "Jill Archive",
                "jill_archive",
                "field officer",
                null,
                null
        ));

        assertTrue(updated.isOnboardingComplete());
        assertEquals("jill_archive", updated.getUsernameNormalized());
        assertEquals("FIELD OFFICER", updated.getDesignation());
    }

    @Test
    void processUserLoginBackfillsGebxbyUsernameOnce() {
        OAuth2User principal = principal("google-gebxby", "gebxby@example.com", "Gebxby", "photo.png");
        when(userRepository.findByGoogleId("google-gebxby")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("gebxby@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByUsernameNormalized("gebxby")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User user = userService.processUserLogin(principal);

        assertEquals("Gebxby", user.getUsername());
        assertEquals("gebxby", user.getUsernameNormalized());
    }

    @Test
    void updateProfileTrimsAndUppercasesDesignation() {
        OAuth2User principal = principal("google-2", "user@example.com", "User", "photo.png");
        User existing = new User();
        existing.setUserID(UUID.randomUUID());
        existing.setGoogleId("google-2");
        existing.setEmail("user@example.com");

        when(userRepository.findByGoogleId("google-2")).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User updated = userService.updateProfile(principal, new ProfileUpdateRequest("New Name", "field officer", "Ready", null));

        assertEquals("New Name", updated.getName());
        assertEquals("FIELD OFFICER", updated.getDesignation());
        assertEquals("Ready", updated.getMoto());
    }

    @Test
    void processUserLoginDoesNotOverwriteCustomizedProfileFields() {
        OAuth2User principal = principal("google-3", "user@example.com", "Google Name", "https://google/photo.png");
        User existing = new User();
        existing.setUserID(UUID.randomUUID());
        existing.setGoogleId("google-3");
        existing.setEmail("user@example.com");
        existing.setName("Custom Name");
        existing.setPhoto("data:image/webp;base64,custom");

        when(userRepository.findByGoogleId("google-3")).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User updated = userService.processUserLogin(principal);

        assertEquals("Custom Name", updated.getName());
        assertEquals("data:image/webp;base64,custom", updated.getPhoto());
    }

    @Test
    void updateProfileRefreshesEmbeddedContentAndCommentUsers() {
        OAuth2User principal = principal("google-4", "user@example.com", "User", "photo.png");
        User existing = new User();
        existing.setUserID(UUID.randomUUID());
        existing.setGoogleId("google-4");
        existing.setEmail("user@example.com");
        Content content = new Content();
        Comment comment = new Comment();

        when(userRepository.findByGoogleId("google-4")).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(contentRepository.findByAuthorId(existing.getUserID())).thenReturn(List.of(content));
        when(commentRepository.findByAuthorId(existing.getUserID())).thenReturn(List.of(comment));

        User updated = userService.updateProfile(principal, new ProfileUpdateRequest("Persisted", "archivist", null, null));

        assertEquals("Persisted", content.getUser().getName());
        assertEquals(updated.getUserID(), comment.getUser().getUserID());
        verify(contentRepository).saveAll(List.of(content));
        verify(commentRepository).saveAll(List.of(comment));
    }

    @Test
    void suspendUserRejectsPermanentLikeDurationAndMarksValidSuspension() {
        User admin = new User();
        admin.setUserID(UUID.randomUUID());
        admin.setRole("ADMIN");
        User target = new User();
        target.setUserID(UUID.randomUUID());

        assertThrows(ResponseStatusException.class, () -> userService.suspendUser(target.getUserID(), Duration.ofDays(60), admin));

        when(userRepository.findById(target.getUserID())).thenReturn(Optional.of(target));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        User suspended = userService.suspendUser(target.getUserID(), Duration.ofHours(2), admin);

        assertTrue(suspended.isSuspensionMarked());
        assertTrue(suspended.isCriminalMarked());
        assertTrue(suspended.getSuspendedUntil().isAfter(LocalDateTime.now()));
    }

    @Test
    void moderatorSuspendIsOneHourAndDoesNotMarkCriminal() {
        User moderator = new User();
        moderator.setUserID(UUID.randomUUID());
        moderator.getManualBadges().add(BadgeCode.MODERATOR);
        User target = new User();
        target.setUserID(UUID.randomUUID());

        when(userRepository.findById(target.getUserID())).thenReturn(Optional.of(target));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User suspended = userService.moderatorSuspendUser(target.getUserID(), moderator);

        assertTrue(suspended.isSuspensionMarked());
        assertTrue(suspended.getSuspendedUntil().isBefore(LocalDateTime.now().plusMinutes(61)));
        assertFalse(suspended.isCriminalMarked());
    }

    @Test
    void ensureActiveRejectsSuspendedUser() {
        User user = new User();
        user.setSuspendedUntil(LocalDateTime.now().plusHours(1));

        assertThrows(ResponseStatusException.class, () -> userService.ensureActive(user));
    }

    @Test
    void loginWithEmailPasswordCreatesConfiguredAdminSessionUser() {
        when(userRepository.findByEmail("admin@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User admin = userService.loginWithEmailPassword(" Admin@Example.com ", "secret");

        assertEquals("admin@example.com", admin.getEmail());
        assertEquals("ADMIN", admin.getRole());
        assertEquals("manual:admin@example.com", admin.getGoogleId());
    }

    @Test
    void registerWithEmailCreatesPasswordUserWithAvailableUsername() {
        when(userRepository.findByEmail("jill@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByUsernameNormalized("jill_valentine")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User user = userService.registerWithEmail(new SignupRequest(
                "Jill Valentine",
                "jill@example.com",
                "supersecret",
                "jill_valentine"
        ));

        assertEquals("jill@example.com", user.getEmail());
        assertEquals("jill_valentine", user.getUsernameNormalized());
        assertTrue(passwordEncoder.matches("supersecret", user.getPasswordHash()));
    }

    @Test
    void publicSignupRejectsConfiguredAdminEmail() {
        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () ->
                userService.registerWithEmail(new SignupRequest(
                        "Public Admin",
                        "admin@example.com",
                        "supersecret",
                        "public_admin"
                ))
        );

        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    void checkUsernameRejectsReservedAndTakenNames() {
        when(userRepository.existsByUsernameNormalized("jill")).thenReturn(true);

        assertFalse(userService.checkUsername("admin").available());
        assertFalse(userService.checkUsername("jill").available());
        assertTrue(userService.checkUsername("jill_valentine").available());
    }

    @Test
    void loginWithEmailPasswordRejectsInvalidCredential() {
        assertThrows(ResponseStatusException.class, () ->
                userService.loginWithEmailPassword("admin@example.com", "wrong")
        );
    }

    private OAuth2User principal(String sub, String email, String name, String picture) {
        OAuth2User principal = mock(OAuth2User.class);
        when(principal.getAttribute("sub")).thenReturn(sub);
        when(principal.getAttribute("email")).thenReturn(email);
        when(principal.getAttribute("name")).thenReturn(name);
        when(principal.getAttribute("picture")).thenReturn(picture);
        return principal;
    }
}
