package gebxby.gebxbyblog.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.util.PatternMatchUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class ApiOriginFilter extends OncePerRequestFilter {
    private final Set<String> allowedOrigins;

    public ApiOriginFilter(@Value("${app.allowed-origins}") String allowedOrigins) {
        this.allowedOrigins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String origin = browserOrigin(request);
        if (origin != null && !origin.isBlank() && isAllowedOrigin(origin)) {
            applyCorsHeaders(response, origin);
        }

        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            if (origin != null && !origin.isBlank() && !isAllowedOrigin(origin)) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "Origin is not allowed");
                return;
            }
            filterChain.doFilter(request, response);
            return;
        }

        if (isUnsafeApiMutation(request) && isDisallowedBrowserOrigin(origin)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Origin is not allowed");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean isUnsafeApiMutation(HttpServletRequest request) {
        String method = request.getMethod();
        String uri = request.getRequestURI();
        boolean unsafe = "POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method) || "DELETE".equals(method);
        boolean api = uri.startsWith("/content/") || uri.startsWith("/api/") || uri.equals("/logout");
        return unsafe && api;
    }

    private String browserOrigin(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        if (origin == null || origin.isBlank()) {
            origin = originFromReferer(request.getHeader("Referer"));
        }
        return origin;
    }

    private boolean isDisallowedBrowserOrigin(String origin) {
        return origin != null && !origin.isBlank() && !isAllowedOrigin(origin);
    }

    private boolean isAllowedOrigin(String origin) {
        return allowedOrigins.stream()
                .anyMatch(allowed -> allowed.equals(origin) || PatternMatchUtils.simpleMatch(allowed, origin));
    }

    private void applyCorsHeaders(HttpServletResponse response, String origin) {
        response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, origin);
        response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true");
        response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, "GET,POST,PUT,PATCH,DELETE,OPTIONS");
        response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS,
                "Content-Type,Authorization,X-Requested-With,Accept,X-CSRF-TOKEN,X-XSRF-TOKEN");
        response.setHeader(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, "X-CSRF-TOKEN,X-XSRF-TOKEN");
        response.addHeader(HttpHeaders.VARY, "Origin");
    }

    private String originFromReferer(String referer) {
        if (referer == null || referer.isBlank()) {
            return null;
        }
        try {
            URI uri = URI.create(referer);
            int port = uri.getPort();
            String portPart = port == -1 ? "" : ":" + port;
            return uri.getScheme() + "://" + uri.getHost() + portPart;
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }
}
