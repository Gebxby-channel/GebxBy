package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.Content;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.UUID;
@Repository
public class ContentRepository {


    private List<Content> contentData = new ArrayList<Content>();


    public Content addContent (Content content){
        if(content.getIdContent() == null){
            content.setIdContent(UUID.randomUUID());
        }
        contentData.add(content);

        return content;
    }

    public Iterator<Content> findAll(){
        return contentData.iterator();
    }

    public Content findId(String contentId) {
        for(Content content : contentData){
            if(content.getIdContent().equals(contentId)) {
                return content;
            }
        }
        return null;
    }
}
