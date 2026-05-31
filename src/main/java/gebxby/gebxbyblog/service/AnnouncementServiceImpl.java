package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.AdminNotificationRequest;
import gebxby.gebxbyblog.dto.AnnouncementResponse;
import gebxby.gebxbyblog.model.Announcement;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.AnnouncementRepository;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class AnnouncementServiceImpl implements AnnouncementService {
    private static final int MAX_TITLE_LENGTH = 120;
    private static final int MAX_MESSAGE_LENGTH = 1_000;

    private final AnnouncementRepository announcementRepository;
    private final UserService userService;

    public AnnouncementServiceImpl(AnnouncementRepository announcementRepository,
                                   UserService userService) {
        this.announcementRepository = announcementRepository;
        this.userService = userService;
    }

    @Override
    public AnnouncementResponse publish(AdminNotificationRequest request, User admin) {
        if (!userService.isAdmin(admin)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }

        String title = sanitize(request == null ? null : request.title(), MAX_TITLE_LENGTH);
        String message = sanitize(request == null ? null : request.message(), MAX_MESSAGE_LENGTH);
        if (!StringUtils.hasText(message)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Announcement wajib diisi");
        }

        Announcement announcement = new Announcement();
        announcement.setId(UUID.randomUUID());
        announcement.setTitle(StringUtils.hasText(title) ? title : "Announcement Event");
        announcement.setMessage(message);
        announcement.setAdminUserId(admin.getUserID());
        announcement.setAdminName(admin.getName());
        announcement.setAdminPhoto(admin.getPhoto());
        announcement.setActive(true);
        announcement.setCreatedAt(LocalDateTime.now());
        return toResponse(announcementRepository.save(announcement));
    }

    @Override
    public Optional<AnnouncementResponse> latest() {
        return announcementRepository.findTopByActiveTrueOrderByCreatedAtDesc()
                .map(this::toResponse);
    }

    @Override
    public void deleteOwn(UUID announcementId, User admin) {
        if (!userService.isAdmin(admin)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
        Announcement announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Announcement tidak ditemukan"));
        if (announcement.getAdminUserId() == null || !announcement.getAdminUserId().equals(admin.getUserID())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Hanya pembuat announcement yang boleh menghapus");
        }
        announcementRepository.delete(announcement);
    }

    private AnnouncementResponse toResponse(Announcement announcement) {
        return new AnnouncementResponse(
                announcement.getId(),
                announcement.getTitle(),
                announcement.getMessage(),
                announcement.getAdminUserId(),
                announcement.getAdminName(),
                announcement.getAdminPhoto(),
                announcement.getCreatedAt()
        );
    }

    private String sanitize(String value, int maxLength) {
        String clean = Jsoup.clean(value == null ? "" : value, Safelist.none()).trim();
        return clean.length() <= maxLength ? clean : clean.substring(0, maxLength);
    }
}
