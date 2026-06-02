package gebxby.gebxbyblog.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.MongoTemplate;

@Configuration
public class MongoDatabaseUsageLogger {
    private static final Logger log = LoggerFactory.getLogger(MongoDatabaseUsageLogger.class);

    @Bean
    @ConditionalOnProperty(name = "app.log-mongo-database", havingValue = "true", matchIfMissing = true)
    ApplicationRunner logActiveMongoDatabase(MongoTemplate mongoTemplate) {
        return ignored -> log.info("MongoDB active database: {}", mongoTemplate.getDb().getName());
    }
}
