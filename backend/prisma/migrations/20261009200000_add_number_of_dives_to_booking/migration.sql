-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "numberOfDives" INTEGER NOT NULL DEFAULT 1;


-- A booking has at least one dive.
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_numberOfDives_min" CHECK ("numberOfDives" >= 1);
