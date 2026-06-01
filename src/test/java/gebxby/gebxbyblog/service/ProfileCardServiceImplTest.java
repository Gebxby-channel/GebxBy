package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.ProfileCardCustomizeRequest;
import gebxby.gebxbyblog.dto.ProfileCardResponse;
import gebxby.gebxbyblog.model.ProfileCardTemplate;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.model.UserProfileCard;
import gebxby.gebxbyblog.repository.CommentRepository;
import gebxby.gebxbyblog.repository.ContentRepository;
import gebxby.gebxbyblog.repository.ProfileCardTemplateRepository;
import gebxby.gebxbyblog.repository.UserProfileCardRepository;
import gebxby.gebxbyblog.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProfileCardServiceImplTest {
    @Mock
    private ProfileCardTemplateRepository templateRepository;
    @Mock
    private UserProfileCardRepository userCardRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ContentRepository contentRepository;
    @Mock
    private CommentRepository commentRepository;
    @Mock
    private UserService userService;

    private ProfileCardServiceImpl profileCardService;
    private User admin;
    private User target;

    @BeforeEach
    void setUp() {
        profileCardService = new ProfileCardServiceImpl(
                templateRepository,
                userCardRepository,
                userRepository,
                contentRepository,
                commentRepository,
                userService
        );
        admin = new User();
        admin.setUserID(UUID.randomUUID());
        admin.setRole("ADMIN");
        target = new User();
        target.setUserID(UUID.randomUUID());
    }

    @Test
    void grantCardCopiesTemplateIntoUserSnapshot() {
        ProfileCardTemplate template = new ProfileCardTemplate();
        template.setId(UUID.randomUUID());
        template.setName("Lab Card");
        template.setDescription("Gift");
        template.setBackgroundImage("data:image/webp;base64,aaaa");
        template.setOrientation("VERTICAL");
        when(userService.isAdmin(admin)).thenReturn(true);
        when(templateRepository.findById(template.getId())).thenReturn(Optional.of(template));
        when(userService.getUserById(target.getUserID())).thenReturn(target);
        when(userCardRepository.save(any(UserProfileCard.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProfileCardResponse response = profileCardService.grantCard(template.getId(), target.getUserID(), admin);
        template.setName("Edited Later");

        assertEquals("Lab Card", response.name());
        assertNotEquals(template.getName(), response.name());
        assertEquals(template.getId(), response.sourceTemplateId());
    }

    @Test
    void setActiveRejectsCardsNotOwnedByUser() {
        UUID cardId = UUID.randomUUID();
        when(userCardRepository.findById(cardId)).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> profileCardService.setActiveCard(cardId.toString(), target));
    }

    @Test
    void cardsForUserAlwaysIncludesDefaultCard() {
        when(userCardRepository.findByUserIdOrderByGrantedAtDesc(target.getUserID())).thenReturn(List.of());

        List<ProfileCardResponse> cards = profileCardService.cardsForUser(target);

        assertEquals(1, cards.size());
        assertEquals(ProfileCardServiceImpl.DEFAULT_STARS, cards.getFirst().id());
    }

    @Test
    void customizeUserCardUpdatesOwnedSnapshotOnly() {
        UUID cardId = UUID.randomUUID();
        UserProfileCard card = new UserProfileCard();
        card.setId(cardId);
        card.setUserId(target.getUserID());
        card.setName("FBI Card");
        card.setBackgroundImage("data:image/webp;base64,aaaa");
        when(userCardRepository.findById(cardId)).thenReturn(Optional.of(card));
        when(userCardRepository.save(any(UserProfileCard.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProfileCardResponse response = profileCardService.customizeUserCard(
                cardId,
                new ProfileCardCustomizeRequest("Jackline", "data:image/webp;base64,bbbb"),
                target
        );

        assertEquals("Jackline", response.displayName());
        assertEquals("data:image/webp;base64,bbbb", response.displayPhoto());
        verify(userCardRepository).save(card);
    }

    @Test
    void deleteUserCardFallsBackToStarsWhenActive() {
        UUID cardId = UUID.randomUUID();
        UserProfileCard card = new UserProfileCard();
        card.setId(cardId);
        card.setUserId(target.getUserID());
        target.setActiveProfileCardId(cardId.toString());
        when(userCardRepository.findById(cardId)).thenReturn(Optional.of(card));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User response = profileCardService.deleteUserCard(cardId, target);

        assertEquals(ProfileCardServiceImpl.DEFAULT_STARS, response.getActiveProfileCardId());
        verify(userCardRepository).delete(card);
        verify(userRepository).save(target);
    }
}
