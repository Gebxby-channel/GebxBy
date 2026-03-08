package gebxby.gebxbyblog.controller;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;


@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
@RestController
public class UserController {

    @GetMapping("/")
    public void tangkapYangNyasar(HttpServletResponse response) throws IOException {
        response.sendRedirect("http://localhost:5173/");
    }

    // Menggunakan OAuth2User agar lebih sakti menangkap balasan Google
    @GetMapping("/api/user/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal OAuth2User user) {
        if (user == null) {
            return ResponseEntity.status(401).body("Not Authenticated");
        }

        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("name", user.getAttribute("name"));
        userInfo.put("email", user.getAttribute("email"));

        // Ambil foto langsung dari atribut mentah Google
        String picture = user.getAttribute("picture");
        userInfo.put("picture", picture);

        return ResponseEntity.ok(userInfo);
    }
}