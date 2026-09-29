-- CreateTable
CREATE TABLE "CustomerCertification" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "cardNumber" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerCertification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerCertification_customerId_idx" ON "CustomerCertification"("customerId");

-- AddForeignKey
ALTER TABLE "CustomerCertification" ADD CONSTRAINT "CustomerCertification_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Move each customer's single recorded certification into the new table.
-- A level of 'none' meant "not certified" and becomes no row. The form
-- required an agency with any other level; 'Other' covers rows set without one.
INSERT INTO "CustomerCertification" ("id", "customerId", "agency", "level", "cardNumber", "expiryDate", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", COALESCE("certificationAgency", 'Other'), "certificationLevel",
       "certificationNumber", "certificationExpiry", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Customer"
WHERE "certificationLevel" IS NOT NULL AND "certificationLevel" <> 'none';

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "certificationAgency",
DROP COLUMN "certificationExpiry",
DROP COLUMN "certificationLevel",
DROP COLUMN "certificationNumber";
