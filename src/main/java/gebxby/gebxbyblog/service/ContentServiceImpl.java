package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.AnalyticsResponse;
import gebxby.gebxbyblog.dto.ContentImageRequest;
import gebxby.gebxbyblog.dto.ContentRequest;
import gebxby.gebxbyblog.dto.ContentResponse;
import gebxby.gebxbyblog.dto.ContentStatsResponse;
import gebxby.gebxbyblog.dto.FeedResponse;
import gebxby.gebxbyblog.dto.VoteBatchResponse;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class ContentServiceImpl implements ContentService {
    private static final Logger log = LoggerFactory.getLogger(ContentServiceImpl.class);
    private static final List<String> DEFAULT_CATEGORIES = List.of(
            "General",
            "Lore",
            "Speculation",
            "Analistic Pshycologic",
            "Fan-Novel",
            "QNA"
    );
    private static final Duration CATEGORY_CACHE_TTL = Duration.ofMinutes(5);
    private static final String STATUS_PUBLISHED = "PUBLISHED";
    private static final String STATUS_DRAFT = "DRAFT";

    private final ContentRepository contentRepository;
    private final ContentVoteRepository voteRepository;
    private final CommentRepository commentRepository;
    private final UserService userService;
    private final GenreRepository genreRepository;
    private final ForumMapper mapper;
    private final ActivityLogService activityLogService;
    private final ContentFeedService feedService;
    private final ContentAnalyticsService analyticsService;
    private final ArticleContentPolicy articlePolicy;
    private final ContentCounterService counterService;
    private final ValidReadTrackingService readTrackingService;
    private final UserSnapshotService userSnapshotService;
    private volatile CacheEntry<List<String>> categoriesCache;

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
                              @Value("${app.max-upload-bytes:5242880}") long maxUploadBytes,
                              ContentFeedService feedService,
                              ContentAnalyticsService analyticsService,
                              ArticleContentPolicy articlePolicy,
                              ContentCounterService counterService,
                              ValidReadTrackingService readTrackingService,
                              UserSnapshotService userSnapshotService) {
        this.contentRepository = contentRepository;
        this.voteRepository = voteRepository;
        this.commentRepository = commentRepository;
        this.userService = userService;
        this.genreRepository = genreRepository;
        this.mapper = mapper;
        this.activityLogService = activityLogService;
        this.feedService = feedService;
        this.analyticsService = analyticsService;
        this.articlePolicy = articlePolicy;
        this.counterService = counterService;
        this.readTrackingService = readTrackingService;
        this.userSnapshotService = userSnapshotService;
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
                mediaPipelineService, null, mapper, activityLogService, maxUploadBytes,
                new ContentFeedService(contentRepository, voteRepository, commentRepository, mapper),
                new ContentAnalyticsService(contentRepository, voteRepository, userRepository, mapper),
                new ArticleContentPolicy(mediaPipelineService, maxUploadBytes),
                new ContentCounterService(contentRepository, null),
                new ValidReadTrackingService(null),
                new UserSnapshotService());
    }

    @Override
    public ContentResponse addContent(ContentRequest request, User author) {
        userService.ensureActive(author);
        Content content = new Content();
        LocalDateTime now = LocalDateTime.now();
        content.setIdContent(UUID.randomUUID());
        articlePolicy.applyPublishedFields(content, request);
        content.setStatus(STATUS_PUBLISHED);
        content.setUser(userSnapshotService.snapshot(author));
        content.setCreatedAt(now);
        content.setUpdatedAt(now);
        Content saved = contentRepository.save(content);
        recordPublicationSafely(saved, author);
        invalidateContentCaches();
        return mapper.toContentResponse(saved, VoteDirection.NONE, true);
    }

    @Override
    public ContentResponse saveDraft(UUID draftId, ContentRequest request, User author) {
        userService.ensureActive(author);
        Content draft = draftId == null ? new Content() : getContentOrThrow(draftId);
        if (draftId == null) {
            draft.setIdContent(UUID.randomUUID());
            draft.setUser(userSnapshotService.snapshot(author));
            draft.setCreatedAt(LocalDateTime.now());
        } else {
            requireOwnerOrAdmin(draft, author);
            if (!isDraft(draft)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tulisan ini sudah diterbitkan");
            }
            refreshAuthorSnapshot(draft, author);
        }
        articlePolicy.applyDraftFields(draft, request);
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
        refreshAuthorSnapshot(draft, author);
        articlePolicy.applyPublishedFields(draft, request);
        LocalDateTime publishedAt = LocalDateTime.now();
        draft.setStatus(STATUS_PUBLISHED);
        draft.setCreatedAt(publishedAt);
        draft.setUpdatedAt(publishedAt);
        Content saved = contentRepository.save(draft);
        recordPublicationSafely(saved, author);
        invalidateContentCaches();
        return mapper.toContentResponse(saved, resolveUserVote(saved.getIdContent(), author), true);
    }

    @Override
    public ContentResponse addContentFromDocx(MultipartFile file, String kategori, String title, List<ContentImageRequest> images, User author) throws IOException {
        userService.ensureActive(author);
        String text = articlePolicy.extractDocxText(file);

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
        return feedService.feed(mode, category, limit, viewer);
    }

    @Override
    public FeedResponse feedPage(String mode, String category, int page, int limit, User viewer) {
        return feedService.feedPage(mode, category, page, limit, viewer);
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
            content = counterService.incrementView(id);
            if (content == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tulisan tidak ditemukan");
            }
        }
        return mapper.toContentResponse(content, resolveUserVote(id, viewer), true);
    }

    @Override
    public ContentStatsResponse recordView(UUID id, User viewer) {
        return recordView(id, viewer, null);
    }

    @Override
    public ContentStatsResponse recordView(UUID id, User viewer, String readerKey) {
        Content content = getContentOrThrow(id);
        requirePublishedOrDraftAccess(content, viewer);
        if (isDraft(content)) {
            return mapper.toStatsResponse(content, commentRepository.countByContentIdAndDeletedFalse(id), resolveUserVote(id, viewer));
        }
        if (readTrackingService.claimRead(id, viewer, readerKey)) {
            Content updated = counterService.incrementView(id);
            if (updated != null) {
                content = updated;
            }
        }
        return mapper.toStatsResponse(content, commentRepository.countByContentIdAndDeletedFalse(id), resolveUserVote(id, viewer));
    }

    @Override
    public ContentResponse updateContent(UUID id, ContentRequest contentDetails, User actor) {
        userService.ensureActive(actor);
        Content existingContent = getContentOrThrow(id);
        requireOwnerOrAdmin(existingContent, actor);
        refreshAuthorSnapshot(existingContent, actor);
        articlePolicy.applyPublishedFields(existingContent, contentDetails);
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
        int upDelta = 0;
        int downDelta = 0;

        if (existing.isPresent()) {
            ContentVote current = existing.get();
            if (requestedVote == VoteDirection.NONE || current.getVote() == requestedVote) {
                if (current.getVote() == VoteDirection.UP) {
                    upDelta--;
                } else if (current.getVote() == VoteDirection.DOWN) {
                    downDelta--;
                }
                voteRepository.delete(current);
                requestedVote = VoteDirection.NONE;
            } else {
                if (current.getVote() == VoteDirection.UP) {
                    upDelta--;
                } else if (current.getVote() == VoteDirection.DOWN) {
                    downDelta--;
                }
                if (requestedVote == VoteDirection.UP) {
                    upDelta++;
                } else if (requestedVote == VoteDirection.DOWN) {
                    downDelta++;
                }
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
            if (requestedVote == VoteDirection.UP) {
                upDelta++;
            } else if (requestedVote == VoteDirection.DOWN) {
                downDelta++;
            }
        }

        if (upDelta != 0 || downDelta != 0) {
            Content updated = counterService.incrementVotes(id, upDelta, downDelta);
            if (updated != null) {
                content = updated;
            }
        }
        analyticsService.invalidate();
        return mapper.toStatsResponse(content, commentRepository.countByContentIdAndDeletedFalse(id), requestedVote);
    }

    @Override
    public VoteBatchResponse batchVotes(Collection<UUID> contentIds, User viewer) {
        if (contentIds == null || contentIds.isEmpty()) {
            return new VoteBatchResponse(List.of());
        }
        List<UUID> ids = contentIds.stream()
                .filter(java.util.Objects::nonNull)
                .distinct()
                .limit(100)
                .toList();
        Map<UUID, VoteDirection> votesByContent = new HashMap<>();
        if (viewer != null && viewer.getUserID() != null) {
            voteRepository.findByContentIdInAndUserId(ids, viewer.getUserID())
                    .forEach(vote -> votesByContent.put(vote.getContentId(), vote.getVote()));
        }
        Map<UUID, Content> contentsById = new HashMap<>();
        contentRepository.findAllById(ids)
                .forEach(content -> contentsById.put(content.getIdContent(), content));
        List<ContentStatsResponse> stats = ids.stream()
                .map(contentsById::get)
                .filter(java.util.Objects::nonNull)
                .filter(content -> isPublished(content) || canViewDraft(content, viewer))
                .map(content -> mapper.toStatsResponse(
                        content,
                        commentRepository.countByContentIdAndDeletedFalse(content.getIdContent()),
                        votesByContent.getOrDefault(content.getIdContent(), VoteDirection.NONE)
                ))
                .toList();
        return new VoteBatchResponse(stats);
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
                    .map(genre -> articlePolicy.normalizeCategory(genre.getName()))
                    .forEach(categories::add);
        } else {
            contentRepository.findCategoryFields().stream()
                    .filter(this::isPublished)
                    .map(Content::getKategori)
                    .filter(StringUtils::hasText)
                    .map(articlePolicy::normalizeCategory)
                    .forEach(categories::add);
        }
        List<String> result = List.copyOf(new ArrayList<>(categories));
        categoriesCache = CacheEntry.of(result, CATEGORY_CACHE_TTL);
        return result;
    }

    @Override
    public AnalyticsResponse getAnalytics(User viewer) {
        return analyticsService.getAnalytics(viewer);
    }

    private Content getContentOrThrow(UUID id) {
        return contentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tulisan tidak ditemukan"));
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

    private void refreshAuthorSnapshot(Content content, User actor) {
        if (content == null) {
            return;
        }
        UUID ownerId = content.getUser() == null ? null : content.getUser().getUserID();
        if (ownerId != null && actor != null && ownerId.equals(actor.getUserID())) {
            content.setUser(userSnapshotService.snapshot(actor));
            return;
        }
        content.setUser(userSnapshotService.snapshot(content.getUser()));
    }

    private void recordPublicationSafely(Content content, User author) {
        try {
            activityLogService.recordPublication(content, author);
        } catch (RuntimeException ex) {
            log.warn("Publication log failed for content {}. Content save remains successful.", content == null ? null : content.getIdContent(), ex);
        }
    }

    private void invalidateContentCaches() {
        categoriesCache = null;
        analyticsService.invalidate();
    }

    private record CacheEntry<T>(T value, long expiresAtMillis) {
        static <T> CacheEntry<T> of(T value, Duration ttl) {
            return new CacheEntry<>(value, System.currentTimeMillis() + ttl.toMillis());
        }

        boolean isExpired() {
            return System.currentTimeMillis() >= expiresAtMillis;
        }
    }

}
