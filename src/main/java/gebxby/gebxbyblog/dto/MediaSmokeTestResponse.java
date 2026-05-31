package gebxby.gebxbyblog.dto;

public record MediaSmokeTestResponse(
        String provider,
        String url,
        String storageKey,
        boolean publicReadable,
        String message
) {
}
