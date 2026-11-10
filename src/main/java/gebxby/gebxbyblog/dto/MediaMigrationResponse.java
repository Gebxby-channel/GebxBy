package gebxby.gebxbyblog.dto;

public record MediaMigrationResponse(
        int migratedContents,
        int migratedImages,
        boolean complete
) {
}
