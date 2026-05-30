package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.AnalyticsResponse;
import gebxby.gebxbyblog.dto.ContentRequest;
import gebxby.gebxbyblog.dto.ContentResponse;
import gebxby.gebxbyblog.dto.ContentStatsResponse;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.model.VoteDirection;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

public interface ContentService {
    ContentResponse addContent(ContentRequest request, User author);
    ContentResponse addContentFromDocx(MultipartFile file, String kategori, String title, User author) throws IOException;
    List<ContentResponse> findAll(User viewer);
    List<ContentResponse> findByCategory(String category, User viewer);
    ContentResponse findContentById(UUID id, User viewer, boolean incrementView);
    ContentResponse updateContent(UUID id, ContentRequest contentDetails, User actor);
    void deleteContent(UUID id, User actor);
    ContentStatsResponse getStats(UUID id, User viewer);
    ContentStatsResponse vote(UUID id, VoteDirection vote, User voter);
    List<String> findCategories();
    AnalyticsResponse getAnalytics(User viewer);
}
