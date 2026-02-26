package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.repository.ContentRepository;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.UUID;

@Service

public class ContentServiceImpl implements ContentService{
    private ContentRepository contentRepository;
    @Autowired
    public ContentServiceImpl(ContentRepository contentRepository) {
        this.contentRepository = contentRepository;
    }
    @Override
    public Content addContent(Content content) {
        contentRepository.addContent(content);

        return content;
    }
    @Override
    public Content addContentFromDocx(MultipartFile file, String title) throws IOException {
        XWPFDocument document = new XWPFDocument(file.getInputStream());
        XWPFWordExtractor extractor = new XWPFWordExtractor(document);
        String text = extractor.getText();
        extractor.close();

        Content newContent = new Content();
        newContent.setHead(title);
        newContent.setParagrafs(text);

        // Sekarang contentRepository tidak akan null lagi
        return contentRepository.addContent(newContent);
    }
    @Override
    public List<Content> findAll() {

        Iterator<Content> contentIterator;
        contentIterator = contentRepository.findAll();
        List<Content> allContent = new ArrayList<Content>();
        contentIterator.forEachRemaining(allContent::add);
        return allContent;
    }

    @Override
    public Content findContentById(UUID contentId) {
        return contentRepository.findId(contentId);
    }

    @Override
    public Content updateContent(UUID id, Content contentDetails) {

        try {
            Content existingContent = contentRepository.findId(id);
            existingContent.setHead(contentDetails.getHead());
            existingContent.setParagrafs(contentDetails.getParagrafs());

            return contentRepository.save(existingContent);

        } catch (Exception e) {
            throw new RuntimeException("Data tidak di temukan!");

        }


    }

    @Override
    public void deleteContent(UUID id) {
        contentRepository.deleteById(id);
    }
}
