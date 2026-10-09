-- AlterTable
ALTER TABLE "DataBreach" ADD COLUMN     "breachType" TEXT,
ADD COLUMN     "containmentMeasures" TEXT,
ADD COLUMN     "customersNotified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "customersNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "customersNotifiedMethod" TEXT,
ADD COLUMN     "mitigationMeasures" TEXT,
ADD COLUMN     "occurredAt" TIMESTAMP(3),
ADD COLUMN     "rootCause" TEXT;


-- Customers notified: always with when and how; the incident before it was
-- found.
ALTER TABLE "DataBreach" ADD CONSTRAINT "DataBreach_customersNotified"
  CHECK (NOT "customersNotified" OR ("customersNotifiedAt" IS NOT NULL AND "customersNotifiedMethod" IS NOT NULL));
ALTER TABLE "DataBreach" ADD CONSTRAINT "DataBreach_occurredAt"
  CHECK ("occurredAt" IS NULL OR "occurredAt" <= "detectedAt");
