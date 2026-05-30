package gebxby.gebxbyblog.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LegacyMongoUriEnvironmentPostProcessorTest {
    @Test
    void buildsAtlasUriFromLegacyKoyebVariables() {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new MapPropertySource("test", Map.of(
                "uName_DB", "gebxby_db",
                "pw_DB", "secret"
        )));

        new LegacyMongoUriEnvironmentPostProcessor()
                .postProcessEnvironment(environment, new SpringApplication());

        assertEquals(
                "mongodb+srv://gebxby_db:secret@cluster0.aogm44s.mongodb.net/gebxby_db?retryWrites=true&w=majority",
                environment.getProperty("spring.data.mongodb.uri")
        );
    }

    @Test
    void keepsExplicitMongoUriAheadOfLegacyVariables() {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new MapPropertySource("test", Map.of(
                "MONGODB_URI", "mongodb://mongo.example/explicit",
                "spring.data.mongodb.uri", "mongodb://mongo.example/explicit",
                "uName_DB", "gebxby_db",
                "pw_DB", "secret"
        )));

        new LegacyMongoUriEnvironmentPostProcessor()
                .postProcessEnvironment(environment, new SpringApplication());

        assertEquals("mongodb://mongo.example/explicit", environment.getProperty("spring.data.mongodb.uri"));
    }

    @Test
    void isRegisteredForSpringBootStartup() throws IOException {
        try (var stream = Thread.currentThread().getContextClassLoader()
                .getResourceAsStream("META-INF/spring.factories")) {
            String factories = new String(stream.readAllBytes(), StandardCharsets.UTF_8);

            assertTrue(factories.contains("org.springframework.boot.env.EnvironmentPostProcessor"));
            assertTrue(factories.contains(LegacyMongoUriEnvironmentPostProcessor.class.getName()));
        }
    }
}
