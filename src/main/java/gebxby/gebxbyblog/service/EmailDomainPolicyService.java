package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.EmailDomainRequest;
import gebxby.gebxbyblog.dto.EmailDomainResponse;
import gebxby.gebxbyblog.model.User;

import java.util.List;
import java.util.UUID;

public interface EmailDomainPolicyService {
    List<EmailDomainResponse> findAll(User admin);

    EmailDomainResponse create(EmailDomainRequest request, User admin);

    void delete(UUID id, User admin);

    boolean isTrustedCustomDomain(String email);
}
