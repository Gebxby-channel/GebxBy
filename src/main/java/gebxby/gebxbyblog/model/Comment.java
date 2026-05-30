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
@Document(collection = "comments")
@CompoundIndex(name = "content_comment_order_idx", def = "{'contentId': 1, 'createdAt': 1}")
public class Comment {
    @Id
    private UUID id;

    @Indexed
    private UUID contentId;

    @Indexed
    private UUID parentId;

    private User user;
    private String body;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean deleted;
    private UUID deletedByUserId;
    private boolean deletedByAdmin;
}
