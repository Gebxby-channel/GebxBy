package gebxby.gebxbyblog.realtime;

import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.service.UserService;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

@Component
public class AuthenticatedUserHandshakeInterceptor implements HandshakeInterceptor {
    public static final String USER_ID_ATTRIBUTE = "userId";

    private final UserService userService;

    public AuthenticatedUserHandshakeInterceptor(UserService userService) {
        this.userService = userService;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request,
                                   ServerHttpResponse response,
                                   WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) {
        if (!(request.getPrincipal() instanceof Authentication authentication)
                || !(authentication.getPrincipal() instanceof OAuth2User principal)) {
            return false;
        }
        User user = userService.getCurrentUser(principal);
        userService.ensureActive(user);
        attributes.put(USER_ID_ATTRIBUTE, user.getUserID());
        return user.getUserID() != null;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request,
                               ServerHttpResponse response,
                               WebSocketHandler wsHandler,
                               Exception exception) {
        // No cleanup required. Sessions are managed by RealtimeSessionRegistry.
    }
}
