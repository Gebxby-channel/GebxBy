package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.BadgeResponse;
import gebxby.gebxbyblog.dto.CustomBadgeRequest;
import gebxby.gebxbyblog.model.BadgeCode;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.ContentVote;
import gebxby.gebxbyblog.model.CustomBadgeDefinition;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.model.VoteDirection;
import gebxby.gebxbyblog.repository.ContentRepository;
import gebxby.gebxbyblog.repository.ContentVoteRepository;
import gebxby.gebxbyblog.repository.CustomBadgeRepository;
import gebxby.gebxbyblog.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class BadgeServiceImpl implements BadgeService {
    private static final Set<BadgeCode> MANUAL_BADGES = Set.of(
            BadgeCode.MODERATOR,
            BadgeCode.WRITERS,
            BadgeCode.MEDIA_TEC,
            BadgeCode.CRIMINAL,
            BadgeCode.SPEED,
            BadgeCode.SMILE,
            BadgeCode.REQUIEM
    );
    private static final Map<BadgeCode, BadgeMeta> META = new EnumMap<>(BadgeCode.class);

    static {
        META.put(BadgeCode.ADMIN, new BadgeMeta("Admin", "Bawaan admin, tidak bisa didapat user biasa.", "key", true));
        META.put(BadgeCode.MODERATOR, new BadgeMeta("Moderator", "Bisa suspend user selama 1 jam dan melapor ke admin.", "crown", false));
        META.put(BadgeCode.WRITERS, new BadgeMeta("Writers", "Penanda tulisan user dipercaya admin.", "typewriter", false));
        META.put(BadgeCode.SURVIVOR, new BadgeMeta("Survivor", "Badge bawaan semua user.", "guns-star", true));
        META.put(BadgeCode.MEDIA_TEC, new BadgeMeta("Media-tec", "Konten kreator dari platform lain.", "blue-check", false));
        META.put(BadgeCode.LIGA, new BadgeMeta("Liga", "Pemuncak leaderboard UP minggu ini.", "league", true));
        META.put(BadgeCode.CRIMINAL, new BadgeMeta("Criminal", "Tercatat pernah terkena suspend admin.", "shield-x", false));
        META.put(BadgeCode.SPEED, new BadgeMeta("Speed", "Publikasi cepat menurut penilaian admin.", "pocket-watch", false));
        META.put(BadgeCode.SMILE, new BadgeMeta("Smile", "Badge rahasia untuk komentar bernuansa senyum.", "smile", false));
        META.put(BadgeCode.REQUIEM, new BadgeMeta("Requiem", "Badge akhir untuk kolektor badge utama.", "wing", false));
    }

    private final UserRepository userRepository;
    private final ContentVoteRepository voteRepository;
    private final ContentRepository contentRepository;
    private final CustomBadgeRepository customBadgeRepository;

    @Autowired
    public BadgeServiceImpl(UserRepository userRepository,
                            ContentVoteRepository voteRepository,
                            ContentRepository contentRepository,
                            CustomBadgeRepository customBadgeRepository) {
        this.userRepository = userRepository;
        this.voteRepository = voteRepository;
        this.contentRepository = contentRepository;
        this.customBadgeRepository = customBadgeRepository;
    }

    public BadgeServiceImpl(UserRepository userRepository,
                            ContentVoteRepository voteRepository,
                            ContentRepository contentRepository) {
        this(userRepository, voteRepository, contentRepository, null);
    }

    @Override
    public List<BadgeResponse> effectiveBadges(User user) {
        if (user == null) {
            return List.of();
        }
        Set<BadgeCode> codes = new LinkedHashSet<>();
        if (user.isAdmin()) {
            codes.add(BadgeCode.ADMIN);
        }
        codes.add(BadgeCode.SURVIVOR);
        if (user.getManualBadges() != null) {
            codes.addAll(user.getManualBadges());
        }
        if (user.isCriminalMarked()) {
            codes.add(BadgeCode.CRIMINAL);
        }
        if (isWeeklyLeader(user.getUserID())) {
            codes.add(BadgeCode.LIGA);
        }
        if (hasRequiemPrerequisites(codes)) {
            codes.add(BadgeCode.REQUIEM);
        }
        List<BadgeResponse> response = definitions().stream()
                .filter(definition -> codes.contains(definition.code()))
                .toList();
        if (customBadgeRepository == null || user.getCustomBadgeIds() == null || user.getCustomBadgeIds().isEmpty()) {
            return response;
        }
        List<BadgeResponse> customBadges = customBadgeRepository.findAllById(user.getCustomBadgeIds()).stream()
                .sorted(Comparator.comparing(CustomBadgeDefinition::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::toCustomResponse)
                .toList();
        List<BadgeResponse> merged = new ArrayList<>(response);
        merged.addAll(customBadges);
        return merged;
    }

    @Override
    public boolean hasBadge(User user, BadgeCode badge) {
        return effectiveBadges(user).stream().anyMatch(response -> response.code() == badge);
    }

    @Override
    public User grantBadge(UUID userId, BadgeCode badge, User admin) {
        requireAdmin(admin);
        if (!MANUAL_BADGES.contains(badge)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Badge ini dikelola otomatis oleh sistem");
        }
        User user = getUser(userId);
        Set<BadgeCode> badges = manualBadges(user);
        badges.add(badge);
        user.setManualBadges(badges);
        if (badge == BadgeCode.CRIMINAL) {
            user.setCriminalMarked(true);
        }
        user.setUpdatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    @Override
    public User revokeBadge(UUID userId, BadgeCode badge, User admin) {
        requireAdmin(admin);
        if (!MANUAL_BADGES.contains(badge)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Badge ini tidak bisa dicabut manual");
        }
        User user = getUser(userId);
        Set<BadgeCode> badges = manualBadges(user);
        badges.remove(badge);
        user.setManualBadges(badges);
        if (badge == BadgeCode.CRIMINAL) {
            user.setCriminalMarked(false);
        }
        user.setUpdatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    @Override
    public BadgeResponse createCustomBadge(CustomBadgeRequest request, User admin) {
        requireAdmin(admin);
        if (customBadgeRepository == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Custom badge storage belum aktif");
        }
        String label = trim(request == null ? null : request.label(), 32);
        String icon = trim(request == null ? null : request.icon(), 12);
        String description = trim(request == null ? null : request.description(), 180);
        if (!StringUtils.hasText(label)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nama badge wajib diisi");
        }
        if (!StringUtils.hasText(icon)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Simbol badge wajib dipilih");
        }
        LocalDateTime now = LocalDateTime.now();
        CustomBadgeDefinition badge = new CustomBadgeDefinition();
        badge.setId(UUID.randomUUID());
        badge.setLabel(label);
        badge.setIcon(icon);
        badge.setDescription(description);
        badge.setCreatedByUserId(admin.getUserID());
        badge.setCreatedAt(now);
        badge.setUpdatedAt(now);
        return toCustomResponse(customBadgeRepository.save(badge));
    }

    @Override
    public void deleteCustomBadge(UUID badgeId, User admin) {
        requireAdmin(admin);
        if (customBadgeRepository == null) {
            return;
        }
        CustomBadgeDefinition badge = getCustomBadge(badgeId);
        userRepository.findAll().stream()
                .filter(user -> user.getCustomBadgeIds() != null && user.getCustomBadgeIds().contains(badge.getId()))
                .forEach(user -> {
                    Set<UUID> badges = customBadges(user);
                    badges.remove(badge.getId());
                    user.setCustomBadgeIds(badges);
                    user.setUpdatedAt(LocalDateTime.now());
                    userRepository.save(user);
                });
        customBadgeRepository.deleteById(badge.getId());
    }

    @Override
    public User grantCustomBadge(UUID userId, UUID badgeId, User admin) {
        requireAdmin(admin);
        CustomBadgeDefinition badge = getCustomBadge(badgeId);
        User user = getUser(userId);
        Set<UUID> badges = customBadges(user);
        badges.add(badge.getId());
        user.setCustomBadgeIds(badges);
        user.setUpdatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    @Override
    public User revokeCustomBadge(UUID userId, UUID badgeId, User admin) {
        requireAdmin(admin);
        CustomBadgeDefinition badge = getCustomBadge(badgeId);
        User user = getUser(userId);
        Set<UUID> badges = customBadges(user);
        badges.remove(badge.getId());
        user.setCustomBadgeIds(badges);
        user.setUpdatedAt(LocalDateTime.now());
        return userRepository.save(user);
    }

    @Override
    public List<BadgeResponse> definitions() {
        List<BadgeResponse> response = new ArrayList<>();
        for (BadgeCode code : BadgeCode.values()) {
            BadgeMeta meta = META.get(code);
            response.add(new BadgeResponse(code, meta.label(), meta.description(), meta.icon(), meta.automatic()));
        }
        if (customBadgeRepository != null) {
            customBadgeRepository.findAllByOrderByCreatedAtDesc().stream()
                    .map(this::toCustomResponse)
                    .forEach(response::add);
        }
        return response;
    }

    private boolean hasRequiemPrerequisites(Set<BadgeCode> badges) {
        return badges.contains(BadgeCode.MODERATOR)
                && badges.contains(BadgeCode.WRITERS)
                && badges.contains(BadgeCode.MEDIA_TEC)
                && badges.contains(BadgeCode.CRIMINAL)
                && badges.contains(BadgeCode.SPEED)
                && badges.contains(BadgeCode.SMILE)
                && badges.contains(BadgeCode.LIGA);
    }

    private boolean isWeeklyLeader(UUID userId) {
        if (userId == null) {
            return false;
        }
        LocalDateTime weekStart = LocalDateTime.now()
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .toLocalDate()
                .atStartOfDay();
        List<ContentVote> weeklyUpVotes = voteRepository.findByVoteAndCreatedAtGreaterThanEqual(VoteDirection.UP, weekStart);
        if (weeklyUpVotes.isEmpty()) {
            return false;
        }
        List<UUID> contentIds = weeklyUpVotes.stream().map(ContentVote::getContentId).distinct().toList();
        Map<UUID, Content> contentById = contentRepository.findAllById(contentIds).stream()
                .collect(Collectors.toMap(Content::getIdContent, Function.identity()));
        Optional<Map.Entry<UUID, Long>> top = weeklyUpVotes.stream()
                .map(vote -> contentById.get(vote.getContentId()))
                .filter(Objects::nonNull)
                .map(Content::getUser)
                .filter(user -> user != null && user.getUserID() != null)
                .collect(Collectors.groupingBy(User::getUserID, Collectors.counting()))
                .entrySet()
                .stream()
                .max(Map.Entry.comparingByValue(Comparator.naturalOrder()));
        return top.map(entry -> entry.getKey().equals(userId)).orElse(false);
    }

    private Set<BadgeCode> manualBadges(User user) {
        return user.getManualBadges() == null ? new LinkedHashSet<>() : new LinkedHashSet<>(user.getManualBadges());
    }

    private Set<UUID> customBadges(User user) {
        return user.getCustomBadgeIds() == null ? new LinkedHashSet<>() : new LinkedHashSet<>(user.getCustomBadgeIds());
    }

    private CustomBadgeDefinition getCustomBadge(UUID badgeId) {
        if (customBadgeRepository == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Custom badge storage belum aktif");
        }
        return customBadgeRepository.findById(badgeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Custom badge tidak ditemukan"));
    }

    private BadgeResponse toCustomResponse(CustomBadgeDefinition badge) {
        return BadgeResponse.custom(badge.getId(), badge.getLabel(), badge.getDescription(), badge.getIcon());
    }

    private User getUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User tidak ditemukan"));
    }

    private void requireAdmin(User user) {
        if (user == null || !user.isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }

    private String trim(String value, int maxLength) {
        String trimmed = value == null ? "" : value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }

    private record BadgeMeta(String label, String description, String icon, boolean automatic) {
    }
}
