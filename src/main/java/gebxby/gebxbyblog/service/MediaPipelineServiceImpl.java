package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.ContentImageRequest;
import gebxby.gebxbyblog.dto.MediaSmokeTestResponse;
import gebxby.gebxbyblog.model.ContentImage;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.net.URI;
import java.net.HttpURLConnection;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class MediaPipelineServiceImpl implements MediaPipelineService {
    private static final Logger log = LoggerFactory.getLogger(MediaPipelineServiceImpl.class);
    private static final String SMOKE_TEST_IMAGE =
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
    private static final int MAX_IMAGES = 6;
    private static final int MAX_IMAGE_DATA_URL_LENGTH = 480_000;
    private static final int MAX_IMAGE_BYTES = 360_000;
    private static final int MAX_THUMBNAIL_DATA_URL_LENGTH = 90_000;
    private static final int MAX_THUMBNAIL_BYTES = 70_000;
    private static final int MAX_TOTAL_IMAGE_BYTES = 1_800_000;
    private static final int MAX_DIMENSION = 10_000;
    private static final String INLINE_STORAGE_PROVIDER = "INLINE_MONGO_V1";
    private static final String R2_STORAGE_PROVIDER = "R2";

    private final String storageProvider;
    private final String r2BucketName;
    private final String r2AccountId;
    private final String r2AccessKeyId;
    private final String r2SecretAccessKey;
    private final String r2Endpoint;
    private final String r2PublicBaseUrl;
    private final String r2Region;
    private final boolean r2FallbackInlineOnFailure;
    private volatile S3Client s3Client;

    @Autowired
    public MediaPipelineServiceImpl(@Value("${app.media.storage-provider:inline}") String storageProvider,
                                    @Value("${app.media.r2.bucket-name:}") String r2BucketName,
                                    @Value("${app.media.r2.account-id:}") String r2AccountId,
                                    @Value("${app.media.r2.access-key-id:}") String r2AccessKeyId,
                                    @Value("${app.media.r2.secret-access-key:}") String r2SecretAccessKey,
                                    @Value("${app.media.r2.endpoint:}") String r2Endpoint,
                                    @Value("${app.media.r2.public-base-url:}") String r2PublicBaseUrl,
                                    @Value("${app.media.r2.region:auto}") String r2Region,
                                    @Value("${app.media.r2.fallback-inline-on-failure:true}") boolean r2FallbackInlineOnFailure) {
        this.storageProvider = normalizeStorageProvider(storageProvider);
        this.r2BucketName = clean(r2BucketName);
        this.r2AccountId = clean(r2AccountId);
        this.r2AccessKeyId = clean(r2AccessKeyId);
        this.r2SecretAccessKey = clean(r2SecretAccessKey);
        this.r2Endpoint = clean(r2Endpoint);
        this.r2PublicBaseUrl = trimTrailingSlash(clean(r2PublicBaseUrl));
        this.r2Region = StringUtils.hasText(r2Region) ? r2Region.trim() : "auto";
        this.r2FallbackInlineOnFailure = r2FallbackInlineOnFailure;
    }

    public MediaPipelineServiceImpl(String storageProvider,
                                    String r2BucketName,
                                    String r2AccountId,
                                    String r2AccessKeyId,
                                    String r2SecretAccessKey,
                                    String r2Endpoint,
                                    String r2PublicBaseUrl,
                                    String r2Region) {
        this(storageProvider, r2BucketName, r2AccountId, r2AccessKeyId, r2SecretAccessKey,
                r2Endpoint, r2PublicBaseUrl, r2Region, true);
    }

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
            image.setAlt(cleanAlt(request.alt()));
            image.setSize(payload.size());
            image.setMimeType(payload.mimeType());
            image.setWidth(cleanDimension(request.width()));
            image.setHeight(cleanDimension(request.height()));
            if (isR2Enabled()) {
                try {
                    applyR2Storage(image, payload, thumbnail);
                } catch (ResponseStatusException ex) {
                    if (!r2FallbackInlineOnFailure) {
                        throw ex;
                    }
                    log.warn("R2 image storage failed with status {}. Falling back to inline media storage for image {}.",
                            ex.getStatusCode(), image.getId());
                    applyInlineStorage(image, request.data().trim(), thumbnail);
                }
            } else {
                applyInlineStorage(image, request.data().trim(), thumbnail);
            }
            result.add(image);
        }
        return result;
    }

    @Override
    public MediaSmokeTestResponse smokeTest() {
        List<ContentImage> images = prepareContentImages(List.of(new ContentImageRequest(
                SMOKE_TEST_IMAGE,
                "r2-smoke-test"
        )));
        if (images.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Smoke test media tidak menghasilkan file");
        }
        ContentImage image = images.getFirst();
        boolean publicReadable = isR2Enabled() && isPubliclyReadable(image.getData());
        String message = isR2Enabled()
                ? (publicReadable ? "Upload R2 berhasil dan URL publik bisa dibaca" : "Upload R2 berhasil, tapi URL publik belum bisa dibaca")
                : "Media pipeline masih memakai inline storage";
        return new MediaSmokeTestResponse(image.getStorageProvider(), image.getData(), image.getStorageKey(), publicReadable, message);
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
        return new ImagePayload(mimeType, decoded);
    }

    private void applyR2Storage(ContentImage image, ImagePayload payload, String thumbnailDataUrl) {
        ensureR2Configured();
        String extension = extensionFor(payload.mimeType());
        String key = objectKey(image.getId(), extension, false);
        putObject(key, payload.mimeType(), payload.bytes());
        image.setData(publicUrl(key));
        image.setStorageProvider(R2_STORAGE_PROVIDER);
        image.setStorageKey(key);

        if (StringUtils.hasText(thumbnailDataUrl)) {
            ImagePayload thumbnail = validateImageDataUrl(thumbnailDataUrl, MAX_THUMBNAIL_DATA_URL_LENGTH, MAX_THUMBNAIL_BYTES);
            String thumbnailKey = objectKey(image.getId(), extensionFor(thumbnail.mimeType()), true);
            putObject(thumbnailKey, thumbnail.mimeType(), thumbnail.bytes());
            image.setThumbnail(publicUrl(thumbnailKey));
            image.setThumbnailStorageKey(thumbnailKey);
        } else {
            image.setThumbnail(image.getData());
        }
    }

    private void putObject(String key, String contentType, byte[] bytes) {
        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(r2BucketName)
                    .key(key)
                    .contentType(contentType)
                    .cacheControl("public, max-age=31536000, immutable")
                    .build();
            s3().putObject(request, RequestBody.fromBytes(bytes));
        } catch (SdkException | IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Upload gambar ke R2 gagal");
        }
    }

    private S3Client s3() {
        S3Client current = s3Client;
        if (current != null) {
            return current;
        }
        synchronized (this) {
            if (s3Client == null) {
                s3Client = S3Client.builder()
                        .endpointOverride(URI.create(effectiveR2Endpoint()))
                        .region(Region.of(r2Region))
                        .credentialsProvider(StaticCredentialsProvider.create(
                                AwsBasicCredentials.create(r2AccessKeyId, r2SecretAccessKey)
                        ))
                        .serviceConfiguration(S3Configuration.builder()
                                .pathStyleAccessEnabled(true)
                                .build())
                        .httpClientBuilder(UrlConnectionHttpClient.builder())
                        .build();
            }
            return s3Client;
        }
    }

    private void ensureR2Configured() {
        if (!StringUtils.hasText(r2BucketName)
                || !StringUtils.hasText(r2AccessKeyId)
                || !StringUtils.hasText(r2SecretAccessKey)
                || !StringUtils.hasText(effectiveR2Endpoint())
                || !StringUtils.hasText(r2PublicBaseUrl)) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Konfigurasi R2 belum lengkap");
        }
    }

    private boolean isR2Enabled() {
        return "r2".equals(storageProvider);
    }

    private String objectKey(String id, String extension, boolean thumbnail) {
        LocalDate today = LocalDate.now();
        String suffix = thumbnail ? "-thumb" : "";
        return "content/%d/%02d/%s%s.%s".formatted(today.getYear(), today.getMonthValue(), id, suffix, extension);
    }

    private String publicUrl(String key) {
        return r2PublicBaseUrl + "/" + key;
    }

    private boolean isPubliclyReadable(String url) {
        if (!StringUtils.hasText(url)) {
            return false;
        }
        try {
            HttpURLConnection connection = (HttpURLConnection) URI.create(url).toURL().openConnection();
            connection.setRequestMethod("HEAD");
            connection.setConnectTimeout(4_000);
            connection.setReadTimeout(4_000);
            int responseCode = connection.getResponseCode();
            return responseCode >= 200 && responseCode < 400;
        } catch (Exception ignored) {
            return false;
        }
    }

    private void applyInlineStorage(ContentImage image, String dataUrl, String thumbnail) {
        image.setData(dataUrl);
        image.setThumbnail(thumbnail);
        image.setStorageProvider(INLINE_STORAGE_PROVIDER);
        image.setStorageKey("content-image/" + image.getId());
    }

    private String effectiveR2Endpoint() {
        if (StringUtils.hasText(r2Endpoint)) {
            return r2Endpoint;
        }
        if (StringUtils.hasText(r2AccountId)) {
            return "https://" + r2AccountId + ".r2.cloudflarestorage.com";
        }
        return "";
    }

    private String extensionFor(String mimeType) {
        return switch (mimeType) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            default -> "webp";
        };
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

    private String normalizeStorageProvider(String value) {
        String normalized = clean(value).toLowerCase(Locale.ROOT);
        return "r2".equals(normalized) ? "r2" : "inline";
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private String trimTrailingSlash(String value) {
        String clean = clean(value);
        while (clean.endsWith("/")) {
            clean = clean.substring(0, clean.length() - 1);
        }
        return clean;
    }

    private record ImagePayload(String mimeType, byte[] bytes) {
        long size() {
            return bytes.length;
        }
    }
}
