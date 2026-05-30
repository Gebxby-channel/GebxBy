package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.CommentRequest;
import gebxby.gebxbyblog.dto.CommentResponse;
import gebxby.gebxbyblog.model.Comment;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.CommentRepository;
import gebxby.gebxbyblog.repository.ContentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentServiceImplTest {
    @Mock
    private CommentRepository commentRepository;
    @Mock
    private ContentRepository contentRepository;
    @Mock
    private UserService userService;

    private CommentServiceImpl commentService;
    private User author;
    private Content content;
    private Comment parent;

    @BeforeEach
    void setUp() {
        commentService = new CommentServiceImpl(commentRepository, contentRepository, userService, new ForumMapper());

        author = new User();
        author.setUserID(UUID.randomUUID());
        author.setName("Commenter");

        content = new Content();
        content.setIdContent(UUID.randomUUID());
        content.setCommentCount(0);

        parent = new Comment();
        parent.setId(UUID.randomUUID());
        parent.setContentId(content.getIdContent());
        parent.setUser(author);
        parent.setBody("Parent");
        parent.setCreatedAt(LocalDateTime.now());
        parent.setUpdatedAt(LocalDateTime.now());
    }

    @Test
    void addCommentSanitizesBodyAndIncrementsCount() {
        when(contentRepository.findById(content.getIdContent())).thenReturn(Optional.of(content));
        when(commentRepository.save(any(Comment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CommentResponse response = commentService.addComment(
                content.getIdContent(),
                new CommentRequest("<b>Hello</b><script>bad()</script>", null),
                author
        );

        assertEquals("Hello", response.body());
        assertEquals(1, content.getCommentCount());
        verify(userService).ensureActive(author);
        verify(contentRepository).save(content);
    }

    @Test
    void addReplyRequiresParentOnSameContent() {
        when(contentRepository.findById(content.getIdContent())).thenReturn(Optional.of(content));
        when(commentRepository.findByIdAndContentId(parent.getId(), content.getIdContent())).thenReturn(Optional.of(parent));
        when(commentRepository.save(any(Comment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CommentResponse response = commentService.addComment(
                content.getIdContent(),
                new CommentRequest("Reply", parent.getId()),
                author
        );

        assertEquals(parent.getId(), response.parentId());
    }

    @Test
    void deleteCommentAllowsOwnerAndSoftDeletes() {
        when(commentRepository.findByIdAndContentId(parent.getId(), content.getIdContent())).thenReturn(Optional.of(parent));
        when(contentRepository.findById(content.getIdContent())).thenReturn(Optional.of(content));

        commentService.deleteComment(content.getIdContent(), parent.getId(), author);

        assertTrue(parent.isDeleted());
        assertEquals("", parent.getBody());
        verify(commentRepository).save(parent);
    }

    @Test
    void deleteCommentRejectsNonOwnerNonAdmin() {
        User other = new User();
        other.setUserID(UUID.randomUUID());
        when(commentRepository.findByIdAndContentId(parent.getId(), content.getIdContent())).thenReturn(Optional.of(parent));

        assertThrows(ResponseStatusException.class, () ->
                commentService.deleteComment(content.getIdContent(), parent.getId(), other)
        );
        assertFalse(parent.isDeleted());
    }

    @Test
    void findThreadBuildsNestedReplies() {
        Comment reply = new Comment();
        reply.setId(UUID.randomUUID());
        reply.setContentId(content.getIdContent());
        reply.setParentId(parent.getId());
        reply.setUser(author);
        reply.setBody("Reply");
        reply.setCreatedAt(LocalDateTime.now().plusMinutes(1));

        when(commentRepository.findByContentIdOrderByCreatedAtAsc(content.getIdContent())).thenReturn(List.of(parent, reply));

        List<CommentResponse> thread = commentService.findThread(content.getIdContent());

        assertEquals(1, thread.size());
        assertEquals(1, thread.getFirst().replies().size());
    }
}
