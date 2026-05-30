package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.AdminNotificationRequest;
import gebxby.gebxbyblog.dto.NotificationResponse;
import gebxby.gebxbyblog.model.Comment;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.Notification;
import gebxby.gebxbyblog.model.NotificationType;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.NotificationRepository;
import gebxby.gebxbyblog.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private UserService userService;
    @Mock
    private UserRepository userRepository;

    private NotificationServiceImpl notificationService;
    private User owner;
    private User commenter;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationServiceImpl(notificationRepository, userService, userRepository);
        owner = new User();
        owner.setUserID(UUID.randomUUID());
        owner.setName("Owner");
        commenter = new User();
        commenter.setUserID(UUID.randomUUID());
        commenter.setName("Reader");
    }

    @Test
    void notifyCommentOnContentCreatesNotificationForOwnerOnly() {
        Content content = new Content();
        content.setIdContent(UUID.randomUUID());
        content.setHead("Post Title");
        content.setUser(owner);
        Comment comment = new Comment();
        comment.setId(UUID.randomUUID());
        comment.setUser(commenter);

        notificationService.notifyCommentOnContent(content, comment);

        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    void notifyCommentOnContentSkipsSelfComment() {
        Content content = new Content();
        content.setUser(owner);
        Comment comment = new Comment();
        comment.setUser(owner);

        notificationService.notifyCommentOnContent(content, comment);

        verify(notificationRepository, never()).save(any(Notification.class));
    }

    @Test
    void sendAdminMessageRequiresAdminAndSanitizesPayload() {
        User admin = new User();
        admin.setUserID(UUID.randomUUID());
        admin.setName("Admin");
        when(userService.isAdmin(admin)).thenReturn(true);
        when(userService.getUserById(owner.getUserID())).thenReturn(owner);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NotificationResponse response = notificationService.sendAdminMessage(
                owner.getUserID(),
                new AdminNotificationRequest("<b>Warning</b>", "<script>bad()</script>Stay alert"),
                admin
        );

        assertEquals(NotificationType.ADMIN_MESSAGE, response.type());
        assertEquals("Warning", response.title());
        assertEquals("Stay alert", response.message());
        assertNotNull(response.expiresAt());
    }

    @Test
    void sendAdminMessageRejectsNonAdmin() {
        assertThrows(ResponseStatusException.class, () ->
                notificationService.sendAdminMessage(owner.getUserID(), new AdminNotificationRequest("x", "y"), commenter)
        );
    }

    @Test
    void sendAdminBroadcastCreatesNotificationForEveryUser() {
        User admin = new User();
        admin.setUserID(UUID.randomUUID());
        admin.setRole("ADMIN");
        admin.setName("Admin");
        when(userService.isAdmin(admin)).thenReturn(true);
        when(userRepository.findAll()).thenReturn(List.of(owner, commenter));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<NotificationResponse> response = notificationService.sendAdminBroadcast(new AdminNotificationRequest("All", "Stay safe"), admin);

        assertEquals(2, response.size());
        verify(notificationRepository, times(2)).save(any(Notification.class));
    }

    @Test
    void moderatorReportRequiresModeratorAndAdminTarget() {
        User admin = new User();
        admin.setUserID(UUID.randomUUID());
        admin.setRole("ADMIN");
        when(userService.isModerator(commenter)).thenReturn(true);
        when(userService.getUserById(admin.getUserID())).thenReturn(admin);
        when(userService.isAdmin(admin)).thenReturn(true);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NotificationResponse response = notificationService.sendModeratorReport(
                admin.getUserID(),
                new AdminNotificationRequest(null, "Ada laporan"),
                commenter
        );

        assertEquals("Laporan moderator", response.title());
        assertEquals(commenter.getUserID(), response.actorUserId());
    }

    @Test
    void markReadSetsReadState() {
        Notification notification = new Notification();
        notification.setId(UUID.randomUUID());
        notification.setRecipientUserId(owner.getUserID());
        notification.setRead(false);
        notification.setCreatedAt(LocalDateTime.now());
        notification.setExpiresAt(LocalDateTime.now().plusDays(7));

        when(notificationRepository.findByIdAndRecipientUserId(notification.getId(), owner.getUserID())).thenReturn(Optional.of(notification));
        when(notificationRepository.save(notification)).thenReturn(notification);

        NotificationResponse response = notificationService.markRead(notification.getId(), owner);

        assertTrue(response.read());
        verify(userService).ensureActive(owner);
    }

    @Test
    void markAllReadPersistsOnlyUnreadNotifications() {
        Notification unread = new Notification();
        unread.setId(UUID.randomUUID());
        unread.setRead(false);
        Notification alreadyRead = new Notification();
        alreadyRead.setId(UUID.randomUUID());
        alreadyRead.setRead(true);

        when(notificationRepository.findByRecipientUserIdAndExpiresAtAfterOrderByCreatedAtDesc(
                eq(owner.getUserID()),
                any(LocalDateTime.class),
                any(Pageable.class)
        )).thenReturn(List.of(alreadyRead, unread));

        notificationService.markAllRead(owner);

        assertTrue(unread.isRead());
        verify(notificationRepository).saveAll(List.of(unread));
    }

    @Test
    void findForUserLimitsToMaxAndDeletesExpiredBeforeRead() {
        when(notificationRepository.findByRecipientUserIdAndExpiresAtAfterOrderByCreatedAtDesc(eq(owner.getUserID()), any(LocalDateTime.class), any(Pageable.class)))
                .thenReturn(List.of());

        List<NotificationResponse> response = notificationService.findForUser(owner, 999);

        assertTrue(response.isEmpty());
        verify(notificationRepository).deleteByExpiresAtBefore(any(LocalDateTime.class));
    }

    @Test
    void notificationDefaultUnreadStateIsFalse() {
        Notification notification = new Notification();
        assertFalse(notification.isRead());
    }
}
