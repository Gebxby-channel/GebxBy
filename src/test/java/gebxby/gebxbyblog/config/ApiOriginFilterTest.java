package gebxby.gebxbyblog.config;

import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ApiOriginFilterTest {
    @Test
    void allowsWildcardVercelOriginForUnsafeApiMutation() throws ServletException, IOException {
        ApiOriginFilter filter = new ApiOriginFilter("http://localhost:5173,https://*.vercel.app");
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/email-login");
        request.addHeader("Origin", "https://gebxby.vercel.app");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
        assertEquals("https://gebxby.vercel.app", response.getHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
        assertEquals("true", response.getHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS));
        assertEquals(
                "Content-Type,Authorization,X-Requested-With,Accept,X-CSRF-TOKEN,X-XSRF-TOKEN,X-Guest-Reader-Key",
                response.getHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS)
        );
    }

    @Test
    void rejectsUnknownOriginForUnsafeApiMutation() throws ServletException, IOException {
        ApiOriginFilter filter = new ApiOriginFilter("http://localhost:5173,https://*.vercel.app");
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/email-login");
        request.addHeader("Origin", "https://not-allowed.example");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(403, response.getStatus());
    }

    @Test
    void keepsCorsHeadersWhenAllowedOriginRequestFailsDownstream() throws ServletException, IOException {
        ApiOriginFilter filter = new ApiOriginFilter("http://localhost:5173,https://*.vercel.app");
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/content/upload");
        request.addHeader("Origin", "https://gebxby.vercel.app");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (servletRequest, servletResponse) ->
                ((MockHttpServletResponse) servletResponse).sendError(500));

        assertEquals(500, response.getStatus());
        assertEquals("https://gebxby.vercel.app", response.getHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
        assertEquals("true", response.getHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS));
    }
}
