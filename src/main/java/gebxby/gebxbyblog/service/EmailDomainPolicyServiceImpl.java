package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.EmailDomainRequest;
import gebxby.gebxbyblog.dto.EmailDomainResponse;
import gebxby.gebxbyblog.model.AllowedEmailDomain;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.AllowedEmailDomainRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class EmailDomainPolicyServiceImpl implements EmailDomainPolicyService {
    private static final int MAX_DOMAIN_LENGTH = 120;

    private final AllowedEmailDomainRepository repository;

    public EmailDomainPolicyServiceImpl(AllowedEmailDomainRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<EmailDomainResponse> findAll(User admin) {
        requireAdmin(admin);
        return repository.findAllByOrderByDomainAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public EmailDomainResponse create(EmailDomainRequest request, User admin) {
        requireAdmin(admin);
        String domain = normalizeDomain(request == null ? null : request.domain());
        if (repository.existsByDomain(domain)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Domain sudah terdaftar");
        }

        AllowedEmailDomain item = new AllowedEmailDomain();
        item.setId(UUID.randomUUID());
        item.setDomain(domain);
        item.setCreatedByUserId(admin.getUserID());
        item.setCreatedAt(LocalDateTime.now());
        return toResponse(repository.save(item));
    }

    @Override
    public void delete(UUID id, User admin) {
        requireAdmin(admin);
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Domain tidak ditemukan");
        }
        repository.deleteById(id);
    }

    @Override
    public boolean isTrustedCustomDomain(String email) {
        try {
            String domain = domainFromEmail(email);
            return StringUtils.hasText(domain) && repository.existsByDomain(domain);
        } catch (ResponseStatusException ex) {
            return false;
        }
    }

    private String normalizeDomain(String value) {
        String domain = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        if (domain.startsWith("@")) {
            domain = domain.substring(1);
        }
        if (!StringUtils.hasText(domain) || domain.length() > MAX_DOMAIN_LENGTH || domain.contains("@") || !domain.contains(".")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Format domain tidak valid");
        }
        if (!domain.matches("^[a-z0-9][a-z0-9.-]*[a-z0-9]$") || domain.contains("..")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Format domain tidak valid");
        }
        return domain;
    }

    private String domainFromEmail(String email) {
        String clean = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        int at = clean.lastIndexOf('@');
        if (at < 0 || at == clean.length() - 1) {
            return "";
        }
        return normalizeDomain(clean.substring(at + 1));
    }

    private void requireAdmin(User admin) {
        if (admin == null || !admin.isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }

    private EmailDomainResponse toResponse(AllowedEmailDomain domain) {
        return new EmailDomainResponse(domain.getId(), domain.getDomain(), domain.getCreatedAt());
    }
}
