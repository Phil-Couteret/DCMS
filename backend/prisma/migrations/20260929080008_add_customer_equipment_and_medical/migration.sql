-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('TOURIST', 'LOCAL', 'RECURRENT');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "bcdSize" TEXT,
ADD COLUMN     "bootsSize" TEXT,
ADD COLUMN     "centerSkillLevel" "SkillLevel",
ADD COLUMN     "customerType" "CustomerType" NOT NULL DEFAULT 'TOURIST',
ADD COLUMN     "finsSize" TEXT,
ADD COLUMN     "insuranceExpiry" TIMESTAMP(3),
ADD COLUMN     "insurancePolicyNumber" TEXT,
ADD COLUMN     "insuranceProvider" TEXT,
ADD COLUMN     "insuranceVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "medicalCertExpiry" TIMESTAMP(3),
ADD COLUMN     "medicalCertNumber" TEXT,
ADD COLUMN     "medicalCertVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "ownEquipment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tankSize" TEXT,
ADD COLUMN     "wetsuitSize" TEXT;

