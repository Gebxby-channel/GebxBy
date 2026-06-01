package gebxby.gebxbyblog.model;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Document(collection = "reports")
@CompoundIndexes({
        @CompoundIndex(name = "report_status_order_idx", def = "{'status': 1, 'createdAt': -1}"),
        @CompoundIndex(name = "report_target_idx", def = "{'contentId': 1, 'commentId': 1, 'createdAt': -1}")
})
public class Report {
    @Id
    private UUID id;

    @Indexed
    private UUID activityLogId;

    @Indexed
    private UUID reporterUserId;

    private String reporterName;
    private UUID targetUserId;
    private String targetUserName;
    private UUID contentId;
    private String contentTitle;
    private UUID commentId;
    private String category;
    private String reason;
    private ReportStatus status = ReportStatus.OPEN;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
    private UUID resolvedByUserId;
}
