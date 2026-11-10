package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.model.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class LoginVerificationService {
    private static final String USER_ID = "auth.pending.userId";
    private static final String EMAIL = "auth.pending.email";
    private static final String REMOTE_ADDRESS = "auth.pending.remoteAddress";
    private static final String CODE_HASH = "auth.pending.codeHash";
    private static final String EXPIRES_AT = "auth.pending.expiresAt";
    private static final String LAST_SENT_AT = "auth.pending.lastSentAt";
    private static final String ATTEMPTS = "auth.pending.attempts";
    private static final long CODE_LIFETIME_MS = Duration.ofMinutes(10).toMillis();
    private static final long RESEND_DELAY_MS = Duration.ofSeconds(60).toMillis();
    private static final int MAX_ATTEMPTS = 5;

    private final JavaMailSender mailSender;
    private final SecureRandom secureRandom = new SecureRandom();
    private final String fromAddress;

    public LoginVerificationService(JavaMailSender mailSender,
                                    @Value("${app.auth.verification.from:}") String fromAddress) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
    }

    public void start(User user, HttpServletRequest request) {
        HttpSession session = request.getSession(true);
        String code = String.format("%06d", secureRandom.nextInt(1_000_000));
        long now = System.currentTimeMillis();
        session.setAttribute(USER_ID, user.getUserID().toString());
        session.setAttribute(EMAIL, user.getEmail());
        session.setAttribute(REMOTE_ADDRESS, request.getRemoteAddr());
        session.setAttribute(CODE_HASH, hash(code));
        session.setAttribute(EXPIRES_AT, now + CODE_LIFETIME_MS);
        session.setAttribute(LAST_SENT_AT, now);
        session.setAttribute(ATTEMPTS, 0);
        try {
            sendCode(user.getEmail(), code);
        } catch (RuntimeException exception) {
            clear(session);
            throw exception;
        }
    }

    public VerifiedLogin verify(String code, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute(USER_ID) == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesi verifikasi tidak ditemukan. Silakan mulai login lagi.");
        }
        long now = System.currentTimeMillis();
        Long expiresAt = (Long) session.getAttribute(EXPIRES_AT);
        if (expiresAt == null || now > expiresAt) {
            clear(session);
            throw new ResponseStatusException(HttpStatus.GONE, "Kode verifikasi kedaluwarsa. Silakan login lagi.");
        }
        int attempts = (Integer) session.getAttribute(ATTEMPTS);
        if (attempts >= MAX_ATTEMPTS) {
            clear(session);
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Batas percobaan kode tercapai. Silakan login lagi.");
        }
        session.setAttribute(ATTEMPTS, attempts + 1);
        String expected = (String) session.getAttribute(CODE_HASH);
        String submitted = StringUtils.hasText(code) ? code.trim() : "";
        if (!submitted.matches("\\d{6}") || expected == null || !MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8), hash(submitted).getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Kode verifikasi tidak sesuai.");
        }
        String userId = (String) session.getAttribute(USER_ID);
        String email = (String) session.getAttribute(EMAIL);
        String remoteAddress = (String) session.getAttribute(REMOTE_ADDRESS);
        clear(session);
        try {
            return new VerifiedLogin(UUID.fromString(userId), email, remoteAddress);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesi verifikasi tidak valid.");
        }
    }

    public void resend(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute(USER_ID) == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesi verifikasi tidak ditemukan. Silakan mulai login lagi.");
        }
        long now = System.currentTimeMillis();
        Long lastSent = (Long) session.getAttribute(LAST_SENT_AT);
        if (lastSent != null && now - lastSent < RESEND_DELAY_MS) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Tunggu satu menit sebelum meminta kode baru.");
        }
        String email = (String) session.getAttribute(EMAIL);
        String code = String.format("%06d", secureRandom.nextInt(1_000_000));
        session.setAttribute(CODE_HASH, hash(code));
        session.setAttribute(EXPIRES_AT, now + CODE_LIFETIME_MS);
        session.setAttribute(LAST_SENT_AT, now);
        session.setAttribute(ATTEMPTS, 0);
        try {
            sendCode(email, code);
        } catch (RuntimeException exception) {
            clear(session);
            throw exception;
        }
    }

    public String emailHint(String email) {
        if (!StringUtils.hasText(email) || !email.contains("@")) return "email terdaftar";
        String[] parts = email.split("@", 2);
        String local = parts[0];
        String masked = local.length() <= 2 ? local.charAt(0) + "***" : local.substring(0, 2) + "***";
        return masked + "@" + parts[1];
    }

    public void clear(HttpSession session) {
        session.removeAttribute(USER_ID);
        session.removeAttribute(EMAIL);
        session.removeAttribute(REMOTE_ADDRESS);
        session.removeAttribute(CODE_HASH);
        session.removeAttribute(EXPIRES_AT);
        session.removeAttribute(LAST_SENT_AT);
        session.removeAttribute(ATTEMPTS);
    }

    private void sendCode(String recipient, String code) {
        if (!StringUtils.hasText(fromAddress) || !StringUtils.hasText(recipient)) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Email verifikasi belum dikonfigurasi. Atur SMTP_USERNAME, SMTP_PASSWORD, dan SMTP_FROM di environment server.");
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(recipient);
            message.setSubject("Kode verifikasi CodeXAvernico");
            message.setText("Kode verifikasi login kamu: " + code + "\n\nKode berlaku 10 menit dan hanya dapat digunakan sekali. Jangan bagikan kode ini kepada siapa pun.");
            mailSender.send(message);
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Kode verifikasi gagal dikirim. Periksa konfigurasi SMTP server.");
        }
    }

    private String hash(String code) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(code.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    public record VerifiedLogin(UUID userId, String email, String remoteAddress) {
    }
}
