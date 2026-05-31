package gebxby.gebxbyblog.dto;

public record ContentImageResponse(
        String id,
        String data,
        String thumbnail,
        String alt,
        long size,
        String mimeType,
        String storageProvider,
        String storageKey,
        Integer width,
        Integer height
) {
    public ContentImageResponse(String id, String data, String alt, long size) {
        this(id, data, null, alt, size, null, null, null, null, null);
    }

    public ContentImageResponse(String id, String data, String thumbnail, String alt, long size) {
        this(id, data, thumbnail, alt, size, null, null, null, null, null);
    }
}
