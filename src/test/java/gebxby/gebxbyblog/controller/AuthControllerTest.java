package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.dto.CurrentUserResponse;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.service.ForumMapper;
import gebxby.gebxbyblog.service.LoginRateLimiter;
import gebxby.gebxbyblog.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;
import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;
    @MockitoBean
    private ForumMapper mapper;
    @MockitoBean
    private LoginRateLimiter loginRateLimiter;

    @Test
    void emailLoginStoresManualAuthenticationAndReturnsUser() throws Exception {
        UUID userId = UUID.randomUUID();
        User admin = new User();
        admin.setUserID(userId);
        admin.setEmail("admin@example.com");
        admin.setName("Admin");
        admin.setRole("ADMIN");
        admin.setGoogleId("manual:admin@example.com");

        when(userService.loginWithEmailPassword(eq("admin@example.com"), eq("secret"))).thenReturn(admin);
        when(mapper.toCurrentUser(admin)).thenReturn(new CurrentUserResponse(
                userId,
                "Admin",
                "admin@example.com",
                null,
                "ADMINISTRATOR",
                null,
                "ADMIN",
                false,
                null,
                List.of(),
                Set.of(),
                Set.of()
        ));

        mockMvc.perform(post("/api/auth/email-login")
                        .with(request -> {
                            request.setRemoteAddr("10.0.0.5");
                            return request;
                        })
                        .header("X-Forwarded-For", "203.0.113.99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@example.com\",\"password\":\"secret\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));

        verify(loginRateLimiter).check("admin@example.com", "10.0.0.5");
    }
}
