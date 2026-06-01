package gebxby.gebxbyblog.service;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class LoginRateLimiterTest {
    @Test
    void blocksAfterTooManyAttemptsAndAllowsReset() {
        LoginRateLimiter limiter = new LoginRateLimiter();

        for (int index = 0; index < 8; index++) {
            limiter.check("user@example.com", "127.0.0.1");
        }

        assertThrows(ResponseStatusException.class, () -> limiter.check("user@example.com", "127.0.0.1"));

        limiter.reset("user@example.com", "127.0.0.1");
        assertDoesNotThrow(() -> limiter.check("user@example.com", "127.0.0.1"));
    }
}
