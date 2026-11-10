package gebxby.gebxbyblog.config;

import gebxby.gebxbyblog.service.UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class GoogleLoginSuccessHandler implements AuthenticationSuccessHandler {
    private final UserService userService;
    private final String frontendUrl;

    public GoogleLoginSuccessHandler(UserService userService,
                                     @Value("${app.frontend-url}") String frontendUrl) {
        this.userService = userService;
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        try {
            OAuth2User principal = (OAuth2User) authentication.getPrincipal();
            userService.processUserLogin(principal);
            response.sendRedirect(frontendUrl + "/");
        } catch (RuntimeException exception) {
            SecurityContextHolder.clearContext();
            if (request.getSession(false) != null) {
                request.getSession(false).removeAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
            }
            response.sendRedirect(frontendUrl + "/login?error=google");
        }
    }
}
