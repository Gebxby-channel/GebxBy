package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.GenreRequest;
import gebxby.gebxbyblog.dto.GenreResponse;
import gebxby.gebxbyblog.model.Genre;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.GenreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GenreServiceImplTest {
    @Mock
    private GenreRepository genreRepository;
    @Mock
    private UserService userService;

    private GenreServiceImpl genreService;
    private User admin;

    @BeforeEach
    void setUp() {
        genreService = new GenreServiceImpl(genreRepository, userService);
        admin = new User();
        admin.setRole("ADMIN");
    }

    @Test
    void createStoresAdminGenreWithHexColor() {
        when(userService.isAdmin(admin)).thenReturn(true);
        when(genreRepository.findByNameIgnoreCase("Rumor")).thenReturn(Optional.empty());
        when(genreRepository.save(any(Genre.class))).thenAnswer(invocation -> invocation.getArgument(0));

        GenreResponse response = genreService.create(new GenreRequest("Rumor", "#38bdf8"), admin);

        assertEquals("Rumor", response.name());
        assertEquals("#38bdf8", response.color());
    }

    @Test
    void createRejectsInvalidColor() {
        when(userService.isAdmin(admin)).thenReturn(true);

        assertThrows(ResponseStatusException.class, () -> genreService.create(new GenreRequest("Rumor", "blue"), admin));
    }
}
