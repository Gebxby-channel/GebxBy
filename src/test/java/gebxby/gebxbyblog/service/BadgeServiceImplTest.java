package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.BadgeResponse;
import gebxby.gebxbyblog.model.BadgeCode;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.ContentRepository;
import gebxby.gebxbyblog.repository.ContentVoteRepository;
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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BadgeServiceImplTest {
    @Mock
    private UserRepository userRepository;
    @Mock
    private ContentVoteRepository voteRepository;
    @Mock
    private ContentRepository contentRepository;

    private BadgeServiceImpl badgeService;
    private User admin;
    private User target;

    @BeforeEach
    void setUp() {
        badgeService = new BadgeServiceImpl(userRepository, voteRepository, contentRepository);
        admin = new User();
        admin.setUserID(UUID.randomUUID());
        admin.setRole("ADMIN");
        target = new User();
        target.setUserID(UUID.randomUUID());
    }

    @Test
    void effectiveBadgesAddsAutomaticAdminAndSurvivor() {
        when(voteRepository.findByVoteAndCreatedAtGreaterThanEqual(any(), any())).thenReturn(List.of());
        List<BadgeResponse> badges = badgeService.effectiveBadges(admin);

        assertTrue(badges.stream().anyMatch(badge -> badge.code() == BadgeCode.ADMIN));
        assertTrue(badges.stream().anyMatch(badge -> badge.code() == BadgeCode.SURVIVOR));
    }

    @Test
    void adminCanGrantManualBadgeButNotAutomaticAdminBadge() {
        when(userRepository.findById(target.getUserID())).thenReturn(Optional.of(target));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User updated = badgeService.grantBadge(target.getUserID(), BadgeCode.MODERATOR, admin);

        assertTrue(updated.getManualBadges().contains(BadgeCode.MODERATOR));
        verify(userRepository).save(target);
        assertThrows(ResponseStatusException.class, () ->
                badgeService.grantBadge(target.getUserID(), BadgeCode.ADMIN, admin)
        );
    }

    @Test
    void revokeCriminalBadgeAlsoClearsCriminalMark() {
        target.getManualBadges().add(BadgeCode.CRIMINAL);
        target.setCriminalMarked(true);
        when(userRepository.findById(target.getUserID())).thenReturn(Optional.of(target));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User updated = badgeService.revokeBadge(target.getUserID(), BadgeCode.CRIMINAL, admin);

        assertFalse(updated.isCriminalMarked());
    }
}
