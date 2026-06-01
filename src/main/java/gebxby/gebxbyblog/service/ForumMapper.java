package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.ContentResponse;
import gebxby.gebxbyblog.dto.ContentStatsResponse;
import gebxby.gebxbyblog.dto.CurrentUserResponse;
import gebxby.gebxbyblog.dto.PublicUserResponse;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.dto.ContentImageResponse;
import gebxby.gebxbyblog.model.ContentImage;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.model.VoteDirection;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Component
public class ForumMapper {
    private final BadgeService badgeService;
    private final ProfileCardService profileCardService;

    public ForumMapper(BadgeService badgeService) {
        this(badgeService, null);
    }

    @Autowired
    public ForumMapper(BadgeService badgeService, ProfileCardService profileCardService) {
        this.badgeService = badgeService;
        this.profileCardService = profileCardService;
    }

    public PublicUserResponse toPublicUser(User user) {
        if (user == null) {
            return null;
        }
        return new PublicUserResponse(
                user.getUserID(),
                user.getName(),
                user.getUsername(),
                user.getPhoto(),
                user.getDesignation(),
                user.getMoto(),
                user.isSuspensionMarked(),
                user.getSuspendedUntil(),
                badgeService.effectiveBadges(user),
                profileCardService == null ? null : profileCardService.activeCard(user)
        );
    }

    public CurrentUserResponse toCurrentUser(User user) {
        return new CurrentUserResponse(
                user.getUserID(),
                user.getName(),
                user.getUsername(),
                user.getEmail(),
                user.getPhoto(),
                user.getDesignation(),
                user.getMoto(),
                user.getRole(),
                user.isSuspensionMarked(),
                user.getSuspendedUntil(),
                badgeService.effectiveBadges(user),
                copyUuidSet(user.getBookmarkedContentIds()),
                copyUuidSet(user.getFollowingUserIds()),
                profileCardService == null ? null : profileCardService.activeCard(user),
                profileCardService == null ? List.of() : profileCardService.cardsForUser(user)
        );
    }

    private Set<UUID> copyUuidSet(Set<UUID> values) {
        return values == null ? Set.of() : new LinkedHashSet<>(values);
    }

    public ContentResponse toContentResponse(Content content, VoteDirection userVote) {
        return toContentResponse(content, userVote, false);
    }

    public ContentResponse toContentResponse(Content content, VoteDirection userVote, boolean includeImages) {
        return new ContentResponse(
                content.getIdContent(),
                content.getHead(),
                content.getSubtitle(),
                content.getParagrafs(),
                includeImages ? toImageResponses(content.getImages()) : List.of(),
                toCoverImageResponse(content.getImages()),
                toPublicUser(content.getUser()),
                content.getKategori(),
                content.getCreatedAt(),
                content.getUpdatedAt(),
                content.getViewCount(),
                content.getUpCount(),
                content.getDownCount(),
                content.getCommentCount(),
                userVote == null ? VoteDirection.NONE : userVote,
                content.getStatus() == null ? "PUBLISHED" : content.getStatus()
        );
    }

    private ContentImageResponse toCoverImageResponse(List<ContentImage> images) {
        if (images == null || images.isEmpty()) {
            return null;
        }
        ContentImage image = images.getFirst();
        String thumbnail = image.getThumbnail() == null ? image.getData() : image.getThumbnail();
        return new ContentImageResponse(
                image.getId(),
                thumbnail,
                thumbnail,
                image.getAlt(),
                image.getSize(),
                image.getMimeType(),
                image.getStorageProvider(),
                image.getStorageKey(),
                image.getThumbnailStorageKey(),
                image.getWidth(),
                image.getHeight()
        );
    }

    private List<ContentImageResponse> toImageResponses(List<ContentImage> images) {
        if (images == null || images.isEmpty()) {
            return List.of();
        }
        return images.stream()
                .map(image -> new ContentImageResponse(
                        image.getId(),
                        image.getData(),
                        image.getThumbnail(),
                        image.getAlt(),
                        image.getSize(),
                        image.getMimeType(),
                        image.getStorageProvider(),
                        image.getStorageKey(),
                        image.getThumbnailStorageKey(),
                        image.getWidth(),
                        image.getHeight()
                ))
                .toList();
    }

    public ContentStatsResponse toStatsResponse(Content content, long commentCount, VoteDirection userVote) {
        return new ContentStatsResponse(
                content.getIdContent(),
                content.getViewCount(),
                content.getUpCount(),
                content.getDownCount(),
                commentCount,
                userVote == null ? VoteDirection.NONE : userVote
        );
    }
}
