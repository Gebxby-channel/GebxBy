package gebxby.gebxbyblog.dto;

public record ReportRequest(
        String category,
        String reason
) {
    public ReportRequest(String reason) {
        this("OTHER", reason);
    }
}
