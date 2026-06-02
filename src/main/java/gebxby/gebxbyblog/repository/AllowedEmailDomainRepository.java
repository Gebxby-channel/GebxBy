package gebxby.gebxbyblog.repository;

import gebxby.gebxbyblog.model.AllowedEmailDomain;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AllowedEmailDomainRepository extends MongoRepository<AllowedEmailDomain, UUID> {
    Optional<AllowedEmailDomain> findByDomain(String domain);

    boolean existsByDomain(String domain);

    List<AllowedEmailDomain> findAllByOrderByDomainAsc();
}
