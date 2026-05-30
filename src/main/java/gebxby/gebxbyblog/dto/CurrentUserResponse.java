package gebxby.gebxbyblog.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record CurrentUserResponse(
        UUID userID,
        String name,
        String email,
        String picture,
        String designation,
        String moto,
        String role,
        boolean suspensionMarked,
        LocalDateTime suspendedUntil
) {
}
