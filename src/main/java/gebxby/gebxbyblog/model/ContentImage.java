package gebxby.gebxbyblog.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ContentImage {
    private String id;
    private String data;
    private String thumbnail;
    private String alt;
    private long size;
    private String mimeType;
    private String storageProvider;
    private String storageKey;
    private Integer width;
    private Integer height;
}
