package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.Announcement;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;
import java.util.UUID;

public interface AnnouncementRepository extends MongoRepository<Announcement, UUID> {
    Optional<Announcement> findTopByActiveTrueOrderByCreatedAtDesc();
}
