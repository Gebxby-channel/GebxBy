package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.AdminNotificationRequest;
import gebxby.gebxbyblog.dto.NotificationResponse;
import gebxby.gebxbyblog.model.Comment;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.ActivityLog;
import gebxby.gebxbyblog.model.Notification;
import gebxby.gebxbyblog.model.NotificationType;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.model.Follow;
import gebxby.gebxbyblog.realtime.RealtimeGateway;
import gebxby.gebxbyblog.repository.NotificationRepository;
import gebxby.gebxbyblog.repository.FollowRepository;
import gebxby.gebxbyblog.repository.UserRepository;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class NotificationServiceImpl implements NotificationService {
    private static final int MAX_TITLE_LENGTH = 120;
    private static final int MAX_MESSAGE_LENGTH = 1_000;
    private static final int MAX_LIMIT = 50;
    private static final int MAX_MENTIONS_PER_ITEM = 10;
    private static final Pattern MENTION_PATTERN = Pattern.compile("(?<![A-Za-z0-9._])@([A-Za-z0-9._]{3,24})");

    private final NotificationRepository notificationRepository;
    private final FollowRepository followRepository;
    private final UserService userService;
    private final UserRepository userRepository;
    private final ActivityLogService activityLogService;
    private final RealtimeGateway realtimeGateway;

    @Autowired
    public NotificationServiceImpl(NotificationRepository notificationRepository,
                                   FollowRepository followRepository,
                                   UserService userService,
                                   UserRepository userRepository,
                                   ActivityLogService activityLogService,
                                   RealtimeGateway realtimeGateway) {
        this.notificationRepository = notificationRepository;
        this.followRepository = followRepository;
        this.userService = userService;
        this.userRepository = userRepository;
        this.activityLogService = activityLogService;
        this.realtimeGateway = realtimeGateway;
    }

    public NotificationServiceImpl(NotificationRepository notificationRepository,
                                    UserService userService,
                                    UserRepository userRepository,
                                    ActivityLogService activityLogService,
                                    RealtimeGateway realtimeGateway) {
        this(notificationRepository, null, userService, userRepository, activityLogService, realtimeGateway);
    }

    @Override
    public List<NotificationResponse> findForUser(User user, int limit) {
        userService.ensureActive(user);
        deleteExpired();
        int size = Math.max(1, Math.min(limit, MAX_LIMIT));
        return notificationRepository
                .findByRecipientUserIdAndExpiresAtAfterOrderByCreatedAtDesc(user.getUserID(), LocalDateTime.now(), PageRequest.of(0, size))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public List<NotificationResponse> findForUser(User user, int limit, boolean mentionsOnly) {
        userService.ensureActive(user);
        deleteExpired();
        int size = Math.max(1, Math.min(limit, MAX_LIMIT));
        LocalDateTime now = LocalDateTime.now();
        List<Notification> notifications = mentionsOnly
                ? notificationRepository.findByRecipientUserIdAndTypeAndExpiresAtAfterOrderByCreatedAtDesc(user.getUserID(), NotificationType.MENTION, now, PageRequest.of(0, size))
                : notificationRepository.findByRecipientUserIdAndExpiresAtAfterOrderByCreatedAtDesc(user.getUserID(), now, PageRequest.of(0, size));
        return notifications
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public long countUnread(User user) {
        userService.ensureActive(user);
        deleteExpired();
        return notificationRepository.countByRecipientUserIdAndReadFalseAndExpiresAtAfter(user.getUserID(), LocalDateTime.now());
    }

    @Override
    public NotificationResponse markRead(UUID notificationId, User user) {
        userService.ensureActive(user);
        Notification notification = notificationRepository.findByIdAndRecipientUserId(notificationId, user.getUserID())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notifikasi tidak ditemukan"));
        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now());
            notification = notificationRepository.save(notification);
            realtimeGateway.unreadCountChanged(user.getUserID(), unreadCount(user.getUserID()));
        }
        return toResponse(notification);
    }

    @Override
    public void markAllRead(User user) {
        userService.ensureActive(user);
        LocalDateTime now = LocalDateTime.now();
        List<Notification> notifications = notificationRepository
                .findByRecipientUserIdAndExpiresAtAfterOrderByCreatedAtDesc(user.getUserID(), now, PageRequest.of(0, MAX_LIMIT));
        List<Notification> unreadNotifications = notifications.stream()
                .filter(notification -> !notification.isRead())
                .toList();
        unreadNotifications.forEach(notification -> {
            notification.setRead(true);
            notification.setReadAt(now);
        });
        if (!unreadNotifications.isEmpty()) {
            notificationRepository.saveAll(unreadNotifications);
        }
        realtimeGateway.notificationsRead(user.getUserID(), unreadCount(user.getUserID()));
    }

    @Override
    public long clearForUser(User user) {
        userService.ensureActive(user);
        long deleted = notificationRepository.deleteByRecipientUserId(user.getUserID());
        realtimeGateway.notificationsRead(user.getUserID(), 0);
        return deleted;
    }

    @Override
    public void notifyCommentOnContent(Content content, Comment comment) {
        if (content == null || comment == null || comment.getUser() == null) {
            return;
        }
        UUID actorId = comment.getUser().getUserID();
        if (actorId == null) {
            return;
        }
        UUID ownerId = content.getUser() == null ? null : content.getUser().getUserID();
        if (ownerId != null && !ownerId.equals(actorId)) {
            Notification notification = baseNotification(ownerId, NotificationType.COMMENT);
            notification.setTitle("Komentar baru");
            notification.setMessage("%s mengomentari tulisan \"%s\"".formatted(
                    trimToLength(comment.getUser().getName(), 80), contentTitle(content)
            ));
            notification.setActorUserId(actorId);
            notification.setActorName(comment.getUser().getName());
            notification.setActorPhoto(comment.getUser().getPhoto());
            notification.setContentId(content.getIdContent());
            notification.setContentTitle(contentTitle(content));
            notification.setCommentId(comment.getId());
            notification = notificationRepository.save(notification);
            realtimeGateway.notificationCreated(ownerId, toResponse(notification), unreadCount(ownerId));
        }
        notifyMentions(comment.getBody(), comment.getUser(), content, comment.getId(), "komentar", Set.of());
    }

    @Override
    public void notifyContentPublished(Content content, User actor) {
        if (content == null || actor == null || actor.getUserID() == null || followRepository == null) return;
        Set<UUID> recipients = followRepository.findByTargetUserIdOrderByCreatedAtDesc(actor.getUserID()).stream()
                .map(Follow::getFollowerUserId)
                .filter(id -> id != null && !id.equals(actor.getUserID()))
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        for (UUID recipientId : recipients) {
            Notification notification = baseNotification(recipientId, NotificationType.CONTENT);
            notification.setTitle("Tulisan baru dari " + trimToLength(actor.getName(), 80));
            notification.setMessage("menerbitkan tulisan baru di " + (StringUtils.hasText(content.getKategori()) ? content.getKategori() : "Utas"));
            notification.setActorUserId(actor.getUserID());
            notification.setActorName(actor.getName());
            notification.setActorPhoto(actor.getPhoto());
            notification.setContentId(content.getIdContent());
            notification.setContentTitle(contentTitle(content));
            notification = notificationRepository.save(notification);
            realtimeGateway.notificationCreated(recipientId, toResponse(notification), unreadCount(recipientId));
        }
    }

    @Override
    public void notifyContentUpvote(Content content, User actor) {
        if (content == null || actor == null || actor.getUserID() == null || content.getUser() == null) return;
        UUID recipientId = content.getUser().getUserID();
        if (recipientId == null || recipientId.equals(actor.getUserID())) return;
        Notification notification = baseNotification(recipientId, NotificationType.UPVOTE);
        notification.setTitle("Upvote baru");
        notification.setMessage("@%s memberi upvote pada tulisan kamu".formatted(
                StringUtils.hasText(actor.getUsername()) ? actor.getUsername() : actor.getName()
        ));
        notification.setActorUserId(actor.getUserID());
        notification.setActorName(actor.getName());
        notification.setActorPhoto(actor.getPhoto());
        notification.setContentId(content.getIdContent());
        notification.setContentTitle(contentTitle(content));
        notification = notificationRepository.save(notification);
        realtimeGateway.notificationCreated(recipientId, toResponse(notification), unreadCount(recipientId));
    }

    @Override
    public void notifyContentMentions(Content content, User actor) {
        if (content != null && actor != null) {
            notifyMentions(mentionableContentText(content), actor, content, null, "tulisan", Set.of());
        }
    }

    @Override
    public void notifyNewContentMentions(Content content, User actor, String previousBody) {
        if (content != null && actor != null) {
            notifyMentions(mentionableContentText(content), actor, content, null, "tulisan", extractMentions(previousBody));
        }
    }

    private String mentionableContentText(Content content) {
        return (content.getHead() == null ? "" : content.getHead()) + "\n" + content.getParagrafs();
    }

    private void notifyMentions(String body, User actor, Content content, UUID commentId, String location, Set<String> excludedUsernames) {
        if (actor.getUserID() == null || !StringUtils.hasText(body)) return;
        Set<String> usernames = extractMentions(body);
        usernames.removeAll(excludedUsernames);
        if (usernames.isEmpty()) return;
        Set<UUID> recipientIds = userRepository.findByUsernameNormalizedIn(usernames).stream()
                .map(User::getUserID)
                .filter(id -> id != null && !id.equals(actor.getUserID()))
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        for (UUID recipientId : recipientIds) {
            Notification notification = baseNotification(recipientId, NotificationType.MENTION);
            notification.setTitle("Kamu disebut di " + location);
            String actorUsername = StringUtils.hasText(actor.getUsername()) ? "@" + actor.getUsername() : trimToLength(actor.getName(), 80);
            String genre = StringUtils.hasText(content.getKategori()) ? content.getKategori() : "Utas";
            notification.setMessage("Anda di-mention oleh %s di sebuah tulisan bergenre %s".formatted(actorUsername, genre));
            notification.setActorUserId(actor.getUserID());
            notification.setActorName(actor.getName());
            notification.setActorPhoto(actor.getPhoto());
            notification.setContentId(content.getIdContent());
            notification.setContentTitle(contentTitle(content));
            notification.setCommentId(commentId);
            notification = notificationRepository.save(notification);
            realtimeGateway.notificationCreated(recipientId, toResponse(notification), unreadCount(recipientId));
        }
    }

    private Set<String> extractMentions(String body) {
        Set<String> usernames = new LinkedHashSet<>();
        if (!StringUtils.hasText(body)) return usernames;
        Matcher matcher = MENTION_PATTERN.matcher(Jsoup.parse(body).text());
        while (matcher.find() && usernames.size() < MAX_MENTIONS_PER_ITEM) {
            usernames.add(matcher.group(1).toLowerCase(java.util.Locale.ROOT));
        }
        return usernames;
    }

    private String contentTitle(Content content) {
        return StringUtils.hasText(content.getHead()) ? trimToLength(content.getHead(), 80) : "Utas";
    }

    @Override
    public NotificationResponse sendAdminMessage(UUID recipientUserId, AdminNotificationRequest request, User admin) {
        if (!userService.isAdmin(admin)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
        User recipient = userService.getUserById(recipientUserId);
        String title = sanitize(request == null ? null : request.title(), MAX_TITLE_LENGTH);
        String message = sanitize(request == null ? null : request.message(), MAX_MESSAGE_LENGTH);
        if (!StringUtils.hasText(message)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pesan admin wajib diisi");
        }

        ActivityLog log = activityLogService.recordAdminMessage(recipient, admin, StringUtils.hasText(title) ? title : "Pesan dari admin", message);
        Notification notification = baseNotification(recipient.getUserID(), NotificationType.ADMIN_MESSAGE);
        notification.setTitle(StringUtils.hasText(title) ? title : "Pesan dari admin");
        notification.setMessage(message);
        notification.setActorUserId(admin.getUserID());
        notification.setActorName(admin.getName());
        notification.setActorPhoto(admin.getPhoto());
        notification.setLogId(log.getId());
        notification = notificationRepository.save(notification);
        NotificationResponse response = toResponse(notification);
        realtimeGateway.notificationCreated(recipient.getUserID(), response, unreadCount(recipient.getUserID()));
        return response;
    }

    @Override
    public List<NotificationResponse> sendAdminBroadcast(AdminNotificationRequest request, User admin) {
        if (!userService.isAdmin(admin)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
        String title = sanitize(request == null ? null : request.title(), MAX_TITLE_LENGTH);
        String message = sanitize(request == null ? null : request.message(), MAX_MESSAGE_LENGTH);
        if (!StringUtils.hasText(message)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pesan broadcast wajib diisi");
        }
        return userRepository.findAll().stream()
                .map(recipient -> {
                    ActivityLog log = activityLogService.recordAdminMessage(recipient, admin, StringUtils.hasText(title) ? title : "Broadcast admin", message);
                    Notification notification = baseNotification(recipient.getUserID(), NotificationType.ADMIN_MESSAGE);
                    notification.setTitle(StringUtils.hasText(title) ? title : "Broadcast admin");
                    notification.setMessage(message);
                    notification.setActorUserId(admin.getUserID());
                    notification.setActorName(admin.getName());
                    notification.setActorPhoto(admin.getPhoto());
                    notification.setLogId(log.getId());
                    notification = notificationRepository.save(notification);
                    NotificationResponse response = toResponse(notification);
                    realtimeGateway.notificationCreated(recipient.getUserID(), response, unreadCount(recipient.getUserID()));
                    return response;
                })
                .toList();
    }

    @Override
    public NotificationResponse sendModeratorReport(UUID adminUserId, AdminNotificationRequest request, User moderator) {
        if (!userService.isModerator(moderator)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Moderator badge required");
        }
        User admin = userService.getUserById(adminUserId);
        if (!userService.isAdmin(admin)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target laporan harus admin");
        }
        String message = sanitize(request == null ? null : request.message(), MAX_MESSAGE_LENGTH);
        if (!StringUtils.hasText(message)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Isi laporan wajib diisi");
        }

        ActivityLog log = activityLogService.recordModeratorReport(admin, moderator, message);
        Notification notification = baseNotification(admin.getUserID(), NotificationType.ADMIN_MESSAGE);
        notification.setTitle("Laporan moderator");
        notification.setMessage(message);
        notification.setActorUserId(moderator.getUserID());
        notification.setActorName(moderator.getName());
        notification.setActorPhoto(moderator.getPhoto());
        notification.setLogId(log.getId());
        notification = notificationRepository.save(notification);
        NotificationResponse response = toResponse(notification);
        realtimeGateway.notificationCreated(admin.getUserID(), response, unreadCount(admin.getUserID()));
        return response;
    }

    @Override
    @Scheduled(cron = "0 12 * * * *")
    public void deleteExpired() {
        notificationRepository.deleteByExpiresAtBefore(LocalDateTime.now());
    }

    private Notification baseNotification(UUID recipientId, NotificationType type) {
        LocalDateTime now = LocalDateTime.now();
        Notification notification = new Notification();
        notification.setId(UUID.randomUUID());
        notification.setRecipientUserId(recipientId);
        notification.setType(type);
        notification.setCreatedAt(now);
        notification.setExpiresAt(now.plusDays(7));
        return notification;
    }

    private long unreadCount(UUID recipientId) {
        return notificationRepository.countByRecipientUserIdAndReadFalseAndExpiresAtAfter(recipientId, LocalDateTime.now());
    }

    private NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getActorUserId(),
                notification.getActorName(),
                notification.getActorPhoto(),
                notification.getContentId(),
                notification.getContentTitle(),
                notification.getCommentId(),
                notification.getLogId(),
                notification.isRead(),
                notification.getCreatedAt(),
                notification.getExpiresAt()
        );
    }

    private String sanitize(String value, int maxLength) {
        return trimToLength(Jsoup.clean(value == null ? "" : value, Safelist.none()).trim(), maxLength);
    }

    private String trimToLength(String value, int maxLength) {
        String trimmed = value == null ? "" : value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }
}
