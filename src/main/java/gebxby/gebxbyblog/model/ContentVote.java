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
@Document(collection = "content_votes")
@CompoundIndex(name = "content_user_vote_idx", def = "{'contentId': 1, 'userId': 1}", unique = true)
public class ContentVote {
    @Id
    private String id;

    @Indexed
    private UUID contentId;

    @Indexed
    private UUID userId;

    private VoteDirection vote;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static String buildId(UUID contentId, UUID userId) {
        return contentId + ":" + userId;
    }
}
