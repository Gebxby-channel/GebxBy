package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.EmailDomainRequest;
import gebxby.gebxbyblog.dto.EmailDomainResponse;
import gebxby.gebxbyblog.model.AllowedEmailDomain;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.AllowedEmailDomainRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailDomainPolicyServiceImplTest {
    @Mock
    private AllowedEmailDomainRepository repository;

    private EmailDomainPolicyServiceImpl service;
    private User admin;

    @BeforeEach
    void setUp() {
        service = new EmailDomainPolicyServiceImpl(repository);
        admin = new User();
        admin.setUserID(UUID.randomUUID());
        admin.setRole("ADMIN");
    }

    @Test
    void createNormalizesDomainAndRejectsDuplicate() {
        when(repository.existsByDomain("g.com")).thenReturn(false, true);
        when(repository.save(any(AllowedEmailDomain.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EmailDomainResponse response = service.create(new EmailDomainRequest("@G.COM"), admin);

        assertEquals("g.com", response.domain());
        assertThrows(ResponseStatusException.class, () -> service.create(new EmailDomainRequest("g.com"), admin));
    }

    @Test
    void trustedCustomDomainChecksEmailDomain() {
        when(repository.existsByDomain("g.com")).thenReturn(true);

        assertTrue(service.isTrustedCustomDomain("Uname@G.com"));
    }
}
