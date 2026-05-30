package gebxby.gebxbyblog.controller;

import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class SecurityController {
    @GetMapping("/api/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        if (token == null) {
            return Map.of(
                    "parameterName", "_csrf",
                    "headerName", "X-CSRF-TOKEN",
                    "token", "csrf-disabled"
            );
        }
        return Map.of(
                "parameterName", token.getParameterName(),
                "headerName", token.getHeaderName(),
                "token", token.getToken()
        );
    }
}
