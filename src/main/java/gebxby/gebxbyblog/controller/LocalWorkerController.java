package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.dto.ContentRequest;
import gebxby.gebxbyblog.dto.ContentResponse;
import gebxby.gebxbyblog.dto.WorkerDraftRequest;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.service.ContentService;
import gebxby.gebxbyblog.service.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/worker")
public class LocalWorkerController {
    private static final String TOKEN_HEADER = "X-Worker-Token";
    private static final int MAX_TITLE_LENGTH = 180;
    private static final int MAX_SUBTITLE_LENGTH = 180;
    private static final int MAX_BODY_LENGTH = 20_000;
    private static final int MAX_CATEGORY_LENGTH = 60;

    private final ContentService contentService;
    private final UserService userService;
    private final String workerToken;
    private final String workerUserId;

    public LocalWorkerController(ContentService contentService,
                                 UserService userService,
                                 @Value("${app.worker.token:}") String workerToken,
                                 @Value("${app.worker.user-id:}") String workerUserId) {
        this.contentService = contentService;
        this.userService = userService;
        this.workerToken = workerToken;
        this.workerUserId = workerUserId;
    }

    @PostMapping("/drafts")
    public ResponseEntity<ContentResponse> createDraft(
            @RequestHeader(value = TOKEN_HEADER, required = false) String providedToken,
            @RequestBody WorkerDraftRequest request) {
        authenticate(providedToken);
        validate(request);

        UUID configuredUserId;
        try {
            configuredUserId = UUID.fromString(workerUserId);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Akun worker belum dikonfigurasi dengan benar");
        }

        User author = userService.getUserById(configuredUserId);
        if (!"USER".equalsIgnoreCase(author.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Worker hanya boleh memakai akun biasa, bukan akun admin atau moderator");
        }

        ContentRequest contentRequest = new ContentRequest(
                request.head(), request.subtitle(), request.paragrafs(), request.kategori(), List.of());
        ContentResponse savedDraft = contentService.saveDraft(null, contentRequest, author);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedDraft);
    }

    private void authenticate(String providedToken) {
        if (!StringUtils.hasText(workerToken) || workerToken.length() < 32 || !StringUtils.hasText(workerUserId)) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Worker belum diaktifkan di server");
        }
        if (!StringUtils.hasText(providedToken)
                || !MessageDigest.isEqual(workerToken.getBytes(StandardCharsets.UTF_8),
                providedToken.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token worker tidak valid");
        }
    }

    private void validate(WorkerDraftRequest request) {
        if (request == null || !StringUtils.hasText(request.paragrafs())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Isi draf wajib diisi");
        }
        if (length(request.head()) > MAX_TITLE_LENGTH
                || length(request.subtitle()) > MAX_SUBTITLE_LENGTH
                || request.paragrafs().length() > MAX_BODY_LENGTH
                || length(request.kategori()) > MAX_CATEGORY_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ukuran data draf melebihi batas");
        }
    }

    private int length(String value) {
        return value == null ? 0 : value.length();
    }
}
