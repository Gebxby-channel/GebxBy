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
                "mongodb+srv://gebxby_db:secret@cluster00.wey8cvq.mongodb.net/blog_db?retryWrites=true&w=majority",
                environment.getProperty("spring.data.mongodb.uri")
        );
    }

    @Test
    void supportsExplicitClusterHostDatabaseAndEncodedPassword() {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new MapPropertySource("test", Map.of(
                "MONGODB_USERNAME", "gabrielselwas_db_user",
                "MONGODB_PASSWORD", "p@ss/word#1",
                "MONGODB_CLUSTER_HOST", "mongodb+srv://cluster-custom.mongodb.net/blog_db?retryWrites=true",
                "MONGODB_DATABASE", "blog_db"
        )));

        new LegacyMongoUriEnvironmentPostProcessor()
                .postProcessEnvironment(environment, new SpringApplication());

        assertEquals(
                "mongodb+srv://gabrielselwas_db_user:p%40ss%2Fword%231@cluster-custom.mongodb.net/blog_db?retryWrites=true&w=majority",
                environment.getProperty("spring.data.mongodb.uri")
        );
    }

    @Test
    void normalizesExplicitMongoUriToConfiguredDatabase() {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new MapPropertySource("test", Map.of(
                "MONGODB_URI", "mongodb://mongo.example/gabrielselwas_db_user?retryWrites=true",
                "spring.data.mongodb.uri", "mongodb://mongo.example/gabrielselwas_db_user?retryWrites=true",
                "MONGODB_DATABASE", "blog_db",
                "uName_DB", "gebxby_db",
                "pw_DB", "secret"
        )));

        new LegacyMongoUriEnvironmentPostProcessor()
                .postProcessEnvironment(environment, new SpringApplication());

        assertEquals("mongodb://mongo.example/blog_db?retryWrites=true", environment.getProperty("spring.data.mongodb.uri"));
    }

    @Test
    void addsDefaultDatabaseToExplicitMongoUriWithoutPath() {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new MapPropertySource("test", Map.of(
                "MONGODB_URI", "mongodb+srv://user:pw@cluster00.wey8cvq.mongodb.net?retryWrites=true"
        )));

        new LegacyMongoUriEnvironmentPostProcessor()
                .postProcessEnvironment(environment, new SpringApplication());

        assertEquals(
                "mongodb+srv://user:pw@cluster00.wey8cvq.mongodb.net/blog_db?retryWrites=true",
                environment.getProperty("spring.data.mongodb.uri")
        );
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
