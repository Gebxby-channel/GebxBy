package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.AnalyticsResponse;
import gebxby.gebxbyblog.dto.ContentImageRequest;
import gebxby.gebxbyblog.dto.ContentRequest;
import gebxby.gebxbyblog.dto.ContentResponse;
import gebxby.gebxbyblog.dto.ContentStatsResponse;
import gebxby.gebxbyblog.dto.FeedResponse;
import gebxby.gebxbyblog.dto.LeaderboardEntryResponse;
import gebxby.gebxbyblog.model.Comment;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.ContentVote;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.model.VoteDirection;
import gebxby.gebxbyblog.repository.CommentRepository;
import gebxby.gebxbyblog.repository.ContentRepository;
import gebxby.gebxbyblog.repository.ContentVoteRepository;
import gebxby.gebxbyblog.repository.GenreRepository;
import gebxby.gebxbyblog.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.HtmlUtils;

import java.io.IOException;
import java.io.InputStream;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ContentServiceImpl implements ContentService {
    private static final List<String> DEFAULT_CATEGORIES = List.of(
            "General",
            "Lore",
            "Speculation",
            "Analistic Pshycologic",
            "Fan-Novel",
            "QNA"
    );
    private static final int MAX_TITLE_LENGTH = 180;
    private static final int MAX_CATEGORY_LENGTH = 60;
    private static final int MAX_BODY_LENGTH = 120_000;
    private static final Duration CATEGORY_CACHE_TTL = Duration.ofMinutes(5);
    private static final Duration ANALYTICS_CACHE_TTL = Duration.ofSeconds(45);
    private static final int DEFAULT_FEED_LIMIT = 20;
    private static final int MAX_FEED_LIMIT = 50;
    private static final int RECOMMENDATION_POOL_SIZE = 120;
    private static final String STATUS_PUBLISHED = "PUBLISHED";
    private static final String STATUS_DRAFT = "DRAFT";
    private static final Safelist ARTICLE_SAFELIST = Safelist.relaxed()
            .removeTags("img")
            .addTags("h1", "h2", "pre", "code", "span", "u", "strong", "em", "blockquote", "ul", "ol", "li")
            .addAttributes("span", "class")
            .addAttributes("a", "target", "rel")
            .addProtocols("a", "href", "http", "https", "mailto");

    private final ContentRepository contentRepository;
    private final ContentVoteRepository voteRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final MediaPipelineService mediaPipelineService;
    private final GenreRepository genreRepository;
    private final ForumMapper mapper;
    private final ActivityLogService activityLogService;
    private final long maxUploadBytes;
    private volatile CacheEntry<List<String>> categoriesCache;
    private volatile CacheEntry<AnalyticsSnapshot> analyticsCache;

    @Autowired
    public ContentServiceImpl(ContentRepository contentRepository,
                              ContentVoteRepository voteRepository,
                              CommentRepository commentRepository,
                              UserRepository userRepository,
                              UserService userService,
                              MediaPipelineService mediaPipelineService,
                              GenreRepository genreRepository,
                              ForumMapper mapper,
                              ActivityLogService activityLogService,
                              @Value("${app.max-upload-bytes:5242880}") long maxUploadBytes) {
        this.contentRepository = contentRepository;
        this.voteRepository = voteRepository;
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.userService = userService;
        this.mediaPipelineService = mediaPipelineService;
        this.genreRepository = genreRepository;
        this.mapper = mapper;
        this.activityLogService = activityLogService;
        this.maxUploadBytes = maxUploadBytes;
    }

    public ContentServiceImpl(ContentRepository contentRepository,
                              ContentVoteRepository voteRepository,
                              CommentRepository commentRepository,
                              UserRepository userRepository,
                              UserService userService,
                              MediaPipelineService mediaPipelineService,
                              ForumMapper mapper,
                              ActivityLogService activityLogService,
                              long maxUploadBytes) {
        this(contentRepository, voteRepository, commentRepository, userRepository, userService,
                mediaPipelineService, null, mapper, activityLogService, maxUploadBytes);
    }

    @Override
    public ContentResponse addContent(ContentRequest request, User author) {
        userService.ensureActive(author);
        Content content = new Content();
        LocalDateTime now = LocalDateTime.now();
        content.setIdContent(UUID.randomUUID());
        applyContentFields(content, request);
        content.setStatus(STATUS_PUBLISHED);
        content.setUser(author);
        content.setCreatedAt(now);
        content.setUpdatedAt(now);
        Content saved = contentRepository.save(content);
        activityLogService.recordPublication(saved, author);
        invalidateContentCaches();
        return mapper.toContentResponse(saved, VoteDirection.NONE, true);
    }

    @Override
    public ContentResponse saveDraft(UUID draftId, ContentRequest request, User author) {
        userService.ensureActive(author);
        Content draft = draftId == null ? new Content() : getContentOrThrow(draftId);
        if (draftId == null) {
            draft.setIdContent(UUID.randomUUID());
            draft.setUser(author);
            draft.setCreatedAt(LocalDateTime.now());
        } else {
            requireOwnerOrAdmin(draft, author);
            if (!isDraft(draft)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tulisan ini sudah diterbitkan");
            }
        }
        applyDraftFields(draft, request);
        draft.setStatus(STATUS_DRAFT);
        draft.setUpdatedAt(LocalDateTime.now());
        Content saved = contentRepository.save(draft);
        invalidateContentCaches();
        return mapper.toContentResponse(saved, resolveUserVote(saved.getIdContent(), author), true);
    }

    @Override
    public ContentResponse publishDraft(UUID draftId, ContentRequest request, User author) {
        userService.ensureActive(author);
        Content draft = getContentOrThrow(draftId);
        requireOwnerOrAdmin(draft, author);
        if (!isDraft(draft)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tulisan ini bukan draft");
        }
        applyContentFields(draft, request);
        draft.setStatus(STATUS_PUBLISHED);
        draft.setUpdatedAt(LocalDateTime.now());
        Content saved = contentRepository.save(draft);
        activityLogService.recordPublication(saved, author);
        invalidateContentCaches();
        return mapper.toContentResponse(saved, resolveUserVote(saved.getIdContent(), author), true);
    }

    @Override
    public ContentResponse addContentFromDocx(MultipartFile file, String kategori, String title, List<ContentImageRequest> images, User author) throws IOException {
        userService.ensureActive(author);
        validateDocx(file);

        String text;
        try (InputStream inputStream = file.getInputStream();
             XWPFDocument document = new XWPFDocument(inputStream)) {
            text = document.getParagraphs().stream()
                    .map(paragraph -> paragraph.getText() == null ? "" : paragraph.getText())
                    .collect(Collectors.joining("\n\n"));
        }

        ContentRequest request = new ContentRequest(title, null, text, kategori, images == null ? List.of() : images);
        return addContent(request, author);
    }

    @Override
    public List<ContentResponse> findAll(User viewer) {
        return contentRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(this::isPublished)
                .map(content -> mapper.toContentResponse(content, resolveUserVote(content.getIdContent(), viewer)))
                .toList();
    }

    @Override
    public List<ContentResponse> feed(String mode, String category, int limit, User viewer) {
        return feedPage(mode, category, 0, limit, viewer).items();
    }

    @Override
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

    @Override
    public List<ContentResponse> findByCategory(String category, User viewer) {
        if (!StringUtils.hasText(category) || "all".equalsIgnoreCase(category)) {
            return findAll(viewer);
        }
        return contentRepository.findByKategoriIgnoreCaseOrderByCreatedAtDesc(category.trim()).stream()
                .filter(this::isPublished)
                .map(content -> mapper.toContentResponse(content, resolveUserVote(content.getIdContent(), viewer)))
                .toList();
    }

    @Override
    public List<ContentResponse> findByAuthor(UUID userId, User viewer) {
        return contentRepository.findByAuthorIdOrderByCreatedAtDesc(userId).stream()
                .filter(content -> isPublished(content) || canViewDraft(content, viewer))
                .map(content -> mapper.toContentResponse(content, resolveUserVote(content.getIdContent(), viewer)))
                .toList();
    }

    @Override
    public ContentResponse findContentById(UUID id, User viewer, boolean incrementView) {
        Content content = getContentOrThrow(id);
        requirePublishedOrDraftAccess(content, viewer);
        if (incrementView) {
            content.setViewCount(content.getViewCount() + 1);
            content.setUpdatedAt(LocalDateTime.now());
            content = contentRepository.save(content);
        }
        return mapper.toContentResponse(content, resolveUserVote(id, viewer), true);
    }

    @Override
    public ContentStatsResponse recordView(UUID id, User viewer) {
        Content content = getContentOrThrow(id);
        requirePublishedOrDraftAccess(content, viewer);
        if (isDraft(content)) {
            return mapper.toStatsResponse(content, commentRepository.countByContentIdAndDeletedFalse(id), resolveUserVote(id, viewer));
        }
        content.setViewCount(content.getViewCount() + 1);
        content.setUpdatedAt(LocalDateTime.now());
        content = contentRepository.save(content);
        return mapper.toStatsResponse(content, commentRepository.countByContentIdAndDeletedFalse(id), resolveUserVote(id, viewer));
    }

    @Override
    public ContentResponse updateContent(UUID id, ContentRequest contentDetails, User actor) {
        userService.ensureActive(actor);
        Content existingContent = getContentOrThrow(id);
        requireOwnerOrAdmin(existingContent, actor);
        applyContentFields(existingContent, contentDetails);
        existingContent.setStatus(STATUS_PUBLISHED);
        existingContent.setUpdatedAt(LocalDateTime.now());
        Content saved = contentRepository.save(existingContent);
        invalidateContentCaches();
        return mapper.toContentResponse(saved, resolveUserVote(id, actor), true);
    }

    @Override
    public void deleteContent(UUID id, User actor) {
        userService.ensureActive(actor);
        Content content = getContentOrThrow(id);
        requireOwnerOrAdmin(content, actor);
        activityLogService.recordContentDelete(actor, content);
        commentRepository.deleteByContentId(id);
        voteRepository.deleteByContentId(id);
        contentRepository.deleteById(id);
        invalidateContentCaches();
    }

    @Override
    public ContentStatsResponse getStats(UUID id, User viewer) {
        Content content = getContentOrThrow(id);
        requirePublishedOrDraftAccess(content, viewer);
        long comments = commentRepository.countByContentIdAndDeletedFalse(id);
        return mapper.toStatsResponse(content, comments, resolveUserVote(id, viewer));
    }

    @Override
    public ContentStatsResponse vote(UUID id, VoteDirection vote, User voter) {
        userService.ensureActive(voter);
        VoteDirection requestedVote = vote == null ? VoteDirection.NONE : vote;
        Content content = getContentOrThrow(id);
        if (!isPublished(content)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Draft belum bisa divote");
        }
        Optional<ContentVote> existing = voteRepository.findByContentIdAndUserId(id, voter.getUserID());

        if (existing.isPresent()) {
            ContentVote current = existing.get();
            if (requestedVote == VoteDirection.NONE || current.getVote() == requestedVote) {
                applyVoteDelta(content, current.getVote(), -1);
                voteRepository.delete(current);
                requestedVote = VoteDirection.NONE;
            } else {
                applyVoteDelta(content, current.getVote(), -1);
                applyVoteDelta(content, requestedVote, 1);
                current.setVote(requestedVote);
                current.setCreatedAt(LocalDateTime.now());
                current.setUpdatedAt(LocalDateTime.now());
                voteRepository.save(current);
            }
        } else if (requestedVote != VoteDirection.NONE) {
            ContentVote newVote = new ContentVote();
            newVote.setId(ContentVote.buildId(id, voter.getUserID()));
            newVote.setContentId(id);
            newVote.setUserId(voter.getUserID());
            newVote.setVote(requestedVote);
            newVote.setCreatedAt(LocalDateTime.now());
            newVote.setUpdatedAt(LocalDateTime.now());
            voteRepository.save(newVote);
            applyVoteDelta(content, requestedVote, 1);
        }

        content.setUpdatedAt(LocalDateTime.now());
        content = contentRepository.save(content);
        analyticsCache = null;
        return mapper.toStatsResponse(content, commentRepository.countByContentIdAndDeletedFalse(id), requestedVote);
    }

    @Override
    public List<String> findCategories() {
        CacheEntry<List<String>> cached = categoriesCache;
        if (cached != null && !cached.isExpired()) {
            return cached.value();
        }
        Set<String> categories = new LinkedHashSet<>(DEFAULT_CATEGORIES);
        if (genreRepository != null) {
            genreRepository.findAllByOrderByNameAsc().stream()
                    .map(genre -> normalizeCategory(genre.getName()))
                    .forEach(categories::add);
        } else {
            contentRepository.findCategoryFields().stream()
                    .filter(this::isPublished)
                    .map(Content::getKategori)
                    .filter(StringUtils::hasText)
                    .map(this::normalizeCategory)
                    .forEach(categories::add);
        }
        List<String> result = List.copyOf(new ArrayList<>(categories));
        categoriesCache = CacheEntry.of(result, CATEGORY_CACHE_TTL);
        return result;
    }

    @Override
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

    private Content getContentOrThrow(UUID id) {
        return contentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tulisan tidak ditemukan"));
    }

    private void applyContentFields(Content content, ContentRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload tulisan wajib diisi");
        }
        String title = trimToLength(request.head(), MAX_TITLE_LENGTH);
        String body = request.paragrafs() == null ? "" : request.paragrafs();
        String normalizedBody = normalizeArticleBody(body);
        if (!StringUtils.hasText(title)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Judul wajib diisi");
        }
        if (!StringUtils.hasText(Jsoup.parse(normalizedBody).text())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Isi tulisan wajib diisi");
        }
        content.setHead(title);
        content.setSubtitle(trimToLength(request.subtitle(), MAX_TITLE_LENGTH));
        content.setParagrafs(sanitizeArticle(normalizedBody));
        content.setKategori(normalizeCategory(request.kategori()));
        if (request.images() != null) {
            content.setImages(mediaPipelineService.prepareContentImages(request.images()));
        }
    }

    private void applyDraftFields(Content content, ContentRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload draft wajib diisi");
        }
        String title = trimToLength(request.head(), MAX_TITLE_LENGTH);
        String body = request.paragrafs() == null ? "" : request.paragrafs();
        String normalizedBody = normalizeArticleBody(body);
        content.setHead(StringUtils.hasText(title) ? title : "Untitled Draft");
        content.setSubtitle(trimToLength(request.subtitle(), MAX_TITLE_LENGTH));
        content.setParagrafs(sanitizeArticle(normalizedBody));
        content.setKategori(normalizeCategory(request.kategori()));
        if (request.images() != null) {
            content.setImages(mediaPipelineService.prepareContentImages(request.images()));
        }
    }

    private String sanitizeArticle(String html) {
        String trimmed = html.length() > MAX_BODY_LENGTH ? html.substring(0, MAX_BODY_LENGTH) : html;
        return Jsoup.clean(trimmed, ARTICLE_SAFELIST);
    }

    private String normalizeArticleBody(String body) {
        String normalized = body == null ? "" : body
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .trim();
        if (looksLikeHtml(normalized)) {
            return normalized;
        }

        return Arrays.stream(normalized.split("\\n\\s*\\n+"))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(block -> "<p>" + HtmlUtils.htmlEscape(block).replace("\n", "<br>") + "</p>")
                .collect(Collectors.joining("\n"));
    }

    private boolean looksLikeHtml(String value) {
        return value.matches("(?s).*<\\s*/?\\s*[a-zA-Z][^>]*>.*");
    }

    private void validateDocx(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File DOCX wajib diisi");
        }
        if (file.getSize() > maxUploadBytes) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Ukuran file terlalu besar");
        }
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        String contentType = file.getContentType() == null ? "" : file.getContentType();
        boolean docxType = contentType.isBlank()
                || "application/vnd.openxmlformats-officedocument.wordprocessingml.document".equals(contentType);
        if (!filename.endsWith(".docx") || !docxType) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hanya file .docx yang diperbolehkan");
        }
    }

    private void requireOwnerOrAdmin(Content content, User actor) {
        if (userService.isAdmin(actor)) {
            return;
        }
        UUID ownerId = content.getUser() == null ? null : content.getUser().getUserID();
        if (ownerId == null || !ownerId.equals(actor.getUserID())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Hanya pemilik atau admin yang boleh mengubah data ini");
        }
    }

    private void requirePublishedOrDraftAccess(Content content, User viewer) {
        if (isPublished(content) || canViewDraft(content, viewer)) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tulisan tidak ditemukan");
    }

    private boolean canViewDraft(Content content, User viewer) {
        if (!isDraft(content) || viewer == null || viewer.getUserID() == null) {
            return false;
        }
        if (userService.isAdmin(viewer)) {
            return true;
        }
        UUID ownerId = content.getUser() == null ? null : content.getUser().getUserID();
        return ownerId != null && ownerId.equals(viewer.getUserID());
    }

    private boolean isPublished(Content content) {
        return content == null || content.getStatus() == null || STATUS_PUBLISHED.equalsIgnoreCase(content.getStatus());
    }

    private boolean isDraft(Content content) {
        return content != null && STATUS_DRAFT.equalsIgnoreCase(content.getStatus());
    }

    private VoteDirection resolveUserVote(UUID contentId, User viewer) {
        if (viewer == null || viewer.getUserID() == null) {
            return VoteDirection.NONE;
        }
        return voteRepository.findByContentIdAndUserId(contentId, viewer.getUserID())
                .map(ContentVote::getVote)
                .orElse(VoteDirection.NONE);
    }

    private void applyVoteDelta(Content content, VoteDirection vote, int delta) {
        if (vote == VoteDirection.UP) {
            content.setUpCount(Math.max(0, content.getUpCount() + delta));
        } else if (vote == VoteDirection.DOWN) {
            content.setDownCount(Math.max(0, content.getDownCount() + delta));
        }
    }

    private String normalizeCategory(String category) {
        String clean = trimToLength(category, MAX_CATEGORY_LENGTH).replaceAll("\\s+", " ");
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

    private void invalidateContentCaches() {
        categoriesCache = null;
        analyticsCache = null;
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
