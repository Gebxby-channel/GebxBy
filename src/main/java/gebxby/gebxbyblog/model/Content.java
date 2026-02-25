package gebxby.gebxbyblog.model;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class Content {
    private String head;
    private String subtitle;
    private String paragrafs;
    private Penulis penulis;
    private UUID idContent;
}
