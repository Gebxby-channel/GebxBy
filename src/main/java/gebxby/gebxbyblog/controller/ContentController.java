package gebxby.gebxbyblog.controller;

import gebxby.gebxbyblog.dto.AnalyticsResponse;
import gebxby.gebxbyblog.dto.CommentRequest;
import gebxby.gebxbyblog.dto.CommentResponse;
import gebxby.gebxbyblog.dto.ContentImageRequest;
import gebxby.gebxbyblog.dto.ContentRequest;
import gebxby.gebxbyblog.dto.ContentResponse;
import gebxby.gebxbyblog.dto.ContentStatsResponse;
import gebxby.gebxbyblog.dto.FeedResponse;
import gebxby.gebxbyblog.dto.VoteRequest;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.model.VoteDirection;
import gebxby.gebxbyblog.service.CommentService;
import gebxby.gebxbyblog.service.ContentService;
import gebxby.gebxbyblog.service.UserService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/content")
public class ContentController {
    private final ContentService contentService;
    private final CommentService commentService;
    private final UserService userService;
    private final ObjectMapper objectMapper;

    public ContentController(ContentService contentService,
                             CommentService commentService,
                             UserService userService,
                             ObjectMapper objectMapper) {
        this.contentService = contentService;
        this.commentService = commentService;
        this.userService = userService;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/upload")
    public ResponseEntity<ContentResponse> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam("kategori") String kategori,
            @RequestParam(value = "imagesJson", required = false) String imagesJson,
            @AuthenticationPrincipal OAuth2User principal) throws IOException {
        User author = userService.getCurrentUser(principal);
        ContentResponse savedContent = contentService.addContentFromDocx(file, kategori, title, parseImagesJson(imagesJson), author);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedContent);
    }

    @GetMapping("/all-content")
    public ResponseEntity<List<ContentResponse>> showAllContent(
            @RequestParam(value = "category", required = false) String category,
            @AuthenticationPrincipal OAuth2User principal) {
        User viewer = optionalUser(principal);
        List<ContentResponse> contents = category == null
                ? contentService.findAll(viewer)
                : contentService.findByCategory(category, viewer);
        return ResponseEntity.ok(contents);
    }

    @GetMapping("/feed")
    public ResponseEntity<List<ContentResponse>> feed(
            @RequestParam(value = "mode", defaultValue = "all") String mode,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "limit", defaultValue = "20") int limit,
            @AuthenticationPrincipal OAuth2User principal) {
        return ResponseEntity.ok(contentService.feed(mode, category, limit, optionalUser(principal)));
    }

    @GetMapping("/feed-page")
    public ResponseEntity<FeedResponse> feedPage(
            @RequestParam(value = "mode", defaultValue = "all") String mode,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "limit", defaultValue = "20") int limit,
            @AuthenticationPrincipal OAuth2User principal) {
        return ResponseEntity.ok(contentService.feedPage(mode, category, page, limit, optionalUser(principal)));
    }

    @GetMapping("/categories")
    public ResponseEntity<List<String>> getCategories() {
        return ResponseEntity.ok(contentService.findCategories());
    }

    @GetMapping("/analytics")
    public ResponseEntity<AnalyticsResponse> getAnalytics(@AuthenticationPrincipal OAuth2User principal) {
        return ResponseEntity.ok(contentService.getAnalytics(optionalUser(principal)));
    }

    @GetMapping("/by-user/{userId}")
    public ResponseEntity<List<ContentResponse>> getContentByUser(
            @PathVariable UUID userId,
            @AuthenticationPrincipal OAuth2User principal) {
        return ResponseEntity.ok(contentService.findByAuthor(userId, optionalUser(principal)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ContentResponse> getContentById(
            @PathVariable UUID id,
            @AuthenticationPrincipal OAuth2User principal) {
        return ResponseEntity.ok(contentService.findContentById(id, optionalUser(principal), false));
    }

    @PostMapping("/{id}/view")
    public ResponseEntity<ContentStatsResponse> recordView(
            @PathVariable UUID id,
            @AuthenticationPrincipal OAuth2User principal) {
        return ResponseEntity.ok(contentService.recordView(id, optionalUser(principal)));
    }

    @GetMapping("/{id}/stats")
    public ResponseEntity<ContentStatsResponse> getStats(
            @PathVariable UUID id,
            @AuthenticationPrincipal OAuth2User principal) {
        return ResponseEntity.ok(contentService.getStats(id, optionalUser(principal)));
    }

    @PostMapping("/add-manual")
    public ResponseEntity<ContentResponse> addManualContent(
            @RequestBody ContentRequest content,
            @AuthenticationPrincipal OAuth2User principal) {
        User author = userService.getCurrentUser(principal);
        ContentResponse result = contentService.addContent(content, author);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PostMapping("/drafts")
    public ResponseEntity<ContentResponse> createDraft(
            @RequestBody ContentRequest content,
            @AuthenticationPrincipal OAuth2User principal) {
        User author = userService.getCurrentUser(principal);
        ContentResponse result = contentService.saveDraft(null, content, author);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PutMapping("/drafts/{id}")
    public ResponseEntity<ContentResponse> updateDraft(
            @PathVariable UUID id,
            @RequestBody ContentRequest content,
            @AuthenticationPrincipal OAuth2User principal) {
        User author = userService.getCurrentUser(principal);
        return ResponseEntity.ok(contentService.saveDraft(id, content, author));
    }

    @PostMapping("/drafts/{id}/publish")
    public ResponseEntity<ContentResponse> publishDraft(
            @PathVariable UUID id,
            @RequestBody ContentRequest content,
            @AuthenticationPrincipal OAuth2User principal) {
        User author = userService.getCurrentUser(principal);
        return ResponseEntity.ok(contentService.publishDraft(id, content, author));
    }

    @PutMapping("/edit/{id}")
    public ResponseEntity<ContentResponse> updateContent(
            @PathVariable UUID id,
            @RequestBody ContentRequest contentDetails,
            @AuthenticationPrincipal OAuth2User principal) {
        User actor = userService.getCurrentUser(principal);
        return ResponseEntity.ok(contentService.updateContent(id, contentDetails, actor));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteContent(
            @PathVariable UUID id,
            @AuthenticationPrincipal OAuth2User principal) {
        User actor = userService.getCurrentUser(principal);
        contentService.deleteContent(id, actor);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/vote")
    public ResponseEntity<ContentStatsResponse> vote(
            @PathVariable UUID id,
            @RequestBody VoteRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        User voter = userService.getCurrentUser(principal);
        VoteDirection vote = request == null ? VoteDirection.NONE : request.vote();
        return ResponseEntity.ok(contentService.vote(id, vote, voter));
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<CommentResponse>> getComments(@PathVariable UUID id) {
        return ResponseEntity.ok(commentService.findThread(id));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable UUID id,
            @RequestBody CommentRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        User author = userService.getCurrentUser(principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(commentService.addComment(id, request, author));
    }

    @DeleteMapping("/{contentId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable UUID contentId,
            @PathVariable UUID commentId,
            @AuthenticationPrincipal OAuth2User principal) {
        User actor = userService.getCurrentUser(principal);
        commentService.deleteComment(contentId, commentId, actor);
        return ResponseEntity.noContent().build();
    }

    private User optionalUser(OAuth2User principal) {
        return principal == null ? null : userService.processUserLogin(principal);
    }

    private List<ContentImageRequest> parseImagesJson(String imagesJson) {
        if (!StringUtils.hasText(imagesJson)) {
            return List.of();
        }
        try {
            return objectMapper.readValue(imagesJson, new TypeReference<List<ContentImageRequest>>() {
            });
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload gambar tidak valid");
        }
    }
}
