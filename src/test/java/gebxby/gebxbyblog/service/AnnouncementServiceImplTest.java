package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.AdminNotificationRequest;
import gebxby.gebxbyblog.dto.AnnouncementResponse;
import gebxby.gebxbyblog.model.Announcement;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.AnnouncementRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnnouncementServiceImplTest {
    @Mock
    private AnnouncementRepository announcementRepository;
    @Mock
    private UserService userService;

    private AnnouncementServiceImpl announcementService;
    private User admin;

    @BeforeEach
    void setUp() {
        announcementService = new AnnouncementServiceImpl(announcementRepository, userService);
        admin = new User();
        admin.setUserID(UUID.randomUUID());
        admin.setName("Jill Valentine");
        admin.setPhoto("photo.webp");
    }

    @Test
    void publishRequiresAdminAndSanitizesPayload() {
        when(userService.isAdmin(admin)).thenReturn(true);
        when(announcementRepository.save(any(Announcement.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AnnouncementResponse response = announcementService.publish(
                new AdminNotificationRequest("<b>Event</b>", "<script>bad()</script>Server maintenance"),
                admin
        );

        assertEquals("Event", response.title());
        assertEquals("Server maintenance", response.message());
        assertEquals(admin.getUserID(), response.adminUserId());
        assertEquals("Jill Valentine", response.adminName());
    }

    @Test
    void publishRejectsNonAdmin() {
        assertThrows(ResponseStatusException.class, () ->
                announcementService.publish(new AdminNotificationRequest("Event", "Hello"), admin)
        );
    }

    @Test
    void latestReturnsNewestActiveAnnouncement() {
        Announcement announcement = new Announcement();
        announcement.setId(UUID.randomUUID());
        announcement.setTitle("Event");
        announcement.setMessage("Welcome");
        when(announcementRepository.findTopByActiveTrueOrderByCreatedAtDesc()).thenReturn(Optional.of(announcement));

        Optional<AnnouncementResponse> response = announcementService.latest();

        assertTrue(response.isPresent());
        assertEquals("Welcome", response.get().message());
    }

    @Test
    void deleteOwnPermanentlyDeletesAnnouncement() {
        Announcement announcement = new Announcement();
        announcement.setId(UUID.randomUUID());
        announcement.setAdminUserId(admin.getUserID());
        announcement.setActive(true);
        when(userService.isAdmin(admin)).thenReturn(true);
        when(announcementRepository.findById(announcement.getId())).thenReturn(Optional.of(announcement));

        announcementService.deleteOwn(announcement.getId(), admin);

        verify(announcementRepository).delete(announcement);
    }

    @Test
    void deleteOwnRejectsDifferentAdmin() {
        Announcement announcement = new Announcement();
        announcement.setId(UUID.randomUUID());
        announcement.setAdminUserId(UUID.randomUUID());
        when(userService.isAdmin(admin)).thenReturn(true);
        when(announcementRepository.findById(announcement.getId())).thenReturn(Optional.of(announcement));

        assertThrows(ResponseStatusException.class, () -> announcementService.deleteOwn(announcement.getId(), admin));
    }
}
