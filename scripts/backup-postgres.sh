#!/usr/bin/env bash
# Nightly Postgres backup to S3/local
# Usage: ./scripts/backup-postgres.sh [backup-dir]
# Note: run `chmod +x scripts/*.sh` after checkout to make scripts executable
set -euo pipefail

BACKUP_DIR="${1:-/tmp/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="founderfate_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Starting Postgres backup: $FILENAME"
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/$FILENAME"
echo "Backup complete: $BACKUP_DIR/$FILENAME"

# Verify backup is non-empty
if [ ! -s "$BACKUP_DIR/$FILENAME" ]; then
  echo "ERROR: Backup file is empty!"
  exit 1
fi

echo "Backup size: $(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)"

# Keep last 7 backups
ls -t "$BACKUP_DIR"/founderfate_*.sql.gz | tail -n +8 | xargs -r rm
echo "Backup retention cleanup done"
