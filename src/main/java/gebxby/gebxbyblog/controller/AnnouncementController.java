package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.dto.AnnouncementResponse;
import gebxby.gebxbyblog.service.AnnouncementService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.CacheControl;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/announcements")
public class AnnouncementController {
    private final AnnouncementService announcementService;

    public AnnouncementController(AnnouncementService announcementService) {
        this.announcementService = announcementService;
    }

    @GetMapping("/latest")
    public ResponseEntity<AnnouncementResponse> latest() {
        return announcementService.latest()
                .map(announcement -> ResponseEntity.ok()
                        .cacheControl(CacheControl.maxAge(Duration.ofSeconds(30)).cachePublic())
                        .body(announcement))
                .orElseGet(() -> ResponseEntity.noContent()
                        .cacheControl(CacheControl.maxAge(Duration.ofSeconds(30)).cachePublic())
                        .build());
    }
}
