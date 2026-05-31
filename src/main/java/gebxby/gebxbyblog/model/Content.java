package gebxby.gebxbyblog.model;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.time.LocalDateTime;

@Getter
@Setter
@Document(collection = "contents")
@CompoundIndexes({
        @CompoundIndex(name = "content_author_order_idx", def = "{'user.userID': 1, 'createdAt': -1}"),
        @CompoundIndex(name = "content_category_order_idx", def = "{'kategori': 1, 'createdAt': -1}"),
        @CompoundIndex(name = "content_view_order_idx", def = "{'viewCount': -1}"),
        @CompoundIndex(name = "content_up_order_idx", def = "{'upCount': -1}")
})
public class Content {
    @Id
    private UUID idContent;

    @Indexed
    private String head;
    private String subtitle;
    private String paragrafs;
    private List<ContentImage> images = new ArrayList<>();
    private User user;

    @Indexed
    private String kategori;

    @Indexed
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private long viewCount;
    private int upCount;
    private int downCount;
    private long commentCount;
}
