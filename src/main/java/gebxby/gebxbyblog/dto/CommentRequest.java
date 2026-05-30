package gebxby.gebxbyblog.dto;

import java.util.UUID;

public record CommentRequest(String body, UUID parentId) {
}
