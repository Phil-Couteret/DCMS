#!/bin/sh
set -e

# Wait for Postgres
until nc -z db 5432 2>/dev/null; do
  echo "Waiting for Postgres at db:5432..."
  sleep 2
done
echo "Postgres is up."

# psql doesn't support ?schema=public - strip query string for psql
PSQL_URL="${DATABASE_URL%%\?*}"

# Apply schema via SQL (bypasses Prisma schema engine which has OpenSSL issues)
# Run Prisma migration SQL directly - only if users table doesn't exist
if ! psql "$PSQL_URL" -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users'" 2>/dev/null | grep -q 1; then
  echo "Applying database schema..."
  for f in /app/prisma/migrations/*/migration.sql; do
    [ -f "$f" ] && psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f "$f" && echo "  applied $(dirname "$f" | xargs basename)"
  done
else
  npx prisma migrate deploy 2>/dev/null || true
fi

# Apply multi-tenant migration when tenants table doesn't exist (idempotent)
if ! psql "$PSQL_URL" -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tenants'" 2>/dev/null | grep -q 1; then
  echo "Applying multi-tenant migration..."
  psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f /app/scripts/migrations/011_add_multi_tenant.sql && echo "  applied 011_add_multi_tenant"
fi

# Seed users and settings (idempotent) - use compiled JS for production
node dist/scripts/seed-users.js || npx ts-node src/scripts/seed-users.ts || true
node dist/scripts/seed-settings.js || npx ts-node src/scripts/seed-settings.ts || true

exec "$@"
