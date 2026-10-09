-- CreateEnum
CREATE TYPE "BonoType" AS ENUM ('PERCENTAGE', 'FIXED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "bonoId" TEXT,
ADD COLUMN     "bonoUsed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "GovernmentBono" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "code" TEXT NOT NULL,
    "type" "BonoType" NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovernmentBono_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GovernmentBono_tenantId_idx" ON "GovernmentBono"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "GovernmentBono_tenantId_code_key" ON "GovernmentBono"("tenantId", "code");

-- AddForeignKey
ALTER TABLE "GovernmentBono" ADD CONSTRAINT "GovernmentBono_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_bonoId_fkey" FOREIGN KEY ("bonoId") REFERENCES "GovernmentBono"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- A bono applies at most usageLimit times.
ALTER TABLE "GovernmentBono" ADD CONSTRAINT "GovernmentBono_usage" CHECK ("usageCount" >= 0 AND ("usageLimit" IS NULL OR "usageCount" <= "usageLimit"));
ALTER TABLE "GovernmentBono" ADD CONSTRAINT "GovernmentBono_value" CHECK ("discountValue" > 0 AND ("type" <> 'PERCENTAGE' OR "discountValue" <= 100));

-- Same-tenant checks (enforce_tenant) and row-level security, as on every
-- tenant table.
CREATE TRIGGER "GovernmentBono_enforce_tenant" BEFORE INSERT OR UPDATE ON "GovernmentBono"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant();
DROP TRIGGER "Booking_enforce_tenant" ON "Booking";
CREATE TRIGGER "Booking_enforce_tenant" BEFORE INSERT OR UPDATE ON "Booking"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('customerId', 'Customer', 'boatId', 'Boat', 'siteId', 'DiveSite', 'tripId', 'Trip', 'stayId', 'Stay', 'partnerId', 'Partner', 'partnerInvoiceId', 'PartnerInvoice', 'locationId', 'Location', 'bonoId', 'GovernmentBono');

ALTER TABLE "GovernmentBono" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GovernmentBono" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "GovernmentBono"
  USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '') OR current_setting('app.rls_bypass', true) = 'on')
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '') OR current_setting('app.rls_bypass', true) = 'on');
