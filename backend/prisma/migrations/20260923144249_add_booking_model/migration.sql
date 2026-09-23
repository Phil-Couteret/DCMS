-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('SNORKELING', 'DISCOVER_SCUBA', 'FUN_DIVE', 'OW_CERT', 'AOW_CERT', 'RESCUE_CERT', 'DM_CERT');

-- CreateEnum
CREATE TYPE "TimeSlot" AS ENUM ('MORNING', 'AFTERNOON');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('DIRECT', 'WALK_IN', 'PARTNER');

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "boatId" TEXT NOT NULL,
    "siteId" TEXT,
    "activityType" "ActivityType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timeSlot" "TimeSlot" NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "participantCount" INTEGER NOT NULL,
    "bookingSource" "BookingSource" NOT NULL DEFAULT 'DIRECT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Booking_boatId_date_idx" ON "Booking"("boatId", "date");

-- CreateIndex
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_date_timeSlot_idx" ON "Booking"("date", "timeSlot");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "Boat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "DiveSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
