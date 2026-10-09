-- AlterTable
ALTER TABLE "CenterSettings" ADD COLUMN     "hydrostaticTestIntervalMonths" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "visualInspectionIntervalMonths" INTEGER NOT NULL DEFAULT 12;


ALTER TABLE "CenterSettings" ADD CONSTRAINT "CenterSettings_tank_intervals"
  CHECK ("visualInspectionIntervalMonths" BETWEEN 1 AND 120 AND "hydrostaticTestIntervalMonths" BETWEEN 1 AND 120);
