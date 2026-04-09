package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.UserRepository;
import gebxby.gebxbyblog.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.core.user.OAuth2User;
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
    @Override
    public User processUserLogin(OAuth2User principal) {
        String sub = principal.getAttribute("sub"); // ID dari Google
        String email = principal.getAttribute("email");
        String name = principal.getAttribute("name");
        String picture = principal.getAttribute("picture");

        // 1. Cek apakah user dengan Google ID ini sudah ada?
        return userRepository.findByGoogleId(sub).orElseGet(() -> {
            // 2. Kalau belum ada, buat user baru dengan UUID profesional
            User newUser = new User();
            newUser.setUserID(UUID.randomUUID()); // Generate UUID Internal
            newUser.setGoogleId(sub);            // Simpan mapping ke Google ID
            newUser.setEmail(email);
            newUser.setName(name);
            newUser.setPhoto(picture);
            newUser.setDesignation("RECONNAISSANCE OFFICER");

            return userRepository.save(newUser);
        });
    }
    @Override
    public User createUser(User user) {
        // Generate UUID jika belum ada
        if (user.getUserID() == null) {
            user.setUserID(UUID.randomUUID());
        }
        // Beri nilai default jika kosong
        if (user.getDesignation() == null) {
            user.setDesignation("RECONNAISSANCE OFFICER");
        }
        return userRepository.save(user);
    }

    @Override
    public User getUserById(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User tidak ditemukan"));
    }
}