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
@Document(collection = "follows")
@org.springframework.data.mongodb.core.index.CompoundIndexes({
        @CompoundIndex(name = "follow_user_target_idx", def = "{'followerUserId': 1, 'targetUserId': 1}", unique = true),
        @CompoundIndex(name = "follow_follower_order_idx", def = "{'followerUserId': 1, 'createdAt': -1}"),
        @CompoundIndex(name = "follow_target_order_idx", def = "{'targetUserId': 1, 'createdAt': -1}")
})
public class Follow {
    @Id
    private String id;

    @Indexed
    private UUID followerUserId;

    @Indexed
    private UUID targetUserId;

    private LocalDateTime createdAt;

    public static String buildId(UUID followerUserId, UUID targetUserId) {
        return followerUserId + ":" + targetUserId;
    }
}
