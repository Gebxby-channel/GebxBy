package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.dto.CurrentUserResponse;
import gebxby.gebxbyblog.dto.NotificationResponse;
import gebxby.gebxbyblog.model.NotificationType;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.service.ForumMapper;
import gebxby.gebxbyblog.service.ActivityLogService;
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
import java.util.Set;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ModerationController.class)
@AutoConfigureMockMvc(addFilters = false)
class ModerationControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;
    @MockitoBean
    private NotificationService notificationService;
    @MockitoBean
    private ActivityLogService activityLogService;
    @MockitoBean
    private ForumMapper mapper;

    @Test
    void moderatorSuspendDelegatesToOneHourSuspend() throws Exception {
        User moderator = new User();
        moderator.setUserID(UUID.randomUUID());
        User target = new User();
        target.setUserID(UUID.randomUUID());
        when(userService.getCurrentUser(any())).thenReturn(moderator);
        when(userService.moderatorSuspendUser(target.getUserID(), moderator)).thenReturn(target);
        when(mapper.toCurrentUser(target)).thenReturn(new CurrentUserResponse(
                target.getUserID(), "Target", "target@example.com", null, null, null, "USER", true, LocalDateTime.now().plusHours(1), List.of(), Set.of(), Set.of()
        ));

        mockMvc.perform(post("/api/moderation/users/{userId}/suspend", target.getUserID()).with(oauth2Login()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.suspensionMarked").value(true));
    }

    @Test
    void moderatorReportCreatesAdminNotification() throws Exception {
        UUID adminId = UUID.randomUUID();
        User moderator = new User();
        moderator.setUserID(UUID.randomUUID());
        when(userService.getCurrentUser(any())).thenReturn(moderator);
        when(notificationService.sendModeratorReport(eq(adminId), any(), eq(moderator))).thenReturn(new NotificationResponse(
                UUID.randomUUID(),
                NotificationType.ADMIN_MESSAGE,
                "Laporan moderator",
                "Report",
                moderator.getUserID(),
                "Mod",
                null,
                null,
                null,
                null,
                UUID.randomUUID(),
                false,
                LocalDateTime.now(),
                LocalDateTime.now().plusDays(7)
        ));

        mockMvc.perform(post("/api/moderation/admins/{adminId}/report", adminId)
                        .with(oauth2Login())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Report\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Laporan moderator"));
    }
}
