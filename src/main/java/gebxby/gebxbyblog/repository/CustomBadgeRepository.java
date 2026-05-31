package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.CustomBadgeDefinition;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.UUID;

public interface CustomBadgeRepository extends MongoRepository<CustomBadgeDefinition, UUID> {
    List<CustomBadgeDefinition> findAllByOrderByCreatedAtDesc();
}
