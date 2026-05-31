package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.Comment;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CommentRepository extends MongoRepository<Comment, UUID> {
    List<Comment> findByContentIdOrderByCreatedAtAsc(UUID contentId);

    Optional<Comment> findByIdAndContentId(UUID id, UUID contentId);

    @Query("{ 'contentId': ?0, 'parentId': ?1, 'user.userID': ?2, 'body': ?3, 'deleted': false, 'createdAt': { $gte: ?4 } }")
    Optional<Comment> findRecentDuplicate(UUID contentId, UUID parentId, UUID userId, String body, LocalDateTime since);

    @Query(value = "{ 'user.userID': ?0, 'deleted': false, 'createdAt': { $gte: ?1 } }", count = true)
    long countRecentByAuthor(UUID userId, LocalDateTime since);

    long countByContentIdAndDeletedFalse(UUID contentId);

    void deleteByContentId(UUID contentId);

    @Query("{ 'user.userID': ?0 }")
    List<Comment> findByAuthorId(UUID userId);
}
