-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TripStaffRole" AS ENUM ('CAPTAIN', 'GUIDE', 'TRAINEE_GUIDE');

-- AlterEnum
ALTER TYPE "TimeSlot" ADD VALUE 'NIGHT';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "tripId" TEXT;

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timeSlot" "TimeSlot" NOT NULL,
    "boatId" TEXT,
    "plannedSiteId" TEXT,
    "actualSiteId" TEXT,
    "status" "TripStatus" NOT NULL DEFAULT 'PLANNED',
    "maxDivers" INTEGER NOT NULL DEFAULT 10,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripStaff" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "role" "TripStaffRole" NOT NULL,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "TripStaff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trip_date_idx" ON "Trip"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_date_timeSlot_boatId_key" ON "Trip"("date", "timeSlot", "boatId");

-- CreateIndex
CREATE INDEX "TripStaff_staffId_idx" ON "TripStaff"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "TripStaff_tripId_staffId_key" ON "TripStaff"("tripId", "staffId");

-- CreateIndex
CREATE INDEX "Booking_tripId_idx" ON "Booking"("tripId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "Boat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_plannedSiteId_fkey" FOREIGN KEY ("plannedSiteId") REFERENCES "DiveSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_actualSiteId_fkey" FOREIGN KEY ("actualSiteId") REFERENCES "DiveSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStaff" ADD CONSTRAINT "TripStaff_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStaff" ADD CONSTRAINT "TripStaff_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

