#!/bin/bash
# DCMS database init: schema, migrations, sample data.
# Runs inside postgres container. /init = mounted database dir.
set -e

DB="${POSTGRES_DB:-dcms}"
PSQL="psql -v ON_ERROR_STOP=1 -U ${POSTGRES_USER:-postgres} -d $DB"

echo "[dcms] Applying schema..."
$PSQL -f /init/schema/001_create_tables.sql

echo "[dcms] Applying migrations..."
for f in /init/migrations/002_add_customer_consents.sql \
         /init/migrations/003_add_audit_logs.sql \
         /init/migrations/004_enhanced_account_deletion.sql \
         /init/migrations/005_add_dsar_table.sql \
         /init/migrations/006_add_data_breaches.sql \
         /init/migrations/006b_add_settings.sql \
         /init/migrations/007_add_location_types_settings.sql \
         /init/migrations/008_location_type_varchar.sql \
         /init/migrations/009_add_users_table.sql; do
  [ -f "$f" ] && $PSQL -f "$f" && echo "  applied $(basename "$f")"
done

if [ -f /init/seeds/002_sample_data.sql ]; then
  echo "[dcms] Loading sample data..."
  $PSQL -f /init/seeds/002_sample_data.sql
fi

echo "[dcms] Init done."
