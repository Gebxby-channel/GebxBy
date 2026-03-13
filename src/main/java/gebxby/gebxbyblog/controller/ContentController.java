package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.service.ContentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

// Paku Anti-CORS
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
@RestController
@RequestMapping("/content")
public class ContentController {

    private final ContentService service;

    @Autowired
    public ContentController(ContentService service) {
        this.service = service;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam("kategori") String kategori,
            @RequestParam("author") String authorName) {
        try {
            User author = new User();
            author.setName(authorName);

            // Panggil service dengan urutan yang sama: file, kategori, title, author
            Content savedContent = service.addContentFromDocx(file, kategori, title, author);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedContent);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @GetMapping("/all-content")
    public ResponseEntity<List<Content>> showAllContent() {
        try {
            List<Content> contents = service.findAll();
            return ResponseEntity.ok(contents);
        } catch (Exception e) {
            e.printStackTrace(); // Tampilkan error 500 di console
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Content> getContentById(@PathVariable UUID id) {
        Content content = service.findContentById(id);
        if (content != null) {
            return ResponseEntity.ok(content);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/add-manual")
    public ResponseEntity<Content> addManualContent(@RequestBody Content content) {
        Content result = service.addContent(content);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PutMapping("/edit/{id}")
    public ResponseEntity<Content> updateContent(@PathVariable UUID id, @RequestBody Content contentDetails) {
        return ResponseEntity.ok(service.updateContent(id, contentDetails));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteContent(@PathVariable UUID id) {
        service.deleteContent(id);
        return ResponseEntity.noContent().build();
    }
}