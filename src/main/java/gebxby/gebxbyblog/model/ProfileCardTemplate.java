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
@Document(collection = "profile_card_templates")
public class ProfileCardTemplate {
    @Id
    private UUID id;

    @Indexed
    private String name;

    private String description;
    private String backgroundImage;
    private String orientation = "HORIZONTAL";
    private ProfileCardLayout layout = new ProfileCardLayout();
    private UUID createdByUserId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
