package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.AnalyticsResponse;
import gebxby.gebxbyblog.dto.ContentResponse;
import gebxby.gebxbyblog.dto.LeaderboardEntryResponse;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.ContentVote;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.model.VoteDirection;
import gebxby.gebxbyblog.repository.ContentRepository;
import gebxby.gebxbyblog.repository.ContentVoteRepository;
import gebxby.gebxbyblog.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ContentAnalyticsService {
    private static final Duration ANALYTICS_CACHE_TTL = Duration.ofSeconds(45);

    private final ContentRepository contentRepository;
    private final ContentVoteRepository voteRepository;
    private final UserRepository userRepository;
    private final ForumMapper mapper;
    private volatile CacheEntry<AnalyticsSnapshot> analyticsCache;

    public ContentAnalyticsService(ContentRepository contentRepository,
                                   ContentVoteRepository voteRepository,
                                   UserRepository userRepository,
                                   ForumMapper mapper) {
        this.contentRepository = contentRepository;
        this.voteRepository = voteRepository;
        this.userRepository = userRepository;
        this.mapper = mapper;
    }

    public AnalyticsResponse getAnalytics(User viewer) {
        AnalyticsSnapshot snapshot = analyticsSnapshot();
        List<ContentResponse> mostRead = snapshot.mostRead().stream()
                .map(content -> mapper.toContentResponse(content, resolveUserVote(content.getIdContent(), viewer)))
                .toList();
        List<ContentResponse> mostUpvoted = snapshot.mostUpvoted().stream()
                .map(content -> mapper.toContentResponse(content, resolveUserVote(content.getIdContent(), viewer)))
                .toList();
        List<LeaderboardEntryResponse> leaderboard = snapshot.leaderboard().stream()
                .map(entry -> new LeaderboardEntryResponse(mapper.toPublicUser(entry.user()), entry.upCount()))
                .filter(entry -> entry.user() != null)
                .toList();

        return new AnalyticsResponse(mostRead, mostUpvoted, leaderboard);
    }

    public void invalidate() {
        analyticsCache = null;
    }

    private AnalyticsSnapshot analyticsSnapshot() {
        CacheEntry<AnalyticsSnapshot> cached = analyticsCache;
        if (cached != null && !cached.isExpired()) {
            return cached.value();
        }

        List<Content> mostRead = contentRepository.findTop10ByOrderByViewCountDesc().stream()
                .filter(this::isPublished)
                .toList();
        List<Content> mostUpvoted = contentRepository.findTop10ByOrderByUpCountDesc().stream()
                .filter(this::isPublished)
                .toList();

        LocalDateTime weekStart = LocalDateTime.now()
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .toLocalDate()
                .atStartOfDay();
        List<ContentVote> weeklyUpVotes = voteRepository.findByVoteAndCreatedAtGreaterThanEqual(VoteDirection.UP, weekStart);
        List<UUID> contentIds = weeklyUpVotes.stream()
                .map(ContentVote::getContentId)
                .distinct()
                .toList();
        Map<UUID, Content> contentById = contentRepository.findAllById(contentIds).stream()
                .collect(Collectors.toMap(Content::getIdContent, Function.identity()));

        Map<UUID, Long> upByAuthor = weeklyUpVotes.stream()
                .map(vote -> contentById.get(vote.getContentId()))
                .filter(content -> content != null && isPublished(content))
                .map(Content::getUser)
                .filter(user -> user != null && user.getUserID() != null)
                .collect(Collectors.groupingBy(User::getUserID, LinkedHashMap::new, Collectors.counting()));

        Map<UUID, User> usersById = userRepository.findByUserIDIn(upByAuthor.keySet()).stream()
                .collect(Collectors.toMap(User::getUserID, Function.identity()));

        List<LeaderboardSnapshotEntry> leaderboard = upByAuthor.entrySet().stream()
                .sorted(Map.Entry.<UUID, Long>comparingByValue(Comparator.reverseOrder()))
                .limit(10)
                .map(entry -> new LeaderboardSnapshotEntry(usersById.get(entry.getKey()), entry.getValue()))
                .filter(entry -> entry.user() != null)
                .toList();

        AnalyticsSnapshot snapshot = new AnalyticsSnapshot(mostRead, mostUpvoted, leaderboard);
        analyticsCache = CacheEntry.of(snapshot, ANALYTICS_CACHE_TTL);
        return snapshot;
    }

    private VoteDirection resolveUserVote(UUID contentId, User viewer) {
        if (viewer == null || viewer.getUserID() == null) {
            return VoteDirection.NONE;
        }
        return voteRepository.findByContentIdAndUserId(contentId, viewer.getUserID())
                .map(ContentVote::getVote)
                .orElse(VoteDirection.NONE);
    }

    private boolean isPublished(Content content) {
        return content == null || content.getStatus() == null || "PUBLISHED".equalsIgnoreCase(content.getStatus());
    }

    private record CacheEntry<T>(T value, long expiresAtMillis) {
        static <T> CacheEntry<T> of(T value, Duration ttl) {
            return new CacheEntry<>(value, System.currentTimeMillis() + ttl.toMillis());
        }

        boolean isExpired() {
            return System.currentTimeMillis() >= expiresAtMillis;
        }
    }

    private record AnalyticsSnapshot(
            List<Content> mostRead,
            List<Content> mostUpvoted,
            List<LeaderboardSnapshotEntry> leaderboard
    ) {
    }

    private record LeaderboardSnapshotEntry(User user, long upCount) {
    }
}
