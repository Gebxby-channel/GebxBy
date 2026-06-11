package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.dto.CommentResponse;
import gebxby.gebxbyblog.dto.ContentResponse;
import gebxby.gebxbyblog.dto.ContentStatsResponse;
import gebxby.gebxbyblog.dto.PublicUserResponse;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.model.VoteDirection;
import gebxby.gebxbyblog.service.CommentService;
import gebxby.gebxbyblog.service.ContentService;
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

import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ContentController.class)
@AutoConfigureMockMvc(addFilters = false)
class ContentControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ContentService contentService;
    @MockitoBean
    private CommentService commentService;
    @MockitoBean
    private UserService userService;

    @Test
    void getAllContentUsesCorrectEndpoint() throws Exception {
        when(contentService.findAll(isNull())).thenReturn(List.of(sampleContent()));

        mockMvc.perform(get("/content/all-content"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].head").value("Title"));
    }

    @Test
    void getCategoriesReturnsAvailableCategories() throws Exception {
        when(contentService.findCategories()).thenReturn(List.of("General", "Lore"));

        mockMvc.perform(get("/content/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[1]").value("Lore"));
    }

    @Test
    void getContentByUserUsesAuthorEndpoint() throws Exception {
        UUID userId = UUID.randomUUID();
        when(contentService.findByAuthor(eq(userId), isNull())).thenReturn(List.of(sampleContent()));

        mockMvc.perform(get("/content/by-user/{userId}", userId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].head").value("Title"));
    }

    @Test
    void getContentByIdDoesNotIncrementViewForCacheableRead() throws Exception {
        UUID contentId = UUID.randomUUID();
        when(contentService.findContentById(eq(contentId), isNull(), eq(false))).thenReturn(sampleContent());

        mockMvc.perform(get("/content/{id}", contentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.head").value("Title"));
    }

    @Test
    void viewEndpointIncrementsAndReturnsStats() throws Exception {
        UUID contentId = UUID.randomUUID();
        when(contentService.recordView(eq(contentId), isNull(), eq("guest-reader-123")))
                .thenReturn(new ContentStatsResponse(contentId, 3, 0, 0, 0, VoteDirection.NONE));

        mockMvc.perform(post("/content/{id}/view", contentId)
                        .header("X-Guest-Reader-Key", "guest-reader-123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.viewCount").value(3));
    }

    @Test
    void viewFallbackReaderKeyIgnoresSpoofedForwardedFor() throws Exception {
        UUID contentId = UUID.randomUUID();
        when(contentService.recordView(
                eq(contentId),
                isNull(),
                argThat(key -> key != null && key.contains("10.0.0.6") && !key.contains("203.0.113.10"))
        )).thenReturn(new ContentStatsResponse(contentId, 4, 0, 0, 0, VoteDirection.NONE));

        mockMvc.perform(post("/content/{id}/view", contentId)
                        .with(request -> {
                            request.setRemoteAddr("10.0.0.6");
                            return request;
                        })
                        .header("X-Forwarded-For", "203.0.113.10")
                        .header("User-Agent", "reader"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.viewCount").value(4));
    }

    @Test
    void voteRequiresCurrentUserAndReturnsStats() throws Exception {
        UUID contentId = UUID.randomUUID();
        User user = new User();
        user.setUserID(UUID.randomUUID());
        when(userService.getCurrentUser(any())).thenReturn(user);
        when(contentService.vote(eq(contentId), eq(VoteDirection.UP), eq(user)))
                .thenReturn(new ContentStatsResponse(contentId, 2, 1, 0, 0, VoteDirection.UP));

        mockMvc.perform(post("/content/{id}/vote", contentId)
                        .with(oauth2Login())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vote\":\"UP\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.upCount").value(1))
                .andExpect(jsonPath("$.userVote").value("UP"));
    }

    @Test
    void commentsEndpointReturnsThread() throws Exception {
        UUID contentId = UUID.randomUUID();
        UUID commentId = UUID.randomUUID();
        when(commentService.findThread(contentId)).thenReturn(List.of(new CommentResponse(
                commentId,
                contentId,
                null,
                new PublicUserResponse(UUID.randomUUID(), "User", null, null, null, false, null, List.of()),
                "Hello",
                LocalDateTime.now(),
                LocalDateTime.now(),
                false,
                false,
                List.of()
        )));

        mockMvc.perform(get("/content/{id}/comments", contentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].body").value("Hello"));
    }

    private ContentResponse sampleContent() {
        UUID userId = UUID.randomUUID();
        return new ContentResponse(
                UUID.randomUUID(),
                "Title",
                null,
                "<p>Body</p>",
                new PublicUserResponse(userId, "Author", null, "Officer", null, false, null, List.of()),
                "General",
                LocalDateTime.now(),
                LocalDateTime.now(),
                0,
                0,
                0,
                0,
                VoteDirection.NONE
        );
    }
}
