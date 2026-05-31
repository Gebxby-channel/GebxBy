package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.ProfileCardRequest;
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
    void cardsForUserAlwaysIncludesDefaultCards() {
        when(userCardRepository.findByUserIdOrderByGrantedAtDesc(target.getUserID())).thenReturn(List.of());

        List<ProfileCardResponse> cards = profileCardService.cardsForUser(target);

        assertEquals(2, cards.size());
        assertEquals(ProfileCardServiceImpl.DEFAULT_STARS, cards.getFirst().id());
    }
}
