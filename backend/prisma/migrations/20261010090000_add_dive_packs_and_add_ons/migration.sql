-- CreateEnum
CREATE TYPE "BookingAddOn" AS ENUM ('NIGHT_DIVE', 'PERSONAL_INSTRUCTOR');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "addOns" "BookingAddOn"[] DEFAULT ARRAY[]::"BookingAddOn"[];

-- CreateTable
CREATE TABLE "AddOnPrice" (
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "addOn" "BookingAddOn" NOT NULL,
    "price" DECIMAL(8,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddOnPrice_pkey" PRIMARY KEY ("tenantId","addOn")
);

-- CreateTable
CREATE TABLE "DivePack" (
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "diveCount" INTEGER NOT NULL,
    "price" DECIMAL(8,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DivePack_pkey" PRIMARY KEY ("tenantId","diveCount")
);

-- AddForeignKey
ALTER TABLE "AddOnPrice" ADD CONSTRAINT "AddOnPrice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DivePack" ADD CONSTRAINT "DivePack_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "AddOnPrice" ADD CONSTRAINT "AddOnPrice_price" CHECK ("price" >= 0);
ALTER TABLE "DivePack" ADD CONSTRAINT "DivePack_values" CHECK ("diveCount" BETWEEN 2 AND 100 AND "price" >= 0);

-- Same-tenant checks (enforce_tenant) and row-level security, as on every
-- tenant table.
CREATE TRIGGER "AddOnPrice_enforce_tenant" BEFORE INSERT OR UPDATE ON "AddOnPrice"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant();
CREATE TRIGGER "DivePack_enforce_tenant" BEFORE INSERT OR UPDATE ON "DivePack"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant();

ALTER TABLE "AddOnPrice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AddOnPrice" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AddOnPrice"
  USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '') OR current_setting('app.rls_bypass', true) = 'on')
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '') OR current_setting('app.rls_bypass', true) = 'on');
ALTER TABLE "DivePack" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DivePack" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "DivePack"
  USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '') OR current_setting('app.rls_bypass', true) = 'on')
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '') OR current_setting('app.rls_bypass', true) = 'on');

-- Every existing center: the add-on prices of the original price list, and
-- the packs the public site showed (5 dives €200, 10 dives €380).
-- Prisma runs a migration outside a transaction, where SET LOCAL has no
-- effect: the bypass is set for the session and cleared again below.
SELECT set_config('app.rls_bypass', 'on', false);
INSERT INTO "AddOnPrice" ("tenantId", "addOn", "price", "updatedAt")
  SELECT t.id, a.add_on::"BookingAddOn", a.price, now()
  FROM "Tenant" t CROSS JOIN (VALUES ('NIGHT_DIVE', 20.00), ('PERSONAL_INSTRUCTOR', 100.00)) AS a(add_on, price);
INSERT INTO "DivePack" ("tenantId", "diveCount", "price", "updatedAt")
  SELECT t.id, p.dives, p.price, now()
  FROM "Tenant" t CROSS JOIN (VALUES (5, 200.00), (10, 380.00)) AS p(dives, price);
SELECT set_config('app.rls_bypass', '', false);
