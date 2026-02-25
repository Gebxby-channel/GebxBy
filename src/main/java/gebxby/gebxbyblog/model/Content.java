package gebxby.gebxbyblog.model;
import lombok.Getter;
import lombok.Setter;
import org.w3c.dom.Text;

import java.util.UUID;

@Getter
@Setter
public class Content {
    private String head;
    private String subtitle;
    private Text paragrafs;
    private Penulis penulis;
    private UUID idContent;
}
