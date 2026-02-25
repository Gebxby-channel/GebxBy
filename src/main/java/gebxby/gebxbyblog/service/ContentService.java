package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.model.Content;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;



public interface ContentService {

    public Content addContent(Content content);
    public Content addContentFromDocx(MultipartFile file, String title) throws IOException;
    public List<Content>findAll();
    public Content findContentById(String id);
}
