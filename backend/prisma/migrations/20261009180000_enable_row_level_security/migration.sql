-- Row-level security: the database's own tenant filter, behind the
-- application's (the Prisma extension). A query that misses the filter in
-- code still sees and changes only the current tenant's rows.
--
-- The tenant comes from the session setting app.tenant_id, which the app sets
-- before every statement (src/prisma/tenant-pool.ts). Unset or empty, a
-- tenant table shows no rows and accepts none: it fails closed.
--
-- app.rls_bypass = 'on' lets a statement see every tenant. The app sets it
-- only inside runUnscoped (platform lookups: a partner's API key at sign-in,
-- the superadmin console's counts), never for ordinary requests.
--
-- FORCE applies the policies to the tables' owner too, so they hold while
-- the app connects as the owner. Migrations that change tenant data must
-- `SET LOCAL app.rls_bypass = 'on'` first (or set app.tenant_id).
--
-- Global tables (Membership, PlatformAuditLog, Invitation; and User, Tenant,
-- which have no tenantId) are not tenant data and get no policy.
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT c.table_name FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.column_name = 'tenantId'
      AND c.table_name NOT IN ('Membership', 'PlatformAuditLog', 'Invitation')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')
                OR current_setting(''app.rls_bypass'', true) = ''on'')
         WITH CHECK ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')
                OR current_setting(''app.rls_bypass'', true) = ''on'')',
      t);
  END LOOP;
END $$;
