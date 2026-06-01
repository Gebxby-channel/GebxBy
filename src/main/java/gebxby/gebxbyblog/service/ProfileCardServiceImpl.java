package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.ProfileCardLayoutResponse;
import gebxby.gebxbyblog.dto.ProfileCardCustomizeRequest;
import gebxby.gebxbyblog.dto.ProfileCardRequest;
import gebxby.gebxbyblog.dto.ProfileCardResponse;
import gebxby.gebxbyblog.model.ProfileCardLayout;
import gebxby.gebxbyblog.model.ProfileCardTemplate;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.model.UserProfileCard;
import gebxby.gebxbyblog.repository.CommentRepository;
import gebxby.gebxbyblog.repository.ContentRepository;
import gebxby.gebxbyblog.repository.ProfileCardTemplateRepository;
import gebxby.gebxbyblog.repository.UserProfileCardRepository;
import gebxby.gebxbyblog.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class ProfileCardServiceImpl implements ProfileCardService {
    public static final String DEFAULT_STARS = "DEFAULT:STARS";
    private static final int MAX_CARD_IMAGE_LENGTH = 650_000;
    private static final int MAX_CARD_PHOTO_LENGTH = 350_000;
    private static final int MAX_NAME_LENGTH = 60;
    private static final int MAX_DESCRIPTION_LENGTH = 180;

    private final ProfileCardTemplateRepository templateRepository;
    private final UserProfileCardRepository userCardRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final UserProfileProjectionService profileProjectionService;

    @Autowired
    public ProfileCardServiceImpl(ProfileCardTemplateRepository templateRepository,
                                  UserProfileCardRepository userCardRepository,
                                  UserRepository userRepository,
                                  UserService userService,
                                  UserProfileProjectionService profileProjectionService) {
        this.templateRepository = templateRepository;
        this.userCardRepository = userCardRepository;
        this.userRepository = userRepository;
        this.userService = userService;
        this.profileProjectionService = profileProjectionService;
    }

    public ProfileCardServiceImpl(ProfileCardTemplateRepository templateRepository,
                                  UserProfileCardRepository userCardRepository,
                                  UserRepository userRepository,
                                  ContentRepository contentRepository,
                                  CommentRepository commentRepository,
                                  UserService userService) {
        this(templateRepository, userCardRepository, userRepository, userService,
                new UserProfileProjectionService(contentRepository, commentRepository));
    }

    @Override
    public List<ProfileCardResponse> findTemplates(User admin) {
        requireAdmin(admin);
        return templateRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toTemplateResponse)
                .toList();
    }

    @Override
    public ProfileCardResponse createTemplate(ProfileCardRequest request, User admin) {
        requireAdmin(admin);
        LocalDateTime now = LocalDateTime.now();
        ProfileCardTemplate template = new ProfileCardTemplate();
        template.setId(UUID.randomUUID());
        applyTemplateFields(template, request);
        template.setCreatedByUserId(admin.getUserID());
        template.setCreatedAt(now);
        template.setUpdatedAt(now);
        return toTemplateResponse(templateRepository.save(template));
    }

    @Override
    public ProfileCardResponse updateTemplate(UUID templateId, ProfileCardRequest request, User admin) {
        requireAdmin(admin);
        ProfileCardTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template card tidak ditemukan"));
        applyTemplateFields(template, request);
        template.setUpdatedAt(LocalDateTime.now());
        return toTemplateResponse(templateRepository.save(template));
    }

    @Override
    public void deleteTemplate(UUID templateId, User admin) {
        requireAdmin(admin);
        if (!templateRepository.existsById(templateId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Template card tidak ditemukan");
        }
        templateRepository.deleteById(templateId);
    }

    @Override
    public ProfileCardResponse grantCard(UUID templateId, UUID userId, User admin) {
        requireAdmin(admin);
        ProfileCardTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template card tidak ditemukan"));
        User target = userService.getUserById(userId);
        UserProfileCard card = new UserProfileCard();
        card.setId(UUID.randomUUID());
        card.setUserId(target.getUserID());
        card.setSourceTemplateId(template.getId());
        card.setName(template.getName());
        card.setDescription(template.getDescription());
        card.setBackgroundImage(template.getBackgroundImage());
        card.setOrientation(template.getOrientation());
        card.setLayout(copyLayout(template.getLayout()));
        card.setGrantedByUserId(admin.getUserID());
        card.setGrantedAt(LocalDateTime.now());
        UserProfileCard saved = userCardRepository.save(card);
        if (!StringUtils.hasText(target.getActiveProfileCardId())) {
            target.setActiveProfileCardId(saved.getId().toString());
            target.setUpdatedAt(LocalDateTime.now());
            userRepository.save(target);
        }
        return toUserCardResponse(saved);
    }

    @Override
    public List<ProfileCardResponse> cardsForUser(User user) {
        if (user == null || user.getUserID() == null) {
            return defaultCards();
        }
        List<ProfileCardResponse> response = new ArrayList<>(defaultCards());
        response.addAll(userCardRepository.findByUserIdOrderByGrantedAtDesc(user.getUserID()).stream()
                .map(this::toUserCardResponse)
                .toList());
        return response;
    }

    @Override
    public ProfileCardResponse activeCard(User user) {
        if (user == null) {
            return defaultCard(DEFAULT_STARS);
        }
        String active = StringUtils.hasText(user.getActiveProfileCardId()) ? user.getActiveProfileCardId() : DEFAULT_STARS;
        if (DEFAULT_STARS.equals(active)) {
            return defaultCard(active);
        }
        try {
            UUID id = UUID.fromString(active);
            return userCardRepository.findById(id)
                    .filter(card -> user.getUserID() != null && user.getUserID().equals(card.getUserId()))
                    .map(this::toUserCardResponse)
                    .orElseGet(() -> defaultCard(DEFAULT_STARS));
        } catch (IllegalArgumentException ex) {
            return defaultCard(DEFAULT_STARS);
        }
    }

    @Override
    public User setActiveCard(String cardId, User user) {
        userService.ensureActive(user);
        String nextCardId = StringUtils.hasText(cardId) ? cardId.trim() : DEFAULT_STARS;
        if (!DEFAULT_STARS.equals(nextCardId)) {
            UUID id;
            try {
                id = UUID.fromString(nextCardId);
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Card profile tidak valid");
            }
            userCardRepository.findById(id)
                    .filter(card -> user.getUserID().equals(card.getUserId()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Card profile bukan milik user ini"));
        }
        user.setActiveProfileCardId(nextCardId);
        user.setUpdatedAt(LocalDateTime.now());
        User saved = userRepository.save(user);
        profileProjectionService.refreshEmbeddedProfiles(saved);
        return saved;
    }

    @Override
    public ProfileCardResponse customizeUserCard(UUID cardId, ProfileCardCustomizeRequest request, User user) {
        userService.ensureActive(user);
        UserProfileCard card = userCardRepository.findById(cardId)
                .filter(item -> user.getUserID().equals(item.getUserId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Card profile tidak ditemukan"));
        String displayName = trim(request == null ? null : request.displayName(), 80);
        card.setDisplayName(StringUtils.hasText(displayName) ? displayName : null);
        if (request != null && request.displayPhoto() != null) {
            card.setDisplayPhoto(StringUtils.hasText(request.displayPhoto()) ? validateCardPhoto(request.displayPhoto()) : null);
        }
        return toUserCardResponse(userCardRepository.save(card));
    }

    @Override
    public User deleteUserCard(UUID cardId, User user) {
        userService.ensureActive(user);
        UserProfileCard card = userCardRepository.findById(cardId)
                .filter(item -> user.getUserID().equals(item.getUserId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Card profile tidak ditemukan"));
        userCardRepository.delete(card);
        if (card.getId().toString().equals(user.getActiveProfileCardId())) {
            user.setActiveProfileCardId(DEFAULT_STARS);
            user.setUpdatedAt(LocalDateTime.now());
            User saved = userRepository.save(user);
            profileProjectionService.refreshEmbeddedProfiles(saved);
            return saved;
        }
        return user;
    }

    private void applyTemplateFields(ProfileCardTemplate template, ProfileCardRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload card wajib diisi");
        }
        template.setName(requiredTrim(request.name(), MAX_NAME_LENGTH, "Nama card wajib diisi"));
        template.setDescription(trim(request.description(), MAX_DESCRIPTION_LENGTH));
        template.setBackgroundImage(validateCardImage(request.backgroundImage()));
        template.setOrientation(normalizeOrientation(request.orientation()));
        template.setLayout(toLayout(request.layout()));
    }

    private List<ProfileCardResponse> defaultCards() {
        return List.of(defaultCard(DEFAULT_STARS));
    }

    private ProfileCardResponse defaultCard(String code) {
        return new ProfileCardResponse(
                DEFAULT_STARS,
                DEFAULT_STARS,
                "S.T.A.R.S. Archive Card",
                "Default S.T.A.R.S. police archive card.",
                null,
                "HORIZONTAL",
                toResponseLayout(new ProfileCardLayout()),
                false,
                false,
                null,
                null
        );
    }

    private void requireAdmin(User admin) {
        if (!userService.isAdmin(admin)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }

    private String validateCardImage(String value) {
        String image = trim(value, MAX_CARD_IMAGE_LENGTH + 1);
        if (!StringUtils.hasText(image)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Background card wajib diisi");
        }
        if (image.length() > MAX_CARD_IMAGE_LENGTH) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Gambar card terlalu besar");
        }
        String lower = image.toLowerCase(Locale.ROOT);
        boolean validDataImage = lower.startsWith("data:image/png;base64,")
                || lower.startsWith("data:image/jpeg;base64,")
                || lower.startsWith("data:image/webp;base64,");
        if (!validDataImage && !lower.startsWith("https://")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Format background card tidak valid");
        }
        return image;
    }

    private String normalizeOrientation(String value) {
        String clean = trim(value, 20).toUpperCase(Locale.ROOT);
        return "VERTICAL".equals(clean) ? "VERTICAL" : "HORIZONTAL";
    }

    private ProfileCardLayout toLayout(ProfileCardLayoutResponse response) {
        ProfileCardLayout layout = new ProfileCardLayout();
        if (response == null) {
            return layout;
        }
        layout.setPhotoX(clamp(response.photoX()));
        layout.setPhotoY(clamp(response.photoY()));
        layout.setPhotoW(clamp(response.photoW()));
        layout.setPhotoH(clamp(response.photoH()));
        layout.setNameX(clamp(response.nameX()));
        layout.setNameY(clamp(response.nameY()));
        layout.setNameW(clamp(response.nameW()));
        layout.setNameH(clamp(response.nameH()));
        layout.setDesignationX(clamp(response.designationX()));
        layout.setDesignationY(clamp(response.designationY()));
        layout.setDesignationW(clamp(response.designationW()));
        layout.setDesignationH(clamp(response.designationH()));
        layout.setStatsX(clamp(response.statsX()));
        layout.setStatsY(clamp(response.statsY()));
        layout.setStatsW(clamp(response.statsW()));
        layout.setStatsH(clamp(response.statsH()));
        layout.setNameFontSize(clampFont(response.nameFontSize(), 0.9));
        layout.setDesignationFontSize(clampFont(response.designationFontSize(), 0.9));
        layout.setStatsFontSize(clampFont(response.statsFontSize(), 1.2));
        layout.setTextColor(normalizeHex(response.textColor(), "#111111"));
        layout.setAccentColor(normalizeHex(response.accentColor(), "#e60000"));
        return layout;
    }

    private ProfileCardLayout copyLayout(ProfileCardLayout source) {
        return toLayout(toResponseLayout(source == null ? new ProfileCardLayout() : source));
    }

    private ProfileCardLayoutResponse toResponseLayout(ProfileCardLayout layout) {
        ProfileCardLayout safe = layout == null ? new ProfileCardLayout() : layout;
        return new ProfileCardLayoutResponse(
                safe.getPhotoX(), safe.getPhotoY(), safe.getPhotoW(), safe.getPhotoH(),
                safe.getNameX(), safe.getNameY(), safe.getNameW(), safe.getNameH(),
                safe.getDesignationX(), safe.getDesignationY(), safe.getDesignationW(), safe.getDesignationH(),
                safe.getStatsX(), safe.getStatsY(), safe.getStatsW(), safe.getStatsH(),
                safe.getNameFontSize(), safe.getDesignationFontSize(), safe.getStatsFontSize(),
                safe.getTextColor(), safe.getAccentColor()
        );
    }

    private ProfileCardResponse toTemplateResponse(ProfileCardTemplate template) {
        return new ProfileCardResponse(
                template.getId().toString(),
                null,
                template.getName(),
                template.getDescription(),
                template.getBackgroundImage(),
                template.getOrientation(),
                toResponseLayout(template.getLayout()),
                null,
                null,
                true,
                true,
                null,
                template.getId()
        );
    }

    private ProfileCardResponse toUserCardResponse(UserProfileCard card) {
        return new ProfileCardResponse(
                card.getId().toString(),
                null,
                card.getName(),
                card.getDescription(),
                card.getBackgroundImage(),
                card.getOrientation(),
                toResponseLayout(card.getLayout()),
                card.getDisplayName(),
                card.getDisplayPhoto(),
                true,
                false,
                card.getGrantedAt(),
                card.getSourceTemplateId()
        );
    }

    private double clamp(double value) {
        if (Double.isNaN(value) || Double.isInfinite(value)) {
            return 0;
        }
        return Math.max(0, Math.min(value, 100));
    }

    private double clampFont(double value, double fallback) {
        if (Double.isNaN(value) || Double.isInfinite(value) || value <= 0) {
            return fallback;
        }
        return Math.max(0.4, Math.min(value, 4));
    }

    private String normalizeHex(String value, String fallback) {
        String clean = trim(value, 24).toLowerCase(Locale.ROOT);
        return clean.matches("^#[0-9a-f]{6}$") ? clean : fallback;
    }

    private String requiredTrim(String value, int maxLength, String message) {
        String trimmed = trim(value, maxLength);
        if (!StringUtils.hasText(trimmed)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return trimmed;
    }

    private String trim(String value, int maxLength) {
        String trimmed = value == null ? "" : value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }

    private String validateCardPhoto(String value) {
        String photo = trim(value, MAX_CARD_PHOTO_LENGTH + 1);
        if (photo.length() > MAX_CARD_PHOTO_LENGTH) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Foto card terlalu besar");
        }
        String lower = photo.toLowerCase(Locale.ROOT);
        boolean dataImage = lower.startsWith("data:image/png;base64,")
                || lower.startsWith("data:image/jpeg;base64,")
                || lower.startsWith("data:image/webp;base64,");
        if (!dataImage && !lower.startsWith("https://")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Format foto card tidak valid");
        }
        return photo;
    }
}
