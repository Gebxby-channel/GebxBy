package gebxby.gebxbyblog.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

import java.util.function.Supplier;

final class SpaCsrfTokenRequestHandler extends CsrfTokenRequestAttributeHandler {
    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, Supplier<CsrfToken> csrfToken) {
        super.handle(request, response, csrfToken);
        csrfToken.get();
    }
}
