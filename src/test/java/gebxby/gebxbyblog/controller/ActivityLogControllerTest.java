package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.service.ActivityLogService;
import gebxby.gebxbyblog.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ActivityLogController.class)
@AutoConfigureMockMvc(addFilters = false)
class ActivityLogControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ActivityLogService activityLogService;
    @MockitoBean
    private UserService userService;

    @Test
    void clearBasisDeletesCurrentUserLogs() throws Exception {
        User user = new User();
        user.setUserID(UUID.randomUUID());
        when(userService.getCurrentUser(any())).thenReturn(user);
        when(activityLogService.clearUserBasis(user)).thenReturn(7L);

        mockMvc.perform(delete("/api/logs").with(oauth2Login()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deleted").value(7));
        verify(activityLogService).clearUserBasis(user);
    }
}
