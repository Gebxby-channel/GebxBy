package gebxby.gebxbyblog.dto;

import java.time.LocalDateTime;

public record ApiErrorResponse(
        int status,
        String code,
        String message,
        String path,
        LocalDateTime timestamp
) {
}
