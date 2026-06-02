package gebxby.gebxbyblog.service;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BadgeImagePolicyTest {
    private final BadgeImagePolicy policy = new BadgeImagePolicy();

    @Test
    void acceptsTransparentSquarePng() {
        String image = transparentPngDataUrl(32, 32);

        String normalized = policy.normalizeBadgeImage(image);

        assertEquals(image, normalized);
    }

    @Test
    void rejectsOpaqueOrNonSquarePng() {
        assertThrows(ResponseStatusException.class, () -> policy.normalizeBadgeImage(opaquePngDataUrl(32, 32)));
        assertThrows(ResponseStatusException.class, () -> policy.normalizeBadgeImage(transparentPngDataUrl(32, 24)));
    }

    private String transparentPngDataUrl(int width, int height) {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = image.createGraphics();
        graphics.setColor(new Color(230, 0, 0, 230));
        graphics.fillOval(width / 4, height / 4, width / 2, height / 2);
        graphics.dispose();
        return toDataUrl(image);
    }

    private String opaquePngDataUrl(int width, int height) {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = image.createGraphics();
        graphics.setColor(Color.BLACK);
        graphics.fillRect(0, 0, width, height);
        graphics.setColor(Color.RED);
        graphics.fillOval(width / 4, height / 4, width / 2, height / 2);
        graphics.dispose();
        return toDataUrl(image);
    }

    private String toDataUrl(BufferedImage image) {
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(image, "png", output);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(output.toByteArray());
        } catch (Exception ex) {
            throw new AssertionError(ex);
        }
    }
}
