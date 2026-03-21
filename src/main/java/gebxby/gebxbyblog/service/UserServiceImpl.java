package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.UserRepository;
import gebxby.gebxbyblog.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
public class UserServiceImpl implements UserService {
    @Autowired
    private UserRepository userRepository;

    @Override
    public User updateProfile(String email, String name, String designation) {
        // Cari user berdasarkan email, kalau gak ada buat baru
        User user = userRepository.findByEmail(email).orElse(new User());

        if (user.getUserID() == null) {
            user.setUserID(UUID.randomUUID());
        }

        user.setEmail(email);
        user.setName(name);
        user.setDesignation(designation);

        return userRepository.save(user);
    }
}