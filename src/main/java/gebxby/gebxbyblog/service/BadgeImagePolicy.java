package gebxby.gebxbyblog.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.util.Base64;

@Component
public class BadgeImagePolicy {
    private static final int MAX_DATA_URL_LENGTH = 180_000;
    private static final String PNG_PREFIX = "data:image/png;base64,";

    public String normalizeBadgeImage(String value) {
        String dataUrl = value == null ? "" : value.trim();
        if (!StringUtils.hasText(dataUrl)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Gambar badge wajib diupload");
        }
        if (dataUrl.length() > MAX_DATA_URL_LENGTH) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Gambar badge terlalu besar");
        }
        if (!dataUrl.toLowerCase().startsWith(PNG_PREFIX)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Badge harus PNG transparan");
        }

        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(dataUrl.substring(PNG_PREFIX.length()));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Data gambar badge tidak valid");
        }

        BufferedImage image;
        try {
            image = ImageIO.read(new ByteArrayInputStream(bytes));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Data gambar badge tidak valid");
        }
        if (image == null || image.getWidth() <= 0 || image.getHeight() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Data gambar badge tidak valid");
        }
        if (image.getWidth() != image.getHeight()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Badge harus rasio 1:1");
        }
        if (!image.getColorModel().hasAlpha() || !hasTransparentPixel(image)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Badge harus punya background transparan");
        }
        return dataUrl;
    }

    private boolean hasTransparentPixel(BufferedImage image) {
        for (int y = 0; y < image.getHeight(); y++) {
            for (int x = 0; x < image.getWidth(); x++) {
                int alpha = (image.getRGB(x, y) >>> 24) & 0xff;
                if (alpha < 245) {
                    return true;
                }
            }
        }
        return false;
    }
}
