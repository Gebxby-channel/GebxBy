package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.dto.GenreResponse;
import gebxby.gebxbyblog.service.GenreService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.CacheControl;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.time.Duration;

@RestController
@RequestMapping("/content")
public class GenreController {
    private final GenreService genreService;

    public GenreController(GenreService genreService) {
        this.genreService = genreService;
    }

    @GetMapping("/genre-definitions")
    public ResponseEntity<List<GenreResponse>> genreDefinitions() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic())
                .body(genreService.findAll());
    }
}
