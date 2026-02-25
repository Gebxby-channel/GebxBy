package gebxby.gebxbyblog.controller;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.service.ContentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController // Ubah ini
@RequestMapping("/content")
@CrossOrigin(origins = "http://localhost:3000")
public class ContentController {

    private final ContentService service;

    @Autowired
    public ContentController(ContentService service) {
        this.service = service;
    }

    @PostMapping("/upload")
    public String uploadFile(@RequestParam("file") MultipartFile file, @RequestParam("title") String title) {
        try {
            // PERBAIKAN: Gunakan variabel 'service', bukan nama Interface-nya
            service.addContentFromDocx(file, title);
            return "redirect:/content/all-content"; // Pastikan path redirect benar
        } catch (IOException e) {
            return "error-page";
        }
    }

    @GetMapping("/upload-page")
    public String showUploadPage() {
        return "upload";
    }

    @GetMapping("/all-content")
    public String showAllContent(Model model) {
        // Mengambil semua data yang tadi di-upload
        List<Content> contents = service.findAll();
        model.addAttribute("contents", contents);
        return "all-content"; // Mengarah ke file HTML bernama all-content.html
    }

}
