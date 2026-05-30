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
@Document(collection = "notifications")
@CompoundIndex(name = "recipient_notification_order_idx", def = "{'recipientUserId': 1, 'createdAt': -1}")
public class Notification {
    @Id
    private UUID id;

    @Indexed
    private UUID recipientUserId;

    private NotificationType type;
    private String title;
    private String message;

    private UUID actorUserId;
    private String actorName;
    private String actorPhoto;

    private UUID contentId;
    private String contentTitle;
    private UUID commentId;

    private boolean read;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;

    @Indexed(expireAfter = "0s")
    private LocalDateTime expiresAt;
}
