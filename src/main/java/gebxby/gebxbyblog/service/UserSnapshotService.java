package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.model.User;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;

@Service
public class UserSnapshotService {
    public User snapshot(User source) {
        if (source == null) {
            return null;
        }
        User snapshot = new User();
        snapshot.setUserID(source.getUserID());
        snapshot.setName(source.getName());
        snapshot.setUsername(source.getUsername());
        snapshot.setPhoto(source.getPhoto());
        snapshot.setMoto(source.getMoto());
        snapshot.setDesignation(source.getDesignation());
        snapshot.setRole(source.getRole());
        snapshot.setSuspendedUntil(source.getSuspendedUntil());
        snapshot.setSuspensionCount(source.getSuspensionCount());
        snapshot.setSuspensionMarked(source.isSuspensionMarked());
        snapshot.setCriminalMarked(source.isCriminalMarked());
        snapshot.setActiveProfileCardId(source.getActiveProfileCardId());
        snapshot.setManualBadges(source.getManualBadges() == null ? new LinkedHashSet<>() : new LinkedHashSet<>(source.getManualBadges()));
        snapshot.setCustomBadgeIds(source.getCustomBadgeIds() == null ? new LinkedHashSet<>() : new LinkedHashSet<>(source.getCustomBadgeIds()));
        return snapshot;
    }
}
