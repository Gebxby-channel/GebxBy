package gebxby.gebxbyblog.dto;

public record ContentImageResponse(
        String id,
        String data,
        String thumbnail,
        String alt,
        long size
) {
    public ContentImageResponse(String id, String data, String alt, long size) {
        this(id, data, null, alt, size);
    }
}
