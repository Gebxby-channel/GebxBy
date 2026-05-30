package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.ContentResponse;
import gebxby.gebxbyblog.dto.ContentStatsResponse;
import gebxby.gebxbyblog.dto.CurrentUserResponse;
import gebxby.gebxbyblog.dto.PublicUserResponse;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.model.VoteDirection;
import org.springframework.stereotype.Component;

@Component
public class ForumMapper {
    public PublicUserResponse toPublicUser(User user) {
        if (user == null) {
            return null;
        }
        return new PublicUserResponse(
                user.getUserID(),
                user.getName(),
                user.getPhoto(),
                user.getDesignation(),
                user.getMoto(),
                user.isSuspensionMarked(),
                user.getSuspendedUntil()
        );
    }

    public CurrentUserResponse toCurrentUser(User user) {
        return new CurrentUserResponse(
                user.getUserID(),
                user.getName(),
                user.getEmail(),
                user.getPhoto(),
                user.getDesignation(),
                user.getMoto(),
                user.getRole(),
                user.isSuspensionMarked(),
                user.getSuspendedUntil()
        );
    }

    public ContentResponse toContentResponse(Content content, VoteDirection userVote) {
        return new ContentResponse(
                content.getIdContent(),
                content.getHead(),
                content.getSubtitle(),
                content.getParagrafs(),
                toPublicUser(content.getUser()),
                content.getKategori(),
                content.getCreatedAt(),
                content.getUpdatedAt(),
                content.getViewCount(),
                content.getUpCount(),
                content.getDownCount(),
                content.getCommentCount(),
                userVote == null ? VoteDirection.NONE : userVote
        );
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
