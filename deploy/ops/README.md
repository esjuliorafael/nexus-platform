# Production operations

`nexus-storage-health.timer` runs every 15 minutes on Contabo and records only
state changes in `journald`. It checks:

- root filesystem capacity;
- presence, age and basic integrity of PostgreSQL backups;
- required Nexus containers.

The check is intentionally observational. It does not delete files, restart
containers, or create backups. Backup creation now belongs to the central
Platform Admin worker and uploads encrypted objects to the configured R2 bucket.
The legacy local-file check remains only for old host backups and should not be
used as proof that an off-site R2 backup completed. The Platform Admin status
and R2 object listing are the source for that verification.
