package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.ProfileCardTemplate;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.UUID;

public interface ProfileCardTemplateRepository extends MongoRepository<ProfileCardTemplate, UUID> {
    List<ProfileCardTemplate> findAllByOrderByCreatedAtDesc();
}
