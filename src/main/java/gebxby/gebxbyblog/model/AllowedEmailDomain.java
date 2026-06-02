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
@Document(collection = "allowed_email_domains")
public class AllowedEmailDomain {
    @Id
    private UUID id;

    @Indexed(unique = true)
    private String domain;

    private UUID createdByUserId;
    private LocalDateTime createdAt;
}
