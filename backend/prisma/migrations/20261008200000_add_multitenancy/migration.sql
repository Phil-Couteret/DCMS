-- Multi-tenancy, step 1 (docs/MULTITENANT_PLAN.md).
--
-- Every existing row moves to one default tenant. The new tenantId columns
-- default to the session setting app.tenant_id; this migration sets it to the
-- default tenant for its own session, so adding each NOT NULL column fills
-- the existing rows in the same statement. Outside this migration the setting
-- is unset and the default yields NULL: an insert without a tenant fails.

-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('DIVING', 'BIKE', 'SURF', 'KITE');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "TenantPlan" NOT NULL DEFAULT 'FREE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "name" TEXT NOT NULL,
    "type" "LocationType" NOT NULL DEFAULT 'DIVING',
    "address" JSONB,
    "contactInfo" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Location_tenantId_idx" ON "Location"("tenantId");

-- CreateIndex
CREATE INDEX "Membership_tenantId_idx" ON "Membership"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_tenantId_key" ON "Membership"("userId", "tenantId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The default tenant, its first location, and access for existing staff.
INSERT INTO "Tenant" ("id", "name", "slug", "updatedAt")
VALUES (gen_random_uuid()::text, 'Default Center', 'default', CURRENT_TIMESTAMP);

SELECT set_config('app.tenant_id', (SELECT "id" FROM "Tenant" WHERE "slug" = 'default'), false);

INSERT INTO "Location" ("id", "tenantId", "name", "updatedAt")
SELECT gen_random_uuid()::text, current_setting('app.tenant_id'),
       COALESCE((SELECT NULLIF(TRIM("name"), '') FROM "CenterSettings" LIMIT 1), 'Main location'),
       CURRENT_TIMESTAMP;

INSERT INTO "Membership" ("id", "userId", "tenantId")
SELECT gen_random_uuid()::text, u."id", current_setting('app.tenant_id')
FROM "User" u
WHERE u."role" IN ('ADMIN', 'INSTRUCTOR')
   OR EXISTS (SELECT 1 FROM "Staff" s WHERE s."userId" = u."id");

-- DropIndex
DROP INDEX "ClosedDay_date_key";

-- DropIndex
DROP INDEX "Customer_userId_key";

-- DropIndex
DROP INDEX "DiveLog_logNumber_key";

-- DropIndex
DROP INDEX "Equipment_serialNumber_key";

-- DropIndex
DROP INDEX "Invoice_invoiceNumber_key";

-- DropIndex
DROP INDEX "Partner_contactEmail_key";

-- DropIndex
DROP INDEX "PartnerInvoice_invoiceNumber_key";

-- DropIndex
DROP INDEX "Staff_userId_key";

-- DropIndex
DROP INDEX "Trip_date_timeSlot_boatId_key";

-- AlterTable
ALTER TABLE "ActivityPrice" DROP CONSTRAINT "ActivityPrice_pkey",
ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
ADD CONSTRAINT "ActivityPrice_pkey" PRIMARY KEY ("tenantId", "activityType");

-- AlterTable
ALTER TABLE "Boat" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "CenterSettings" DROP CONSTRAINT "CenterSettings_pkey",
DROP COLUMN "id",
ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
ADD CONSTRAINT "CenterSettings_pkey" PRIMARY KEY ("tenantId");

-- AlterTable
ALTER TABLE "ClosedDay" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "CustomerCertification" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "DataBreach" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "DiveLog" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "DiveLogParticipant" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "DiveLogSignature" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "DiveSite" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "EquipmentPrice" DROP CONSTRAINT "EquipmentPrice_pkey",
ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
ADD CONSTRAINT "EquipmentPrice_pkey" PRIMARY KEY ("tenantId", "key");

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "FunDiveTier" DROP CONSTRAINT "FunDiveTier_pkey",
ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
ADD CONSTRAINT "FunDiveTier_pkey" PRIMARY KEY ("tenantId", "minDives");

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "MaintenanceLog" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "ManualIncome" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "PartnerInvoice" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "PartnerInvoiceLine" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "StaffAvailability" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "StaffQualification" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "Stay" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "StayCost" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- AlterTable
ALTER TABLE "TripStaff" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true);

-- CreateIndex
CREATE INDEX "Boat_tenantId_idx" ON "Boat"("tenantId");

-- CreateIndex
CREATE INDEX "Booking_tenantId_idx" ON "Booking"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ClosedDay_tenantId_date_key" ON "ClosedDay"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tenantId_userId_key" ON "Customer"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "CustomerCertification_tenantId_idx" ON "CustomerCertification"("tenantId");

-- CreateIndex
CREATE INDEX "DataBreach_tenantId_idx" ON "DataBreach"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "DiveLog_tenantId_logNumber_key" ON "DiveLog"("tenantId", "logNumber");

-- CreateIndex
CREATE INDEX "DiveLogParticipant_tenantId_idx" ON "DiveLogParticipant"("tenantId");

-- CreateIndex
CREATE INDEX "DiveLogSignature_tenantId_idx" ON "DiveLogSignature"("tenantId");

