package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.ContentRepository;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.UUID;

@Service
public class ContentServiceImpl implements ContentService {

    private final ContentRepository contentRepository;

    @Autowired
    public ContentServiceImpl(ContentRepository contentRepository) {
        this.contentRepository = contentRepository;
    }

    @Override
    public Content addContent(Content content) {
        // 1. Buat ID Content kalau kosong
        if (content.getIdContent() == null) {
            content.setIdContent(UUID.randomUUID());
        }

        // 2. Buat ID User kalau kosong agar tidak error di MongoDB
        if (content.getUser() != null && content.getUser().getUserID() == null) {
            content.getUser().setUserID(UUID.randomUUID());
        }
        return contentRepository.save(content);
    }

    @Override
    public Content addContentFromDocx(MultipartFile file, String kategori, String title, User author) throws IOException {
        String text;
        try (InputStream inputStream = file.getInputStream();
             XWPFDocument document = new XWPFDocument(inputStream);
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            text = extractor.getText();
        }

        Content newContent = new Content();
        newContent.setHead(title);
        newContent.setParagrafs(text);
        newContent.setIdContent(UUID.randomUUID());
        // Sekarang ini tidak akan merah karena parameter 'kategori' sudah ada di atas
        newContent.setKategori(kategori != null && !kategori.isEmpty() ? kategori : "General");

        if (author != null && author.getUserID() == null) {
            author.setUserID(UUID.randomUUID());
        }
        newContent.setUser(author);
        return contentRepository.save(newContent);
    }

    @Override
    public List<Content> findAll() {
        // MongoRepository otomatis mengembalikan List<Content> secara langsung
        return contentRepository.findAll();
    }

    @Override
    public Content findContentById(UUID contentId) { // Ganti UUID jadi String
        // findById() mengembalikan Optional, jadi kita pakai orElse(null)
        return contentRepository.findById(contentId).orElse(null);
    }

    @Override
    public Content updateContent(UUID id, Content contentDetails) { // Ganti UUID jadi String
        Content existingContent = contentRepository.findById(id).orElse(null);

        if (existingContent == null) {
            throw new RuntimeException("Data dengan ID " + id + " tidak ditemukan!");
        }

        existingContent.setHead(contentDetails.getHead());
        existingContent.setParagrafs(contentDetails.getParagrafs());

        return contentRepository.save(existingContent);
    }

    @Override
    public void deleteContent(UUID id) { // Ganti UUID jadi String
        contentRepository.deleteById(id);
    }
}