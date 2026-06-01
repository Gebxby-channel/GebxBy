package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.Comment;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CommentRepository extends MongoRepository<Comment, UUID> {
    List<Comment> findByContentIdOrderByCreatedAtAsc(UUID contentId);

    List<Comment> findByContentIdAndParentIdOrderByCreatedAtAsc(UUID contentId, UUID parentId, Pageable pageable);

    List<Comment> findByContentIdAndParentIdIsNullOrderByCreatedAtAsc(UUID contentId, Pageable pageable);

    long countByContentIdAndParentIdIsNull(UUID contentId);

    List<Comment> findByContentIdAndParentIdInOrderByCreatedAtAsc(UUID contentId, List<UUID> parentIds);

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
