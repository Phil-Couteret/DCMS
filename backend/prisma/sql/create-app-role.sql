-- The API's own database role (MULTITENANT_PLAN.md step 6). Run once, as a
-- superuser, against the app's database:
--
--   sudo -u postgres psql -d divedb -v app_password="'<a strong password>'" -f prisma/sql/create-app-role.sql
--
-- then point the API at the new role and keep the owner for migrations
-- (backend/.env):
--
--   DATABASE_URL="postgresql://dcms_app:<password>@localhost:5432/divedb"
--   MIGRATION_DATABASE_URL="postgresql://diveapp:<password>@localhost:5432/divedb"
--
-- dcms_app reads and writes rows but owns no table, so it cannot disable or
-- un-force row-level security (that needs ownership), and it has no
-- BYPASSRLS. diveapp stays the owner: migrations run as it
-- (prisma7.config.ts reads MIGRATION_DATABASE_URL).

CREATE ROLE dcms_app LOGIN PASSWORD :app_password
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;

GRANT CONNECT ON DATABASE divedb TO dcms_app;
GRANT USAGE ON SCHEMA public TO dcms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dcms_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO dcms_app;

-- Tables and sequences that future migrations (run as diveapp) create.
ALTER DEFAULT PRIVILEGES FOR ROLE diveapp IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dcms_app;
ALTER DEFAULT PRIVILEGES FOR ROLE diveapp IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO dcms_app;

-- The migration history is the owner's business.
REVOKE ALL ON "_prisma_migrations" FROM dcms_app;
