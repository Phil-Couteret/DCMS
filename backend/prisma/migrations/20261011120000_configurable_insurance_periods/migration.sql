-- Insurance periods become a list each center configures: a name, the days
-- it covers and a price. The four fixed periods are kept as rows.
ALTER TABLE "InsurancePrice"
  ADD COLUMN "id" TEXT,
  ADD COLUMN "name" TEXT,
  ADD COLUMN "days" INTEGER;

-- Prisma runs a migration outside a transaction, where SET LOCAL has no
-- effect: the bypass is set for the session and cleared again below.
SELECT set_config('app.rls_bypass', 'on', false);
UPDATE "InsurancePrice" SET
  "id" = gen_random_uuid()::text,
  "name" = CASE "period" WHEN 'DAY' THEN '1 day' WHEN 'WEEK' THEN '1 week' WHEN 'MONTH' THEN '1 month' ELSE '1 year' END,
  "days" = CASE "period" WHEN 'DAY' THEN 1 WHEN 'WEEK' THEN 7 WHEN 'MONTH' THEN 30 ELSE 365 END;
SELECT set_config('app.rls_bypass', '', false);

ALTER TABLE "InsurancePrice" DROP CONSTRAINT "InsurancePrice_pkey",
  DROP COLUMN "period",
  ALTER COLUMN "id" SET NOT NULL,
  ALTER COLUMN "name" SET NOT NULL,
  ALTER COLUMN "days" SET NOT NULL,
  ADD CONSTRAINT "InsurancePrice_pkey" PRIMARY KEY ("id");

DROP TYPE "InsurancePeriod";

CREATE UNIQUE INDEX "InsurancePrice_tenantId_name_key" ON "InsurancePrice"("tenantId", "name");

ALTER TABLE "InsurancePrice" ADD CONSTRAINT "InsurancePrice_values"
  CHECK ("days" BETWEEN 1 AND 3660 AND length(trim("name")) BETWEEN 1 AND 40);
