package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.model.Content;

import gebxby.gebxbyblog.model.User;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;


public interface ContentService {

    public Content addContent(Content content);
    public Content addContentFromDocx(MultipartFile file, String title, User author) throws IOException;
    public List<Content>findAll();
    public Content findContentById(UUID id);
    public Content updateContent(UUID id, Content contentDetails);
    void deleteContent(UUID id);

}
