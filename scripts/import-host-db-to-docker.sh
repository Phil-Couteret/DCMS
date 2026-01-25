#!/bin/bash
# Import host PostgreSQL DB into Docker (VPS-like stack).
# Usage: ./scripts/import-host-db-to-docker.sh <path-to-dump.sql>
#
# 1. Dump your host DB first (use same DB as start-poc/backend):
#    pg_dump -U postgres -h localhost -d dcms -F p --no-owner --no-acl -f dcms_export.sql
#    (Use your DB name if different: dcms_test, etc. --no-owner/--no-acl avoid restore issues.)
# 2. Stop local stack (start-poc), then:
#    ./scripts/import-host-db-to-docker.sh dcms_export.sql

set -e

DUMP="${1:-}"
if [ -z "$DUMP" ]; then
  echo "Usage: $0 <path-to-dump.sql>"
  echo ""
  echo "1. Dump your host DB:"
  echo "   pg_dump -U postgres -h localhost -d dcms -F p --no-owner --no-acl -f dcms_export.sql"
  echo "   (Use your DB name if different: dcms_test, etc.)"
  echo "2. Run: $0 dcms_export.sql"
  exit 1
fi

if [ ! -f "$DUMP" ]; then
  echo "File not found: $DUMP"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Stopping stack and removing DB volume..."
docker compose down -v

echo "Starting Postgres only (no init)..."
docker compose -f docker-compose.yml -f docker-compose.import.yml up -d db

echo "Waiting for Postgres..."
until docker compose exec db pg_isready -U dcms -d dcms 2>/dev/null; do
  sleep 1
done
sleep 2

echo "Restoring dump into Docker Postgres..."
docker compose exec -T db psql -U dcms -d dcms < "$DUMP"

echo "Starting backend and frontend..."
docker compose -f docker-compose.yml -f docker-compose.import.yml up -d

echo "Done. Open http://localhost:3000 (use your existing users to log in)."
