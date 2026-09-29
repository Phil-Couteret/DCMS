-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "certificationExpiry" TIMESTAMP(3),
ADD COLUMN     "certificationNumber" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "notes" TEXT;

