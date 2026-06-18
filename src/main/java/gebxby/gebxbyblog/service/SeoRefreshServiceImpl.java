package gebxby.gebxbyblog.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
public class SeoRefreshServiceImpl implements SeoRefreshService {
    private static final Logger log = LoggerFactory.getLogger(SeoRefreshServiceImpl.class);

    private final HttpClient httpClient;
    private final URI rebuildHookUri;

    public SeoRefreshServiceImpl(@Value("${app.seo.rebuild-hook-url:}") String rebuildHookUrl) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        this.rebuildHookUri = parseRebuildHookUrl(rebuildHookUrl);
    }

    @Override
    public void requestRefresh(String reason) {
        if (rebuildHookUri == null) {
            return;
        }

        HttpRequest request = HttpRequest.newBuilder(rebuildHookUri)
                .timeout(Duration.ofSeconds(10))
                .header("User-Agent", "GebxByBlog-SEO-Refresh")
                .POST(HttpRequest.BodyPublishers.noBody())
                .build();

        httpClient.sendAsync(request, HttpResponse.BodyHandlers.discarding())
                .thenAccept(response -> {
                    int statusCode = response.statusCode();
                    if (statusCode < 200 || statusCode >= 300) {
                        log.warn("SEO rebuild hook returned HTTP {} for reason {}", statusCode, reason);
                        return;
                    }
                    log.info("SEO rebuild hook accepted for reason {}", reason);
                })
                .exceptionally(error -> {
                    log.warn("SEO rebuild hook failed for reason {}. Content change remains successful.", reason, error);
                    return null;
                });
    }

    private URI parseRebuildHookUrl(String rebuildHookUrl) {
        if (!StringUtils.hasText(rebuildHookUrl)) {
            return null;
        }
        try {
            return URI.create(rebuildHookUrl.trim());
        } catch (IllegalArgumentException error) {
            log.warn("Ignoring invalid SEO rebuild hook URL.", error);
            return null;
        }
    }
}
