package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.ProfileUpdateRequest;
import gebxby.gebxbyblog.dto.SignupRequest;
import gebxby.gebxbyblog.dto.UsernameCheckResponse;
import gebxby.gebxbyblog.model.BadgeCode;
import gebxby.gebxbyblog.model.Bookmark;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.Follow;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.BookmarkRepository;
import gebxby.gebxbyblog.repository.CommentRepository;
import gebxby.gebxbyblog.repository.ContentRepository;
import gebxby.gebxbyblog.repository.FollowRepository;
import gebxby.gebxbyblog.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserServiceImpl implements UserService {
    private static final String DEFAULT_DESIGNATION = "RECONNAISSANCE OFFICER";
    private static final String MANUAL_SUB_PREFIX = "manual:";
    private static final int MAX_PROFILE_IMAGE_LENGTH = 350_000;
    private static final int MIN_PASSWORD_LENGTH = 8;

    private final UserRepository userRepository;
    private final ContentRepository contentRepository;
    private final CommentRepository commentRepository;
    private final Set<String> adminEmails;
    private final String adminLoginEmail;
    private final String adminLoginPasswordHash;
    private final PasswordEncoder passwordEncoder;
    private final UsernameService usernameService;
    private final UserProfileProjectionService profileProjectionService;
    private final BookmarkRepository bookmarkRepository;
    private final FollowRepository followRepository;

    @Autowired
    public UserServiceImpl(UserRepository userRepository,
                           ContentRepository contentRepository,
                           CommentRepository commentRepository,
                           @Value("${app.admin-emails:}") String adminEmails,
                           @Value("${app.admin-login-email:}") String adminLoginEmail,
                           @Value("${app.admin-login-password-hash:}") String adminLoginPasswordHash,
                           PasswordEncoder passwordEncoder,
                           UsernameService usernameService,
                           UserProfileProjectionService profileProjectionService,
                           BookmarkRepository bookmarkRepository,
                           FollowRepository followRepository) {
        this.userRepository = userRepository;
        this.contentRepository = contentRepository;
        this.commentRepository = commentRepository;
        this.adminEmails = Arrays.stream(adminEmails.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(email -> email.toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());
        this.adminLoginEmail = normalizeEmail(adminLoginEmail);
        this.adminLoginPasswordHash = adminLoginPasswordHash;
        this.passwordEncoder = passwordEncoder;
        this.usernameService = usernameService;
        this.profileProjectionService = profileProjectionService;
        this.bookmarkRepository = bookmarkRepository;
        this.followRepository = followRepository;
    }

    public UserServiceImpl(UserRepository userRepository,
                           ContentRepository contentRepository,
                           CommentRepository commentRepository,
                           String adminEmails,
                           String adminLoginEmail,
                           String adminLoginPasswordHash,
                           PasswordEncoder passwordEncoder) {
        this(userRepository, contentRepository, commentRepository, adminEmails, adminLoginEmail,
                adminLoginPasswordHash, passwordEncoder, new UsernameService(userRepository),
                new UserProfileProjectionService(contentRepository, commentRepository), null, null);
    }

    @Override
    public User updateProfile(OAuth2User principal, ProfileUpdateRequest request) {
        User user = getCurrentUser(principal);
        ensureActive(user);
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload profil wajib diisi");
        }
        if (StringUtils.hasText(request.name())) {
            user.setName(trimToLength(request.name(), 80));
        }
        if (StringUtils.hasText(request.designation())) {
            user.setDesignation(trimToLength(request.designation(), 80).toUpperCase(Locale.ROOT));
        }
        if (request.moto() != null) {
            user.setMoto(trimToLength(request.moto(), 160));
        }
        if (StringUtils.hasText(request.picture())) {
            user.setPhoto(validateProfilePicture(request.picture()));
        }
        user.setUpdatedAt(LocalDateTime.now());
        return saveUserAndRefreshEmbeddedProfiles(user);
    }

    @Override
    public User processUserLogin(OAuth2User principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User belum login");
        }

        String googleId = principal.getAttribute("sub");
        String email = normalizeEmail(principal.getAttribute("email"));
        String name = principal.getAttribute("name");
        String picture = principal.getAttribute("picture");

        if (!StringUtils.hasText(googleId) || !StringUtils.hasText(email)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Profil OAuth tidak lengkap");
        }

        User user = userRepository.findByGoogleId(googleId)
                .or(() -> userRepository.findByEmail(email))
                .orElseGet(User::new);

        LocalDateTime now = LocalDateTime.now();
        boolean newUser = user.getUserID() == null;
        if (newUser) {
            user.setUserID(UUID.randomUUID());
            user.setCreatedAt(now);
        }
        user.setGoogleId(googleId);
        user.setEmail(email);
        if (!StringUtils.hasText(user.getName())) {
            user.setName(StringUtils.hasText(name) ? trimToLength(name, 80) : email);
        }
        if (!StringUtils.hasText(user.getPhoto()) && StringUtils.hasText(picture)) {
            user.setPhoto(picture);
        }
        if (!StringUtils.hasText(user.getDesignation())) {
            user.setDesignation(DEFAULT_DESIGNATION);
        }
        user.setRole(resolveRole(email, user.getRole()));
        usernameService.ensureUsername(user);
        user.setUpdatedAt(now);

        return userRepository.save(user);
    }

    @Override
    public User getCurrentUser(OAuth2User principal) {
        return processUserLogin(principal);
    }

    @Override
    public User loginWithEmailPassword(String email, String password) {
        String normalizedEmail = normalizeEmail(email);
        if (!StringUtils.hasText(normalizedEmail) || !StringUtils.hasText(password)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email atau password tidak valid");
        }

        boolean configuredAdminLogin = normalizedEmail.equals(adminLoginEmail)
                && StringUtils.hasText(adminLoginPasswordHash)
                && passwordEncoder.matches(password, adminLoginPasswordHash);

        if (!configuredAdminLogin) {
            User user = userRepository.findByEmail(normalizedEmail)
                    .filter(candidate -> StringUtils.hasText(candidate.getPasswordHash()))
                    .filter(candidate -> passwordEncoder.matches(password, candidate.getPasswordHash()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email atau password tidak valid"));
            usernameService.ensureUsername(user);
            user.setUpdatedAt(LocalDateTime.now());
            return userRepository.save(user);
        }

        User user = userRepository.findByEmail(normalizedEmail).orElseGet(User::new);
        LocalDateTime now = LocalDateTime.now();
        if (user.getUserID() == null) {
            user.setUserID(UUID.randomUUID());
            user.setCreatedAt(now);
        }
        user.setEmail(normalizedEmail);
        user.setGoogleId(MANUAL_SUB_PREFIX + normalizedEmail);
        user.setName(StringUtils.hasText(user.getName()) ? trimToLength(user.getName(), 80) : "Jill Valentine");
        user.setDesignation(StringUtils.hasText(user.getDesignation())
                ? trimToLength(user.getDesignation(), 80).toUpperCase(Locale.ROOT)
                : "ADMINISTRATOR");
        user.setRole("ADMIN");
        usernameService.ensureUsername(user);
        user.setUpdatedAt(now);
        return userRepository.save(user);
    }

    @Override
    public User registerWithEmail(SignupRequest request) {
        if (request == null
                || !StringUtils.hasText(request.name())
                || !StringUtils.hasText(request.email())
                || !StringUtils.hasText(request.password())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nama, email, dan password wajib diisi");
        }
        String email = normalizeEmail(request.email());
        if (!StringUtils.hasText(email) || !email.contains("@")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Format email tidak valid");
        }
        if (request.password().length() < MIN_PASSWORD_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password minimal 8 karakter");
        }
        if (userRepository.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email sudah terdaftar");
        }

        User user = new User();
        LocalDateTime now = LocalDateTime.now();
        user.setUserID(UUID.randomUUID());
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        user.setEmail(email);
        user.setGoogleId(MANUAL_SUB_PREFIX + email);
        user.setName(trimToLength(request.name(), 80));
        user.setDesignation(DEFAULT_DESIGNATION);
        user.setRole(resolveRole(email, "USER"));
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        if (StringUtils.hasText(request.username())) {
            usernameService.applyRequestedUsername(user, request.username());
        } else {
            usernameService.ensureUsername(user);
        }
        return userRepository.save(user);
    }

    @Override
    public User createManualUser(User user) {
        if (!StringUtils.hasText(user.getEmail()) || !StringUtils.hasText(user.getName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nama dan email wajib diisi");
        }
        String email = normalizeEmail(user.getEmail());
        User existing = userRepository.findByEmail(email).orElse(user);
        LocalDateTime now = LocalDateTime.now();
        if (existing.getUserID() == null) {
            existing.setUserID(UUID.randomUUID());
            existing.setCreatedAt(now);
        }
        existing.setName(trimToLength(user.getName(), 80));
        existing.setEmail(email);
        existing.setDesignation(StringUtils.hasText(user.getDesignation())
                ? trimToLength(user.getDesignation(), 80).toUpperCase(Locale.ROOT)
                : DEFAULT_DESIGNATION);
        existing.setRole(resolveRole(existing.getEmail(), existing.getRole()));
        if (StringUtils.hasText(user.getUsername())) {
            usernameService.applyRequestedUsername(existing, user.getUsername());
        } else {
            usernameService.ensureUsername(existing);
        }
        existing.setUpdatedAt(now);
        return saveUserAndRefreshEmbeddedProfiles(existing);
    }

    @Override
    public UsernameCheckResponse checkUsername(String username) {
        return usernameService.checkUsername(username);
    }

    @Override
    public List<String> suggestUsernames(String seed, int limit) {
        return usernameService.suggestUsernames(seed, limit);
    }

    @Override
    public User getUserById(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User tidak ditemukan"));
        return ensurePersistedUsername(user);
    }

    @Override
    public List<User> getAllUsers(User admin) {
        requireAdmin(admin);
        return userRepository.findAll().stream()
                .map(this::ensurePersistedUsername)
                .toList();
    }

    @Override
    public User suspendUser(UUID userId, Duration duration, User admin) {
        requireAdmin(admin);
        if (duration == null || duration.isZero() || duration.isNegative() || duration.toHours() > 720) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Durasi suspend harus 1 sampai 720 jam");
        }
        User target = getUserById(userId);
        if (target.isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin tidak bisa suspend admin lain");
        }
        target.setSuspendedUntil(LocalDateTime.now().plus(duration));
        target.setSuspensionCount(target.getSuspensionCount() + 1);
        target.setSuspensionMarked(true);
        target.setCriminalMarked(true);
        target.setUpdatedAt(LocalDateTime.now());
        return userRepository.save(target);
    }

    @Override
    public User moderatorSuspendUser(UUID userId, User moderator) {
        if (!isModerator(moderator)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Moderator badge required");
        }
        User target = getUserById(userId);
        if (target.isAdmin() || target.getUserID().equals(moderator.getUserID())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Target tidak bisa disuspend moderator");
        }
        target.setSuspendedUntil(LocalDateTime.now().plusHours(1));
        target.setSuspensionCount(target.getSuspensionCount() + 1);
        target.setSuspensionMarked(true);
        target.setUpdatedAt(LocalDateTime.now());
        return userRepository.save(target);
    }

    @Override
    public void deleteUser(UUID userId, User admin) {
        requireAdmin(admin);
        if (admin.getUserID().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Admin tidak bisa menghapus akun sendiri");
        }
        if (!userRepository.existsById(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User tidak ditemukan");
        }
        if (bookmarkRepository != null) {
            bookmarkRepository.deleteByUserId(userId);
        }
        if (followRepository != null) {
            followRepository.deleteByFollowerUserId(userId);
            followRepository.deleteByTargetUserId(userId);
        }
        userRepository.deleteById(userId);
    }

    @Override
    public User bookmarkContent(UUID contentId, User user) {
        ensureActive(user);
        if (!contentRepository.existsById(contentId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tulisan tidak ditemukan");
        }
        if (bookmarkRepository != null && bookmarkRepository.findByUserIdAndContentId(user.getUserID(), contentId).isEmpty()) {
            Bookmark bookmark = new Bookmark();
            bookmark.setId(Bookmark.buildId(user.getUserID(), contentId));
            bookmark.setUserId(user.getUserID());
            bookmark.setContentId(contentId);
            bookmark.setCreatedAt(LocalDateTime.now());
            bookmarkRepository.save(bookmark);
        }
        Set<UUID> bookmarks = new LinkedHashSet<>(user.getBookmarkedContentIds() == null ? Set.of() : user.getBookmarkedContentIds());
        bookmarks.add(contentId);
        user.setBookmarkedContentIds(bookmarks);
        user.setUpdatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    @Override
    public User removeBookmark(UUID contentId, User user) {
        ensureActive(user);
        if (bookmarkRepository != null) {
            bookmarkRepository.deleteByUserIdAndContentId(user.getUserID(), contentId);
        }
        Set<UUID> bookmarks = new LinkedHashSet<>(user.getBookmarkedContentIds() == null ? Set.of() : user.getBookmarkedContentIds());
        bookmarks.remove(contentId);
        user.setBookmarkedContentIds(bookmarks);
        user.setUpdatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    @Override
    public List<Content> getBookmarkedContents(User user) {
        ensureActive(user);
        LinkedHashSet<UUID> orderedIds = new LinkedHashSet<>();
        if (bookmarkRepository != null) {
            bookmarkRepository.findByUserIdOrderByCreatedAtDesc(user.getUserID()).stream()
                    .map(Bookmark::getContentId)
                    .filter(java.util.Objects::nonNull)
                    .forEach(orderedIds::add);
        }
        orderedIds.addAll(user.getBookmarkedContentIds() == null ? Set.of() : user.getBookmarkedContentIds());
        List<UUID> ids = new ArrayList<>(orderedIds);
        if (ids.isEmpty()) {
            return List.of();
        }
        List<Content> contents = contentRepository.findAllById(ids);
        contents.sort(Comparator.comparingInt(content -> ids.indexOf(content.getIdContent())));
        return contents;
    }

    @Override
    public User followUser(UUID targetUserId, User user) {
        ensureActive(user);
        if (user.getUserID().equals(targetUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tidak bisa follow akun sendiri");
        }
        if (!userRepository.existsById(targetUserId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User tidak ditemukan");
        }
        if (followRepository != null && followRepository.findByFollowerUserIdAndTargetUserId(user.getUserID(), targetUserId).isEmpty()) {
            Follow follow = new Follow();
            follow.setId(Follow.buildId(user.getUserID(), targetUserId));
            follow.setFollowerUserId(user.getUserID());
            follow.setTargetUserId(targetUserId);
            follow.setCreatedAt(LocalDateTime.now());
            followRepository.save(follow);
        }
        Set<UUID> following = new LinkedHashSet<>(user.getFollowingUserIds() == null ? Set.of() : user.getFollowingUserIds());
        following.add(targetUserId);
        user.setFollowingUserIds(following);
        user.setUpdatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    @Override
    public User unfollowUser(UUID targetUserId, User user) {
        ensureActive(user);
        if (followRepository != null) {
            followRepository.deleteByFollowerUserIdAndTargetUserId(user.getUserID(), targetUserId);
        }
        Set<UUID> following = new LinkedHashSet<>(user.getFollowingUserIds() == null ? Set.of() : user.getFollowingUserIds());
        following.remove(targetUserId);
        user.setFollowingUserIds(following);
        user.setUpdatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    @Override
    public List<User> getFollowingUsers(User user) {
        ensureActive(user);
        LinkedHashSet<UUID> following = new LinkedHashSet<>();
        if (followRepository != null) {
            followRepository.findByFollowerUserIdOrderByCreatedAtDesc(user.getUserID()).stream()
                    .map(Follow::getTargetUserId)
                    .filter(java.util.Objects::nonNull)
                    .forEach(following::add);
        }
        following.addAll(user.getFollowingUserIds() == null ? Set.of() : user.getFollowingUserIds());
        if (following.isEmpty()) {
            return List.of();
        }
        return userRepository.findByUserIDIn(following);
    }

    @Override
    public boolean isAdmin(User user) {
        return user != null && user.isAdmin();
    }

    @Override
    public boolean isModerator(User user) {
        return isAdmin(user) || (user != null
                && user.getManualBadges() != null
                && user.getManualBadges().contains(BadgeCode.MODERATOR));
    }

    @Override
    public void ensureActive(User user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User belum login");
        }
        if (user.isSuspended()) {
            throw new ResponseStatusException(HttpStatus.LOCKED, "Akun sedang disuspend sementara");
        }
    }

    private String resolveRole(String email, String currentRole) {
        if (email != null && adminEmails.contains(normalizeEmail(email))) {
            return "ADMIN";
        }
        return StringUtils.hasText(currentRole) ? currentRole : "USER";
    }

    private void requireAdmin(User user) {
        if (!isAdmin(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }

    private String trimToLength(String value, int maxLength) {
        String trimmed = value == null ? "" : value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }

    private String validateProfilePicture(String value) {
        String picture = value.trim();
        if (picture.length() > MAX_PROFILE_IMAGE_LENGTH) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Foto profil terlalu besar");
        }
        String lower = picture.toLowerCase(Locale.ROOT);
        boolean dataImage = lower.startsWith("data:image/png;base64,")
                || lower.startsWith("data:image/jpeg;base64,")
                || lower.startsWith("data:image/webp;base64,");
        boolean remoteImage = lower.startsWith("https://");
        if (!dataImage && !remoteImage) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Format foto profil tidak valid");
        }
        return picture;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void backfillMissingUsernamesOnStartup() {
        try {
            userRepository.findAll().forEach(this::ensurePersistedUsername);
        } catch (RuntimeException ignored) {
            // Startup must not fail only because the optional one-time username backfill cannot reach storage yet.
        }
    }

    private User ensurePersistedUsername(User user) {
        if (user == null || usernameService.hasUsername(user)) {
            return user;
        }
        usernameService.ensureUsername(user);
        user.setUpdatedAt(LocalDateTime.now());
        return saveUserAndRefreshEmbeddedProfiles(user);
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private User saveUserAndRefreshEmbeddedProfiles(User user) {
        usernameService.ensureUsername(user);
        User saved = userRepository.save(user);
        if (saved.getUserID() == null) {
            return saved;
        }

        profileProjectionService.refreshEmbeddedProfiles(saved);
        return saved;
    }
}
