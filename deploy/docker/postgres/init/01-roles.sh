#!/bin/sh
# First start only (an empty data volume): the database's roles.
# - diveapp owns the database and its tables; migrations run as it.
# - dcms_app is the API's role: it reads and writes rows but owns nothing,
#   so it cannot disable row-level security, and has no BYPASSRLS.
# Same design as backend/prisma/sql/create-app-role.sql.
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v owner_pw="$DIVEAPP_PASSWORD" -v app_pw="$DCMS_APP_PASSWORD" -v db="$POSTGRES_DB" <<'SQL'
CREATE ROLE diveapp LOGIN PASSWORD :'owner_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE;
ALTER DATABASE :"db" OWNER TO diveapp;
ALTER SCHEMA public OWNER TO diveapp;

CREATE ROLE dcms_app LOGIN PASSWORD :'app_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE :"db" TO dcms_app;
GRANT USAGE ON SCHEMA public TO dcms_app;
-- Every table and sequence the migrations (as diveapp) create.
ALTER DEFAULT PRIVILEGES FOR ROLE diveapp IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dcms_app;
ALTER DEFAULT PRIVILEGES FOR ROLE diveapp IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO dcms_app;
SQL
