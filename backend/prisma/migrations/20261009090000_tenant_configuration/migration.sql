-- CreateEnum
CREATE TYPE "NumberSeries" AS ENUM ('INVOICE', 'PARTNER_INVOICE', 'DIVE_LOG');

-- AlterTable
ALTER TABLE "CenterSettings" ADD COLUMN     "accentColor" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'EUR',
ADD COLUMN     "defaultLanguage" "Language" NOT NULL DEFAULT 'EN',
ADD COLUMN     "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "partnerInvoicePrefix" TEXT NOT NULL DEFAULT 'PINV',
ADD COLUMN     "primaryColor" TEXT,
ADD COLUMN     "timeZone" TEXT NOT NULL DEFAULT 'Atlantic/Canary';

-- CreateTable
CREATE TABLE "NumberSequence" (
    "tenantId" TEXT NOT NULL DEFAULT current_setting('app.tenant_id'::text, true),
    "series" "NumberSeries" NOT NULL,
    "year" INTEGER NOT NULL,
    "last" INTEGER NOT NULL,

    CONSTRAINT "NumberSequence_pkey" PRIMARY KEY ("tenantId","series","year")
);

-- AddForeignKey
ALTER TABLE "NumberSequence" ADD CONSTRAINT "NumberSequence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Same-tenant trigger, as on every tenant table (refuses a tenantId change).
CREATE TRIGGER "NumberSequence_enforce_tenant" BEFORE INSERT OR UPDATE ON "NumberSequence"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant();

-- The series continue from the numbers already given.
INSERT INTO "NumberSequence" ("tenantId", "series", "year", "last")
SELECT "tenantId", 'INVOICE', CAST(split_part("invoiceNumber", '-', 2) AS int), MAX(CAST(split_part("invoiceNumber", '-', 3) AS int))
FROM "Invoice" WHERE "invoiceNumber" ~ '^INV-[0-9]{4}-[0-9]+$'
GROUP BY 1, 3;

INSERT INTO "NumberSequence" ("tenantId", "series", "year", "last")
SELECT "tenantId", 'PARTNER_INVOICE', CAST(split_part("invoiceNumber", '-', 2) AS int), MAX(CAST(split_part("invoiceNumber", '-', 3) AS int))
FROM "PartnerInvoice" WHERE "invoiceNumber" ~ '^PINV-[0-9]{4}-[0-9]+$'
GROUP BY 1, 3;

INSERT INTO "NumberSequence" ("tenantId", "series", "year", "last")
SELECT "tenantId", 'DIVE_LOG', CAST(split_part("logNumber", '-', 1) AS int), MAX(CAST(split_part("logNumber", '-', 2) AS int))
FROM "DiveLog" WHERE "logNumber" ~ '^[0-9]{4}-[0-9]+$'
GROUP BY 1, 3;

-- Every tenant has its settings row from now on (new tenants get one when
-- created), named after the tenant until it is edited.
INSERT INTO "CenterSettings" ("tenantId", "name", "updatedAt")
SELECT t."id", t."name", CURRENT_TIMESTAMP FROM "Tenant" t
WHERE NOT EXISTS (SELECT 1 FROM "CenterSettings" s WHERE s."tenantId" = t."id");
