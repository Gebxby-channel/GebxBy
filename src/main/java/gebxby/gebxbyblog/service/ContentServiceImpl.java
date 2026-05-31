package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.AnalyticsResponse;
import gebxby.gebxbyblog.dto.ContentImageRequest;
import gebxby.gebxbyblog.dto.ContentRequest;
import gebxby.gebxbyblog.dto.ContentResponse;
import gebxby.gebxbyblog.dto.ContentStatsResponse;
import gebxby.gebxbyblog.dto.LeaderboardEntryResponse;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.ContentImage;
import gebxby.gebxbyblog.model.ContentVote;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.model.VoteDirection;
import gebxby.gebxbyblog.repository.CommentRepository;
import gebxby.gebxbyblog.repository.ContentRepository;
import gebxby.gebxbyblog.repository.ContentVoteRepository;
import gebxby.gebxbyblog.repository.UserRepository;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.beans.factory.annotation.Value;
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
import java.util.Base64;
import java.util.Comparator;
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
    private static final int MAX_IMAGES = 6;
    private static final int MAX_IMAGE_DATA_URL_LENGTH = 480_000;
    private static final int MAX_IMAGE_BYTES = 360_000;
    private static final int MAX_THUMBNAIL_DATA_URL_LENGTH = 90_000;
    private static final int MAX_THUMBNAIL_BYTES = 70_000;
    private static final int MAX_TOTAL_IMAGE_BYTES = 1_800_000;
    private static final Duration CATEGORY_CACHE_TTL = Duration.ofMinutes(5);
    private static final Duration ANALYTICS_CACHE_TTL = Duration.ofSeconds(45);
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
    private final ForumMapper mapper;
    private final ActivityLogService activityLogService;
    private final long maxUploadBytes;
    private volatile CacheEntry<List<String>> categoriesCache;
    private volatile CacheEntry<AnalyticsSnapshot> analyticsCache;

    public ContentServiceImpl(ContentRepository contentRepository,
                              ContentVoteRepository voteRepository,
                              CommentRepository commentRepository,
                              UserRepository userRepository,
                              UserService userService,
                              ForumMapper mapper,
                              ActivityLogService activityLogService,
                              @Value("${app.max-upload-bytes:5242880}") long maxUploadBytes) {
        this.contentRepository = contentRepository;
        this.voteRepository = voteRepository;
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.userService = userService;
        this.mapper = mapper;
        this.activityLogService = activityLogService;
        this.maxUploadBytes = maxUploadBytes;
    }

    @Override
    public ContentResponse addContent(ContentRequest request, User author) {
        userService.ensureActive(author);
        Content content = new Content();
        LocalDateTime now = LocalDateTime.now();
        content.setIdContent(UUID.randomUUID());
        applyContentFields(content, request);
        content.setUser(author);
        content.setCreatedAt(now);
        content.setUpdatedAt(now);
        Content saved = contentRepository.save(content);
        activityLogService.recordPublication(saved, author);
        invalidateContentCaches();
        return mapper.toContentResponse(saved, VoteDirection.NONE, true);
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
                .map(content -> mapper.toContentResponse(content, resolveUserVote(content.getIdContent(), viewer)))
                .toList();
    }

    @Override
    public List<ContentResponse> findByCategory(String category, User viewer) {
        if (!StringUtils.hasText(category) || "all".equalsIgnoreCase(category)) {
            return findAll(viewer);
        }
        return contentRepository.findByKategoriIgnoreCaseOrderByCreatedAtDesc(category.trim()).stream()
                .map(content -> mapper.toContentResponse(content, resolveUserVote(content.getIdContent(), viewer)))
                .toList();
    }

    @Override
    public List<ContentResponse> findByAuthor(UUID userId, User viewer) {
        return contentRepository.findByAuthorIdOrderByCreatedAtDesc(userId).stream()
                .map(content -> mapper.toContentResponse(content, resolveUserVote(content.getIdContent(), viewer)))
                .toList();
    }

    @Override
    public ContentResponse findContentById(UUID id, User viewer, boolean incrementView) {
        Content content = getContentOrThrow(id);
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
        long comments = commentRepository.countByContentIdAndDeletedFalse(id);
        return mapper.toStatsResponse(content, comments, resolveUserVote(id, viewer));
    }

    @Override
    public ContentStatsResponse vote(UUID id, VoteDirection vote, User voter) {
        userService.ensureActive(voter);
        VoteDirection requestedVote = vote == null ? VoteDirection.NONE : vote;
        Content content = getContentOrThrow(id);
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
        contentRepository.findCategoryFields().stream()
                .map(Content::getKategori)
                .filter(StringUtils::hasText)
                .map(this::normalizeCategory)
                .forEach(categories::add);
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

        List<Content> mostRead = List.copyOf(contentRepository.findTop10ByOrderByViewCountDesc());
        List<Content> mostUpvoted = List.copyOf(contentRepository.findTop10ByOrderByUpCountDesc());

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
                .filter(Objects::nonNull)
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
            content.setImages(validateImages(request.images()));
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

    private List<ContentImage> validateImages(List<ContentImageRequest> images) {
        if (images == null || images.isEmpty()) {
            return List.of();
        }
        if (images.size() > MAX_IMAGES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Maksimal 6 gambar per tulisan");
        }

        List<ContentImage> result = new ArrayList<>();
        long totalBytes = 0;
        for (ContentImageRequest request : images) {
            if (request == null || !StringUtils.hasText(request.data())) {
                continue;
            }
            String dataUrl = request.data().trim();
            ImagePayload payload = validateImageDataUrl(dataUrl, MAX_IMAGE_DATA_URL_LENGTH, MAX_IMAGE_BYTES);
            totalBytes += payload.size();
            if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
                throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Total gambar terlalu besar");
            }
            String thumbnail = null;
            if (StringUtils.hasText(request.thumbnail())) {
                thumbnail = request.thumbnail().trim();
                validateImageDataUrl(thumbnail, MAX_THUMBNAIL_DATA_URL_LENGTH, MAX_THUMBNAIL_BYTES);
            }

            ContentImage image = new ContentImage();
            image.setId(UUID.randomUUID().toString());
            image.setData(dataUrl);
            image.setThumbnail(thumbnail);
            image.setAlt(trimToLength(Jsoup.clean(request.alt() == null ? "" : request.alt(), Safelist.none()), 120));
            image.setSize(payload.size());
            result.add(image);
        }
        return result;
    }

    private ImagePayload validateImageDataUrl(String dataUrl, int maxLength, int maxBytes) {
        if (dataUrl.length() > maxLength) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Ukuran gambar terlalu besar");
        }
        int commaIndex = dataUrl.indexOf(',');
        if (!dataUrl.startsWith("data:image/") || commaIndex < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Format gambar tidak valid");
        }

        String metadata = dataUrl.substring(5, commaIndex).toLowerCase(Locale.ROOT);
        if (!metadata.endsWith(";base64")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Gambar wajib memakai base64 data URL");
        }
        String mimeType = metadata.substring(0, metadata.length() - ";base64".length());
        if (!Set.of("image/webp", "image/jpeg", "image/png").contains(mimeType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipe gambar tidak didukung");
        }

        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(dataUrl.substring(commaIndex + 1));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Data gambar rusak");
        }
        if (decoded.length > maxBytes) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Ukuran gambar terlalu besar");
        }
        return new ImagePayload(decoded.length);
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

    private record ImagePayload(long size) {
    }
}
