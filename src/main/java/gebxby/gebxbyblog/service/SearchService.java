package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.SearchResponse;

public interface SearchService {
    SearchResponse search(String query, String type, int size);
}
