package gebxby.gebxbyblog.controller;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.service.ContentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/content")
@CrossOrigin(origins = "http://localhost:5173")
public class ContentController {

    private final ContentService service;

    @Autowired
    public ContentController(ContentService service) {
        this.service = service;
    }

    @PostMapping("/upload")
    public String uploadFile(@RequestParam("file") MultipartFile file, @RequestParam("title") String title) {
        try {

            service.addContentFromDocx(file, title);
            return "redirect:/content/all-content";
        } catch (IOException e) {
            return "error-page";
        }
    }

    @GetMapping("/upload-page")
    public String showUploadPage() {
        return "upload";
    }

    @GetMapping("/all-content")
    public List<Content> showAllContent(Model model) {
        List<Content> contents = service.findAll();
        model.addAttribute("contents", contents);
        return contents;
    }
    @PutMapping("/edit/{id}")
    public ResponseEntity<Content> updateContent(@PathVariable UUID id, @RequestBody Content contentDetails) {
        return ResponseEntity.ok(service.updateContent(id, contentDetails));
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

    @DeleteMapping("/{id}") // Gunakan @DeleteMapping untuk hapus
    public ResponseEntity<Void> deleteContent(@PathVariable UUID id) {
        service.deleteContent(id);
        return ResponseEntity.noContent().build();
    }
    @PostMapping("/add-manual")
    public ResponseEntity<Content> addManualContent(@RequestBody Content content) {
        // Karena ID dibuat otomatis di Repository, kita tinggal simpan saja
        Content result = service.addContent(content);
        return ResponseEntity.ok(result);
    }
}

