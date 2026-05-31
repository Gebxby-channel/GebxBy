package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.Content;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ContentRepository extends MongoRepository<Content, UUID> {
    List<Content> findAllByOrderByCreatedAtDesc();

    List<Content> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<Content> findByKategoriIgnoreCaseOrderByCreatedAtDesc(String kategori);

    List<Content> findByKategoriIgnoreCaseOrderByCreatedAtDesc(String kategori, Pageable pageable);

    List<Content> findByCreatedAtGreaterThanEqualOrderByUpCountDescCreatedAtDesc(LocalDateTime createdAt, Pageable pageable);

    List<Content> findTop10ByOrderByViewCountDesc();

    List<Content> findTop10ByOrderByUpCountDesc();

    @Query(value = "{}", fields = "{ 'kategori': 1 }")
    List<Content> findCategoryFields();

    @Query("{ 'user.userID': ?0 }")
    List<Content> findByAuthorId(UUID userId);

    @Query(value = "{ 'user.userID': ?0 }", sort = "{ 'createdAt': -1 }")
    List<Content> findByAuthorIdOrderByCreatedAtDesc(UUID userId);

    @Query("{ '$or': [ { 'head': { $regex: ?0, $options: 'i' } }, { 'subtitle': { $regex: ?0, $options: 'i' } }, { 'kategori': { $regex: ?0, $options: 'i' } } ] }")
    List<Content> searchByHeadline(String query, Pageable pageable);
}
