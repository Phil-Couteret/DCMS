-- AlterTable
ALTER TABLE "Boat" ADD COLUMN     "locationId" TEXT;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "locationId" TEXT;

-- AlterTable
ALTER TABLE "DiveSite" ADD COLUMN     "locationId" TEXT;

-- CreateIndex
CREATE INDEX "Boat_locationId_idx" ON "Boat"("locationId");

-- CreateIndex
CREATE INDEX "Booking_locationId_idx" ON "Booking"("locationId");

-- CreateIndex
CREATE INDEX "DiveSite_locationId_idx" ON "DiveSite"("locationId");

-- AddForeignKey
ALTER TABLE "Boat" ADD CONSTRAINT "Boat_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiveSite" ADD CONSTRAINT "DiveSite_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Same-tenant checks now include the location (enforce_tenant, migration
-- add_multitenancy): a boat, site or booking cannot point at another
-- tenant's location.
DROP TRIGGER "Boat_enforce_tenant" ON "Boat";
CREATE TRIGGER "Boat_enforce_tenant" BEFORE INSERT OR UPDATE ON "Boat"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('locationId', 'Location');

DROP TRIGGER "DiveSite_enforce_tenant" ON "DiveSite";
CREATE TRIGGER "DiveSite_enforce_tenant" BEFORE INSERT OR UPDATE ON "DiveSite"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('locationId', 'Location');

DROP TRIGGER "Booking_enforce_tenant" ON "Booking";
CREATE TRIGGER "Booking_enforce_tenant" BEFORE INSERT OR UPDATE ON "Booking"
  FOR EACH ROW EXECUTE FUNCTION enforce_tenant('customerId', 'Customer', 'boatId', 'Boat', 'siteId', 'DiveSite', 'tripId', 'Trip', 'stayId', 'Stay', 'partnerId', 'Partner', 'partnerInvoiceId', 'PartnerInvoice', 'locationId', 'Location');

-- A booking takes place where its boat operates: created without a
-- location, it takes the boat's; moved to another boat (and not given a
-- location in the same change), it takes the new boat's. Every way of
-- creating a booking (staff, guest, partner portal) goes through here.
CREATE FUNCTION booking_location() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW."locationId" IS NULL)
     OR (TG_OP = 'UPDATE' AND NEW."boatId" IS DISTINCT FROM OLD."boatId"
         AND NEW."locationId" IS NOT DISTINCT FROM OLD."locationId") THEN
    SELECT "locationId" INTO NEW."locationId" FROM "Boat" WHERE "id" = NEW."boatId";
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "Booking_location" BEFORE INSERT OR UPDATE OF "boatId", "locationId" ON "Booking"
  FOR EACH ROW EXECUTE FUNCTION booking_location();

-- A tenant with a single location: its boats and sites are there, and so
-- are their bookings.
UPDATE "Boat" b SET "locationId" = l."id"
FROM "Location" l
WHERE l."tenantId" = b."tenantId" AND b."locationId" IS NULL
  AND (SELECT count(*) FROM "Location" x WHERE x."tenantId" = b."tenantId") = 1;

UPDATE "DiveSite" d SET "locationId" = l."id"
FROM "Location" l
WHERE l."tenantId" = d."tenantId" AND d."locationId" IS NULL
  AND (SELECT count(*) FROM "Location" x WHERE x."tenantId" = d."tenantId") = 1;

UPDATE "Booking" k SET "locationId" = b."locationId"
FROM "Boat" b
WHERE b."id" = k."boatId" AND k."locationId" IS NULL AND b."locationId" IS NOT NULL;
