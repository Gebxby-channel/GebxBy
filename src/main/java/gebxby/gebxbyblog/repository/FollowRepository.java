package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.Follow;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FollowRepository extends MongoRepository<Follow, String> {
    Optional<Follow> findByFollowerUserIdAndTargetUserId(UUID followerUserId, UUID targetUserId);

    List<Follow> findByFollowerUserId(UUID followerUserId);

    List<Follow> findByFollowerUserIdOrderByCreatedAtDesc(UUID followerUserId);

    List<Follow> findByTargetUserIdOrderByCreatedAtDesc(UUID targetUserId);

    void deleteByFollowerUserIdAndTargetUserId(UUID followerUserId, UUID targetUserId);

    void deleteByFollowerUserId(UUID followerUserId);

    void deleteByTargetUserId(UUID targetUserId);
}
