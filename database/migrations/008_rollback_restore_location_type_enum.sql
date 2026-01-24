-- Rollback: restore locations.type as ENUM (undo 008_location_type_varchar).
-- Run ONLY if you previously applied 008. Local: psql -U postgres -d dcms -f database/migrations/008_rollback_restore_location_type_enum.sql

-- 1. Recreate enum
CREATE TYPE location_type AS ENUM ('diving', 'bike_rental', 'future');

-- 2. Add enum column, backfill from varchar (only known values)
ALTER TABLE locations ADD COLUMN type_enum location_type;
UPDATE locations SET type_enum = CASE
  WHEN type = 'diving' THEN 'diving'::location_type
  WHEN type = 'bike_rental' THEN 'bike_rental'::location_type
  WHEN type = 'future' THEN 'future'::location_type
  ELSE 'diving'::location_type
END;
ALTER TABLE locations ALTER COLUMN type_enum SET NOT NULL;

-- 3. Drop varchar column, rename
ALTER TABLE locations DROP COLUMN type;
ALTER TABLE locations RENAME COLUMN type_enum TO type;

-- 4. Recreate index
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(type);
