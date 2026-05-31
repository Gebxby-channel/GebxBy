package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.ActivityLogResponse;
import gebxby.gebxbyblog.dto.ReportRequest;
import gebxby.gebxbyblog.model.ActivityLog;
import gebxby.gebxbyblog.model.ActivityLogDirection;
import gebxby.gebxbyblog.model.ActivityLogType;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.ActivityLogRepository;
import gebxby.gebxbyblog.repository.CommentRepository;
import gebxby.gebxbyblog.repository.ContentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ActivityLogServiceImplTest {
    @Mock
    private ActivityLogRepository logRepository;
    @Mock
    private ContentRepository contentRepository;
    @Mock
    private CommentRepository commentRepository;

    private ActivityLogServiceImpl activityLogService;
    private User reporter;
    private Content content;

    @BeforeEach
    void setUp() {
        activityLogService = new ActivityLogServiceImpl(logRepository, contentRepository, commentRepository);
        reporter = new User();
        reporter.setUserID(UUID.randomUUID());
        reporter.setName("Reporter");
        content = new Content();
        content.setIdContent(UUID.randomUUID());
        content.setHead("Unsafe post");
        User author = new User();
        author.setUserID(UUID.randomUUID());
        author.setName("Author");
        content.setUser(author);
    }

    @Test
    void recordUserReportCreatesQueueEntryForContent() {
        when(contentRepository.findById(content.getIdContent())).thenReturn(Optional.of(content));
        when(logRepository.save(any(ActivityLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ActivityLog log = activityLogService.recordUserReport(reporter, content.getIdContent(), null, new ReportRequest("<b>Spam</b>"));

        assertEquals(ActivityLogType.USER_REPORT, log.getType());
        assertTrue(log.isReportQueue());
        assertEquals("Spam", log.getReason());
        assertEquals(content.getIdContent(), log.getContentId());
    }

    @Test
    void reportQueueRequiresModeratorOrAdminFlag() {
        assertThrows(ResponseStatusException.class, () -> activityLogService.findReportQueue(reporter, 20, false));
    }

    @Test
    void findOneAllowsOwnerAccess() {
        ActivityLog log = new ActivityLog();
        log.setId(UUID.randomUUID());
        log.setOwnerUserId(reporter.getUserID());
        log.setType(ActivityLogType.PUBLICATION);
        log.setDirection(ActivityLogDirection.OUTGOING);
        when(logRepository.findByIdAndOwnerUserId(eq(log.getId()), eq(reporter.getUserID()))).thenReturn(Optional.of(log));

        ActivityLogResponse response = activityLogService.findOne(log.getId(), reporter, false);

        assertEquals(log.getId(), response.id());
    }

    @Test
    void findBasisLimitsAndMapsRecords() {
        ActivityLog log = new ActivityLog();
        log.setId(UUID.randomUUID());
        log.setOwnerUserId(reporter.getUserID());
        log.setType(ActivityLogType.PUBLICATION);
        log.setDirection(ActivityLogDirection.OUTGOING);
        when(logRepository.findByOwnerUserIdOrderByCreatedAtDesc(eq(reporter.getUserID()), any(Pageable.class))).thenReturn(List.of(log));

        List<ActivityLogResponse> response = activityLogService.findBasis(reporter, 999);

        assertEquals(1, response.size());
    }

    @Test
    void resolveReportMarksQueueEntryResolved() {
        ActivityLog log = new ActivityLog();
        log.setId(UUID.randomUUID());
        log.setOwnerUserId(reporter.getUserID());
        log.setType(ActivityLogType.USER_REPORT);
        log.setDirection(ActivityLogDirection.OUTGOING);
        log.setReportQueue(true);
        when(logRepository.findById(log.getId())).thenReturn(Optional.of(log));
        when(logRepository.save(any(ActivityLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ActivityLogResponse response = activityLogService.resolveReport(log.getId(), reporter, true);

        assertTrue(response.resolved());
        assertEquals(log.getId(), response.id());
    }

    @Test
    void rejectReportDeletesQueueEntryPermanently() {
        ActivityLog log = new ActivityLog();
        log.setId(UUID.randomUUID());
        log.setOwnerUserId(reporter.getUserID());
        log.setType(ActivityLogType.USER_REPORT);
        log.setDirection(ActivityLogDirection.OUTGOING);
        log.setReportQueue(true);
        when(logRepository.findById(log.getId())).thenReturn(Optional.of(log));

        activityLogService.rejectReport(log.getId(), reporter, true);

        verify(logRepository).delete(log);
    }
}
