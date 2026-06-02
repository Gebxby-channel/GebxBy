package gebxby.gebxbyblog.model;

import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.index.Indexed;

import static org.junit.jupiter.api.Assertions.assertFalse;

class UserIndexAnnotationTest {
    @Test
    void uniqueUserIndexesAreNotDeclaredOnFieldsThatCanBeEmbeddedInContent() throws Exception {
        assertFalse(User.class.getDeclaredField("email").isAnnotationPresent(Indexed.class));
        assertFalse(User.class.getDeclaredField("usernameNormalized").isAnnotationPresent(Indexed.class));
        assertFalse(User.class.getDeclaredField("googleId").isAnnotationPresent(Indexed.class));
    }
}
