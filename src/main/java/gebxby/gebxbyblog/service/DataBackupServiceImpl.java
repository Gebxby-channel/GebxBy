package gebxby.gebxbyblog.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.bson.Document;
import org.bson.json.JsonMode;
import org.bson.json.JsonWriterSettings;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import gebxby.gebxbyblog.model.User;

@Service
public class DataBackupServiceImpl implements DataBackupService {
    private static final JsonWriterSettings JSON_SETTINGS = JsonWriterSettings.builder()
            .outputMode(JsonMode.RELAXED)
            .build();
    private static final DateTimeFormatter FILE_TIMESTAMP = DateTimeFormatter
            .ofPattern("yyyyMMdd-HHmmss")
            .withZone(ZoneOffset.UTC);

    private final MongoTemplate mongoTemplate;
    private final UserService userService;
    private final ObjectMapper objectMapper;

    public DataBackupServiceImpl(MongoTemplate mongoTemplate,
                                 UserService userService,
                                 ObjectMapper objectMapper) {
        this.mongoTemplate = mongoTemplate;
        this.userService = userService;
        this.objectMapper = objectMapper;
    }

    @Override
    public BackupArchive createBackup(User admin) {
        requireAdmin(admin);
        Instant createdAt = Instant.now();
        String databaseName = mongoTemplate.getDb().getName();
        String filename = "codexavernico-backup-%s.zip".formatted(FILE_TIMESTAMP.format(createdAt));

        try {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            try (ZipOutputStream zip = new ZipOutputStream(buffer, StandardCharsets.UTF_8)) {
                List<String> collections = mongoTemplate.getCollectionNames().stream()
                        .filter(this::isBackupCollection)
                        .sorted(Comparator.naturalOrder())
                        .toList();

                List<BackupCollectionSummary> summaries = writeCollections(zip, collections);
                BackupManifest manifest = new BackupManifest(
                        1,
                        "CodeXAvernico",
                        "mongo-relaxed-json-zip",
                        databaseName,
                        createdAt,
                        new BackupActor(admin.getUserID(), admin.getName(), admin.getEmail()),
                        "Database backup stores media metadata and URLs only. R2 object binaries are not downloaded.",
                        summaries
                );
                writeManifest(zip, manifest);
            }
            return new BackupArchive(filename, buffer.toByteArray());
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Gagal membuat archive backup", exception);
        }
    }

    private List<BackupCollectionSummary> writeCollections(ZipOutputStream zip, List<String> collections) {
        return java.util.stream.IntStream.range(0, collections.size())
                .mapToObj(index -> writeCollection(zip, collections.get(index), index + 1))
                .toList();
    }

    private BackupCollectionSummary writeCollection(ZipOutputStream zip, String collectionName, int index) {
        List<Document> documents = mongoTemplate.findAll(Document.class, collectionName);
        String entryName = "collections/%03d-%s.json".formatted(index, safeFileName(collectionName));
        try {
            zip.putNextEntry(new ZipEntry(entryName));
            writeUtf8(zip, "[\n");
            for (int i = 0; i < documents.size(); i++) {
                writeUtf8(zip, "  ");
                writeUtf8(zip, documents.get(i).toJson(JSON_SETTINGS));
                writeUtf8(zip, i + 1 < documents.size() ? ",\n" : "\n");
            }
            writeUtf8(zip, "]\n");
            zip.closeEntry();
            return new BackupCollectionSummary(collectionName, documents.size(), entryName);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Gagal menulis collection backup: " + collectionName, exception);
        }
    }

    private void writeManifest(ZipOutputStream zip, BackupManifest manifest) throws IOException {
        zip.putNextEntry(new ZipEntry("manifest.json"));
        zip.write(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(manifest));
        zip.write('\n');
        zip.closeEntry();
    }

    private void writeUtf8(ZipOutputStream zip, String value) throws IOException {
        zip.write(value.getBytes(StandardCharsets.UTF_8));
    }

    private boolean isBackupCollection(String collectionName) {
        return collectionName != null
                && !collectionName.isBlank()
                && !collectionName.startsWith("system.");
    }

    private String safeFileName(String collectionName) {
        String safe = collectionName.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9._-]+", "-")
                .replaceAll("^-+|-+$", "");
        return safe.isBlank() ? "collection" : safe;
    }

    private void requireAdmin(User admin) {
        if (!userService.isAdmin(admin)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }

    private record BackupManifest(
            int schemaVersion,
            String application,
            String format,
            String databaseName,
            Instant createdAt,
            BackupActor createdBy,
            String mediaPolicy,
            List<BackupCollectionSummary> collections
    ) {
    }

    private record BackupActor(
            UUID userId,
            String name,
            String email
    ) {
    }

    private record BackupCollectionSummary(
            String name,
            long documentCount,
            String file
    ) {
    }
}