-- CreateIndex
CREATE INDEX "DiveSite_tenantId_idx" ON "DiveSite"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_tenantId_serialNumber_key" ON "Equipment"("tenantId", "serialNumber");

-- CreateIndex
CREATE INDEX "Expense_tenantId_idx" ON "Expense"("tenantId");

-- CreateIndex
CREATE INDEX "Incident_tenantId_idx" ON "Incident"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_invoiceNumber_key" ON "Invoice"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "InvoiceItem_tenantId_idx" ON "InvoiceItem"("tenantId");

-- CreateIndex
CREATE INDEX "MaintenanceLog_tenantId_idx" ON "MaintenanceLog"("tenantId");

-- CreateIndex
CREATE INDEX "ManualIncome_tenantId_idx" ON "ManualIncome"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_tenantId_contactEmail_key" ON "Partner"("tenantId", "contactEmail");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerInvoice_tenantId_invoiceNumber_key" ON "PartnerInvoice"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "PartnerInvoiceLine_tenantId_idx" ON "PartnerInvoiceLine"("tenantId");

-- CreateIndex
CREATE INDEX "Payment_tenantId_idx" ON "Payment"("tenantId");

-- CreateIndex
CREATE INDEX "Refund_tenantId_idx" ON "Refund"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_tenantId_userId_key" ON "Staff"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "StaffAvailability_tenantId_idx" ON "StaffAvailability"("tenantId");

-- CreateIndex
CREATE INDEX "StaffQualification_tenantId_idx" ON "StaffQualification"("tenantId");

-- CreateIndex
CREATE INDEX "Stay_tenantId_idx" ON "Stay"("tenantId");

-- CreateIndex
CREATE INDEX "StayCost_tenantId_idx" ON "StayCost"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_tenantId_date_timeSlot_boatId_key" ON "Trip"("tenantId", "date", "timeSlot", "boatId");

-- CreateIndex
CREATE INDEX "TripStaff_tenantId_idx" ON "TripStaff"("tenantId");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerCertification" ADD CONSTRAINT "CustomerCertification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CenterSettings" ADD CONSTRAINT "CenterSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityPrice" ADD CONSTRAINT "ActivityPrice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentPrice" ADD CONSTRAINT "EquipmentPrice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunDiveTier" ADD CONSTRAINT "FunDiveTier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boat" ADD CONSTRAINT "Boat_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiveSite" ADD CONSTRAINT "DiveSite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffQualification" ADD CONSTRAINT "StaffQualification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAvailability" ADD CONSTRAINT "StaffAvailability_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStaff" ADD CONSTRAINT "TripStaff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiveLog" ADD CONSTRAINT "DiveLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiveLogParticipant" ADD CONSTRAINT "DiveLogParticipant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiveLogSignature" ADD CONSTRAINT "DiveLogSignature_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualIncome" ADD CONSTRAINT "ManualIncome_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosedDay" ADD CONSTRAINT "ClosedDay_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StayCost" ADD CONSTRAINT "StayCost_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerInvoice" ADD CONSTRAINT "PartnerInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerInvoiceLine" ADD CONSTRAINT "PartnerInvoiceLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataBreach" ADD CONSTRAINT "DataBreach_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Same-tenant references. A row may only point at rows of its own tenant, and
-- a row's tenant never changes. Checked in the database so that no code path
-- (including raw SQL) can link two tenants' data. Each trigger lists its
-- foreign keys as (column, referenced table) pairs.
CREATE FUNCTION enforce_tenant() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  i int := 0;
  ref_id text;
  ref_tenant text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."tenantId" IS DISTINCT FROM OLD."tenantId" THEN
    RAISE EXCEPTION 'tenantId of % cannot change', TG_TABLE_NAME USING ERRCODE = 'check_violation';
  END IF;
  WHILE i < TG_NARGS LOOP
    ref_id := to_jsonb(NEW) ->> TG_ARGV[i];
    IF ref_id IS NOT NULL THEN
      EXECUTE format('SELECT "tenantId" FROM %I WHERE "id" = $1', TG_ARGV[i + 1]) INTO ref_tenant USING ref_id;
      IF ref_tenant IS DISTINCT FROM NEW."tenantId" THEN
        RAISE EXCEPTION '%.% points at a % of another tenant', TG_TABLE_NAME, TG_ARGV[i], TG_ARGV[i + 1]
          USING ERRCODE = 'foreign_key_violation';
      END IF;
    END IF;
    i := i + 2;
  END LOOP;
  RETURN NEW;
END $$;

CREATE TRIGGER "ActivityPrice_enforce_tenant" BEFORE INSERT OR UPDATE ON "ActivityPrice"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant();

CREATE TRIGGER "Boat_enforce_tenant" BEFORE INSERT OR UPDATE ON "Boat"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant();

CREATE TRIGGER "Booking_enforce_tenant" BEFORE INSERT OR UPDATE ON "Booking"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('customerId', 'Customer', 'boatId', 'Boat', 'siteId', 'DiveSite', 'tripId', 'Trip', 'stayId', 'Stay', 'partnerId', 'Partner', 'partnerInvoiceId', 'PartnerInvoice');

