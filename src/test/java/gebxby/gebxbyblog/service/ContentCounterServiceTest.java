package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.repository.ContentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContentCounterServiceTest {
    @Mock
    private ContentRepository contentRepository;

    @Test
    void fallbackCounterKeepsVoteAndCommentCountsNonNegative() {
        UUID contentId = UUID.randomUUID();
        Content content = new Content();
        content.setIdContent(contentId);

        when(contentRepository.findById(contentId)).thenReturn(Optional.of(content));
        when(contentRepository.save(any(Content.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ContentCounterService service = new ContentCounterService(contentRepository, null);

        Content afterVotes = service.incrementVotes(contentId, 1, -1);
        Content afterComments = service.incrementComments(contentId, -3);

        assertEquals(1, afterVotes.getUpCount());
        assertEquals(0, afterVotes.getDownCount());
        assertEquals(0, afterComments.getCommentCount());
    }
}
