package gebxby.gebxbyblog.model;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.UUID;
import java.time.LocalDateTime;

@Getter
@Setter
@Document(collection = "contents")
public class Content {
    @Id
    private UUID idContent;

    private String head;
    private String subtitle;
    private String paragrafs;
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
