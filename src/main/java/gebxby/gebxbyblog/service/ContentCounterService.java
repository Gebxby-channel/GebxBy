package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.repository.ContentRepository;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class ContentCounterService {
    private final ContentRepository contentRepository;
    private final MongoTemplate mongoTemplate;

    public ContentCounterService(ContentRepository contentRepository, MongoTemplate mongoTemplate) {
        this.contentRepository = contentRepository;
        this.mongoTemplate = mongoTemplate;
    }

    public Content incrementView(UUID contentId) {
        return increment(contentId, 1, 0, 0, 0);
    }

    public Content incrementComments(UUID contentId, long delta) {
        return increment(contentId, 0, 0, 0, delta);
    }

    public Content incrementVotes(UUID contentId, int upDelta, int downDelta) {
        return increment(contentId, 0, upDelta, downDelta, 0);
    }

    private Content increment(UUID contentId, long viewDelta, int upDelta, int downDelta, long commentDelta) {
        if (mongoTemplate != null) {
            Update update = new Update().set("updatedAt", LocalDateTime.now());
            if (viewDelta != 0) {
                update.inc("viewCount", viewDelta);
            }
            if (upDelta != 0) {
                update.inc("upCount", upDelta);
            }
            if (downDelta != 0) {
                update.inc("downCount", downDelta);
            }
            if (commentDelta != 0) {
                update.inc("commentCount", commentDelta);
            }
            mongoTemplate.updateFirst(Query.query(Criteria.where("_id").is(contentId)), update, Content.class);
            return contentRepository.findById(contentId).orElse(null);
        }
        return contentRepository.findById(contentId)
                .map(content -> {
                    if (viewDelta != 0) {
                        content.setViewCount(Math.max(0, content.getViewCount() + viewDelta));
                    }
                    if (upDelta != 0) {
                        content.setUpCount(Math.max(0, content.getUpCount() + upDelta));
                    }
                    if (downDelta != 0) {
                        content.setDownCount(Math.max(0, content.getDownCount() + downDelta));
                    }
                    if (commentDelta != 0) {
                        content.setCommentCount(Math.max(0, content.getCommentCount() + commentDelta));
                    }
                    content.setUpdatedAt(LocalDateTime.now());
                    return contentRepository.save(content);
                })
                .orElse(null);
    }
}
