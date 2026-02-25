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
    public Content findContentById(String contentId) {
        return contentRepository.findId(contentId);
    }
}
