package gebxby.gebxbyblog.dto;

import java.util.List;

public record ContentRequest(
        String head,
        String subtitle,
        String paragrafs,
        String kategori,
        List<ContentImageRequest> images
) {
    public ContentRequest(String head, String subtitle, String paragrafs, String kategori) {
        this(head, subtitle, paragrafs, kategori, List.of());
    }
}
