package gebxby.gebxbyblog.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.client.MongoDatabase;
import gebxby.gebxbyblog.model.User;
import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.zip.ZipInputStream;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DataBackupServiceImplTest {
    @Mock
    private MongoTemplate mongoTemplate;
    @Mock
    private MongoDatabase mongoDatabase;
    @Mock
    private UserService userService;

    private DataBackupServiceImpl backupService;
    private User admin;

    @BeforeEach
    void setUp() {
        backupService = new DataBackupServiceImpl(mongoTemplate, userService, new ObjectMapper().findAndRegisterModules());
        admin = new User();
        admin.setUserID(UUID.randomUUID());
        admin.setName("Jill Valentine");
        admin.setEmail("jill@admin.code.x.avernico.com");
        admin.setRole("ADMIN");
    }

    @Test
    void createBackupExportsManifestAndCollectionsAsZip() throws Exception {
        when(userService.isAdmin(admin)).thenReturn(true);
        when(mongoTemplate.getDb()).thenReturn(mongoDatabase);
        when(mongoDatabase.getName()).thenReturn("blog_db");
        when(mongoTemplate.getCollectionNames()).thenReturn(Set.of("users", "contents", "system.profile"));
        when(mongoTemplate.findAll(Document.class, "contents")).thenReturn(List.of(new Document("head", "Archive File")));
        when(mongoTemplate.findAll(Document.class, "users")).thenReturn(List.of(new Document("name", "Jill")));

        BackupArchive archive = backupService.createBackup(admin);

        Map<String, String> entries = unzip(archive.bytes());
        assertTrue(archive.filename().startsWith("codexavernico-backup-"));
        assertTrue(entries.containsKey("manifest.json"));
        assertTrue(entries.containsKey("collections/001-contents.json"));
        assertTrue(entries.containsKey("collections/002-users.json"));
        assertFalse(entries.containsKey("collections/003-system.profile.json"));
        assertTrue(entries.get("manifest.json").contains("\"databaseName\" : \"blog_db\""));
        assertTrue(entries.get("manifest.json").contains("\"documentCount\" : 1"));
        assertTrue(entries.get("collections/001-contents.json").contains("\"head\": \"Archive File\""));
        assertTrue(entries.get("collections/002-users.json").contains("\"name\": \"Jill\""));
    }

    @Test
    void createBackupRejectsNonAdminBeforeReadingDatabase() {
        User normalUser = new User();
        normalUser.setRole("USER");
        when(userService.isAdmin(normalUser)).thenReturn(false);

        assertThrows(ResponseStatusException.class, () -> backupService.createBackup(normalUser));
        verifyNoInteractions(mongoTemplate);
    }

    private Map<String, String> unzip(byte[] bytes) throws IOException {
        Map<String, String> entries = new LinkedHashMap<>();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(bytes), StandardCharsets.UTF_8)) {
            java.util.zip.ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                entries.put(entry.getName(), new String(zip.readAllBytes(), StandardCharsets.UTF_8));
                zip.closeEntry();
            }
        }
        return entries;
    }
}
