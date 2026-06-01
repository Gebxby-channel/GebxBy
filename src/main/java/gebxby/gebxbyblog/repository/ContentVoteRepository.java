package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.ContentVote;
import gebxby.gebxbyblog.model.VoteDirection;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Collection;

public interface ContentVoteRepository extends MongoRepository<ContentVote, String> {
    Optional<ContentVote> findByContentIdAndUserId(UUID contentId, UUID userId);

    List<ContentVote> findByContentIdInAndUserId(Collection<UUID> contentIds, UUID userId);

    List<ContentVote> findByUserId(UUID userId);

    void deleteByContentId(UUID contentId);

    List<ContentVote> findByVoteAndCreatedAtGreaterThanEqual(VoteDirection vote, LocalDateTime createdAt);
}
