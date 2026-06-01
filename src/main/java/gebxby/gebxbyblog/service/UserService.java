package gebxby.gebxbyblog.service;
import gebxby.gebxbyblog.dto.ProfileUpdateRequest;
import gebxby.gebxbyblog.dto.SignupRequest;
import gebxby.gebxbyblog.dto.UsernameCheckResponse;
import gebxby.gebxbyblog.model.Content;
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
    User registerWithEmail(SignupRequest request);
    User createManualUser(User user);
    UsernameCheckResponse checkUsername(String username);
    List<String> suggestUsernames(String seed, int limit);
    User getUserById(UUID userId);
    List<User> getAllUsers(User admin);
    User suspendUser(UUID userId, Duration duration, User admin);
    User moderatorSuspendUser(UUID userId, User moderator);
    void deleteUser(UUID userId, User admin);
    User bookmarkContent(UUID contentId, User user);
    User removeBookmark(UUID contentId, User user);
    List<Content> getBookmarkedContents(User user);
    User followUser(UUID targetUserId, User user);
    User unfollowUser(UUID targetUserId, User user);
    List<User> getFollowingUsers(User user);
    boolean isAdmin(User user);
    boolean isModerator(User user);
    void ensureActive(User user);
}

