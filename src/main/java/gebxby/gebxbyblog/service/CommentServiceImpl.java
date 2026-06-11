package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.CommentRequest;
import gebxby.gebxbyblog.dto.CommentPageResponse;
import gebxby.gebxbyblog.dto.CommentResponse;
import gebxby.gebxbyblog.model.Comment;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.realtime.RealtimeGateway;
import gebxby.gebxbyblog.repository.CommentRepository;
import gebxby.gebxbyblog.repository.ContentRepository;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CommentServiceImpl implements CommentService {
    private static final int MAX_COMMENT_LENGTH = 4_000;
    private static final long MAX_COMMENTS_PER_WINDOW = 5;
    private static final Duration RATE_LIMIT_WINDOW = Duration.ofSeconds(30);
    private static final Duration DUPLICATE_WINDOW = Duration.ofSeconds(10);
    private static final int MAX_PAGE_LIMIT = 50;
    private static final String STATUS_PUBLISHED = "PUBLISHED";

    private final CommentRepository commentRepository;
    private final ContentRepository contentRepository;
    private final UserService userService;
    private final ForumMapper mapper;
    private final NotificationService notificationService;
    private final ActivityLogService activityLogService;
    private final RealtimeGateway realtimeGateway;
    private final ContentCounterService counterService;
    private final UserSnapshotService userSnapshotService;

    @Autowired
    public CommentServiceImpl(CommentRepository commentRepository,
                              ContentRepository contentRepository,
                              UserService userService,
                              ForumMapper mapper,
                              NotificationService notificationService,
                              ActivityLogService activityLogService,
                              RealtimeGateway realtimeGateway,
                              ContentCounterService counterService,
                              UserSnapshotService userSnapshotService) {
        this.commentRepository = commentRepository;
        this.contentRepository = contentRepository;
        this.userService = userService;
        this.mapper = mapper;
        this.notificationService = notificationService;
        this.activityLogService = activityLogService;
        this.realtimeGateway = realtimeGateway;
        this.counterService = counterService;
        this.userSnapshotService = userSnapshotService;
    }

    public CommentServiceImpl(CommentRepository commentRepository,
                              ContentRepository contentRepository,
                              UserService userService,
                              ForumMapper mapper,
                              NotificationService notificationService,
                              ActivityLogService activityLogService,
                              RealtimeGateway realtimeGateway) {
        this(commentRepository, contentRepository, userService, mapper, notificationService, activityLogService,
                realtimeGateway, new ContentCounterService(contentRepository, null), new UserSnapshotService());
    }

    @Override
    public List<CommentResponse> findThread(UUID contentId) {
        requirePublishedContent(contentId);
        List<Comment> comments = commentRepository.findByContentIdOrderByCreatedAtAsc(contentId);
        return buildReplies(comments, null);
    }

    @Override
    public CommentPageResponse findThreadPage(UUID contentId, int page, int limit) {
        requirePublishedContent(contentId);
        int pageNumber = Math.max(0, page);
        int pageSize = Math.max(1, Math.min(limit <= 0 ? 20 : limit, MAX_PAGE_LIMIT));
        List<Comment> roots = commentRepository.findByContentIdAndParentIdIsNullOrderByCreatedAtAsc(
                contentId,
                PageRequest.of(pageNumber, pageSize + 1)
        );
        boolean hasMore = roots.size() > pageSize;
        List<Comment> limitedRoots = roots.stream().limit(pageSize).toList();
        List<Comment> threadSlice = new ArrayList<>(limitedRoots);
        List<UUID> frontier = limitedRoots.stream().map(Comment::getId).toList();
        while (!frontier.isEmpty()) {
            List<Comment> children = commentRepository.findByContentIdAndParentIdInOrderByCreatedAtAsc(contentId, frontier);
            if (children.isEmpty()) {
                break;
            }
            threadSlice.addAll(children);
            frontier = children.stream().map(Comment::getId).toList();
        }
        return new CommentPageResponse(buildReplies(threadSlice, null), pageNumber, pageSize, hasMore);
    }

    @Override
    public CommentResponse addComment(UUID contentId, CommentRequest request, User author) {
        userService.ensureActive(author);
        if (author.getUserID() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User belum login");
        }
        Content content = requirePublishedContent(contentId);
        String body = sanitizeBody(request == null ? null : request.body());
        if (!StringUtils.hasText(body)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Komentar wajib diisi");
        }
        UUID parentId = request == null ? null : request.parentId();
        if (parentId != null) {
            commentRepository.findByIdAndContentId(parentId, contentId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Komentar induk tidak ditemukan"));
        }

        LocalDateTime now = LocalDateTime.now();
        Optional<Comment> duplicate = commentRepository.findRecentDuplicate(
                contentId,
                parentId,
                author.getUserID(),
                body,
                now.minus(DUPLICATE_WINDOW)
        );
        if (duplicate != null && duplicate.isPresent()) {
            return toResponse(duplicate.get(), List.of());
        }

        enforceCommentRateLimit(author, now);

        Comment comment = new Comment();
        comment.setId(UUID.randomUUID());
        comment.setContentId(contentId);
        comment.setParentId(parentId);
        comment.setUser(userSnapshotService.snapshot(author));
        comment.setBody(body);
        comment.setAdminHighlighted(userService.isAdmin(author));
        comment.setCreatedAt(now);
        comment.setUpdatedAt(now);

        Comment savedComment = commentRepository.save(comment);
        Content updatedContent = counterService.incrementComments(contentId, 1);
        if (updatedContent != null) {
            content = updatedContent;
        }
        notificationService.notifyCommentOnContent(content, savedComment);

        CommentResponse response = toResponse(savedComment, List.of());
        realtimeGateway.commentCreated(contentId, response);
        return response;
    }

    @Override
    public void deleteComment(UUID contentId, UUID commentId, User actor) {
        userService.ensureActive(actor);
        Comment comment = commentRepository.findByIdAndContentId(commentId, contentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Komentar tidak ditemukan"));
        boolean owner = comment.getUser() != null && actor.getUserID().equals(comment.getUser().getUserID());
        if (!owner && !userService.isAdmin(actor)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Komentar hanya bisa dihapus pemilik atau admin");
        }
        if (!comment.isDeleted()) {
            activityLogService.recordCommentDelete(actor, comment);
            comment.setDeleted(true);
            comment.setDeletedByUserId(actor.getUserID());
            comment.setDeletedByAdmin(!owner);
            comment.setBody("");
            comment.setUpdatedAt(LocalDateTime.now());
            commentRepository.save(comment);

            Content content = counterService.incrementComments(contentId, -1);
            if (content != null) {
                realtimeGateway.commentDeleted(contentId, commentId, content.getCommentCount());
            }
        }
    }

    private List<CommentResponse> buildReplies(List<Comment> comments, UUID parentId) {
        return comments.stream()
                .filter(comment -> parentId == null ? comment.getParentId() == null : parentId.equals(comment.getParentId()))
                .sorted(Comparator.comparing(Comment::getCreatedAt))
                .map(comment -> toResponse(comment, buildReplies(comments, comment.getId())))
                .toList();
    }

    private CommentResponse toResponse(Comment comment, List<CommentResponse> replies) {
        List<CommentResponse> sortedReplies = new ArrayList<>(replies);
        sortedReplies.sort(Comparator.comparing(CommentResponse::createdAt));
        return new CommentResponse(
                comment.getId(),
                comment.getContentId(),
                comment.getParentId(),
                mapper.toPublicUser(comment.getUser()),
                comment.isDeleted() ? "[comment deleted]" : comment.getBody(),
                comment.getCreatedAt(),
                comment.getUpdatedAt(),
                comment.isDeleted(),
                comment.isAdminHighlighted(),
                sortedReplies
        );
    }

    private String sanitizeBody(String body) {
        String clean = Jsoup.clean(body == null ? "" : body, Safelist.none()).trim();
        return clean.length() <= MAX_COMMENT_LENGTH ? clean : clean.substring(0, MAX_COMMENT_LENGTH);
    }

    private Content requirePublishedContent(UUID contentId) {
        Content content = contentRepository.findById(contentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tulisan tidak ditemukan"));
        if (!isPublished(content)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tulisan tidak ditemukan");
        }
        return content;
    }

    private boolean isPublished(Content content) {
        return content == null || content.getStatus() == null || STATUS_PUBLISHED.equalsIgnoreCase(content.getStatus());
    }

    private void enforceCommentRateLimit(User author, LocalDateTime now) {
        if (userService.isAdmin(author)) {
            return;
        }
        long recentComments = commentRepository.countRecentByAuthor(author.getUserID(), now.minus(RATE_LIMIT_WINDOW));
        if (recentComments >= MAX_COMMENTS_PER_WINDOW) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Terlalu banyak komentar. Tunggu sebentar sebelum mengirim lagi."
            );
        }
    }
}
