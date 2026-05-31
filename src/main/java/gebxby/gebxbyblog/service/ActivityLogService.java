package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.ActivityLogResponse;
import gebxby.gebxbyblog.dto.ReportRequest;
import gebxby.gebxbyblog.model.ActivityLog;
import gebxby.gebxbyblog.model.BadgeCode;
import gebxby.gebxbyblog.model.Comment;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.User;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

public interface ActivityLogService {
    List<ActivityLogResponse> findBasis(User user, int limit);
    List<ActivityLogResponse> findReportQueue(User viewer, int limit, boolean allowed);
    ActivityLogResponse findOne(UUID id, User viewer, boolean queueAllowed);
    ActivityLogResponse resolveReport(UUID id, User actor, boolean allowed);
    ActivityLog recordPublication(Content content, User actor);
    ActivityLog recordAdminMessage(User recipient, User actor, String title, String message);
    ActivityLog recordModeratorReport(User admin, User moderator, String message);
    ActivityLog recordUserReport(User reporter, UUID contentId, UUID commentId, ReportRequest request);
    void recordSuspension(User actor, User target, Duration duration, boolean adminSuspension);
    void recordContentDelete(User actor, Content content);
    void recordCommentDelete(User actor, Comment comment);
    void recordBadgeAction(User actor, User target, BadgeCode badge, boolean granted);
}
