package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.Bookmark;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookmarkRepository extends MongoRepository<Bookmark, String> {
    Optional<Bookmark> findByUserIdAndContentId(UUID userId, UUID contentId);

    List<Bookmark> findByUserIdOrderByCreatedAtDesc(UUID userId);

    void deleteByUserIdAndContentId(UUID userId, UUID contentId);

    void deleteByContentId(UUID contentId);

    void deleteByUserId(UUID userId);
}
