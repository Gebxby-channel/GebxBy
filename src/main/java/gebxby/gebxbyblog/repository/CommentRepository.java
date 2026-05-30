package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.Comment;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CommentRepository extends MongoRepository<Comment, UUID> {
    List<Comment> findByContentIdOrderByCreatedAtAsc(UUID contentId);

    Optional<Comment> findByIdAndContentId(UUID id, UUID contentId);

    long countByContentIdAndDeletedFalse(UUID contentId);

    void deleteByContentId(UUID contentId);
}
