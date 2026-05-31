package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.ContentImageRequest;
import gebxby.gebxbyblog.dto.MediaSmokeTestResponse;
import gebxby.gebxbyblog.model.ContentImage;

import java.util.List;

public interface MediaPipelineService {
    List<ContentImage> prepareContentImages(List<ContentImageRequest> images);

    MediaSmokeTestResponse smokeTest();
}
