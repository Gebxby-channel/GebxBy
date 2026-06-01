package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.ContentResponse;
import gebxby.gebxbyblog.dto.FeedResponse;
import gebxby.gebxbyblog.model.Comment;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.ContentVote;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.model.VoteDirection;
import gebxby.gebxbyblog.repository.CommentRepository;
import gebxby.gebxbyblog.repository.ContentRepository;
import gebxby.gebxbyblog.repository.ContentVoteRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.Arrays;

@Service
public class ContentFeedService {
    private static final int DEFAULT_FEED_LIMIT = 20;
    private static final int MAX_FEED_LIMIT = 50;
    private static final int RECOMMENDATION_POOL_SIZE = 120;

    private final ContentRepository contentRepository;
    private final ContentVoteRepository voteRepository;
    private final CommentRepository commentRepository;
    private final ForumMapper mapper;

    public ContentFeedService(ContentRepository contentRepository,
                              ContentVoteRepository voteRepository,
                              CommentRepository commentRepository,
                              ForumMapper mapper) {
        this.contentRepository = contentRepository;
        this.voteRepository = voteRepository;
        this.commentRepository = commentRepository;
        this.mapper = mapper;
    }

    public List<ContentResponse> feed(String mode, String category, int limit, User viewer) {
        return feedPage(mode, category, 0, limit, viewer).items();
    }

