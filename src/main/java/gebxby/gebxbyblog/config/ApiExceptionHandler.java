package gebxby.gebxbyblog.config;

import com.mongodb.MongoException;
import gebxby.gebxbyblog.dto.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleResponseStatus(ResponseStatusException exception,
                                                                 HttpServletRequest request) {
        HttpStatus status = HttpStatus.valueOf(exception.getStatusCode().value());
        String reason = exception.getReason();
        String message = reason == null || reason.isBlank() ? status.getReasonPhrase() : reason;
        return ResponseEntity.status(status).body(error(status, message, request));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException exception,
                                                               HttpServletRequest request) {
        HttpStatus status = HttpStatus.BAD_REQUEST;
        return ResponseEntity.status(status).body(error(status, "Parameter request tidak valid", request));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException exception,
                                                             HttpServletRequest request) {
        HttpStatus status = HttpStatus.BAD_REQUEST;
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .orElse("Payload request tidak valid");
        return ResponseEntity.status(status).body(error(status, message, request));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleMaxUpload(MaxUploadSizeExceededException exception,
                                                            HttpServletRequest request) {
        HttpStatus status = HttpStatus.PAYLOAD_TOO_LARGE;
        return ResponseEntity.status(status).body(error(status, "Ukuran payload terlalu besar", request));
    }

    @ExceptionHandler({DataAccessException.class, MongoException.class})
    public ResponseEntity<ApiErrorResponse> handleDatabaseFailure(Exception exception,
                                                                  HttpServletRequest request) {
        log.error("Database operation failed for {}", request == null ? "unknown-path" : request.getRequestURI(), exception);
        HttpStatus status = HttpStatus.SERVICE_UNAVAILABLE;
        return ResponseEntity.status(status).body(error(status, "Database belum siap atau menolak operasi. Cek MongoDB active database dan role user Atlas.", request));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiErrorResponse> handleRuntime(RuntimeException exception,
                                                          HttpServletRequest request) {
        log.error("Unhandled API error for {}", request == null ? "unknown-path" : request.getRequestURI(), exception);
        HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
        return ResponseEntity.status(status).body(error(status, "Server gagal memproses request. Cek log backend untuk detail stacktrace.", request));
    }

    private ApiErrorResponse error(HttpStatus status, String message, HttpServletRequest request) {
        return new ApiErrorResponse(
                status.value(),
                status.name(),
                message,
                request == null ? "" : request.getRequestURI(),
                LocalDateTime.now()
        );
    }
}
