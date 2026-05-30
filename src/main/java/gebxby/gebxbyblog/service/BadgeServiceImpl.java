package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.BadgeResponse;
import gebxby.gebxbyblog.model.BadgeCode;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.ContentVote;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.model.VoteDirection;
import gebxby.gebxbyblog.repository.ContentRepository;
import gebxby.gebxbyblog.repository.ContentVoteRepository;
import gebxby.gebxbyblog.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
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

    public BadgeServiceImpl(UserRepository userRepository,
                            ContentVoteRepository voteRepository,
                            ContentRepository contentRepository) {
        this.userRepository = userRepository;
        this.voteRepository = voteRepository;
        this.contentRepository = contentRepository;
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
        return definitions().stream()
                .filter(definition -> codes.contains(definition.code()))
                .toList();
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
    public List<BadgeResponse> definitions() {
        List<BadgeResponse> response = new ArrayList<>();
        for (BadgeCode code : BadgeCode.values()) {
            BadgeMeta meta = META.get(code);
            response.add(new BadgeResponse(code, meta.label(), meta.description(), meta.icon(), meta.automatic()));
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

    private User getUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User tidak ditemukan"));
    }

    private void requireAdmin(User user) {
        if (user == null || !user.isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }

    private record BadgeMeta(String label, String description, String icon, boolean automatic) {
    }
}
