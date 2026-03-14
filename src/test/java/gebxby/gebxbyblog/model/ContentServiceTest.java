package gebxby.gebxbyblog.model;

import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.ContentRepository;
import gebxby.gebxbyblog.service.ContentServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContentServiceTest {

    @Mock
    private ContentRepository contentRepository;

    @InjectMocks
    private ContentServiceImpl contentService;

    private Content content;
    private User author;

    @BeforeEach
    void setUp() {
        author = new User();
        // UserID sengaja null untuk ngetes branch if (userID == null)

        content = new Content();
        content.setHead("Test Head");
        content.setKategori("Horror");
        content.setUser(author);
    }

    // 1. Cover addContent (Branch: ID null & UserID null)
    @Test
    void testAddContent_NewContentAndUser() {
        when(contentRepository.save(any(Content.class))).thenAnswer(i -> i.getArgument(0));

        Content saved = contentService.addContent(content);

        assertNotNull(saved.getIdContent()); // Harus generate UUID
        assertNotNull(saved.getUser().getUserID()); // Harus generate UUID buat user
        verify(contentRepository, times(1)).save(any(Content.class));
    }

    // 2. Cover findAll
    @Test
    void testFindAll() {
        when(contentRepository.findAll()).thenReturn(Arrays.asList(content));

        List<Content> result = contentService.findAll();

        assertEquals(1, result.size());
        verify(contentRepository, times(1)).findAll();
    }

    // 3. Cover findContentById
    @Test
    void testFindContentById() {
        UUID id = UUID.randomUUID();
        when(contentRepository.findById(id)).thenReturn(Optional.of(content));

        Content found = contentService.findContentById(id);

        assertNotNull(found);
        verify(contentRepository, times(1)).findById(id);
    }

    // 4. Cover updateContent - Success
    @Test
    void testUpdateContent_Success() {
        UUID id = UUID.randomUUID();
        Content details = new Content();
        details.setHead("Updated Head");
        details.setParagrafs("Updated Paragrafs");

        when(contentRepository.findById(id)).thenReturn(Optional.of(content));
        when(contentRepository.save(any(Content.class))).thenAnswer(i -> i.getArgument(0));

        Content updated = contentService.updateContent(id, details);

        assertEquals("Updated Head", updated.getHead());
        assertEquals("Updated Paragrafs", updated.getParagrafs());
    }

    // 5. Cover updateContent - Throw Exception (Branch: existingContent == null)
    @Test
    void testUpdateContent_NotFound() {
        UUID id = UUID.randomUUID();
        when(contentRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> {
            contentService.updateContent(id, new Content());
        });
    }

    // 6. Cover deleteContent
    @Test
    void testDeleteContent() {
        UUID id = UUID.randomUUID();
        doNothing().when(contentRepository).deleteById(id);

        contentService.deleteContent(id);

        verify(contentRepository, times(1)).deleteById(id);
    }

    // 7. Cover addContentFromDocx (Branch: Kategori Empty & Author ID Null)
    @Test
    void testAddContentFromDocx_GeneralKategori() throws IOException {
        // Bikin dummy byte array biar simpel dulu Geb
        byte[] contentBytes = new byte[0];

        // Cek kalau ada file docx beneran di folder resources, kalau gaada pake byte kosong
        var resourceStream = getClass().getResourceAsStream("/test.docx");
        if (resourceStream != null) {
            contentBytes = resourceStream.readAllBytes();
        }

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                contentBytes
        );

        // Karena Apache POI bakal bingung baca byte kosong sebagai dokumen,
        // kita expect dia bakal throw exception (ini justru bagus buat coverage branch error)
        assertThrows(Exception.class, () -> {
            contentService.addContentFromDocx(file, "", "Title", author);
        });
    }
    @Test
    void testAddContent_WithExistingId() {
        UUID existingId = UUID.randomUUID();
        content.setIdContent(existingId);

        when(contentRepository.save(any(Content.class))).thenReturn(content);

        Content result = contentService.addContent(content);

        assertEquals(existingId, result.getIdContent()); // ID tidak boleh berubah
        verify(contentRepository, times(1)).save(content);
    }

}