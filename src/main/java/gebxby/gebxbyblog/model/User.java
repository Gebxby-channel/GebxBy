package gebxby.gebxbyblog.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Document(collection = "users")
public class User {
    @Id
    private UUID userID;

    @Indexed(unique = true, sparse = true)
    private String email;

    private String name;
    private String photo;
    private String moto;
    private String designation;

    private String role = "USER";

    @Indexed(unique = true, sparse = true)
    private String googleId;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime suspendedUntil;
    private int suspensionCount;
    private boolean suspensionMarked;

    public boolean isAdmin() {
        return "ADMIN".equalsIgnoreCase(role);
    }

    public boolean isSuspended() {
        return suspendedUntil != null && suspendedUntil.isAfter(LocalDateTime.now());
    }

    public String getPicture() {
        return photo;
    }
}
