package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.model.Comment;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.CommentRepository;
import gebxby.gebxbyblog.repository.ContentRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserProfileProjectionService {
    private final ContentRepository contentRepository;
    private final CommentRepository commentRepository;
    private final UserSnapshotService userSnapshotService;

    public UserProfileProjectionService(ContentRepository contentRepository,
                                        CommentRepository commentRepository,
                                        UserSnapshotService userSnapshotService) {
        this.contentRepository = contentRepository;
        this.commentRepository = commentRepository;
        this.userSnapshotService = userSnapshotService;
    }

    public void refreshEmbeddedProfiles(User saved) {
        if (saved == null || saved.getUserID() == null) {
            return;
        }
        List<Content> contents = Optional.ofNullable(contentRepository.findByAuthorId(saved.getUserID())).orElse(List.of());
        User snapshot = userSnapshotService.snapshot(saved);
        contents.forEach(content -> content.setUser(snapshot));
        if (!contents.isEmpty()) {
            contentRepository.saveAll(contents);
        }

        List<Comment> comments = Optional.ofNullable(commentRepository.findByAuthorId(saved.getUserID())).orElse(List.of());
        comments.forEach(comment -> comment.setUser(snapshot));
        if (!comments.isEmpty()) {
            commentRepository.saveAll(comments);
        }
    }
}
