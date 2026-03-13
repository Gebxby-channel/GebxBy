package gebxby.gebxbyblog.model;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.UUID;

@Getter
@Setter
@Document(collection = "contents")
public class Content {
    private String head;
    private String subtitle;
    private String paragrafs;
    private User user;
    @Id
    private UUID idContent;
    private String kategori;
}