    public FeedResponse feedPage(String mode, String category, int page, int limit, User viewer) {
        String feedMode = normalizeFeedMode(mode);
        int pageSize = clampFeedLimit(limit);
        int pageNumber = Math.max(0, page);
        List<Content> contents = switch (feedMode) {
            case "category" -> feedByCategory(category, pageNumber, pageSize + 1);
            case "trending" -> trendingFeed(pageNumber, pageSize + 1);
            case "recommended" -> recommendedFeed(viewer, pageNumber, pageSize + 1);
            case "following" -> followingFeed(viewer, pageNumber, pageSize + 1);
            default -> contentRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(pageNumber, pageSize + 1));
        };
        boolean hasMore = contents.size() > pageSize;
        List<ContentResponse> items = contents.stream()
                .filter(this::isPublished)
                .limit(pageSize)
                .map(content -> mapper.toContentResponse(content, resolveUserVote(content.getIdContent(), viewer)))
                .toList();
        return new FeedResponse(items, pageNumber, pageSize, hasMore);
    }

    private List<Content> feedByCategory(String category, int page, int limit) {
        if (!StringUtils.hasText(category) || "all".equalsIgnoreCase(category)) {
            return contentRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, limit));
        }
        return contentRepository.findByKategoriIgnoreCaseOrderByCreatedAtDesc(normalizeCategory(category), PageRequest.of(page, limit));
    }

    private List<Content> trendingFeed(int page, int limit) {
        int needed = (page + 1) * limit;
        LocalDateTime recentWindow = LocalDateTime.now().minusDays(14);
        int poolSize = Math.min(RECOMMENDATION_POOL_SIZE, Math.max(needed * 4, needed));
        List<Content> recent = contentRepository.findByCreatedAtGreaterThanEqualOrderByUpCountDescCreatedAtDesc(
                recentWindow,
                PageRequest.of(0, poolSize)
        );
        if (recent.isEmpty()) {
            recent = contentRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, poolSize));
        }
        return recent.stream()
                .filter(this::isPublished)
                .sorted(Comparator.comparingDouble(this::trendingScore).reversed())
                .skip((long) page * limit)
                .limit(limit)
                .toList();
    }

    private List<Content> recommendedFeed(User viewer, int page, int limit) {
        if (viewer == null || viewer.getUserID() == null) {
            return trendingFeed(page, limit);
        }

        RecommendationProfile profile = buildRecommendationProfile(viewer);
        if (profile.isEmpty()) {
            return trendingFeed(page, limit);
        }

        List<Content> pool = contentRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, RECOMMENDATION_POOL_SIZE));
        return pool.stream()
                .filter(this::isPublished)
                .sorted(Comparator.comparingDouble((Content content) -> recommendationScore(content, profile)).reversed())
                .skip((long) page * limit)
                .limit(limit)
                .toList();
    }

    private List<Content> followingFeed(User viewer, int page, int limit) {
        if (viewer == null || viewer.getUserID() == null || viewer.getFollowingUserIds() == null || viewer.getFollowingUserIds().isEmpty()) {
            return List.of();
        }
        return contentRepository.findFollowingFeed(viewer.getFollowingUserIds(), List.of(), PageRequest.of(page, limit)).stream()
                .filter(this::isPublished)
                .toList();
    }

    private RecommendationProfile buildRecommendationProfile(User viewer) {
        Map<String, Integer> categoryWeights = new HashMap<>();
        Set<UUID> preferredAuthors = new HashSet<>(viewer.getFollowingUserIds() == null ? Set.of() : viewer.getFollowingUserIds());
        Set<UUID> interactedContentIds = new HashSet<>();

        List<ContentVote> votes = voteRepository.findByUserId(viewer.getUserID());
        Map<UUID, ContentVote> votesByContent = votes.stream()
                .collect(Collectors.toMap(ContentVote::getContentId, Function.identity(), (first, second) -> first));
        interactedContentIds.addAll(votesByContent.keySet());

        Set<UUID> contentIds = new HashSet<>(votesByContent.keySet());
        commentRepository.findByAuthorId(viewer.getUserID()).stream()
                .map(Comment::getContentId)
                .filter(Objects::nonNull)
                .forEach(id -> {
                    contentIds.add(id);
                    interactedContentIds.add(id);
                });

        Map<UUID, Content> interactedContents = contentRepository.findAllById(contentIds).stream()
                .collect(Collectors.toMap(Content::getIdContent, Function.identity(), (first, second) -> first));

        interactedContents.forEach((contentId, content) -> {
            ContentVote vote = votesByContent.get(contentId);
            int weight = vote == null
                    ? 1
                    : vote.getVote() == VoteDirection.UP ? 3
                    : vote.getVote() == VoteDirection.DOWN ? -2
                    : 0;
            if (StringUtils.hasText(content.getKategori()) && weight != 0) {
                categoryWeights.merge(normalizeCategory(content.getKategori()), weight, Integer::sum);
            }
            if (weight > 0 && content.getUser() != null && content.getUser().getUserID() != null) {
                preferredAuthors.add(content.getUser().getUserID());
            }
        });

        contentRepository.findByAuthorIdOrderByCreatedAtDesc(viewer.getUserID()).stream()
                .filter(this::isPublished)
                .limit(8)
                .map(Content::getKategori)
                .filter(StringUtils::hasText)
                .map(this::normalizeCategory)
                .forEach(category -> categoryWeights.merge(category, 1, Integer::sum));

        return new RecommendationProfile(categoryWeights, preferredAuthors, interactedContentIds);
    }

    private double recommendationScore(Content content, RecommendationProfile profile) {
        double score = trendingScore(content);
        String category = normalizeCategory(content.getKategori());
        score += profile.categoryWeights().getOrDefault(category, 0) * 14.0;
        UUID authorId = content.getUser() == null ? null : content.getUser().getUserID();
        if (authorId != null && profile.preferredAuthors().contains(authorId)) {
            score += 18.0;
        }
        if (profile.interactedContentIds().contains(content.getIdContent())) {
            score -= 60.0;
        }
        return score;
    }

    private double trendingScore(Content content) {
        LocalDateTime createdAt = content.getCreatedAt() == null ? LocalDateTime.now().minusDays(30) : content.getCreatedAt();
        long ageHours = Math.max(1, Duration.between(createdAt, LocalDateTime.now()).toHours());
        double freshness = 80.0 / Math.sqrt(ageHours + 12.0);
        return content.getUpCount() * 6.0
                + content.getCommentCount() * 2.5
                + content.getViewCount() * 0.45
                - content.getDownCount() * 3.0
                + freshness;
    }

    private String normalizeFeedMode(String mode) {
        if (!StringUtils.hasText(mode)) {
            return "all";
        }
        return switch (mode.trim().toLowerCase(Locale.ROOT)) {
            case "recommended", "for-you", "foryou", "untukmu" -> "recommended";
            case "trending", "popular" -> "trending";
            case "category", "kategori" -> "category";
            case "following", "followed" -> "following";
            default -> "all";
        };
    }

    private int clampFeedLimit(int limit) {
        int requested = limit <= 0 ? DEFAULT_FEED_LIMIT : limit;
        return Math.max(1, Math.min(requested, MAX_FEED_LIMIT));
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

    private String normalizeCategory(String category) {
        String clean = trimToLength(category, 60).replaceAll("\\s+", " ");
        if (!StringUtils.hasText(clean)) {
            return "General";
        }
        String key = clean.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
        if ("general".equals(key)) {
            return "General";
        }
        if ("lore".equals(key)) {
            return "Lore";
        }
        if ("speculation".equals(key) || "spekulasiteori".equals(key)) {
            return "Speculation";
        }
        if ("analisticpshycologic".equals(key) || "analyticpsychological".equals(key)) {
            return "Analistic Pshycologic";
        }
        if ("fannovel".equals(key)) {
            return "Fan-Novel";
        }
        if ("qna".equals(key) || "qa".equals(key)) {
            return "QNA";
        }
        return Arrays.stream(clean.split(" "))
                .filter(StringUtils::hasText)
                .map(part -> part.substring(0, 1).toUpperCase(Locale.ROOT) + part.substring(1).toLowerCase(Locale.ROOT))
                .collect(Collectors.joining(" "));
    }

    private String trimToLength(String value, int maxLength) {
        String trimmed = value == null ? "" : value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }

    private record RecommendationProfile(
            Map<String, Integer> categoryWeights,
            Set<UUID> preferredAuthors,
            Set<UUID> interactedContentIds
    ) {
        boolean isEmpty() {
            return categoryWeights.isEmpty() && preferredAuthors.isEmpty();
        }
    }
}
