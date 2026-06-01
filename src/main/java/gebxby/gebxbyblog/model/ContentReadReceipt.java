package gebxby.gebxbyblog.model;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Document(collection = "content_read_receipts")
@CompoundIndexes({
        @CompoundIndex(name = "content_reader_recent_idx", def = "{'contentId': 1, 'readerKey': 1, 'createdAt': -1}"),
        @CompoundIndex(name = "reader_recent_idx", def = "{'readerKey': 1, 'createdAt': -1}")
})
public class ContentReadReceipt {
    @Id
    private UUID id;

    @Indexed
    private UUID contentId;

    @Indexed
    private UUID userId;

    @Indexed
    private String readerKey;

    private LocalDateTime createdAt;
}
