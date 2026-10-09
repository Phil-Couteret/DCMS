-- CreateEnum
CREATE TYPE "InsurancePeriod" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "waiverSignedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "InsurancePrice" (
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "period" "InsurancePeriod" NOT NULL,
    "price" DECIMAL(8,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsurancePrice_pkey" PRIMARY KEY ("tenantId","period")
);

-- AddForeignKey
ALTER TABLE "InsurancePrice" ADD CONSTRAINT "InsurancePrice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;



ALTER TABLE "InsurancePrice" ADD CONSTRAINT "InsurancePrice_price" CHECK ("price" >= 0);

-- Same-tenant checks (enforce_tenant) and row-level security, as on every
-- tenant table.
CREATE TRIGGER "InsurancePrice_enforce_tenant" BEFORE INSERT OR UPDATE ON "InsurancePrice"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant();
ALTER TABLE "InsurancePrice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InsurancePrice" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "InsurancePrice"
  USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '') OR current_setting('app.rls_bypass', true) = 'on')
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '') OR current_setting('app.rls_bypass', true) = 'on');

-- Every existing center: the original system's dive insurance prices (1 day
-- 7, 1 week 18, 1 month 25, 1 year 45). Prisma runs a migration outside a
-- transaction, where SET LOCAL has no effect: the bypass is set for the
-- session and cleared again below.
SELECT set_config('app.rls_bypass', 'on', false);
INSERT INTO "InsurancePrice" ("tenantId", "period", "price", "updatedAt")
  SELECT t.id, i.period::"InsurancePeriod", i.price, now()
  FROM "Tenant" t CROSS JOIN (VALUES ('DAY', 7.00), ('WEEK', 18.00), ('MONTH', 25.00), ('YEAR', 45.00)) AS i(period, price);
SELECT set_config('app.rls_bypass', '', false);
