package gebxby.gebxbyblog.config;

import com.mongodb.DuplicateKeyException;
import gebxby.gebxbyblog.model.User;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;

@Configuration
public class UserIndexInitializer {
    private static final Logger log = LoggerFactory.getLogger(UserIndexInitializer.class);
    private static final String[] EMBEDDED_USER_COLLECTIONS = {"contents", "comments"};
    private static final String[] UNIQUE_USER_FIELDS = {"email", "usernameNormalized", "googleId"};

    @Bean
    @ConditionalOnProperty(name = "app.ensure-user-indexes", havingValue = "true", matchIfMissing = true)
    ApplicationRunner ensureUserIndexes(MongoTemplate mongoTemplate) {
        return ignored -> {
            removeEmbeddedUserUniqueIndexes(mongoTemplate);
            var indexOps = mongoTemplate.indexOps(User.class);
            ensureUniqueSparse(indexOps, UNIQUE_USER_FIELDS[0], "user_email_unique_idx");
            ensureUniqueSparse(indexOps, UNIQUE_USER_FIELDS[1], "user_username_normalized_unique_idx");
            ensureUniqueSparse(indexOps, UNIQUE_USER_FIELDS[2], "user_google_id_unique_idx");
        };
    }

    private void removeEmbeddedUserUniqueIndexes(MongoTemplate mongoTemplate) {
        for (String collectionName : EMBEDDED_USER_COLLECTIONS) {
            try {
                var collection = mongoTemplate.getCollection(collectionName);
                for (Document index : collection.listIndexes(Document.class)) {
                    String indexName = index.getString("name");
                    Document key = index.get("key", Document.class);
                    if (indexName != null && key != null && Boolean.TRUE.equals(index.getBoolean("unique"))
                            && hasEmbeddedUserField(key)) {
                        collection.dropIndex(indexName);
                        log.warn("Dropped invalid unique embedded user index {} from {}.", indexName, collectionName);
                    }
                }
            } catch (RuntimeException ex) {
                log.warn("Cannot inspect embedded user indexes on {}. App will keep running and retry on next boot.", collectionName);
            }
        }
    }

    private boolean hasEmbeddedUserField(Document key) {
        for (String field : UNIQUE_USER_FIELDS) {
            if (key.containsKey("user." + field)) {
                return true;
            }
        }
        return false;
    }

    private void ensureUniqueSparse(org.springframework.data.mongodb.core.index.IndexOperations indexOps,
                                    String field,
                                    String name) {
        try {
            indexOps.createIndex(new Index()
                    .on(field, Sort.Direction.ASC)
                    .unique()
                    .sparse()
                    .named(name));
        } catch (DuplicateKeyException ex) {
            log.warn("Cannot create unique user index {} because existing users contain duplicates. App will keep running; clean the duplicate {} values to restore database-level uniqueness.", name, field);
        } catch (RuntimeException ex) {
            log.warn("Cannot ensure user index {} at startup. App-level validation remains active; retry will happen on next boot.", name);
        }
    }
}
