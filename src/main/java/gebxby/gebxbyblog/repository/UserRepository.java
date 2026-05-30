package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends MongoRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByGoogleId(String googleId);
    List<User> findByUserIDIn(Collection<UUID> userIds);
    List<User> findByRoleIgnoreCase(String role);
}
