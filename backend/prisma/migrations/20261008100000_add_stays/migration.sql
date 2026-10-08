-- CreateEnum
CREATE TYPE "StayStatus" AS ENUM ('OPEN', 'BILLED');

-- CreateEnum
CREATE TYPE "StayCostCategory" AS ENUM ('INSURANCE', 'EQUIPMENT', 'CLOTHES', 'GOODIES', 'BEVERAGES', 'OTHER');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "stayId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "stayId" TEXT,
ALTER COLUMN "bookingId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Stay" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "StayStatus" NOT NULL DEFAULT 'OPEN',
    "billedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StayCost" (
    "id" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "category" "StayCostCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StayCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Stay_customerId_status_idx" ON "Stay"("customerId", "status");

-- CreateIndex
CREATE INDEX "StayCost_stayId_idx" ON "StayCost"("stayId");

-- CreateIndex
CREATE INDEX "Booking_stayId_idx" ON "Booking"("stayId");

-- CreateIndex
CREATE INDEX "Invoice_stayId_idx" ON "Invoice"("stayId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StayCost" ADD CONSTRAINT "StayCost_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- An invoice bills exactly one booking or one stay.
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_booking_or_stay_check"
  CHECK (("bookingId" IS NULL) <> ("stayId" IS NULL));
