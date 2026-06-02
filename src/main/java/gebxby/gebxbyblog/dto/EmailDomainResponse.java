package gebxby.gebxbyblog.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record EmailDomainResponse(
        UUID id,
        String domain,
        LocalDateTime createdAt
) {
}
