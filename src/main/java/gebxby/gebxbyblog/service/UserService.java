package gebxby.gebxbyblog.service;
import gebxby.gebxbyblog.model.User;

public interface UserService {
    User updateProfile(String email, String name, String designation);
}

