package gebxby.gebxbyblog.dto;

public record ProfileCardRequest(
        String name,
        String description,
        String backgroundImage,
        String orientation,
        ProfileCardLayoutResponse layout
) {
}
