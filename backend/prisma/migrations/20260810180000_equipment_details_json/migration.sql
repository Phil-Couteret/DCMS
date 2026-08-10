-- Phase 6.12 (roadmap): the Equipment "Add"/"Edit" form has always
-- collected brand, model, thickness, style, hood, purchase date, warranty,
-- last/next revision dates, and (for regulators) first-stage/second-stage/
-- octopus brand+model - none of which ever had a backend column. Before
-- `forbidNonWhitelisted` (Phase 2) this was a silent no-op: the extra
-- fields were dropped by the DTO/service's explicit per-field mapping and
-- only `name`/`category`/`type`/`size`/`condition`/`serialNumber`/
-- `isAvailable` actually persisted. With `forbidNonWhitelisted` on, the
-- unrecognized fields make the *entire* create/update request 400 instead,
-- breaking add/edit equipment outright.
--
-- Purely additive: no existing column changes, no backfill needed (every
-- current equipment row gets `{}`, same effective behavior as before this
-- migration for fields that already exist elsewhere on the row).

-- AlterTable
ALTER TABLE "equipment" ADD COLUMN "details" JSONB DEFAULT '{}';
