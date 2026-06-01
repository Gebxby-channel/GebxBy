package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.UsernameCheckResponse;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class UsernameService {
    private static final int MIN_USERNAME_LENGTH = 3;
    private static final int MAX_USERNAME_LENGTH = 24;
    private static final Set<String> RESERVED_USERNAMES = Set.of(
            "admin", "administrator", "api", "auth", "login", "logout", "signup", "register",
            "settings", "profile", "profiles", "user", "users", "moderator", "mod", "root",
            "system", "support", "help", "search", "content", "write", "database", "gebxby"
    );

    private final UserRepository userRepository;

    public UsernameService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UsernameCheckResponse checkUsername(String username) {
        String cleaned = cleanUsername(username);
        String validation = usernameValidationMessage(cleaned, false);
        if (validation != null) {
            return new UsernameCheckResponse(cleaned, false, validation);
        }
        boolean available = !userRepository.existsByUsernameNormalized(cleaned.toLowerCase(Locale.ROOT));
        return new UsernameCheckResponse(cleaned, available, available ? "USERNAME_AVAILABLE" : "USERNAME_TAKEN");
    }

    public List<String> suggestUsernames(String seed, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 8));
        List<String> suggestions = new ArrayList<>();
        String source = StringUtils.hasText(seed) ? seed : "archive_user";
        boolean allowGebxby = isGebxbyName(source);
        String base = usernameBase(source);
        if (allowGebxby && isUsernameAvailableFor("Gebxby", null, true)) {
            suggestions.add("Gebxby");
        }
        addSuggestion(suggestions, base, safeLimit, allowGebxby);
        addSuggestion(suggestions, base + "." + twoDigitCode(source), safeLimit, allowGebxby);
        addSuggestion(suggestions, base + "_" + twoDigitCode(source), safeLimit, allowGebxby);
        addSuggestion(suggestions, base + "_x", safeLimit, allowGebxby);
        int attempts = 0;
        while (suggestions.size() < safeLimit && attempts < 80) {
            attempts++;
            addSuggestion(suggestions, base + "_" + ThreadLocalRandom.current().nextInt(10, 9999), safeLimit, allowGebxby);
        }
        return suggestions;
    }

    public User ensureUsername(User user) {
        if (hasUsername(user)) {
            return user;
        }
        boolean allowGebxby = isGebxbyName(user.getName());
        String generated = generateAvailableUsername(user.getName(), user.getEmail(), allowGebxby, user);
        user.setUsername(generated);
        user.setUsernameNormalized(generated.toLowerCase(Locale.ROOT));
        return user;
    }

    public void applyRequestedUsername(User user, String username) {
        boolean allowGebxby = isGebxbyName(user.getName());
        String cleaned = cleanUsername(username);
        String validation = usernameValidationMessage(cleaned, allowGebxby);
        if (validation != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, validation);
        }
        if (!isUsernameAvailableFor(cleaned, user, allowGebxby)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "USERNAME_TAKEN");
        }
        user.setUsername(cleaned);
        user.setUsernameNormalized(cleaned.toLowerCase(Locale.ROOT));
    }

    public boolean hasUsername(User user) {
        return user != null
                && StringUtils.hasText(user.getUsername())
                && StringUtils.hasText(user.getUsernameNormalized());
    }

    private String generateAvailableUsername(String name, String email, boolean allowGebxby, User owner) {
        if (allowGebxby && isUsernameAvailableFor("Gebxby", owner, true)) {
            return "Gebxby";
        }
        String base = usernameBase(StringUtils.hasText(name) ? name : email);
        List<String> candidates = new ArrayList<>(List.of(
                base,
                base + "_" + twoDigitCode(StringUtils.hasText(email) ? email : base),
                base + "." + twoDigitCode(StringUtils.hasText(name) ? name : base),
                base + "_x"
        ));
        for (String candidate : candidates) {
            if (isUsernameAvailableFor(candidate, owner, allowGebxby)) {
                return candidate;
            }
        }
        int attempts = 0;
        while (attempts < 200) {
            attempts++;
            String candidate = trimUsername(base, 18) + "_" + ThreadLocalRandom.current().nextInt(100, 99999);
            if (isUsernameAvailableFor(candidate, owner, allowGebxby)) {
                return candidate;
            }
        }
        return "user_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }

    private boolean isUsernameAvailableFor(String username, User owner, boolean allowGebxby) {
        String cleaned = cleanUsername(username);
        if (usernameValidationMessage(cleaned, allowGebxby) != null) {
            return false;
        }
        String normalized = cleaned.toLowerCase(Locale.ROOT);
        Optional<User> existingUser = Optional.ofNullable(userRepository.findByUsernameNormalized(normalized))
                .orElse(Optional.empty());
        return existingUser
                .map(existing -> owner != null && owner.getUserID() != null && owner.getUserID().equals(existing.getUserID()))
                .orElse(true);
    }

    private void addSuggestion(List<String> suggestions, String candidate, int limit, boolean allowGebxby) {
        if (suggestions.size() >= limit) {
            return;
        }
        String cleaned = cleanUsername(candidate);
        if (!suggestions.contains(cleaned) && isUsernameAvailableFor(cleaned, null, allowGebxby)) {
            suggestions.add(cleaned);
        }
    }

    private String usernameValidationMessage(String username, boolean allowGebxby) {
        if (!StringUtils.hasText(username)) {
            return "USERNAME_REQUIRED";
        }
        String cleaned = cleanUsername(username);
        if (cleaned.length() < MIN_USERNAME_LENGTH || cleaned.length() > MAX_USERNAME_LENGTH) {
            return "USERNAME_LENGTH_3_24";
        }
        if (!cleaned.matches("^[A-Za-z0-9._]+$")) {
            return "USERNAME_CHARS_INVALID";
        }
        if (cleaned.startsWith(".") || cleaned.endsWith(".") || cleaned.contains("..")) {
            return "USERNAME_DOT_INVALID";
        }
        String normalized = cleaned.toLowerCase(Locale.ROOT);
        if (RESERVED_USERNAMES.contains(normalized) && !(allowGebxby && "gebxby".equals(normalized))) {
            return "USERNAME_RESERVED";
        }
        return null;
    }

    private String usernameBase(String value) {
        String source = StringUtils.hasText(value) ? value : "archive_user";
        String ascii = source.toLowerCase(Locale.ROOT)
                .replaceAll("@.*$", "")
                .replaceAll("[^a-z0-9._]+", "_")
                .replaceAll("[._]{2,}", "_")
                .replaceAll("^[._]+|[._]+$", "");
        if (!StringUtils.hasText(ascii)) {
            ascii = "archive_user";
        }
        if (ascii.length() < MIN_USERNAME_LENGTH) {
            ascii = ascii + "_user";
        }
        if (RESERVED_USERNAMES.contains(ascii)) {
            ascii = ascii + "_user";
        }
        return trimUsername(ascii, MAX_USERNAME_LENGTH);
    }

    private String cleanUsername(String username) {
        String cleaned = username == null ? "" : username.trim();
        if (cleaned.startsWith("@")) {
            cleaned = cleaned.substring(1);
        }
        return trimUsername(cleaned, MAX_USERNAME_LENGTH);
    }

    private String trimUsername(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength).replaceAll("[._]+$", "");
    }

    private boolean isGebxbyName(String name) {
        return name != null && "gebxby".equals(name.trim().toLowerCase(Locale.ROOT));
    }

    private String twoDigitCode(String value) {
        return String.valueOf(Math.abs((value == null ? "user" : value).toLowerCase(Locale.ROOT).hashCode()) % 90 + 10);
    }
}
