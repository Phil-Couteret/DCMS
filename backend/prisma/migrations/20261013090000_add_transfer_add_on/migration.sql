-- AlterEnum
ALTER TYPE "BookingAddOn" ADD VALUE 'TRANSFER';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "transferPickup" TEXT;


ALTER TABLE "Booking" ADD CONSTRAINT "Booking_transferPickup" CHECK (length("transferPickup") <= 200);

-- The transfer price is set in the next migration: a new enum value cannot
-- be used in the transaction that adds it.
