package gebxby.gebxbyblog.model;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.UUID;
@Getter
@Setter
@Document(collection = "users")
public class User {
    private String email;
    private String name;
    private String role;
    private String photo;
    private String moto;
    private String designation;
    @Id
    private UUID userID;
    @Indexed(unique = true)
    private String googleId;

}
