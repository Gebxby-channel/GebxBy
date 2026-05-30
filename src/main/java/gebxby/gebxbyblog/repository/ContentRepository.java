package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.Content;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ContentRepository extends MongoRepository<Content, UUID> {
    List<Content> findAllByOrderByCreatedAtDesc();

    List<Content> findByKategoriIgnoreCaseOrderByCreatedAtDesc(String kategori);

    List<Content> findTop10ByOrderByViewCountDesc();

    List<Content> findTop10ByOrderByUpCountDesc();

    @Query("{ 'user.userID': ?0 }")
    List<Content> findByAuthorId(UUID userId);
}
