package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.GenreRequest;
import gebxby.gebxbyblog.dto.GenreResponse;
import gebxby.gebxbyblog.model.Genre;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.GenreRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class GenreServiceImpl implements GenreService {
    private static final int MAX_NAME_LENGTH = 60;
    private final GenreRepository genreRepository;
    private final UserService userService;

    public GenreServiceImpl(GenreRepository genreRepository, UserService userService) {
        this.genreRepository = genreRepository;
        this.userService = userService;
    }

    @Override
    public List<GenreResponse> findAll() {
        return genreRepository.findAllByOrderByNameAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public GenreResponse create(GenreRequest request, User admin) {
        requireAdmin(admin);
        String name = normalizeName(request == null ? null : request.name());
        if (genreRepository.findByNameIgnoreCase(name).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Genre sudah ada");
        }
        LocalDateTime now = LocalDateTime.now();
        Genre genre = new Genre();
        genre.setId(UUID.randomUUID());
        genre.setName(name);
        genre.setColor(normalizeColor(request == null ? null : request.color()));
        genre.setCreatedAt(now);
        genre.setUpdatedAt(now);
        return toResponse(genreRepository.save(genre));
    }

    @Override
    public GenreResponse update(UUID id, GenreRequest request, User admin) {
        requireAdmin(admin);
        Genre genre = genreRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Genre tidak ditemukan"));
        genre.setName(normalizeName(request == null ? null : request.name()));
        genre.setColor(normalizeColor(request == null ? null : request.color()));
        genre.setUpdatedAt(LocalDateTime.now());
        return toResponse(genreRepository.save(genre));
    }

    @Override
    public void delete(UUID id, User admin) {
        requireAdmin(admin);
        if (!genreRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Genre tidak ditemukan");
        }
        genreRepository.deleteById(id);
    }

    private void requireAdmin(User admin) {
        if (!userService.isAdmin(admin)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }

    private String normalizeName(String value) {
        String clean = trim(value, MAX_NAME_LENGTH).replaceAll("\\s+", " ");
        if (!StringUtils.hasText(clean)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nama genre wajib diisi");
        }
        return clean;
    }

    private String normalizeColor(String value) {
        String clean = trim(value, 24).toLowerCase(Locale.ROOT);
        if (!clean.matches("^#[0-9a-f]{6}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Warna harus format hex #RRGGBB");
        }
        return clean;
    }

    private String trim(String value, int maxLength) {
        String trimmed = value == null ? "" : value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }

    private GenreResponse toResponse(Genre genre) {
        return new GenreResponse(genre.getId(), genre.getName(), genre.getColor(), genre.getCreatedAt(), genre.getUpdatedAt());
    }
}
