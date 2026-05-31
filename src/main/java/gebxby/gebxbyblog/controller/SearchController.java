package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.dto.SearchResponse;
import gebxby.gebxbyblog.service.SearchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
public class SearchController {
    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    public ResponseEntity<SearchResponse> search(
            @RequestParam("q") String query,
            @RequestParam(value = "type", defaultValue = "all") String type,
            @RequestParam(value = "size", defaultValue = "5") int size) {
        return ResponseEntity.ok(searchService.search(query, type, size));
    }
}
