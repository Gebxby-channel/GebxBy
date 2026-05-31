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
@Document(collection = "activity_logs")
@CompoundIndex(name = "owner_activity_order_idx", def = "{'ownerUserId': 1, 'createdAt': -1}")
@CompoundIndex(name = "report_queue_order_idx", def = "{'reportQueue': 1, 'createdAt': -1}")
public class ActivityLog {
    @Id
    private UUID id;

    @Indexed
    private UUID ownerUserId;

    private ActivityLogType type;
    private ActivityLogDirection direction;
    private ActivityTargetType targetType;

    private String title;
    private String message;
    private String reason;

    private UUID actorUserId;
    private String actorName;
    private String actorPhoto;

    private UUID targetUserId;
    private String targetUserName;

    private UUID contentId;
    private String contentTitle;
    private UUID commentId;

    private boolean reportQueue;
    private boolean resolved;

    @Indexed
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
}
