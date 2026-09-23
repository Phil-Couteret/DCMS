-- Phase 6.17 (roadmap): Schedule's Mole-slot/boat-session assignment and
-- guide-coverage state has never survived a page reload - it was rebuilt
-- each load purely from `booking.slotAssignment`, a frontend-only field
-- with no backing column (see Phase 6.14's audit). This migration adds
-- real persistence for both halves of that gap:
--
-- 1. `bookings.mole_slot_time`/`session` - which 30-min Mole slot (shore
--    dives) or which session (boat trips) a booking belongs to. Boat-slot
--    *customer* assignment already persisted correctly via the existing
--    `boat_id` column; these two new columns close the remaining gaps
--    (Mole slot time was never stored at all, and multiple same-day boat
--    sessions on the same boat couldn't be told apart).
-- 2. `schedule_slot_guides` - which staff are covering a slot, independent
--    of any specific booking (a guide can be assigned before any customer
--    is). Deliberately a new, dedicated table rather than reusing
--    `boat_preps.staff` (a similar but coarser-grained, customer-ID-keyed
--    concept serving the separate Boat Prep day-of-operations workflow) -
--    see docs/roadmap.md Phase 6.17 for the explicit choice.

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "mole_slot_time" VARCHAR(5);
ALTER TABLE "bookings" ADD COLUMN "session" VARCHAR(20);

-- CreateTable
CREATE TABLE "schedule_slot_guides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "location_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "slot_type" VARCHAR(10) NOT NULL,
    "slot_key" VARCHAR(150) NOT NULL,
    "boat_id" UUID,
    "guide_ids" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) DEFAULT now(),

    CONSTRAINT "schedule_slot_guides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_schedule_slot_guides_slot" ON "schedule_slot_guides"("location_id", "date", "slot_type", "slot_key");

-- CreateIndex
CREATE INDEX "idx_schedule_slot_guides_date" ON "schedule_slot_guides"("date");

-- CreateIndex
CREATE INDEX "idx_schedule_slot_guides_location" ON "schedule_slot_guides"("location_id");

-- CreateIndex
CREATE INDEX "idx_schedule_slot_guides_tenant" ON "schedule_slot_guides"("tenant_id");

-- AddForeignKey
ALTER TABLE "schedule_slot_guides" ADD CONSTRAINT "schedule_slot_guides_boat_id_fkey" FOREIGN KEY ("boat_id") REFERENCES "boats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "schedule_slot_guides" ADD CONSTRAINT "schedule_slot_guides_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "schedule_slot_guides" ADD CONSTRAINT "schedule_slot_guides_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
