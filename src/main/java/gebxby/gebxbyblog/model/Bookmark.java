package gebxby.gebxbyblog.model;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Document(collection = "bookmarks")
@CompoundIndex(name = "bookmark_user_content_idx", def = "{'userId': 1, 'contentId': 1}", unique = true)
public class Bookmark {
    @Id
    private String id;

    @Indexed
    private UUID userId;

    @Indexed
    private UUID contentId;

    private LocalDateTime createdAt;

    public static String buildId(UUID userId, UUID contentId) {
        return userId + ":" + contentId;
    }
}
