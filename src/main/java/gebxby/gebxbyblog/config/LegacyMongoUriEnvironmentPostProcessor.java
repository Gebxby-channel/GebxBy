package gebxby.gebxbyblog.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.util.StringUtils;

import java.util.Map;

public class LegacyMongoUriEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {
    private static final String PROPERTY_SOURCE_NAME = "legacyMongoUri";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        if (StringUtils.hasText(environment.getProperty("MONGODB_URI"))) {
            return;
        }

        String username = firstText(environment.getProperty("uName_DB"), environment.getProperty("UNAME_DB"));
        String password = firstText(environment.getProperty("pw_DB"), environment.getProperty("PW_DB"));
        if (!StringUtils.hasText(username) || !StringUtils.hasText(password)) {
            return;
        }

        String uri = "mongodb+srv://%s:%s@cluster0.aogm44s.mongodb.net/%s?retryWrites=true&w=majority"
                .formatted(username, password, username);
        environment.getPropertySources().addFirst(new MapPropertySource(
                PROPERTY_SOURCE_NAME,
                Map.of("spring.data.mongodb.uri", uri)
        ));
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    private String firstText(String first, String second) {
        return StringUtils.hasText(first) ? first : second;
    }
}
