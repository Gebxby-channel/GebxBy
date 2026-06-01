package gebxby.gebxbyblog.dto;

public record UsernameCheckResponse(
        String username,
        boolean available,
        String message
) {
}
