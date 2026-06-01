package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.model.BadgeCode;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends MongoRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByGoogleId(String googleId);
    Optional<User> findByUsernameNormalized(String usernameNormalized);
    boolean existsByUsernameNormalized(String usernameNormalized);
    List<User> findByUserIDIn(Collection<UUID> userIds);
    List<User> findByRoleIgnoreCase(String role);
    List<User> findByRoleIgnoreCase(String role, Pageable pageable);
    List<User> findByManualBadges(BadgeCode badge, Pageable pageable);
    List<User> findByCustomBadgeIds(UUID customBadgeId, Pageable pageable);

    @Query("{ '$or': [ { 'name': { $regex: ?0, $options: 'i' } }, { 'username': { $regex: ?0, $options: 'i' } }, { 'usernameNormalized': { $regex: ?0, $options: 'i' } }, { 'designation': { $regex: ?0, $options: 'i' } } ] }")
    List<User> searchPublicUsers(String query, Pageable pageable);

    @Query("{ '$or': [ { 'manualBadges': 'CRIMINAL' }, { 'criminalMarked': true } ] }")
    List<User> findCriminalBadgeUsers(Pageable pageable);
}
