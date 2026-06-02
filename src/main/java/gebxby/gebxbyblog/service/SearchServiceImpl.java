package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.dto.BadgeResponse;
import gebxby.gebxbyblog.dto.PublicUserResponse;
import gebxby.gebxbyblog.dto.SearchBadgeResult;
import gebxby.gebxbyblog.dto.SearchContentResult;
import gebxby.gebxbyblog.dto.SearchResponse;
import gebxby.gebxbyblog.model.BadgeCode;
import gebxby.gebxbyblog.model.Content;
import gebxby.gebxbyblog.model.User;
import gebxby.gebxbyblog.repository.ContentRepository;
import gebxby.gebxbyblog.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class SearchServiceImpl implements SearchService {
    private static final int MAX_QUERY_LENGTH = 80;
    private static final int MAX_SIZE = 12;
    private static final int USER_FETCH_MULTIPLIER = 4;
    private static final int BADGE_USER_LIMIT = 4;

    private final UserRepository userRepository;
    private final ContentRepository contentRepository;
    private final BadgeService badgeService;
    private final ForumMapper mapper;

    public SearchServiceImpl(UserRepository userRepository,
                             ContentRepository contentRepository,
                             BadgeService badgeService,
                             ForumMapper mapper) {
        this.userRepository = userRepository;
        this.contentRepository = contentRepository;
        this.badgeService = badgeService;
        this.mapper = mapper;
    }

    @Override
    public SearchResponse search(String query, String type, int size) {
        String normalizedQuery = normalizeQuery(query);
        int resultSize = clampSize(size);
        SearchType searchType = SearchType.from(type);
        if (normalizedQuery.length() < 2) {
            return new SearchResponse(normalizedQuery, List.of(), List.of(), List.of());
        }

        List<PublicUserResponse> users = searchType.includesUsers()
                ? searchUsers(normalizedQuery, resultSize)
                : List.of();
        List<SearchContentResult> contents = searchType.includesContents()
                ? searchContents(normalizedQuery, resultSize)
                : List.of();
        List<SearchBadgeResult> badges = searchType.includesBadges()
                ? searchBadges(normalizedQuery, resultSize)
                : List.of();

        return new SearchResponse(normalizedQuery, users, contents, badges);
    }

    private List<PublicUserResponse> searchUsers(String query, int size) {
        return userRepository.searchPublicUsers(regexContains(query), PageRequest.of(0, fetchSize(size))).stream()
                .sorted(Comparator
                        .comparingInt((User user) -> userRank(user, query))
                        .thenComparing(user -> safe(user.getName()), String.CASE_INSENSITIVE_ORDER))
                .limit(size)
                .map(mapper::toPublicUser)
                .toList();
    }

    private List<SearchContentResult> searchContents(String query, int size) {
        return contentRepository.searchByHeadline(regexContains(query), PageRequest.of(0, fetchSize(size))).stream()
                .filter(this::isPublished)
                .sorted(Comparator
                        .comparingInt((Content content) -> contentRank(content, query))
                        .thenComparing(Content::getUpCount, Comparator.reverseOrder())
                        .thenComparing(Content::getViewCount, Comparator.reverseOrder()))
                .limit(size)
                .map(this::toContentResult)
                .toList();
    }

    private List<SearchBadgeResult> searchBadges(String query, int size) {
        return badgeService.definitions().stream()
                .filter(badge -> badgeMatches(badge, query))
                .sorted(Comparator.comparingInt((BadgeResponse badge) -> badgeRank(badge, query))
                        .thenComparing(badge -> badge.label().toLowerCase(Locale.ROOT)))
                .limit(size)
                .map(this::toBadgeResult)
                .toList();
    }

    private SearchContentResult toContentResult(Content content) {
        return new SearchContentResult(
                content.getIdContent(),
                content.getHead(),
                content.getSubtitle(),
                content.getKategori(),
                mapper.toPublicUser(content.getUser()),
                content.getViewCount(),
                content.getUpCount(),
                content.getCommentCount(),
                content.getCreatedAt()
        );
    }

    private SearchBadgeResult toBadgeResult(BadgeResponse badge) {
        return new SearchBadgeResult(
                badge.id(),
                badge.code(),
                badge.label(),
                badge.description(),
                badge.icon(),
                badge.image(),
                badge.automatic(),
                badge.custom(),
                findBadgeUsers(badge).stream()
                        .map(mapper::toPublicUser)
                        .toList()
        );
    }

    private List<User> findBadgeUsers(BadgeResponse badge) {
        PageRequest page = PageRequest.of(0, BADGE_USER_LIMIT);
        if (badge.custom()) {
            try {
                return userRepository.findByCustomBadgeIds(UUID.fromString(badge.id()), page);
            } catch (IllegalArgumentException ex) {
                return List.of();
            }
        }
        return switch (badge.code()) {
            case ADMIN -> userRepository.findByRoleIgnoreCase("ADMIN", page);
            case SURVIVOR -> userRepository.findAll(page).getContent();
            case CRIMINAL -> userRepository.findCriminalBadgeUsers(page);
            case LIGA -> List.of();
            default -> userRepository.findByManualBadges(badge.code(), page);
        };
    }

    private boolean badgeMatches(BadgeResponse badge, String query) {
        return contains(badge.id(), query)
                || contains(badge.code() == null ? "" : badge.code().name(), query)
                || contains(badge.label(), query)
                || contains(badge.description(), query);
    }

    private int badgeRank(BadgeResponse badge, String query) {
        String code = normalizeText(badge.code() == null ? badge.id() : badge.code().name());
        String label = normalizeText(badge.label());
        if (code.equals(query) || label.equals(query)) return 0;
        if (code.startsWith(query) || label.startsWith(query)) return 1;
        return 2;
    }

    private int userRank(User user, String query) {
        return Math.min(rank(user.getName(), query), rank(user.getDesignation(), query) + 1);
    }

    private int contentRank(Content content, String query) {
        return Math.min(rank(content.getHead(), query), Math.min(rank(content.getSubtitle(), query) + 1, rank(content.getKategori(), query) + 2));
    }

    private int rank(String value, String query) {
        String normalized = normalizeText(value);
        if (normalized.equals(query)) return 0;
        if (normalized.startsWith(query)) return 1;
        if (normalized.contains(query)) return 2;
        return 3;
    }

    private boolean contains(String value, String query) {
        return normalizeText(value).contains(query);
    }

    private String regexContains(String query) {
        return ".*" + Pattern.quote(query) + ".*";
    }

    private int fetchSize(int size) {
        return Math.min(50, Math.max(size, size * USER_FETCH_MULTIPLIER));
    }

    private int clampSize(int size) {
        return Math.max(1, Math.min(size <= 0 ? 5 : size, MAX_SIZE));
    }

    private String normalizeQuery(String query) {
        String clean = StringUtils.hasText(query) ? query.trim().replaceAll("\\s+", " ") : "";
        return normalizeText(clean.length() <= MAX_QUERY_LENGTH ? clean : clean.substring(0, MAX_QUERY_LENGTH));
    }

    private String normalizeText(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT).replace('_', ' ').replaceAll("\\s+", " ").trim();
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private boolean isPublished(Content content) {
        return content == null || content.getStatus() == null || "PUBLISHED".equalsIgnoreCase(content.getStatus());
    }

    private enum SearchType {
        ALL,
        USERS,
        CONTENTS,
        BADGES;

        static SearchType from(String value) {
            if (!StringUtils.hasText(value)) {
                return ALL;
            }
            return switch (value.trim().toLowerCase(Locale.ROOT)) {
                case "user", "users" -> USERS;
                case "content", "contents", "writing", "writings", "tulisan" -> CONTENTS;
                case "badge", "badges" -> BADGES;
                default -> ALL;
            };
        }

        boolean includesUsers() {
            return this == ALL || this == USERS;
        }

        boolean includesContents() {
            return this == ALL || this == CONTENTS;
        }

        boolean includesBadges() {
            return this == ALL || this == BADGES;
        }
    }
}
