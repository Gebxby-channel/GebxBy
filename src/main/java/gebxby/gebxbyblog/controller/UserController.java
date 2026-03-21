package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.service.UserService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;


@CrossOrigin(origins = "https://gebxby.vercel.app", allowCredentials = "true")
@RestController
public class UserController {
    @Autowired
    private UserService userService;

    @PutMapping("/api/user/update")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> updates,
                                           @AuthenticationPrincipal OAuth2User principal) {
        if (principal == null) return ResponseEntity.status(401).body("Unauthorized");

        String email = principal.getAttribute("email");
        String newName = updates.get("name");
        String newDesignation = updates.get("designation");

        gebxby.gebxbyblog.model.User updatedUser = userService.updateProfile(email, newName, newDesignation);
        return ResponseEntity.ok(updatedUser);
    }
    @GetMapping("/")
    public void tangkapYangNyasar(HttpServletResponse response) throws IOException {
        response.sendRedirect("https://gebxby.vercel.app/");
    }

    // Menggunakan OAuth2User agar lebih sakti menangkap balasan Google
    @GetMapping("/api/user/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal OAuth2User principal) {
        if (principal == null) return ResponseEntity.status(401).body("Not Authenticated");

        String googleId = principal.getAttribute("sub"); // ID asli Google

        // CARI USER DI DB (Pakai logika Hybrid yang kita bahas tadi)
        User dbUser = userService.processUserLogin(principal);

        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("name", dbUser.getName());
        userInfo.put("email", dbUser.getEmail());
        userInfo.put("picture", dbUser.getPhoto());

        // PENTING: Kirim userID yang berupa UUID hasil generate Database
        // Bukan lagi 'sub' dari Google!
        userInfo.put("userID", dbUser.getUserID().toString());
        userInfo.put("designation", dbUser.getDesignation());

        return ResponseEntity.ok(userInfo);
    }
}