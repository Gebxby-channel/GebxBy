package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.dto.CurrentUserResponse;
import gebxby.gebxbyblog.dto.ProfileCardResponse;
import gebxby.gebxbyblog.dto.ProfileCardSelectionRequest;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.service.ForumMapper;
import gebxby.gebxbyblog.service.ProfileCardService;
import gebxby.gebxbyblog.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/profile-cards")
public class ProfileCardController {
    private final ProfileCardService profileCardService;
    private final UserService userService;
    private final ForumMapper mapper;

    public ProfileCardController(ProfileCardService profileCardService, UserService userService, ForumMapper mapper) {
        this.profileCardService = profileCardService;
        this.userService = userService;
        this.mapper = mapper;
    }

    @GetMapping("/mine")
    public ResponseEntity<List<ProfileCardResponse>> mine(@AuthenticationPrincipal OAuth2User principal) {
        User user = userService.getCurrentUser(principal);
        return ResponseEntity.ok(profileCardService.cardsForUser(user));
    }

    @PutMapping("/active")
    public ResponseEntity<CurrentUserResponse> setActive(
            @RequestBody ProfileCardSelectionRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        User user = userService.getCurrentUser(principal);
        return ResponseEntity.ok(mapper.toCurrentUser(profileCardService.setActiveCard(request == null ? null : request.cardId(), user)));
    }
}
