#!/usr/bin/env bash
# Create a Fly.io volume snapshot
# Usage: ./scripts/fly-snapshot.sh [app-name]
# Note: run `chmod +x scripts/*.sh` after checkout to make scripts executable
set -euo pipefail

APP="${1:-founderfate-mirofish}"
echo "Creating volume snapshot for app: $APP"
flyctl volumes snapshots create --app "$APP"
echo "Snapshot created."

# List recent snapshots
echo "Recent snapshots:"
flyctl volumes snapshots list --app "$APP"
