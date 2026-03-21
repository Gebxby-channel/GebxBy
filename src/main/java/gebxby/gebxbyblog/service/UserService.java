package gebxby.gebxbyblog.service;
import gebxby.gebxbyblog.model.User;
import org.springframework.security.oauth2.core.user.OAuth2User;

public interface UserService {
    User updateProfile(String email, String name, String designation);
    public User processUserLogin(OAuth2User principal);
}

