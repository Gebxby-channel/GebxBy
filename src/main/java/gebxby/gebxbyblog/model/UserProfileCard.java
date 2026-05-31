package gebxby.gebxbyblog.model;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Document(collection = "user_profile_cards")
public class UserProfileCard {
    @Id
    private UUID id;

    @Indexed
    private UUID userId;

    private UUID sourceTemplateId;
    private String name;
    private String description;
    private String backgroundImage;
    private String orientation = "HORIZONTAL";
    private ProfileCardLayout layout = new ProfileCardLayout();
    private UUID grantedByUserId;
    private LocalDateTime grantedAt;
}
