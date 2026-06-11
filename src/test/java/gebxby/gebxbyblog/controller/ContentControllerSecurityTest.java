package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.config.ApiOriginFilter;
import gebxby.gebxbyblog.config.SecurityConfig;
import gebxby.gebxbyblog.dto.CommentResponse;
import gebxby.gebxbyblog.dto.ContentStatsResponse;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.model.VoteDirection;
import gebxby.gebxbyblog.service.CommentService;
import gebxby.gebxbyblog.service.ContentService;
import gebxby.gebxbyblog.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ContentController.class)
@AutoConfigureMockMvc
@Import({SecurityConfig.class, ApiOriginFilter.class})
class ContentControllerSecurityTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ContentService contentService;
    @MockitoBean
    private CommentService commentService;
    @MockitoBean
    private UserService userService;

    private UUID contentId;
    private User user;

    @BeforeEach
    void setUp() {
        contentId = UUID.randomUUID();
        user = new User();
        user.setUserID(UUID.randomUUID());
        user.setName("User");
    }

    @Test
    void voteAllowsAllowedSpaOriginWithCsrfToken() throws Exception {
        when(userService.getCurrentUser(any())).thenReturn(user);
        when(contentService.vote(eq(contentId), eq(VoteDirection.UP), eq(user)))
                .thenReturn(new ContentStatsResponse(contentId, 0, 1, 0, 0, VoteDirection.UP));

        mockMvc.perform(post("/content/{id}/vote", contentId)
                        .with(oauth2Login())
                        .with(csrf())
                        .header("Origin", "http://localhost:5173")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vote\":\"UP\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void commentAllowsAllowedSpaOriginWithCsrfToken() throws Exception {
        when(userService.getCurrentUser(any())).thenReturn(user);
        when(commentService.addComment(eq(contentId), any(), eq(user))).thenReturn(new CommentResponse(
                UUID.randomUUID(),
                contentId,
                null,
                null,
                "hello",
                LocalDateTime.now(),
                LocalDateTime.now(),
                false,
                false,
                List.of()
        ));

        mockMvc.perform(post("/content/{id}/comments", contentId)
                        .with(oauth2Login())
                        .with(csrf())
                        .header("Origin", "http://localhost:5173")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"body\":\"hello\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void viewAllowsGuestReaderWithCsrfToken() throws Exception {
        when(contentService.recordView(eq(contentId), isNull(), eq("guest-reader-123")))
                .thenReturn(new ContentStatsResponse(contentId, 1, 0, 0, 0, VoteDirection.NONE));

        mockMvc.perform(post("/content/{id}/view", contentId)
                        .with(csrf())
                        .header("Origin", "http://localhost:5173")
                        .header("X-Guest-Reader-Key", "guest-reader-123"))
                .andExpect(status().isOk());
    }

    @Test
    void unsafeApiMutationRejectsUnknownOrigin() throws Exception {
        mockMvc.perform(post("/content/{id}/vote", contentId)
                        .with(oauth2Login())
                        .header("Origin", "https://not-allowed.example")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vote\":\"UP\"}"))
                .andExpect(status().isForbidden());
    }
}
