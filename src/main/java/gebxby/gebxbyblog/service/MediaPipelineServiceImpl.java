package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.ContentImageRequest;
import gebxby.gebxbyblog.model.ContentImage;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class MediaPipelineServiceImpl implements MediaPipelineService {
    private static final int MAX_IMAGES = 6;
    private static final int MAX_IMAGE_DATA_URL_LENGTH = 480_000;
    private static final int MAX_IMAGE_BYTES = 360_000;
    private static final int MAX_THUMBNAIL_DATA_URL_LENGTH = 90_000;
    private static final int MAX_THUMBNAIL_BYTES = 70_000;
    private static final int MAX_TOTAL_IMAGE_BYTES = 1_800_000;
    private static final int MAX_DIMENSION = 10_000;
    private static final String STORAGE_PROVIDER = "INLINE_MONGO_V1";

    @Override
    public List<ContentImage> prepareContentImages(List<ContentImageRequest> images) {
        if (images == null || images.isEmpty()) {
            return List.of();
        }
        if (images.size() > MAX_IMAGES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Maksimal 6 gambar per tulisan");
        }

        List<ContentImage> result = new ArrayList<>();
        long totalBytes = 0;
        for (ContentImageRequest request : images) {
            if (request == null || !StringUtils.hasText(request.data())) {
                continue;
            }
            ImagePayload payload = validateImageDataUrl(request.data().trim(), MAX_IMAGE_DATA_URL_LENGTH, MAX_IMAGE_BYTES);
            totalBytes += payload.size();
            if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
                throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Total gambar terlalu besar");
            }

            String thumbnail = null;
            if (StringUtils.hasText(request.thumbnail())) {
                thumbnail = request.thumbnail().trim();
                validateImageDataUrl(thumbnail, MAX_THUMBNAIL_DATA_URL_LENGTH, MAX_THUMBNAIL_BYTES);
            }

            String id = UUID.randomUUID().toString();
            ContentImage image = new ContentImage();
            image.setId(id);
            image.setData(request.data().trim());
            image.setThumbnail(thumbnail);
            image.setAlt(cleanAlt(request.alt()));
            image.setSize(payload.size());
            image.setMimeType(payload.mimeType());
            image.setStorageProvider(STORAGE_PROVIDER);
            image.setStorageKey("content-image/" + id);
            image.setWidth(cleanDimension(request.width()));
            image.setHeight(cleanDimension(request.height()));
            result.add(image);
        }
        return result;
    }

    private ImagePayload validateImageDataUrl(String dataUrl, int maxLength, int maxBytes) {
        if (dataUrl.length() > maxLength) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Ukuran gambar terlalu besar");
        }
        int commaIndex = dataUrl.indexOf(',');
        if (!dataUrl.startsWith("data:image/") || commaIndex < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Format gambar tidak valid");
        }

        String metadata = dataUrl.substring(5, commaIndex).toLowerCase(Locale.ROOT);
        if (!metadata.endsWith(";base64")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Gambar wajib memakai base64 data URL");
        }
        String mimeType = metadata.substring(0, metadata.length() - ";base64".length());
        if (!Set.of("image/webp", "image/jpeg", "image/png").contains(mimeType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipe gambar tidak didukung");
        }

        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(dataUrl.substring(commaIndex + 1));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Data gambar rusak");
        }
        if (decoded.length > maxBytes) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Ukuran gambar terlalu besar");
        }
        return new ImagePayload(mimeType, decoded.length);
    }

    private String cleanAlt(String value) {
        String clean = Jsoup.clean(value == null ? "" : value, Safelist.none()).trim();
        return clean.length() <= 120 ? clean : clean.substring(0, 120);
    }

    private Integer cleanDimension(Integer dimension) {
        if (dimension == null || dimension <= 0) {
            return null;
        }
        return Math.min(dimension, MAX_DIMENSION);
    }

    private record ImagePayload(String mimeType, long size) {
    }
}
