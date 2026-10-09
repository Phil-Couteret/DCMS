-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "addOnPrices" JSONB,
ADD COLUMN     "equipmentPrice" DECIMAL(8,2),
ADD COLUMN     "funDiveTiers" JSONB,
ADD COLUMN     "pricePerDiver" DECIMAL(8,2);


ALTER TABLE "Booking" ADD CONSTRAINT "Booking_locked_prices" CHECK (
  ("pricePerDiver" IS NULL OR "pricePerDiver" >= 0) AND ("equipmentPrice" IS NULL OR "equipmentPrice" >= 0)
);
