package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.BadgeResponse;
import gebxby.gebxbyblog.dto.SearchResponse;
import gebxby.gebxbyblog.model.BadgeCode;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.ContentRepository;
import gebxby.gebxbyblog.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SearchServiceImplTest {
    @Mock
    private UserRepository userRepository;
    @Mock
    private ContentRepository contentRepository;
    @Mock
    private BadgeService badgeService;

    private SearchServiceImpl searchService;
    private User user;
    private Content content;

    @BeforeEach
    void setUp() {
        searchService = new SearchServiceImpl(
                userRepository,
                contentRepository,
                badgeService,
                new ForumMapper(badgeService)
        );

        user = new User();
        user.setUserID(UUID.randomUUID());
        user.setName("Jill Valentine");
        user.setDesignation("Moderator");

        content = new Content();
        content.setIdContent(UUID.randomUUID());
        content.setHead("Resident Evil Archive");
        content.setKategori("Lore");
        content.setUser(user);
        content.setCreatedAt(LocalDateTime.now());
        content.setUpCount(12);
    }

    @Test
    void searchReturnsUsersContentsAndBadges() {
        BadgeResponse moderator = new BadgeResponse(
                BadgeCode.MODERATOR,
                "Moderator",
                "Bisa suspend user selama 1 jam dan melapor ke admin.",
                "crown",
                false
        );
        when(userRepository.searchPublicUsers(anyString(), any(Pageable.class))).thenReturn(List.of(user));
        when(contentRepository.searchByHeadline(anyString(), any(Pageable.class))).thenReturn(List.of(content));
        when(badgeService.definitions()).thenReturn(List.of(moderator));
        when(userRepository.findByManualBadges(eq(BadgeCode.MODERATOR), any(Pageable.class))).thenReturn(List.of(user));
        when(badgeService.effectiveBadges(any(User.class))).thenReturn(List.of(moderator));

        SearchResponse response = searchService.search("mod", "all", 5);

        assertEquals("mod", response.query());
        assertEquals("Jill Valentine", response.users().getFirst().name());
        assertEquals("Resident Evil Archive", response.contents().getFirst().head());
        assertEquals(BadgeCode.MODERATOR, response.badges().getFirst().code());
        assertEquals("Jill Valentine", response.badges().getFirst().users().getFirst().name());
    }

    @Test
    void shortQueryReturnsEmptyResultWithoutRepositorySearch() {
        SearchResponse response = searchService.search("j", "all", 5);

        assertTrue(response.users().isEmpty());
        assertTrue(response.contents().isEmpty());
        assertTrue(response.badges().isEmpty());
        verify(userRepository, never()).searchPublicUsers(anyString(), any(Pageable.class));
        verify(contentRepository, never()).searchByHeadline(anyString(), any(Pageable.class));
    }

    @Test
    void typeCanLimitSearchScope() {
        when(contentRepository.searchByHeadline(anyString(), any(Pageable.class))).thenReturn(List.of(content));

        SearchResponse response = searchService.search("resident", "contents", 5);

        assertTrue(response.users().isEmpty());
        assertEquals(1, response.contents().size());
        assertTrue(response.badges().isEmpty());
        verify(userRepository, never()).searchPublicUsers(anyString(), any(Pageable.class));
        verify(badgeService, never()).definitions();
    }
}
