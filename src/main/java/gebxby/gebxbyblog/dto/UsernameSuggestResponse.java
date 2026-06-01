package gebxby.gebxbyblog.dto;

import java.util.List;

public record UsernameSuggestResponse(
        List<String> suggestions
) {
}
