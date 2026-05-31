package gebxby.gebxbyblog.model;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Document(collection = "announcements")
public class Announcement {
    @Id
    private UUID id;

    private String title;
    private String message;

    private UUID adminUserId;
    private String adminName;
    private String adminPhoto;

    @Indexed
    private boolean active = true;

    @Indexed
    private LocalDateTime createdAt;
}
