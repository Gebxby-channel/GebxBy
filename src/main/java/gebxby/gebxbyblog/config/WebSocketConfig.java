package gebxby.gebxbyblog.config;

import gebxby.gebxbyblog.realtime.AuthenticatedUserHandshakeInterceptor;
import gebxby.gebxbyblog.realtime.RealtimeWebSocketHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.Arrays;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private final RealtimeWebSocketHandler realtimeWebSocketHandler;
    private final AuthenticatedUserHandshakeInterceptor authenticatedUserHandshakeInterceptor;
    private final String[] allowedOrigins;

    public WebSocketConfig(RealtimeWebSocketHandler realtimeWebSocketHandler,
                           AuthenticatedUserHandshakeInterceptor authenticatedUserHandshakeInterceptor,
                           @Value("${app.allowed-origins}") String allowedOrigins) {
        this.realtimeWebSocketHandler = realtimeWebSocketHandler;
        this.authenticatedUserHandshakeInterceptor = authenticatedUserHandshakeInterceptor;
        this.allowedOrigins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .toArray(String[]::new);
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(realtimeWebSocketHandler, "/ws/realtime")
                .addInterceptors(authenticatedUserHandshakeInterceptor)
                .setAllowedOriginPatterns(allowedOrigins);
    }
}
