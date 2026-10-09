-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "insuranceIssuedAt" TIMESTAMP(3),
ADD COLUMN     "insuranceValidDays" INTEGER,
ADD COLUMN     "medicalCertIssuedAt" TIMESTAMP(3),
ADD COLUMN     "medicalCertValidDays" INTEGER;


ALTER TABLE "Customer" ADD CONSTRAINT "Customer_validDays"
  CHECK (("medicalCertValidDays" IS NULL OR "medicalCertValidDays" BETWEEN 1 AND 3660)
     AND ("insuranceValidDays" IS NULL OR "insuranceValidDays" BETWEEN 1 AND 3660));
