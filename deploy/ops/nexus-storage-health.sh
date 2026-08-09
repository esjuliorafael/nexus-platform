#!/usr/bin/env bash
set -u

STATE_DIR="/var/lib/nexus"
STATE_FILE="$STATE_DIR/storage-health.state"
BACKUP_DIR="/home/nexus/backups"
WARN_DISK=70
CRITICAL_DISK=85
MAX_BACKUP_AGE_HOURS=48

mkdir -p "$STATE_DIR"

emit_state() {
  local state="$1"
  local message="$2"
  local previous=""
  [[ -f "$STATE_FILE" ]] && previous=$(cat "$STATE_FILE")
  if [[ "$state" != "$previous" ]]; then
    logger -p "${state%%:*}" -t nexus-storage-health -- "$message"
    printf '%s' "$state" > "$STATE_FILE"
  fi
}

disk_used=$(df -P / | awk 'NR==2 {gsub(/%/, "", $5); print $5}')
if (( disk_used >= CRITICAL_DISK )); then
  emit_state "user.crit:disk" "Disk usage is ${disk_used}% (critical threshold ${CRITICAL_DISK}%)."
elif (( disk_used >= WARN_DISK )); then
  emit_state "user.warning:disk" "Disk usage is ${disk_used}% (warning threshold ${WARN_DISK}%)."
fi

latest_backup=$(find "$BACKUP_DIR" -type f \( -name '*.dump' -o -name '*.sql' -o -name '*.sql.gz' \) -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -1 | cut -d' ' -f2-)
if [[ -z "$latest_backup" ]]; then
  emit_state "user.crit:backup" "No database backup files were found under $BACKUP_DIR."
else
  backup_age=$(( $(date +%s) - $(stat -c %Y "$latest_backup") ))
  if (( backup_age > MAX_BACKUP_AGE_HOURS * 3600 )); then
    emit_state "user.warning:backup" "Latest database backup is older than ${MAX_BACKUP_AGE_HOURS} hours: $latest_backup"
  else
    if [[ "$latest_backup" == *.sql.gz ]]; then
      if ! gzip -t "$latest_backup" 2>/dev/null; then
        emit_state "user.crit:backup-integrity" "Latest compressed backup failed gzip integrity check: $latest_backup"
      fi
    elif [[ "$latest_backup" == *.dump ]]; then
      if ! timeout 30s docker exec -i nexus-postgres-global pg_restore --list < "$latest_backup" >/dev/null 2>&1; then
        emit_state "user.crit:backup-integrity" "Latest PostgreSQL dump failed pg_restore integrity check: $latest_backup"
      fi
    fi
  fi
fi

required_containers=(
  trojes-api
  trojes-front
  trojes-admin
  nexus-postgres-global
  nexus-redis-global
  nexus-nginx
)
missing=()
for container in "${required_containers[@]}"; do
  if ! docker ps --format '{{.Names}}' | grep -Fxq "$container"; then
    missing+=("$container")
  fi
done
if (( ${#missing[@]} > 0 )); then
  emit_state "user.crit:services" "Required containers are not running: ${missing[*]}"
fi

# A healthy run clears the state only after all checks pass, allowing recovery
# messages without producing a log entry every 15 minutes.
if (( disk_used < WARN_DISK )) && [[ -n "$latest_backup" ]] && (( backup_age <= MAX_BACKUP_AGE_HOURS * 3600 )) && (( ${#missing[@]} == 0 )); then
  previous=""
  [[ -f "$STATE_FILE" ]] && previous=$(cat "$STATE_FILE")
  if [[ -n "$previous" ]]; then
    logger -p user.notice -t nexus-storage-health -- "Storage, backup and required services recovered."
    : > "$STATE_FILE"
  fi
fi
