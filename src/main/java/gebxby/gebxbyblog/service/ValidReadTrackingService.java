package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.model.ContentReadReceipt;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.ContentReadReceiptRepository;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class ValidReadTrackingService {
    private static final Duration READ_DEDUP_WINDOW = Duration.ofHours(12);

    private final ContentReadReceiptRepository receiptRepository;

    public ValidReadTrackingService(ContentReadReceiptRepository receiptRepository) {
        this.receiptRepository = receiptRepository;
    }

    public boolean claimRead(UUID contentId, User viewer, String readerKeyHint) {
        if (contentId == null || receiptRepository == null) {
            return true;
        }
        String readerKey = readerKey(viewer, readerKeyHint);
        if (!StringUtils.hasText(readerKey)) {
            return true;
        }
        LocalDateTime now = LocalDateTime.now();
        boolean seenRecently = receiptRepository
                .findFirstByContentIdAndReaderKeyAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
                        contentId,
                        readerKey,
                        now.minus(READ_DEDUP_WINDOW)
                )
                .isPresent();
        if (seenRecently) {
            return false;
        }
        ContentReadReceipt receipt = new ContentReadReceipt();
        receipt.setId(UUID.randomUUID());
        receipt.setContentId(contentId);
        receipt.setUserId(viewer == null ? null : viewer.getUserID());
        receipt.setReaderKey(readerKey);
        receipt.setCreatedAt(now);
        receiptRepository.save(receipt);
        return true;
    }

    private String readerKey(User viewer, String hint) {
        if (viewer != null && viewer.getUserID() != null) {
            return "u:" + viewer.getUserID();
        }
        if (!StringUtils.hasText(hint)) {
            return "";
        }
        return "g:" + hint.trim();
    }
}
