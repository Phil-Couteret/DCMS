-- Migration: Add location_ids UUID[] to staff (supports one, multiple, or all locations)
-- Empty array = staff works at all locations
-- Run: psql -U postgres -d dcms -f database/migrations/010_add_staff_location_ids.sql

ALTER TABLE staff ADD COLUMN IF NOT EXISTS location_ids UUID[] DEFAULT '{}';

-- Backfill: existing staff with location_id get that as their only location_ids entry
UPDATE staff
SET location_ids = ARRAY[location_id]::UUID[]
WHERE location_ids IS NULL OR location_ids = '{}';
