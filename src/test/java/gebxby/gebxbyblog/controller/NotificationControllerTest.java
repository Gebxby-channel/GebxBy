package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.dto.NotificationResponse;
import gebxby.gebxbyblog.model.NotificationType;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.service.NotificationService;
import gebxby.gebxbyblog.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NotificationController.class)
@AutoConfigureMockMvc(addFilters = false)
class NotificationControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private NotificationService notificationService;
    @MockitoBean
    private UserService userService;

    @Test
    void listNotificationsReturnsCurrentUserNotifications() throws Exception {
        User user = user();
        when(userService.getCurrentUser(any())).thenReturn(user);
        when(notificationService.findForUser(user, 30)).thenReturn(List.of(notification()));

        mockMvc.perform(get("/api/notifications").with(oauth2Login()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].type").value("COMMENT"));
    }

    @Test
    void unreadCountReturnsCount() throws Exception {
        User user = user();
        when(userService.getCurrentUser(any())).thenReturn(user);
        when(notificationService.countUnread(user)).thenReturn(3L);

        mockMvc.perform(get("/api/notifications/unread-count").with(oauth2Login()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(3));
    }

    @Test
    void markReadDelegatesToService() throws Exception {
        User user = user();
        UUID notificationId = UUID.randomUUID();
        when(userService.getCurrentUser(any())).thenReturn(user);
        when(notificationService.markRead(eq(notificationId), eq(user))).thenReturn(notification());

        mockMvc.perform(put("/api/notifications/{id}/read", notificationId)
                        .with(oauth2Login())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    void markAllReadDelegatesToService() throws Exception {
        User user = user();
        when(userService.getCurrentUser(any())).thenReturn(user);

        mockMvc.perform(put("/api/notifications/read-all").with(oauth2Login()))
                .andExpect(status().isNoContent());
        verify(notificationService).markAllRead(user);
    }

    private User user() {
        User user = new User();
        user.setUserID(UUID.randomUUID());
        return user;
    }

    private NotificationResponse notification() {
        return new NotificationResponse(
                UUID.randomUUID(),
                NotificationType.COMMENT,
                "Komentar baru",
                "Reader mengomentari tulisan",
                UUID.randomUUID(),
                "Reader",
                null,
                UUID.randomUUID(),
                "Post",
                UUID.randomUUID(),
                UUID.randomUUID(),
                false,
                LocalDateTime.now(),
                LocalDateTime.now().plusDays(7)
        );
    }
}
