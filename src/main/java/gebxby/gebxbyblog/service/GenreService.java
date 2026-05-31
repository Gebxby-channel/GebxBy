package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.GenreRequest;
import gebxby.gebxbyblog.dto.GenreResponse;
import gebxby.gebxbyblog.model.User;

import java.util.List;
import java.util.UUID;

public interface GenreService {
    List<GenreResponse> findAll();
    GenreResponse create(GenreRequest request, User admin);
    GenreResponse update(UUID id, GenreRequest request, User admin);
    void delete(UUID id, User admin);
}
