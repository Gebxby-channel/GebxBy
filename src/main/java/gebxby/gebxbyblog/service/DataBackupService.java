package gebxby.gebxbyblog.service;

import gebxby.gebxbyblog.model.User;

public interface DataBackupService {
    BackupArchive createBackup(User admin);
}
