package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.CommentRequest;
import gebxby.gebxbyblog.dto.CommentPageResponse;
import gebxby.gebxbyblog.dto.CommentResponse;
import gebxby.gebxbyblog.model.User;

import java.util.List;
import java.util.UUID;

public interface CommentService {
    List<CommentResponse> findThread(UUID contentId);
    CommentPageResponse findThreadPage(UUID contentId, int page, int limit);
    CommentResponse addComment(UUID contentId, CommentRequest request, User author);
    void deleteComment(UUID contentId, UUID commentId, User actor);
}
