package gebxby.gebxbyblog.dto;

public record ContentImageRequest(
        String data,
        String thumbnail,
        String alt,
        Integer width,
        Integer height
) {
    public ContentImageRequest(String data, String alt) {
        this(data, null, alt, null, null);
    }

    public ContentImageRequest(String data, String thumbnail, String alt) {
        this(data, thumbnail, alt, null, null);
    }
}
