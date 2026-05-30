package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.ProfileUpdateRequest;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {
    @Mock
    private UserRepository userRepository;

    private UserServiceImpl userService;

    @BeforeEach
    void setUp() {
        userService = new UserServiceImpl(userRepository, "admin@example.com");
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

        User updated = userService.updateProfile(principal, new ProfileUpdateRequest("New Name", "field officer", "Ready"));

        assertEquals("New Name", updated.getName());
        assertEquals("FIELD OFFICER", updated.getDesignation());
        assertEquals("Ready", updated.getMoto());
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
        assertTrue(suspended.getSuspendedUntil().isAfter(LocalDateTime.now()));
    }

    @Test
    void ensureActiveRejectsSuspendedUser() {
        User user = new User();
        user.setSuspendedUntil(LocalDateTime.now().plusHours(1));

        assertThrows(ResponseStatusException.class, () -> userService.ensureActive(user));
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
