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
@Document(collection = "genres")
public class Genre {
    @Id
    private UUID id;

    @Indexed(unique = true)
    private String name;

    private String color;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
