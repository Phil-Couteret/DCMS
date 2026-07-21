-- Migration: Add locationTypes to settings (Option A: configurable location types)
-- Date: January 2026
-- Start from scratch: locationTypes = [] (no default types).
-- ENUM location_type unchanged: 'diving' | 'bike_rental' | 'future'.

-- Ensure default settings has locationTypes = [] when missing.
-- Safe to run multiple times.
UPDATE settings
SET value = jsonb_set(value, '{locationTypes}', '[]'::jsonb, true)
WHERE key = 'default'
  AND (value->'locationTypes') IS NULL;

-- If no default row exists, we rely on seed-settings or app bootstrap to create it with locationTypes: [].
