package gebxby.gebxbyblog.repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import gebxby.gebxbyblog.model.Content;

@Repository
public interface ContentRepository extends MongoRepository<Content, UUID> {
    List<Content> findAllByOrderByCreatedAtDesc();

    List<Content> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query(value = "{ 'images.data': { '$regex': '^data:image/' } }", sort = "{ '_id': 1 }")
    List<Content> findContentsWithInlineImages(Pageable pageable);

    @Query(value = "{ 'images.data': { '$regex': '^data:image/' } }", exists = true)
    boolean existsContentsWithInlineImages();

    // Feed cards only need image thumbnails. Keep original image payloads out of
    // Mongo-to-application reads; full image data is loaded by the article view.
    @Query(value = "{ '$or': [ { 'status': 'PUBLISHED' }, { 'status': null } ] }", fields = "{ 'images.data': 0, 'user.photo': 0 }", sort = "{ 'createdAt': -1, '_id': -1 }")
    List<Content> findFeedPageBy(Pageable pageable);

    @Query(value = "{ '$or': [ { 'status': 'PUBLISHED' }, { 'status': null } ] }", fields = "{ 'images.data': 0, 'user.photo': 0 }", sort = "{ 'createdAt': 1, '_id': 1 }")
    List<Content> findPublishedFeedOldest(Pageable pageable);

    @Query(value = "{ '$or': [ { 'status': 'PUBLISHED' }, { 'status': null } ] }", fields = "{ 'images.data': 0, 'user.photo': 0 }", sort = "{ 'upCount': -1, 'viewCount': -1, 'createdAt': -1, '_id': -1 }")
    List<Content> findPublishedFeedPopular(Pageable pageable);

    @Query(value = "{ '$and': [ { '$or': [ { 'status': 'PUBLISHED' }, { 'status': null } ] }, { 'kategori': { '$regex': ?0, '$options': 'i' } } ] }", fields = "{ 'images.data': 0, 'user.photo': 0 }", sort = "{ 'createdAt': -1, '_id': -1 }")
    List<Content> findFeedPageByCategory(String categoryPattern, Pageable pageable);

    @Query(value = "{ '$and': [ { '$or': [ { 'status': 'PUBLISHED' }, { 'status': null } ] }, { 'kategori': { '$regex': ?0, '$options': 'i' } } ] }", fields = "{ 'images.data': 0, 'user.photo': 0 }", sort = "{ 'createdAt': 1, '_id': 1 }")
    List<Content> findPublishedCategoryOldest(String categoryPattern, Pageable pageable);

    @Query(value = "{ '$and': [ { '$or': [ { 'status': 'PUBLISHED' }, { 'status': null } ] }, { 'kategori': { '$regex': ?0, '$options': 'i' } } ] }", fields = "{ 'images.data': 0, 'user.photo': 0 }", sort = "{ 'upCount': -1, 'viewCount': -1, 'createdAt': -1, '_id': -1 }")
    List<Content> findPublishedCategoryPopular(String categoryPattern, Pageable pageable);

    @Query(value = "{ '$and': [ { '$or': [ { 'status': 'PUBLISHED' }, { 'status': null } ] }, { 'createdAt': { '$gte': ?0 } } ] }", fields = "{ 'images.data': 0, 'user.photo': 0 }", sort = "{ 'upCount': -1, 'createdAt': -1, '_id': -1 }")
    List<Content> findFeedPageByCreatedAtAfterOrderByUpCountDescCreatedAtDesc(LocalDateTime createdAt, Pageable pageable);

    @Query(value = "{ '$and': [ { '$or': [ { 'status': 'PUBLISHED' }, { 'status': null } ] }, { '$or': [ { 'user.userID': { '$in': ?0 } }, { 'kategori': { '$in': ?1 } } ] } ] }", fields = "{ 'images.data': 0, 'user.photo': 0 }", sort = "{ 'createdAt': -1, '_id': -1 }")
    List<Content> findFollowingFeedPage(Collection<UUID> userIds, Collection<String> categories, Pageable pageable);

    @Query(value = "{ '$and': [ { '$or': [ { 'status': 'PUBLISHED' }, { 'status': null } ] }, { '$or': [ { 'user.userID': { '$in': ?0 } }, { 'kategori': { '$in': ?1 } } ] } ] }", fields = "{ 'images.data': 0, 'user.photo': 0 }", sort = "{ 'createdAt': 1, '_id': 1 }")
    List<Content> findFollowingFeedOldest(Collection<UUID> userIds, Collection<String> categories, Pageable pageable);

    @Query(value = "{ '$and': [ { '$or': [ { 'status': 'PUBLISHED' }, { 'status': null } ] }, { '$or': [ { 'user.userID': { '$in': ?0 } }, { 'kategori': { '$in': ?1 } } ] } ] }", fields = "{ 'images.data': 0, 'user.photo': 0 }", sort = "{ 'upCount': -1, 'viewCount': -1, 'createdAt': -1, '_id': -1 }")
    List<Content> findFollowingFeedPopular(Collection<UUID> userIds, Collection<String> categories, Pageable pageable);

    @Query(value = "{ 'user.userID': ?0, '$or': [ { 'status': 'PUBLISHED' }, { 'status': null } ] }",
            fields = "{ 'images.data': 0, 'user.photo': 0 }", sort = "{ 'createdAt': -1, '_id': -1 }")
    List<Content> findPublishedProfileFeedByAuthorId(UUID userId, Pageable pageable);

    @Query(value = "{ 'user.userID': ?0 }", fields = "{ 'images.data': 0, 'user.photo': 0 }", sort = "{ 'createdAt': -1, '_id': -1 }")
    List<Content> findProfileFeedByAuthorId(UUID userId, Pageable pageable);

    List<Content> findByKategoriIgnoreCaseOrderByCreatedAtDesc(String kategori);

    List<Content> findByKategoriIgnoreCaseOrderByCreatedAtDesc(String kategori, Pageable pageable);

    List<Content> findByCreatedAtGreaterThanEqualOrderByUpCountDescCreatedAtDesc(LocalDateTime createdAt, Pageable pageable);

    List<Content> findTop10ByOrderByViewCountDesc();

    List<Content> findTop10ByOrderByUpCountDesc();
    
    Page<Content> findByKategori(String kategori, Pageable pageable);

    @Query(value = "{}", fields = "{ 'kategori': 1, 'status': 1 }")
    List<Content> findCategoryFields();

    @Query("{ 'user.userID': ?0 }")
    List<Content> findByAuthorId(UUID userId);

    @Query(value = "{ 'user.userID': ?0 }", sort = "{ 'createdAt': -1 }")
    List<Content> findByAuthorIdOrderByCreatedAtDesc(UUID userId);

    @Query(value = "{ '$or': [ { 'user.userID': { '$in': ?0 } }, { 'kategori': { '$in': ?1 } } ] }", sort = "{ 'createdAt': -1 }")
    List<Content> findFollowingFeed(Collection<UUID> userIds, Collection<String> categories, Pageable pageable);

    @Query(value = "{ '$and': [ { '$or': [ { 'status': 'PUBLISHED' }, { 'status': null } ] }, { '$or': [ { 'head': { $regex: ?0, $options: 'i' } }, { 'subtitle': { $regex: ?0, $options: 'i' } }, { 'kategori': { $regex: ?0, $options: 'i' } }, { 'paragrafs': { $regex: ?0, $options: 'i' } } ] } ] }", fields = "{ 'images.data': 0, 'user.photo': 0 }")
    List<Content> searchByHeadline(String query, Pageable pageable);
}
