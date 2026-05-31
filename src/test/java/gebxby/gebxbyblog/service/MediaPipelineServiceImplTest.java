package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.ContentImageRequest;
import gebxby.gebxbyblog.model.ContentImage;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class MediaPipelineServiceImplTest {
    private final MediaPipelineServiceImpl mediaPipeline = new MediaPipelineServiceImpl();

    @Test
    void preparesInlineMediaWithMetadata() {
        String dataUrl = "data:image/webp;base64,"
                + Base64.getEncoder().encodeToString("tiny-image".getBytes(StandardCharsets.UTF_8));

        List<ContentImage> images = mediaPipeline.prepareContentImages(List.of(
                new ContentImageRequest(dataUrl, null, "<b>Evidence</b>", 640, 360)
        ));

        assertEquals(1, images.size());
        assertEquals("Evidence", images.getFirst().getAlt());
        assertEquals("image/webp", images.getFirst().getMimeType());
        assertEquals("INLINE_MONGO_V1", images.getFirst().getStorageProvider());
        assertEquals(640, images.getFirst().getWidth());
        assertNotNull(images.getFirst().getStorageKey());
    }

    @Test
    void rejectsUnsafeMediaPayload() {
        assertThrows(ResponseStatusException.class, () ->
                mediaPipeline.prepareContentImages(List.of(new ContentImageRequest("javascript:alert(1)", "bad")))
        );
    }
}
