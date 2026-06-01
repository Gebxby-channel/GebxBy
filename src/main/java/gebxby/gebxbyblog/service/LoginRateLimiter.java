package gebxby.gebxbyblog.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class LoginRateLimiter {
    private static final int MAX_ATTEMPTS = 8;
    private static final Duration WINDOW = Duration.ofMinutes(15);

    private final ConcurrentMap<String, AttemptBucket> buckets = new ConcurrentHashMap<>();

    public void check(String email, String remoteAddress) {
        String key = key(email, remoteAddress);
        AttemptBucket bucket = buckets.compute(key, (ignored, current) -> {
            Instant now = Instant.now();
            if (current == null || current.windowStartedAt.plus(WINDOW).isBefore(now)) {
                return new AttemptBucket(now, 1);
            }
            return new AttemptBucket(current.windowStartedAt, current.attempts + 1);
        });
        if (bucket != null && bucket.attempts > MAX_ATTEMPTS) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Terlalu banyak percobaan login. Tunggu beberapa menit lalu coba lagi."
            );
        }
    }

    public void reset(String email, String remoteAddress) {
        buckets.remove(key(email, remoteAddress));
    }

    private String key(String email, String remoteAddress) {
        String cleanEmail = StringUtils.hasText(email) ? email.trim().toLowerCase(Locale.ROOT) : "unknown";
        String cleanAddress = StringUtils.hasText(remoteAddress) ? remoteAddress.trim() : "unknown";
        return cleanEmail + "|" + cleanAddress;
    }

    private record AttemptBucket(Instant windowStartedAt, int attempts) {
    }
}
