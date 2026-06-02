package gebxby.gebxbyblog.dto;

public record ProfileUpdateRequest(
        String name,
        String username,
        String designation,
        String moto,
        String picture
) {
    public ProfileUpdateRequest(String name, String designation, String moto, String picture) {
        this(name, null, designation, moto, picture);
    }
}
