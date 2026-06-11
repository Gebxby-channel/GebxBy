package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.model.ContentReadReceipt;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.ContentReadReceiptRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ValidReadTrackingServiceTest {
    @Mock
    private ContentReadReceiptRepository receiptRepository;

    @Test
    void claimReadStoresReceiptForFreshReader() {
        UUID contentId = UUID.randomUUID();
        User user = new User();
        user.setUserID(UUID.randomUUID());
        ValidReadTrackingService service = new ValidReadTrackingService(receiptRepository);

        when(receiptRepository.findFirstByContentIdAndReaderKeyAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
                eq(contentId),
                eq("u:" + user.getUserID()),
                any(LocalDateTime.class)
        )).thenReturn(Optional.empty());

        assertTrue(service.claimRead(contentId, user, "guest-session"));
        verify(receiptRepository).save(any(ContentReadReceipt.class));
    }

    @Test
    void claimReadRejectsRecentDuplicate() {
        UUID contentId = UUID.randomUUID();
        ValidReadTrackingService service = new ValidReadTrackingService(receiptRepository);

        when(receiptRepository.findFirstByContentIdAndReaderKeyAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
                eq(contentId),
                eq("g:guest-session"),
                any(LocalDateTime.class)
        )).thenReturn(Optional.of(new ContentReadReceipt()));

        assertFalse(service.claimRead(contentId, null, "guest-session"));
        verify(receiptRepository, never()).save(any(ContentReadReceipt.class));
    }

    @Test
    void claimReadAllowsDifferentGuestReaderKeys() {
        UUID contentId = UUID.randomUUID();
        ValidReadTrackingService service = new ValidReadTrackingService(receiptRepository);

        when(receiptRepository.findFirstByContentIdAndReaderKeyAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
                eq(contentId),
                eq("g:guest-reader-a"),
                any(LocalDateTime.class)
        )).thenReturn(Optional.of(new ContentReadReceipt()));
        when(receiptRepository.findFirstByContentIdAndReaderKeyAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
                eq(contentId),
                eq("g:guest-reader-b"),
                any(LocalDateTime.class)
        )).thenReturn(Optional.empty());

        assertFalse(service.claimRead(contentId, null, "guest-reader-a"));
        assertTrue(service.claimRead(contentId, null, "guest-reader-b"));
        verify(receiptRepository).save(any(ContentReadReceipt.class));
    }
}
