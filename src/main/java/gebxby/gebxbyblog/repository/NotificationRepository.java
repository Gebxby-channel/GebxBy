package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.Notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends MongoRepository<Notification, UUID> {
    List<Notification> findByRecipientUserIdAndExpiresAtAfterOrderByCreatedAtDesc(UUID recipientUserId, LocalDateTime now, Pageable pageable);

    long countByRecipientUserIdAndReadFalseAndExpiresAtAfter(UUID recipientUserId, LocalDateTime now);

    Optional<Notification> findByIdAndRecipientUserId(UUID id, UUID recipientUserId);

    void deleteByExpiresAtBefore(LocalDateTime cutoff);
}
