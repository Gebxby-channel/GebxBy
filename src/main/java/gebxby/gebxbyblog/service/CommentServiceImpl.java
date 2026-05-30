package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.CommentRequest;
import gebxby.gebxbyblog.dto.CommentResponse;
import gebxby.gebxbyblog.model.Comment;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.CommentRepository;
import gebxby.gebxbyblog.repository.ContentRepository;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class CommentServiceImpl implements CommentService {
    private static final int MAX_COMMENT_LENGTH = 4_000;

    private final CommentRepository commentRepository;
    private final ContentRepository contentRepository;
    private final UserService userService;
    private final ForumMapper mapper;
    private final NotificationService notificationService;

    public CommentServiceImpl(CommentRepository commentRepository,
                              ContentRepository contentRepository,
                              UserService userService,
                              ForumMapper mapper,
                              NotificationService notificationService) {
        this.commentRepository = commentRepository;
        this.contentRepository = contentRepository;
        this.userService = userService;
        this.mapper = mapper;
        this.notificationService = notificationService;
    }

    @Override
    public List<CommentResponse> findThread(UUID contentId) {
        List<Comment> comments = commentRepository.findByContentIdOrderByCreatedAtAsc(contentId);
        return buildReplies(comments, null);
    }

    @Override
    public CommentResponse addComment(UUID contentId, CommentRequest request, User author) {
        userService.ensureActive(author);
        Content content = contentRepository.findById(contentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tulisan tidak ditemukan"));
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
        Comment comment = new Comment();
        comment.setId(UUID.randomUUID());
        comment.setContentId(contentId);
        comment.setParentId(parentId);
        comment.setUser(author);
        comment.setBody(body);
        comment.setAdminHighlighted(userService.isAdmin(author));
        comment.setCreatedAt(now);
        comment.setUpdatedAt(now);

        content.setCommentCount(content.getCommentCount() + 1);
        content.setUpdatedAt(now);
        contentRepository.save(content);

        Comment savedComment = commentRepository.save(comment);
        notificationService.notifyCommentOnContent(content, savedComment);

        return toResponse(savedComment, List.of());
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
            comment.setDeleted(true);
            comment.setDeletedByUserId(actor.getUserID());
            comment.setDeletedByAdmin(!owner);
            comment.setBody("");
            comment.setUpdatedAt(LocalDateTime.now());
            commentRepository.save(comment);

            contentRepository.findById(contentId).ifPresent(content -> {
                content.setCommentCount(Math.max(0, content.getCommentCount() - 1));
                content.setUpdatedAt(LocalDateTime.now());
                contentRepository.save(content);
            });
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
}
