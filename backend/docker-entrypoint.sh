#!/bin/sh
set -e

# Wait for Postgres
until nc -z db 5432 2>/dev/null; do
  echo "Waiting for Postgres at db:5432..."
  sleep 2
done
echo "Postgres is up."

# Seed users and settings (idempotent)
npx ts-node src/scripts/seed-users.ts || true
npx ts-node src/scripts/seed-settings.ts || true

exec "$@"
