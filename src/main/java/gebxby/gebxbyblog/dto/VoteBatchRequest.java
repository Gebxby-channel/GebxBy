package gebxby.gebxbyblog.dto;

import java.util.List;
import java.util.UUID;

public record VoteBatchRequest(
        List<UUID> contentIds
) {
}
