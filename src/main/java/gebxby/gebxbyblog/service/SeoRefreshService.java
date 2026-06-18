package gebxby.gebxbyblog.service;

public interface SeoRefreshService {
    SeoRefreshService NOOP = reason -> {
    };

    void requestRefresh(String reason);
}
