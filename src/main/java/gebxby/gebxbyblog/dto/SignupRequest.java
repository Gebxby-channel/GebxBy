package gebxby.gebxbyblog.dto;

public record SignupRequest(
        String name,
        String email,
        String password,
        String username
) {
}
