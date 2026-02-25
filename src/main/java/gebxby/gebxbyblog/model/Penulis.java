package gebxby.gebxbyblog.model;
import lombok.Getter;
import lombok.Setter;
import java.util.UUID;
@Getter
@Setter
public class Penulis {
    private String name;
    private String nickname;
    private String photo;
    private String moto;
    private UUID idPenulis;
}
