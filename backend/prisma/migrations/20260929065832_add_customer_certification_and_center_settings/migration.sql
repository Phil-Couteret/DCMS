-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "certificationAgency" TEXT,
ADD COLUMN     "certificationLevel" TEXT;

-- CreateTable
CREATE TABLE "CenterSettings" (
    "id" TEXT NOT NULL DEFAULT 'center',
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CenterSettings_pkey" PRIMARY KEY ("id")
);

