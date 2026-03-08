package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.Content;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface ContentRepository extends MongoRepository<Content, UUID> {

}