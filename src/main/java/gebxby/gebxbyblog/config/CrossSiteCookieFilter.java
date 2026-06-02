package gebxby.gebxbyblog.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;

@Component
public class CrossSiteCookieFilter extends OncePerRequestFilter {
    private static final String XSRF_COOKIE_PREFIX = "XSRF-TOKEN=";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        filterChain.doFilter(request, response);
        normalizeCrossSiteCookies(response);
    }

    private void normalizeCrossSiteCookies(HttpServletResponse response) {
        Collection<String> cookies = response.getHeaders(HttpHeaders.SET_COOKIE);
        if (cookies.isEmpty()) {
            return;
        }

        List<String> updatedCookies = new ArrayList<>(cookies.size());
        boolean changed = false;
        for (String cookie : cookies) {
            String updated = normalizeXsrfCookie(cookie);
            updatedCookies.add(updated);
            changed = changed || !updated.equals(cookie);
        }

        if (!changed) {
            return;
        }

        response.setHeader(HttpHeaders.SET_COOKIE, updatedCookies.getFirst());
        for (int index = 1; index < updatedCookies.size(); index++) {
            response.addHeader(HttpHeaders.SET_COOKIE, updatedCookies.get(index));
        }
    }

    private String normalizeXsrfCookie(String cookie) {
        if (cookie == null || !cookie.startsWith(XSRF_COOKIE_PREFIX)) {
            return cookie;
        }

        String updated = cookie;
        String lower = cookie.toLowerCase(Locale.ROOT);
        if (!lower.contains("secure")) {
            updated += "; Secure";
        }
        if (!lower.contains("samesite=")) {
            updated += "; SameSite=None";
        }
        return updated;
    }
}
