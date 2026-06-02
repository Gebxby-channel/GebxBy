package gebxby.gebxbyblog.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.util.StringUtils;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

public class LegacyMongoUriEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {
    private static final String PROPERTY_SOURCE_NAME = "legacyMongoUri";
    private static final String DEFAULT_CLUSTER_HOST = "cluster00.wey8cvq.mongodb.net";
    private static final String DEFAULT_DATABASE = "blog_db";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String database = resolveDatabase(environment);
        if (StringUtils.hasText(environment.getProperty("MONGODB_URI"))) {
            environment.getPropertySources().addFirst(new MapPropertySource(
                    PROPERTY_SOURCE_NAME,
                    Map.of("spring.data.mongodb.uri", withDatabase(environment.getProperty("MONGODB_URI"), database))
            ));
            return;
        }

        String username = firstText(
                environment.getProperty("MONGODB_USERNAME"),
                environment.getProperty("MONGO_USERNAME"),
                environment.getProperty("uName_DB"),
                environment.getProperty("UNAME_DB")
        );
        String password = firstText(
                environment.getProperty("MONGODB_PASSWORD"),
                environment.getProperty("MONGO_PASSWORD"),
                environment.getProperty("pw_DB"),
                environment.getProperty("PW_DB")
        );
        if (!StringUtils.hasText(username) || !StringUtils.hasText(password)) {
            return;
        }

        String clusterHost = normalizeClusterHost(firstText(
                environment.getProperty("MONGODB_CLUSTER_HOST"),
                environment.getProperty("MONGO_CLUSTER_HOST"),
                environment.getProperty("ATLAS_CLUSTER_HOST"),
                DEFAULT_CLUSTER_HOST
        ));

        String uri = "mongodb+srv://%s:%s@%s/%s?retryWrites=true&w=majority"
                .formatted(encodeUriPart(username), encodeUriPart(password), clusterHost, encodeUriPart(database));
        environment.getPropertySources().addFirst(new MapPropertySource(
                PROPERTY_SOURCE_NAME,
                Map.of("spring.data.mongodb.uri", uri)
        ));
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    private String firstText(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return null;
    }

    private String normalizeClusterHost(String host) {
        String normalized = host.trim()
                .replaceFirst("^mongodb\\+srv://", "")
                .replaceFirst("^mongodb://", "")
                .replaceFirst("^https?://", "");
        int at = normalized.lastIndexOf('@');
        if (at >= 0) {
            normalized = normalized.substring(at + 1);
        }
        int slash = normalized.indexOf('/');
        if (slash >= 0) {
            normalized = normalized.substring(0, slash);
        }
        return normalized;
    }

    private String resolveDatabase(ConfigurableEnvironment environment) {
        return firstText(
                environment.getProperty("MONGODB_DATABASE"),
                environment.getProperty("MONGO_DATABASE"),
                environment.getProperty("DB_NAME"),
                environment.getProperty("DATABASE_NAME"),
                environment.getProperty("MONGODB_DB"),
                environment.getProperty("MONGO_DB"),
                DEFAULT_DATABASE
        );
    }

    private String withDatabase(String uri, String database) {
        String trimmed = uri.trim();
        int queryStart = trimmed.indexOf('?');
        String base = queryStart >= 0 ? trimmed.substring(0, queryStart) : trimmed;
        String query = queryStart >= 0 ? trimmed.substring(queryStart) : "";
        int schemeEnd = base.indexOf("://");
        if (schemeEnd < 0) {
            return trimmed;
        }
        int authorityStart = schemeEnd + 3;
        int pathStart = base.indexOf('/', authorityStart);
        String encodedDatabase = encodeUriPart(firstText(database, DEFAULT_DATABASE));
        if (pathStart < 0) {
            return base + "/" + encodedDatabase + query;
        }
        return base.substring(0, pathStart + 1) + encodedDatabase + query;
    }

    private String encodeUriPart(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
