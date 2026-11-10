package gebxby.gebxbyblog.config;

import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.service.LoginVerificationService;
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
public class GoogleLoginVerificationSuccessHandler implements AuthenticationSuccessHandler {
    private final UserService userService;
    private final LoginVerificationService verificationService;
    private final String frontendUrl;

    public GoogleLoginVerificationSuccessHandler(UserService userService,
                                                LoginVerificationService verificationService,
                                                @Value("${app.frontend-url}") String frontendUrl) {
        this.userService = userService;
        this.verificationService = verificationService;
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        try {
            OAuth2User principal = (OAuth2User) authentication.getPrincipal();
            User user = userService.processUserLogin(principal);
            verificationService.start(user, request);
            SecurityContextHolder.clearContext();
            if (request.getSession(false) != null) {
                request.getSession(false).removeAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
            }
            response.sendRedirect(frontendUrl + "/login?verify=1");
        } catch (RuntimeException exception) {
            SecurityContextHolder.clearContext();
            if (request.getSession(false) != null) {
                verificationService.clear(request.getSession(false));
                request.getSession(false).removeAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
            }
            response.sendRedirect(frontendUrl + "/login?verification=unavailable");
        }
    }
}
