package gebxby.gebxbyblog.dto;

public record ContentImageRequest(
        String data,
        String thumbnail,
        String alt
) {
    public ContentImageRequest(String data, String alt) {
        this(data, null, alt);
    }
}
