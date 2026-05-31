package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.ActivityLogResponse;
import gebxby.gebxbyblog.dto.ReportRequest;
import gebxby.gebxbyblog.model.ActivityLog;
import gebxby.gebxbyblog.model.ActivityLogDirection;
import gebxby.gebxbyblog.model.ActivityLogType;
import gebxby.gebxbyblog.model.ActivityTargetType;
import gebxby.gebxbyblog.model.BadgeCode;
import gebxby.gebxbyblog.model.Comment;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.ActivityLogRepository;
import gebxby.gebxbyblog.repository.CommentRepository;
import gebxby.gebxbyblog.repository.ContentRepository;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ActivityLogServiceImpl implements ActivityLogService {
    private static final int MAX_LIMIT = 100;
    private static final int MAX_MESSAGE_LENGTH = 1_200;

    private final ActivityLogRepository logRepository;
    private final ContentRepository contentRepository;
    private final CommentRepository commentRepository;

    public ActivityLogServiceImpl(ActivityLogRepository logRepository,
                                  ContentRepository contentRepository,
                                  CommentRepository commentRepository) {
        this.logRepository = logRepository;
        this.contentRepository = contentRepository;
        this.commentRepository = commentRepository;
    }

    @Override
    public List<ActivityLogResponse> findBasis(User user, int limit) {
        requireUser(user);
        return logRepository.findByOwnerUserIdOrderByCreatedAtDesc(user.getUserID(), PageRequest.of(0, clampLimit(limit)))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public List<ActivityLogResponse> findReportQueue(User viewer, int limit, boolean allowed) {
        requireUser(viewer);
        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Report queue access required");
        }
        return logRepository.findByReportQueueTrueOrderByCreatedAtDesc(PageRequest.of(0, clampLimit(limit)))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public ActivityLogResponse findOne(UUID id, User viewer, boolean queueAllowed) {
        requireUser(viewer);
        ActivityLog log = logRepository.findByIdAndOwnerUserId(id, viewer.getUserID())
                .or(() -> queueAllowed ? logRepository.findById(id).filter(ActivityLog::isReportQueue) : java.util.Optional.empty())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Log tidak ditemukan"));
        return toResponse(log);
    }

    @Override
    public ActivityLog recordPublication(Content content, User actor) {
        if (content == null || actor == null) {
            return null;
        }
        ActivityLog log = base(actor, ActivityLogType.PUBLICATION, ActivityLogDirection.OUTGOING, ActivityTargetType.CONTENT);
        log.setTitle("Tulisan diterbitkan");
        log.setMessage("Kamu menerbitkan \"%s\"".formatted(trim(content.getHead(), 120)));
        setContent(log, content);
        return logRepository.save(log);
    }

    @Override
    public ActivityLog recordAdminMessage(User recipient, User actor, String title, String message) {
        ActivityLog log = base(recipient, ActivityLogType.ADMIN_MESSAGE, ActivityLogDirection.INCOMING, ActivityTargetType.SYSTEM);
        setActor(log, actor);
        log.setTitle(StringUtils.hasText(title) ? trim(title, 120) : "Pesan admin");
        log.setMessage(sanitize(message));
        return logRepository.save(log);
    }

    @Override
    public ActivityLog recordModeratorReport(User admin, User moderator, String message) {
        ActivityLog log = base(moderator, ActivityLogType.MODERATOR_REPORT, ActivityLogDirection.OUTGOING, ActivityTargetType.USER);
        setActor(log, moderator);
        setTargetUser(log, admin);
        log.setTitle("Laporan moderator");
        log.setMessage(sanitize(message));
        log.setReason(sanitize(message));
        log.setReportQueue(true);
        return logRepository.save(log);
    }

    @Override
    public ActivityLog recordUserReport(User reporter, UUID contentId, UUID commentId, ReportRequest request) {
        requireUser(reporter);
        Content content = contentRepository.findById(contentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tulisan tidak ditemukan"));
        Comment comment = null;
        if (commentId != null) {
            comment = commentRepository.findByIdAndContentId(commentId, contentId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Komentar tidak ditemukan"));
        }
        String reason = sanitize(request == null ? null : request.reason());
        if (!StringUtils.hasText(reason)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Alasan report wajib diisi");
        }

        ActivityLog log = base(reporter, ActivityLogType.USER_REPORT, ActivityLogDirection.OUTGOING,
                comment == null ? ActivityTargetType.CONTENT : ActivityTargetType.COMMENT);
        log.setTitle(comment == null ? "Report tulisan" : "Report komentar");
        log.setMessage(reason);
        log.setReason(reason);
        log.setReportQueue(true);
        setContent(log, content);
        if (comment != null) {
            log.setCommentId(comment.getId());
            setTargetUser(log, comment.getUser());
        } else {
            setTargetUser(log, content.getUser());
        }
        return logRepository.save(log);
    }

    @Override
    public void recordSuspension(User actor, User target, Duration duration, boolean adminSuspension) {
        if (actor == null || target == null) {
            return;
        }
        String title = adminSuspension ? "Suspend admin" : "Suspend moderator";
        String message = "%s menyuspend %s selama %s".formatted(actor.getName(), target.getName(), formatDuration(duration));
        ActivityLog outgoing = base(actor, ActivityLogType.USER_SUSPEND, ActivityLogDirection.OUTGOING, ActivityTargetType.USER);
        setTargetUser(outgoing, target);
        outgoing.setTitle(title);
        outgoing.setMessage(message);
        logRepository.save(outgoing);

        ActivityLog incoming = base(target, ActivityLogType.USER_SUSPEND, ActivityLogDirection.INCOMING, ActivityTargetType.USER);
        setActor(incoming, actor);
        incoming.setTitle("Akun disuspend");
        incoming.setMessage(message);
        logRepository.save(incoming);
    }

    @Override
    public void recordContentDelete(User actor, Content content) {
        if (actor == null || content == null) {
            return;
        }
        ActivityLog log = base(actor, ActivityLogType.CONTENT_DELETE, ActivityLogDirection.OUTGOING, ActivityTargetType.CONTENT);
        setContent(log, content);
        setTargetUser(log, content.getUser());
        log.setTitle("Tulisan dihapus");
        log.setMessage("%s menghapus tulisan \"%s\"".formatted(actor.getName(), trim(content.getHead(), 120)));
        logRepository.save(log);
    }

    @Override
    public void recordCommentDelete(User actor, Comment comment) {
        if (actor == null || comment == null) {
            return;
        }
        ActivityLog log = base(actor, ActivityLogType.COMMENT_DELETE, ActivityLogDirection.OUTGOING, ActivityTargetType.COMMENT);
        setActor(log, actor);
        setTargetUser(log, comment.getUser());
        log.setContentId(comment.getContentId());
        log.setCommentId(comment.getId());
        log.setTitle("Komentar dihapus");
        log.setMessage("%s menghapus komentar".formatted(actor.getName()));
        logRepository.save(log);
    }

    @Override
    public void recordBadgeAction(User actor, User target, BadgeCode badge, boolean granted) {
        if (actor == null || target == null || badge == null) {
            return;
        }
        ActivityLog log = base(actor, granted ? ActivityLogType.BADGE_GRANTED : ActivityLogType.BADGE_REVOKED,
                ActivityLogDirection.OUTGOING, ActivityTargetType.USER);
        setTargetUser(log, target);
        log.setTitle(granted ? "Badge diberikan" : "Badge dicabut");
        log.setMessage("%s %s badge %s untuk %s".formatted(
                actor.getName(),
                granted ? "memberikan" : "mencabut",
                badge.name(),
                target.getName()
        ));
        logRepository.save(log);
    }

    private ActivityLog base(User owner, ActivityLogType type, ActivityLogDirection direction, ActivityTargetType targetType) {
        ActivityLog log = new ActivityLog();
        log.setId(UUID.randomUUID());
        log.setOwnerUserId(owner.getUserID());
        log.setType(type);
        log.setDirection(direction);
        log.setTargetType(targetType);
        log.setCreatedAt(LocalDateTime.now());
        setActor(log, owner);
        return log;
    }

    private void setActor(ActivityLog log, User actor) {
        if (actor == null) {
            return;
        }
        log.setActorUserId(actor.getUserID());
        log.setActorName(actor.getName());
        log.setActorPhoto(actor.getPhoto());
    }

    private void setTargetUser(ActivityLog log, User target) {
        if (target == null) {
            return;
        }
        log.setTargetUserId(target.getUserID());
        log.setTargetUserName(target.getName());
    }

    private void setContent(ActivityLog log, Content content) {
        log.setContentId(content.getIdContent());
        log.setContentTitle(content.getHead());
    }

    private ActivityLogResponse toResponse(ActivityLog log) {
        return new ActivityLogResponse(
                log.getId(),
                log.getType(),
                log.getDirection(),
                log.getTargetType(),
                log.getTitle(),
                log.getMessage(),
                log.getReason(),
                log.getActorUserId(),
                log.getActorName(),
                log.getActorPhoto(),
                log.getTargetUserId(),
                log.getTargetUserName(),
                log.getContentId(),
                log.getContentTitle(),
                log.getCommentId(),
                log.isReportQueue(),
                log.isResolved(),
                log.getCreatedAt(),
                log.getResolvedAt()
        );
    }

    private String sanitize(String value) {
        return trim(Jsoup.clean(value == null ? "" : value, Safelist.none()).trim(), MAX_MESSAGE_LENGTH);
    }

    private String trim(String value, int maxLength) {
        String trimmed = value == null ? "" : value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }

    private int clampLimit(int limit) {
        return Math.max(1, Math.min(limit, MAX_LIMIT));
    }

    private void requireUser(User user) {
        if (user == null || user.getUserID() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User belum login");
        }
    }

    private String formatDuration(Duration duration) {
        if (duration == null) {
            return "sementara";
        }
        long hours = duration.toHours();
        if (hours > 0) {
            return hours + " jam";
        }
        return Math.max(1, duration.toMinutes()) + " menit";
    }
}
