package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.ProfileUpdateRequest;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserServiceImpl implements UserService {
    private static final String DEFAULT_DESIGNATION = "RECONNAISSANCE OFFICER";

    private final UserRepository userRepository;
    private final Set<String> adminEmails;

    public UserServiceImpl(UserRepository userRepository,
                           @Value("${app.admin-emails:}") String adminEmails) {
        this.userRepository = userRepository;
        this.adminEmails = Arrays.stream(adminEmails.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(email -> email.toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    public User updateProfile(OAuth2User principal, ProfileUpdateRequest request) {
        User user = getCurrentUser(principal);
        ensureActive(user);
        if (StringUtils.hasText(request.name())) {
            user.setName(trimToLength(request.name(), 80));
        }
        if (StringUtils.hasText(request.designation())) {
            user.setDesignation(trimToLength(request.designation(), 80).toUpperCase(Locale.ROOT));
        }
        if (request.moto() != null) {
            user.setMoto(trimToLength(request.moto(), 160));
        }
        user.setUpdatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    @Override
    public User processUserLogin(OAuth2User principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User belum login");
        }

        String googleId = principal.getAttribute("sub");
        String email = principal.getAttribute("email");
        String name = principal.getAttribute("name");
        String picture = principal.getAttribute("picture");

        if (!StringUtils.hasText(googleId) || !StringUtils.hasText(email)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Profil OAuth tidak lengkap");
        }

        User user = userRepository.findByGoogleId(googleId)
                .or(() -> userRepository.findByEmail(email))
                .orElseGet(User::new);

        LocalDateTime now = LocalDateTime.now();
        if (user.getUserID() == null) {
            user.setUserID(UUID.randomUUID());
            user.setCreatedAt(now);
        }
        user.setGoogleId(googleId);
        user.setEmail(email);
        user.setName(StringUtils.hasText(name) ? trimToLength(name, 80) : email);
        user.setPhoto(picture);
        if (!StringUtils.hasText(user.getDesignation())) {
            user.setDesignation(DEFAULT_DESIGNATION);
        }
        user.setRole(resolveRole(email, user.getRole()));
        user.setUpdatedAt(now);

        return userRepository.save(user);
    }

    @Override
    public User getCurrentUser(OAuth2User principal) {
        return processUserLogin(principal);
    }

    @Override
    public User createManualUser(User user) {
        if (!StringUtils.hasText(user.getEmail()) || !StringUtils.hasText(user.getName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nama dan email wajib diisi");
        }
        User existing = userRepository.findByEmail(user.getEmail()).orElse(user);
        LocalDateTime now = LocalDateTime.now();
        if (existing.getUserID() == null) {
            existing.setUserID(UUID.randomUUID());
            existing.setCreatedAt(now);
        }
        existing.setName(trimToLength(user.getName(), 80));
        existing.setEmail(user.getEmail().trim().toLowerCase(Locale.ROOT));
        existing.setDesignation(StringUtils.hasText(user.getDesignation())
                ? trimToLength(user.getDesignation(), 80).toUpperCase(Locale.ROOT)
                : DEFAULT_DESIGNATION);
        existing.setRole(resolveRole(existing.getEmail(), existing.getRole()));
        existing.setUpdatedAt(now);
        return userRepository.save(existing);
    }

    @Override
    public User getUserById(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User tidak ditemukan"));
    }

    @Override
    public List<User> getAllUsers(User admin) {
        requireAdmin(admin);
        return userRepository.findAll();
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
        userRepository.deleteById(userId);
    }

    @Override
    public boolean isAdmin(User user) {
        return user != null && user.isAdmin();
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
        if (email != null && adminEmails.contains(email.toLowerCase(Locale.ROOT))) {
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
}
