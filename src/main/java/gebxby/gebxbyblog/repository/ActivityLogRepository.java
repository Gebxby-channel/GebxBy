package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.ActivityLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ActivityLogRepository extends MongoRepository<ActivityLog, UUID> {
    List<ActivityLog> findByOwnerUserIdOrderByCreatedAtDesc(UUID ownerUserId, Pageable pageable);

    List<ActivityLog> findByReportQueueTrueOrderByCreatedAtDesc(Pageable pageable);

    Optional<ActivityLog> findByIdAndOwnerUserId(UUID id, UUID ownerUserId);
}
