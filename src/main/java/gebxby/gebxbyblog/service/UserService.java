package gebxby.gebxbyblog.service;
import gebxby.gebxbyblog.dto.ProfileUpdateRequest;
import gebxby.gebxbyblog.model.User;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

public interface UserService {
    User updateProfile(OAuth2User principal, ProfileUpdateRequest request);
    User processUserLogin(OAuth2User principal);
    User getCurrentUser(OAuth2User principal);
    User loginWithEmailPassword(String email, String password);
    User createManualUser(User user);
    User getUserById(UUID userId);
    List<User> getAllUsers(User admin);
    User suspendUser(UUID userId, Duration duration, User admin);
    void deleteUser(UUID userId, User admin);
    boolean isAdmin(User user);
    void ensureActive(User user);
}

