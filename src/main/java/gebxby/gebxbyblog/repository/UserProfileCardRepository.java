package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.UserProfileCard;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.UUID;

public interface UserProfileCardRepository extends MongoRepository<UserProfileCard, UUID> {
    List<UserProfileCard> findByUserIdOrderByGrantedAtDesc(UUID userId);
}
