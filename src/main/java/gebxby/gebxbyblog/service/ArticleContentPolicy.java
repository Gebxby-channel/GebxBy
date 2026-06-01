package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.ContentRequest;
import gebxby.gebxbyblog.model.Content;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.HtmlUtils;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class ArticleContentPolicy {
    private static final int MAX_TITLE_LENGTH = 180;
    private static final int MAX_CATEGORY_LENGTH = 60;
    private static final int MAX_BODY_LENGTH = 120_000;
    private static final Safelist ARTICLE_SAFELIST = Safelist.relaxed()
            .removeTags("img")
            .addTags("h1", "h2", "pre", "code", "span", "u", "strong", "em", "blockquote", "ul", "ol", "li")
            .addAttributes("span", "class")
            .addAttributes("a", "target", "rel")
            .addProtocols("a", "href", "http", "https", "mailto");

    private final MediaPipelineService mediaPipelineService;
    private final long maxUploadBytes;

    public ArticleContentPolicy(MediaPipelineService mediaPipelineService,
                                @Value("${app.max-upload-bytes:5242880}") long maxUploadBytes) {
        this.mediaPipelineService = mediaPipelineService;
        this.maxUploadBytes = maxUploadBytes;
    }

    public void applyPublishedFields(Content content, ContentRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload tulisan wajib diisi");
        }
        String title = trimToLength(request.head(), MAX_TITLE_LENGTH);
        String body = request.paragrafs() == null ? "" : request.paragrafs();
        String normalizedBody = normalizeArticleBody(body);
        if (!StringUtils.hasText(title)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Judul wajib diisi");
        }
        if (!StringUtils.hasText(Jsoup.parse(normalizedBody).text())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Isi tulisan wajib diisi");
        }
        applySharedFields(content, request, title, normalizedBody);
    }

    public void applyDraftFields(Content content, ContentRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload draft wajib diisi");
        }
        String title = trimToLength(request.head(), MAX_TITLE_LENGTH);
        String body = request.paragrafs() == null ? "" : request.paragrafs();
        String normalizedBody = normalizeArticleBody(body);
        applySharedFields(content, request, StringUtils.hasText(title) ? title : "Untitled Draft", normalizedBody);
    }

    public void validateDocx(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File DOCX wajib diisi");
        }
        if (file.getSize() > maxUploadBytes) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Ukuran file terlalu besar");
        }
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        String contentType = file.getContentType() == null ? "" : file.getContentType();
        boolean docxType = contentType.isBlank()
                || "application/vnd.openxmlformats-officedocument.wordprocessingml.document".equals(contentType);
        if (!filename.endsWith(".docx") || !docxType) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hanya file .docx yang diperbolehkan");
        }
    }

    public String extractDocxText(MultipartFile file) throws IOException {
        validateDocx(file);
        try (InputStream inputStream = file.getInputStream();
             XWPFDocument document = new XWPFDocument(inputStream)) {
            return document.getParagraphs().stream()
                    .map(paragraph -> paragraph.getText() == null ? "" : paragraph.getText())
                    .collect(Collectors.joining("\n\n"));
        }
    }

    public String normalizeCategory(String category) {
        String clean = trimToLength(category, MAX_CATEGORY_LENGTH).replaceAll("\\s+", " ");
        if (!StringUtils.hasText(clean)) {
            return "General";
        }
        String key = clean.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
        if ("general".equals(key)) {
            return "General";
        }
        if ("lore".equals(key)) {
            return "Lore";
        }
        if ("speculation".equals(key) || "spekulasiteori".equals(key)) {
            return "Speculation";
        }
        if ("analisticpshycologic".equals(key) || "analyticpsychological".equals(key)) {
            return "Analistic Pshycologic";
        }
        if ("fannovel".equals(key)) {
            return "Fan-Novel";
        }
        if ("qna".equals(key) || "qa".equals(key)) {
            return "QNA";
        }
        return Arrays.stream(clean.split(" "))
                .filter(StringUtils::hasText)
                .map(part -> part.substring(0, 1).toUpperCase(Locale.ROOT) + part.substring(1).toLowerCase(Locale.ROOT))
                .collect(Collectors.joining(" "));
    }

    private void applySharedFields(Content content, ContentRequest request, String title, String normalizedBody) {
        content.setHead(title);
        content.setSubtitle(trimToLength(request.subtitle(), MAX_TITLE_LENGTH));
        content.setParagrafs(sanitizeArticle(normalizedBody));
        content.setKategori(normalizeCategory(request.kategori()));
        if (request.images() != null) {
            content.setImages(mediaPipelineService.prepareContentImages(request.images()));
        }
    }

    private String sanitizeArticle(String html) {
        String trimmed = html.length() > MAX_BODY_LENGTH ? html.substring(0, MAX_BODY_LENGTH) : html;
        return Jsoup.clean(trimmed, ARTICLE_SAFELIST);
    }

    private String normalizeArticleBody(String body) {
        String normalized = body == null ? "" : body
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .trim();
        if (looksLikeHtml(normalized)) {
            return normalized;
        }

        return Arrays.stream(normalized.split("\\n\\s*\\n+"))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(block -> "<p>" + HtmlUtils.htmlEscape(block).replace("\n", "<br>") + "</p>")
                .collect(Collectors.joining("\n"));
    }

    private boolean looksLikeHtml(String value) {
        return value.matches("(?s).*<\\s*/?\\s*[a-zA-Z][^>]*>.*");
    }

    private String trimToLength(String value, int maxLength) {
        String trimmed = value == null ? "" : value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }
}
