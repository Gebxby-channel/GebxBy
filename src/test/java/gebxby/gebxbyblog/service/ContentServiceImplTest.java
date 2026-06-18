package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.AnalyticsResponse;
import gebxby.gebxbyblog.dto.ContentImageRequest;
import gebxby.gebxbyblog.dto.ContentRequest;
import gebxby.gebxbyblog.dto.ContentResponse;
import gebxby.gebxbyblog.dto.ContentStatsResponse;
import gebxby.gebxbyblog.dto.VoteBatchResponse;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.ContentImage;
import gebxby.gebxbyblog.model.ContentVote;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.model.VoteDirection;
import gebxby.gebxbyblog.repository.CommentRepository;
import gebxby.gebxbyblog.repository.ContentRepository;
import gebxby.gebxbyblog.repository.ContentVoteRepository;
import gebxby.gebxbyblog.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContentServiceImplTest {
    @Mock
    private ContentRepository contentRepository;
    @Mock
    private ContentVoteRepository voteRepository;
    @Mock
    private CommentRepository commentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private UserService userService;
    @Mock
    private BadgeService badgeService;
    @Mock
    private ActivityLogService activityLogService;
    @Mock
    private SeoRefreshService seoRefreshService;

    private ContentServiceImpl contentService;
    private User author;
    private Content content;

    @BeforeEach
    void setUp() {
        contentService = new ContentServiceImpl(
                contentRepository,
                voteRepository,
                commentRepository,
                userRepository,
                userService,
                inlineMediaPipeline(),
                new ForumMapper(badgeService),
                activityLogService,
                5_242_880,
                seoRefreshService
        );
        author = new User();
        author.setUserID(UUID.randomUUID());
        author.setName("Author");

        content = new Content();
        content.setIdContent(UUID.randomUUID());
        content.setHead("Original");
        content.setParagrafs("<p>Original</p>");
        content.setKategori("General");
        content.setUser(author);
        content.setCreatedAt(LocalDateTime.now());
    }

    private MediaPipelineServiceImpl inlineMediaPipeline() {
        return new MediaPipelineServiceImpl("inline", "", "", "", "", "", "", "auto");
    }

    @Test
    void addContentSanitizesBodyAndSetsDefaults() {
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ContentResponse response = contentService.addContent(
                new ContentRequest("Title", null, "<p>Hello</p><script>alert(1)</script>", "lore"),
                author
        );

        assertNotNull(response.idContent());
        assertEquals("Lore", response.kategori());
        assertFalse(response.paragrafs().contains("script"));
        assertEquals(author.getUserID(), response.user().userID());
        verify(userService).ensureActive(author);
        verify(seoRefreshService).requestRefresh("content-published");
    }

    @Test
    void addContentStoresSafeAuthorSnapshot() {
        author.setEmail("author@example.com");
        author.setGoogleId("google-id");
        author.setPasswordHash("secret-hash");
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> invocation.getArgument(0));

        contentService.addContent(new ContentRequest("Title", null, "Body", "General"), author);

        verify(contentRepository).save(org.mockito.ArgumentMatchers.argThat(saved ->
                saved.getUser() != author
                        && author.getUserID().equals(saved.getUser().getUserID())
                        && "Author".equals(saved.getUser().getName())
                        && saved.getUser().getEmail() == null
                        && saved.getUser().getGoogleId() == null
                        && saved.getUser().getPasswordHash() == null
        ));
    }

    @Test
    void addContentStillSucceedsWhenPublicationLogFails() {
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(activityLogService.recordPublication(any(Content.class), eq(author)))
                .thenThrow(new RuntimeException("log storage down"));

        ContentResponse response = contentService.addContent(
                new ContentRequest("Title", null, "Body", "General"),
                author
        );

        assertEquals("Title", response.head());
        verify(contentRepository).save(any(Content.class));
    }

    @Test
    void addContentPreservesPlainTextParagraphBreaks() {
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ContentResponse response = contentService.addContent(
                new ContentRequest("Title", null, "First paragraph\n\nSecond paragraph\nwith same-block line", "General"),
                author
        );

        assertFalse(response.paragrafs().contains("First paragraphSecond paragraph"));
        assertFalse(response.paragrafs().contains("<script"));
        assertTrue(response.paragrafs().contains("<p>First paragraph</p>"));
        assertTrue(response.paragrafs().replaceAll("\\s+", "").contains("Secondparagraph<br>withsame-blockline"));
    }

    @Test
    void publishDraftRefreshesCreatedAtToPublicationTime() {
        LocalDateTime originalDraftDate = LocalDateTime.now().minusDays(4);
        content.setStatus("DRAFT");
        content.setCreatedAt(originalDraftDate);
        content.setUpdatedAt(originalDraftDate.plusHours(1));
        when(contentRepository.findById(content.getIdContent())).thenReturn(Optional.of(content));
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LocalDateTime beforePublish = LocalDateTime.now();
        ContentResponse response = contentService.publishDraft(
                content.getIdContent(),
                new ContentRequest("Published Draft", null, "Ready now", "General"),
                author
        );
        LocalDateTime afterPublish = LocalDateTime.now();

        assertEquals("PUBLISHED", response.status());
        assertTrue(!response.createdAt().isBefore(beforePublish));
        assertTrue(!response.createdAt().isAfter(afterPublish));
        assertEquals(response.createdAt(), response.updatedAt());
        assertTrue(response.createdAt().isAfter(originalDraftDate));
        verify(seoRefreshService).requestRefresh("draft-published");
    }

    @Test
    void addContentStoresValidatedImageAttachments() {
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> invocation.getArgument(0));
        String dataUrl = "data:image/webp;base64,"
                + Base64.getEncoder().encodeToString("tiny-image".getBytes(StandardCharsets.UTF_8));

        ContentResponse response = contentService.addContent(
                new ContentRequest(
                        "Title",
                        null,
                        "Body",
                        "General",
                        List.of(new ContentImageRequest(dataUrl, "<b>Evidence</b>"))
                ),
                author
        );

        assertEquals(1, response.images().size());
        assertEquals(dataUrl, response.images().getFirst().data());
        assertEquals("Evidence", response.images().getFirst().alt());
        assertEquals(10, response.images().getFirst().size());
    }

    @Test
    void addContentRejectsUnsafeImageAttachment() {
        assertThrows(ResponseStatusException.class, () ->
                contentService.addContent(
                        new ContentRequest(
                                "Title",
                                null,
                                "Body",
                                "General",
                                List.of(new ContentImageRequest("javascript:alert(1)", "bad"))
                        ),
                        author
                )
        );
    }

    @Test
    void findContentByIdCanIncrementViewCount() {
        when(contentRepository.findById(content.getIdContent())).thenReturn(Optional.of(content));
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ContentResponse response = contentService.findContentById(content.getIdContent(), null, true);

        assertEquals(1, response.viewCount());
        verify(contentRepository).save(content);
    }

    @Test
    void findContentByIdCanSkipViewIncrementForCacheableReads() {
        when(contentRepository.findById(content.getIdContent())).thenReturn(Optional.of(content));

        ContentResponse response = contentService.findContentById(content.getIdContent(), null, false);

        assertEquals(0, response.viewCount());
        verify(contentRepository, never()).save(any(Content.class));
    }

    @Test
    void detailResponseIncludesImagesButListResponseStaysLight() {
        ContentImage image = new ContentImage();
        image.setId("img-1");
        image.setData("data:image/webp;base64,dGlueQ==");
        image.setAlt("Evidence");
        image.setSize(4);
        content.setImages(List.of(image));
        when(contentRepository.findById(content.getIdContent())).thenReturn(Optional.of(content));
        when(contentRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(content));

        ContentResponse detail = contentService.findContentById(content.getIdContent(), null, false);
        List<ContentResponse> list = contentService.findAll(null);

        assertEquals(1, detail.images().size());
        assertEquals("data:image/webp;base64,dGlueQ==", list.getFirst().coverImage().data());
        assertEquals(0, list.getFirst().images().size());
    }

    @Test
    void recordViewIncrementsCountAndReturnsStats() {
        when(contentRepository.findById(content.getIdContent())).thenReturn(Optional.of(content));
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ContentStatsResponse response = contentService.recordView(content.getIdContent(), null);

        assertEquals(1, response.viewCount());
        verify(contentRepository).save(content);
    }

    @Test
    void findByAuthorUsesAuthorSpecificQuery() {
        when(contentRepository.findByAuthorIdOrderByCreatedAtDesc(author.getUserID())).thenReturn(List.of(content));

        List<ContentResponse> response = contentService.findByAuthor(author.getUserID(), null);

        assertEquals(1, response.size());
        assertEquals(content.getIdContent(), response.getFirst().idContent());
    }

    @Test
    void feedTrendingRanksBySignals() {
        Content quiet = new Content();
        quiet.setIdContent(UUID.randomUUID());
        quiet.setHead("Quiet");
        quiet.setParagrafs("Body");
        quiet.setKategori("General");
        quiet.setCreatedAt(LocalDateTime.now());

        Content active = new Content();
        active.setIdContent(UUID.randomUUID());
        active.setHead("Active");
        active.setParagrafs("Body");
        active.setKategori("General");
        active.setCreatedAt(LocalDateTime.now().minusHours(2));
        active.setUpCount(5);
        active.setCommentCount(3);
        active.setViewCount(20);

        when(contentRepository.findByCreatedAtGreaterThanEqualOrderByUpCountDescCreatedAtDesc(any(LocalDateTime.class), any(Pageable.class)))
                .thenReturn(List.of(quiet, active));

        List<ContentResponse> response = contentService.feed("trending", null, 10, null);

        assertEquals(active.getIdContent(), response.getFirst().idContent());
    }

    @Test
    void updateContentAllowsOwnerAndSanitizes() {
        when(contentRepository.findById(content.getIdContent())).thenReturn(Optional.of(content));
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ContentResponse response = contentService.updateContent(
                content.getIdContent(),
                new ContentRequest("Updated", null, "<b>Clean</b><img src=x onerror=bad()>", "QNA"),
                author
        );

        assertEquals("Updated", response.head());
        assertEquals("QNA", response.kategori());
        assertFalse(response.paragrafs().contains("onerror"));
        verify(seoRefreshService).requestRefresh("content-updated");
    }

    @Test
    void updateContentRejectsNonOwner() {
        User other = new User();
        other.setUserID(UUID.randomUUID());
        when(contentRepository.findById(content.getIdContent())).thenReturn(Optional.of(content));

        assertThrows(ResponseStatusException.class, () ->
                contentService.updateContent(content.getIdContent(), new ContentRequest("X", null, "Body", "General"), other)
        );
    }

    @Test
    void voteUpCreatesVoteAndIncrementsCount() {
        when(contentRepository.findById(content.getIdContent())).thenReturn(Optional.of(content));
        when(voteRepository.findByContentIdAndUserId(content.getIdContent(), author.getUserID())).thenReturn(Optional.empty());
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ContentStatsResponse response = contentService.vote(content.getIdContent(), VoteDirection.UP, author);

        assertEquals(1, response.upCount());
        assertEquals(VoteDirection.UP, response.userVote());
        verify(voteRepository).save(any(ContentVote.class));
    }

    @Test
    void votingSameDirectionTogglesVoteOff() {
        content.setUpCount(1);
        ContentVote vote = new ContentVote();
        vote.setContentId(content.getIdContent());
        vote.setUserId(author.getUserID());
        vote.setVote(VoteDirection.UP);
        when(contentRepository.findById(content.getIdContent())).thenReturn(Optional.of(content));
        when(voteRepository.findByContentIdAndUserId(content.getIdContent(), author.getUserID())).thenReturn(Optional.of(vote));
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ContentStatsResponse response = contentService.vote(content.getIdContent(), VoteDirection.UP, author);

        assertEquals(0, response.upCount());
        assertEquals(VoteDirection.NONE, response.userVote());
        verify(voteRepository).delete(vote);
    }

    @Test
    void batchVotesReturnsStatsAndViewerVotesInOneCall() {
        ContentVote vote = new ContentVote();
        vote.setContentId(content.getIdContent());
        vote.setUserId(author.getUserID());
        vote.setVote(VoteDirection.UP);

        when(voteRepository.findByContentIdInAndUserId(anyCollection(), eq(author.getUserID()))).thenReturn(List.of(vote));
        when(contentRepository.findAllById(anyCollection())).thenReturn(List.of(content));
        when(commentRepository.countByContentIdAndDeletedFalse(content.getIdContent())).thenReturn(2L);

        VoteBatchResponse response = contentService.batchVotes(List.of(content.getIdContent()), author);

        assertEquals(1, response.items().size());
        assertEquals(VoteDirection.UP, response.items().getFirst().userVote());
        assertEquals(2, response.items().getFirst().commentCount());
    }

    @Test
    void deleteContentRemovesVotesAndComments() {
        when(contentRepository.findById(content.getIdContent())).thenReturn(Optional.of(content));

        contentService.deleteContent(content.getIdContent(), author);

        verify(commentRepository).deleteByContentId(content.getIdContent());
        verify(voteRepository).deleteByContentId(content.getIdContent());
        verify(contentRepository).deleteById(content.getIdContent());
        verify(seoRefreshService).requestRefresh("content-deleted");
    }

    @Test
    void analyticsBuildsWeeklyLeaderboardFromUpVotesReceived() {
        ContentVote vote = new ContentVote();
        vote.setContentId(content.getIdContent());
        vote.setVote(VoteDirection.UP);
        vote.setCreatedAt(LocalDateTime.now());

        when(contentRepository.findTop10ByOrderByViewCountDesc()).thenReturn(List.of(content));
        when(contentRepository.findTop10ByOrderByUpCountDesc()).thenReturn(List.of(content));
        when(voteRepository.findByVoteAndCreatedAtGreaterThanEqual(eq(VoteDirection.UP), any(LocalDateTime.class))).thenReturn(List.of(vote));
        when(contentRepository.findAllById(anyCollection())).thenReturn(List.of(content));
        when(userRepository.findByUserIDIn(anyCollection())).thenReturn(List.of(author));

        AnalyticsResponse response = contentService.getAnalytics(null);

        assertEquals(1, response.mostRead().size());
        assertEquals(1, response.weeklyLeaderboard().size());
        assertEquals(author.getUserID(), response.weeklyLeaderboard().getFirst().user().userID());
    }

    @Test
    void categoriesUseShortLivedServiceCache() {
        when(contentRepository.findCategoryFields()).thenReturn(List.of(content));

        List<String> first = contentService.findCategories();
        List<String> second = contentService.findCategories();

        assertEquals(first, second);
        verify(contentRepository, times(1)).findCategoryFields();
    }

    @Test
    void analyticsUseShortLivedServiceCacheForHeavySnapshot() {
        when(contentRepository.findTop10ByOrderByViewCountDesc()).thenReturn(List.of(content));
        when(contentRepository.findTop10ByOrderByUpCountDesc()).thenReturn(List.of(content));
        when(voteRepository.findByVoteAndCreatedAtGreaterThanEqual(eq(VoteDirection.UP), any(LocalDateTime.class))).thenReturn(List.of());
        when(contentRepository.findAllById(anyCollection())).thenReturn(List.of());
        when(userRepository.findByUserIDIn(anyCollection())).thenReturn(List.of());

        contentService.getAnalytics(null);
        contentService.getAnalytics(null);

        verify(contentRepository, times(1)).findTop10ByOrderByViewCountDesc();
        verify(contentRepository, times(1)).findTop10ByOrderByUpCountDesc();
        verify(voteRepository, times(1)).findByVoteAndCreatedAtGreaterThanEqual(eq(VoteDirection.UP), any(LocalDateTime.class));
    }
}
