package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.ProfileCardRequest;
import gebxby.gebxbyblog.dto.ProfileCardResponse;
import gebxby.gebxbyblog.dto.ProfileCardCustomizeRequest;
import gebxby.gebxbyblog.model.User;

import java.util.List;
import java.util.UUID;

public interface ProfileCardService {
    List<ProfileCardResponse> findTemplates(User admin);
    ProfileCardResponse createTemplate(ProfileCardRequest request, User admin);
    ProfileCardResponse updateTemplate(UUID templateId, ProfileCardRequest request, User admin);
    void deleteTemplate(UUID templateId, User admin);
    ProfileCardResponse grantCard(UUID templateId, UUID userId, User admin);
    List<ProfileCardResponse> cardsForUser(User user);
    ProfileCardResponse activeCard(User user);
    User setActiveCard(String cardId, User user);
    ProfileCardResponse customizeUserCard(UUID cardId, ProfileCardCustomizeRequest request, User user);
    User deleteUserCard(UUID cardId, User user);
}
