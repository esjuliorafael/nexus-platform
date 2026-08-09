# Production operations

`nexus-storage-health.timer` runs every 15 minutes on Contabo and records only
state changes in `journald`. It checks:

- root filesystem capacity;
- presence, age and basic integrity of PostgreSQL backups;
- required Nexus containers.

The check is intentionally observational. It does not delete files, restart
containers, or create backups. Backup creation and off-site retention must be
configured separately once the destination and credentials are defined.
