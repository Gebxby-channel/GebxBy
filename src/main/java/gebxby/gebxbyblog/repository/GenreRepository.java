package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.Genre;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GenreRepository extends MongoRepository<Genre, UUID> {
    List<Genre> findAllByOrderByNameAsc();
    Optional<Genre> findByNameIgnoreCase(String name);
}
