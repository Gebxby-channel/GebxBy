package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.ContentReadReceipt;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface ContentReadReceiptRepository extends MongoRepository<ContentReadReceipt, UUID> {
    Optional<ContentReadReceipt> findFirstByContentIdAndReaderKeyAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
            UUID contentId,
            String readerKey,
            LocalDateTime createdAt
    );

    void deleteByContentId(UUID contentId);
}
