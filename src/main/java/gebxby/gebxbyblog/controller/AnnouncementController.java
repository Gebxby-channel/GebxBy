package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.dto.AnnouncementResponse;
import gebxby.gebxbyblog.service.AnnouncementService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
