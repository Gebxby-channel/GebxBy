package gebxby.gebxbyblog.dto;

public record CustomBadgeRequest(
        String label,
        String description,
        String icon,
        String image
) {
    public CustomBadgeRequest(String label, String description, String icon) {
        this(label, description, icon, null);
    }
}
