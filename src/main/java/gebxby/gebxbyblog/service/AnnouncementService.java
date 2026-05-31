package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.AdminNotificationRequest;
import gebxby.gebxbyblog.dto.AnnouncementResponse;
import gebxby.gebxbyblog.model.User;

import java.util.Optional;

public interface AnnouncementService {
    AnnouncementResponse publish(AdminNotificationRequest request, User admin);

    Optional<AnnouncementResponse> latest();
}
