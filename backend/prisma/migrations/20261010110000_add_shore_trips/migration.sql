-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "shoreTime" VARCHAR(5),
ALTER COLUMN "boatId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "DiveSite" ADD COLUMN     "isShore" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "isShore" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startTime" VARCHAR(5);


-- Trips without a boat were already shore trips.
SELECT set_config('app.rls_bypass', 'on', false);
UPDATE "Trip" SET "isShore" = true WHERE "boatId" IS NULL;
SELECT set_config('app.rls_bypass', '', false);

ALTER TABLE "Trip" ADD CONSTRAINT "Trip_shore" CHECK (
  "isShore" = ("boatId" IS NULL)
  AND ("startTime" IS NULL OR ("isShore" AND "startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'))
);
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_boat_or_shore" CHECK (
  ("boatId" IS NULL) = ("shoreTime" IS NOT NULL)
  AND ("shoreTime" IS NULL OR "shoreTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