CREATE TRIGGER "CenterSettings_enforce_tenant" BEFORE INSERT OR UPDATE ON "CenterSettings"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant();

CREATE TRIGGER "ClosedDay_enforce_tenant" BEFORE INSERT OR UPDATE ON "ClosedDay"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant();

CREATE TRIGGER "Customer_enforce_tenant" BEFORE INSERT OR UPDATE ON "Customer"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('partnerId', 'Partner');

CREATE TRIGGER "CustomerCertification_enforce_tenant" BEFORE INSERT OR UPDATE ON "CustomerCertification"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('customerId', 'Customer');

CREATE TRIGGER "DataBreach_enforce_tenant" BEFORE INSERT OR UPDATE ON "DataBreach"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant();

CREATE TRIGGER "DiveLog_enforce_tenant" BEFORE INSERT OR UPDATE ON "DiveLog"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('bookingId', 'Booking', 'siteId', 'DiveSite', 'guideId', 'Staff');

CREATE TRIGGER "DiveLogParticipant_enforce_tenant" BEFORE INSERT OR UPDATE ON "DiveLogParticipant"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('diveLogId', 'DiveLog', 'customerId', 'Customer');

CREATE TRIGGER "DiveLogSignature_enforce_tenant" BEFORE INSERT OR UPDATE ON "DiveLogSignature"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('diveLogId', 'DiveLog');

CREATE TRIGGER "DiveSite_enforce_tenant" BEFORE INSERT OR UPDATE ON "DiveSite"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant();

CREATE TRIGGER "Equipment_enforce_tenant" BEFORE INSERT OR UPDATE ON "Equipment"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant();

CREATE TRIGGER "EquipmentPrice_enforce_tenant" BEFORE INSERT OR UPDATE ON "EquipmentPrice"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant();

CREATE TRIGGER "Expense_enforce_tenant" BEFORE INSERT OR UPDATE ON "Expense"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant();

CREATE TRIGGER "FunDiveTier_enforce_tenant" BEFORE INSERT OR UPDATE ON "FunDiveTier"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant();

CREATE TRIGGER "Incident_enforce_tenant" BEFORE INSERT OR UPDATE ON "Incident"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('diveLogId', 'DiveLog');

CREATE TRIGGER "Invoice_enforce_tenant" BEFORE INSERT OR UPDATE ON "Invoice"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('bookingId', 'Booking', 'stayId', 'Stay', 'customerId', 'Customer');

CREATE TRIGGER "InvoiceItem_enforce_tenant" BEFORE INSERT OR UPDATE ON "InvoiceItem"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('invoiceId', 'Invoice');

CREATE TRIGGER "Location_enforce_tenant" BEFORE INSERT OR UPDATE ON "Location"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant();

CREATE TRIGGER "MaintenanceLog_enforce_tenant" BEFORE INSERT OR UPDATE ON "MaintenanceLog"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('equipmentId', 'Equipment');

CREATE TRIGGER "ManualIncome_enforce_tenant" BEFORE INSERT OR UPDATE ON "ManualIncome"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant();

CREATE TRIGGER "Partner_enforce_tenant" BEFORE INSERT OR UPDATE ON "Partner"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant();

CREATE TRIGGER "PartnerInvoice_enforce_tenant" BEFORE INSERT OR UPDATE ON "PartnerInvoice"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('partnerId', 'Partner');

CREATE TRIGGER "PartnerInvoiceLine_enforce_tenant" BEFORE INSERT OR UPDATE ON "PartnerInvoiceLine"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('partnerInvoiceId', 'PartnerInvoice');

CREATE TRIGGER "Payment_enforce_tenant" BEFORE INSERT OR UPDATE ON "Payment"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('invoiceId', 'Invoice');

CREATE TRIGGER "Refund_enforce_tenant" BEFORE INSERT OR UPDATE ON "Refund"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('paymentId', 'Payment');

CREATE TRIGGER "Staff_enforce_tenant" BEFORE INSERT OR UPDATE ON "Staff"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant();

CREATE TRIGGER "StaffAvailability_enforce_tenant" BEFORE INSERT OR UPDATE ON "StaffAvailability"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('staffId', 'Staff');

CREATE TRIGGER "StaffQualification_enforce_tenant" BEFORE INSERT OR UPDATE ON "StaffQualification"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('staffId', 'Staff');

CREATE TRIGGER "Stay_enforce_tenant" BEFORE INSERT OR UPDATE ON "Stay"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('customerId', 'Customer');

CREATE TRIGGER "StayCost_enforce_tenant" BEFORE INSERT OR UPDATE ON "StayCost"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('stayId', 'Stay');

CREATE TRIGGER "Trip_enforce_tenant" BEFORE INSERT OR UPDATE ON "Trip"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('boatId', 'Boat', 'plannedSiteId', 'DiveSite', 'actualSiteId', 'DiveSite');

CREATE TRIGGER "TripStaff_enforce_tenant" BEFORE INSERT OR UPDATE ON "TripStaff"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('tripId', 'Trip', 'staffId', 'Staff');

RESET app.tenant_id;
