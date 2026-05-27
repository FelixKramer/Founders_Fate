#!/usr/bin/env bash
# Restore Postgres from backup
# Usage: ./scripts/restore-postgres.sh /path/to/backup.sql.gz
# Note: run `chmod +x scripts/*.sh` after checkout to make scripts executable
set -euo pipefail

BACKUP_FILE="${1:?Usage: $0 <backup.sql.gz>}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will restore from $BACKUP_FILE"
echo "This will DROP and recreate the database. Are you sure? (type 'yes' to confirm)"
read -r CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo "Restoring from $BACKUP_FILE..."
gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
echo "Restore complete."
