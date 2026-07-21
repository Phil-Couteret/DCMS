-- Migration: locations.type ENUM -> VARCHAR(50)
-- Run once. Use your local DB name, e.g. psql -U postgres -d dcms -f database/migrations/008_location_type_varchar.sql
-- Order: 1) Run this, 2) Update Prisma + backend, 3) prisma generate, 4) Restart backend.

ALTER TABLE locations ADD COLUMN type_new VARCHAR(50);
UPDATE locations SET type_new = type::text;
UPDATE locations SET type_new = 'diving' WHERE type_new IS NULL OR type_new = '';
ALTER TABLE locations ALTER COLUMN type_new SET NOT NULL;
ALTER TABLE locations ALTER COLUMN type_new SET DEFAULT 'diving';

ALTER TABLE locations DROP COLUMN type;
ALTER TABLE locations RENAME COLUMN type_new TO type;

CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(type);
DROP TYPE IF EXISTS location_type;
