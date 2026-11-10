package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.MediaMigrationResponse;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.repository.ContentRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MediaMigrationService {
    private static final int MAX_CONTENTS_PER_BATCH = 3;

    private final ContentRepository contentRepository;
    private final MediaPipelineService mediaPipelineService;
    private final MongoTemplate mongoTemplate;

    public MediaMigrationService(ContentRepository contentRepository,
                                 MediaPipelineService mediaPipelineService,
                                 MongoTemplate mongoTemplate) {
        this.contentRepository = contentRepository;
        this.mediaPipelineService = mediaPipelineService;
        this.mongoTemplate = mongoTemplate;
    }

    public MediaMigrationResponse migrateNextBatch() {
        // Validate that R2 is enabled even when no inline images remain.
        mediaPipelineService.migrateInlineContentImages(List.of());

        List<Content> candidates = contentRepository.findContentsWithInlineImages(
                PageRequest.of(0, MAX_CONTENTS_PER_BATCH + 1)
        );
        int batchSize = Math.min(MAX_CONTENTS_PER_BATCH, candidates.size());
        int migratedContents = 0;
        int migratedImages = 0;

        for (Content content : candidates.subList(0, batchSize)) {
            int count = mediaPipelineService.migrateInlineContentImages(content.getImages());
            if (count > 0) {
                mongoTemplate.updateFirst(
                        Query.query(Criteria.where("_id").is(content.getIdContent())),
                        Update.update("images", content.getImages()),
                        Content.class
                );
                migratedContents++;
                migratedImages += count;
            }
        }

        return new MediaMigrationResponse(migratedContents, migratedImages,
                !contentRepository.existsContentsWithInlineImages());
    }
}
