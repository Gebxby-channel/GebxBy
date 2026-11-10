package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.ContentImageRequest;
import gebxby.gebxbyblog.dto.MediaSmokeTestResponse;
import gebxby.gebxbyblog.model.ContentImage;

import java.util.List;
import java.util.UUID;

public interface MediaPipelineService {
    List<ContentImage> prepareContentImages(List<ContentImageRequest> images);

    int migrateInlineContentImages(List<ContentImage> images);

    String storeProfilePhoto(String imageData, String ownerType, UUID ownerId);

    MediaSmokeTestResponse smokeTest();
}
