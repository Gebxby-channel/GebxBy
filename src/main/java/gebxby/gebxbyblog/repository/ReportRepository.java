package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.Report;
import gebxby.gebxbyblog.model.ReportStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReportRepository extends MongoRepository<Report, UUID> {
    Optional<Report> findByActivityLogId(UUID activityLogId);

    List<Report> findByStatusOrderByCreatedAtDesc(ReportStatus status);

    void deleteByActivityLogId(UUID activityLogId);
}
