-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tenantId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email") WHERE ("tenantId" IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email") WHERE ("tenantId" IS NOT NULL);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Only customer accounts belong to a tenant.
ALTER TABLE "User" ADD CONSTRAINT "User_tenant_customer" CHECK ("tenantId" IS NULL OR ("role" = 'CUSTOMER' AND NOT "isSuperadmin"));

-- Existing data. Customer profiles are tenant rows, so the row-level
-- security bypass is set for this session (Prisma runs migrations outside a
-- transaction, where SET LOCAL does nothing) and cleared at the end.
SELECT set_config('app.rls_bypass', 'on', false);

DO $$
DECLARE
  r record;
  home text;
  copy_id text;
BEGIN
  -- 1. A customer-only account moves into the tenant of its first customer
  --    profile; a profile at any other tenant gets its own account there
  --    (same email and password, so the diver can still sign in).
  FOR r IN
    SELECT u.id AS user_id, u.email, u."passwordHash", u.name, c.id AS customer_id, c."tenantId",
           row_number() OVER (PARTITION BY u.id ORDER BY c."createdAt", c.id) AS n
    FROM "User" u JOIN "Customer" c ON c."userId" = u.id
    WHERE u.role = 'CUSTOMER' AND NOT u."isSuperadmin"
    ORDER BY u.id, n
  LOOP
    IF r.n = 1 THEN
      UPDATE "User" SET "tenantId" = r."tenantId" WHERE id = r.user_id;
    ELSE
      copy_id := gen_random_uuid()::text;
      INSERT INTO "User" (id, email, "passwordHash", name, role, "tenantId", "createdAt", "updatedAt")
        VALUES (copy_id, r.email, r."passwordHash", r.name, 'CUSTOMER', r."tenantId", now(), now());
      UPDATE "Customer" SET "userId" = copy_id WHERE id = r.customer_id;
    END IF;
  END LOOP;

  -- 2. A staff (or platform) account keeps its customer profiles at the
  --    tenants it works for; one at any other tenant gets a customer account
  --    of that tenant.
  FOR r IN
    SELECT u.id AS user_id, u.email, u."passwordHash", u.name, c.id AS customer_id, c."tenantId"
    FROM "User" u JOIN "Customer" c ON c."userId" = u.id
    WHERE (u.role <> 'CUSTOMER' OR u."isSuperadmin")
      AND NOT EXISTS (SELECT 1 FROM "Membership" m WHERE m."userId" = u.id AND m."tenantId" = c."tenantId")
      AND NOT EXISTS (SELECT 1 FROM "Staff" s WHERE s."userId" = u.id AND s."tenantId" = c."tenantId")
  LOOP
    copy_id := gen_random_uuid()::text;
    INSERT INTO "User" (id, email, "passwordHash", name, role, "tenantId", "createdAt", "updatedAt")
      VALUES (copy_id, r.email, r."passwordHash", r.name, 'CUSTOMER', r."tenantId", now(), now());
    UPDATE "Customer" SET "userId" = copy_id WHERE id = r.customer_id;
  END LOOP;
END $$;

SELECT set_config('app.rls_bypass', '', false);

-- The database's own check: a customer uses a global account (a staff
-- member's own profile) or a customer account of its own tenant, never
-- another tenant's.
CREATE FUNCTION customer_account_tenant() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "User" u
    WHERE u.id = NEW."userId" AND u."tenantId" IS NOT NULL AND u."tenantId" <> NEW."tenantId"
  ) THEN
    RAISE EXCEPTION 'A customer can only use a customer account of its own tenant' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER "Customer_account_tenant" BEFORE INSERT OR UPDATE OF "userId", "tenantId" ON "Customer"
  FOR EACH ROW EXECUTE FUNCTION customer_account_tenant();
