package gebxby.gebxbyblog.dto;

public record AuthChallengeResponse(boolean verificationRequired, String emailHint, CurrentUserResponse user) {
}
