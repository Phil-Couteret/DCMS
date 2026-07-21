# Legacy SQL migrations (archived)

This directory holds the hand-written SQL that built the DCMS schema before
the Prisma migration history was baselined on 2026-07-17
(`backend/prisma/migrations/0_baseline/`). See
`docs/guides/PRISMA_MIGRATION_BASELINE.md` for how the baseline was created.

These files are kept for historical reference only. They are **not** applied
by any current setup path:

- `backend/docker-entrypoint.sh` and the root `setup-database.sh` /
  `setup-local-db.sh` scripts now create the schema via
  `prisma migrate deploy` against `backend/prisma/migrations/`.
- `schema/001_create_tables.sql` (originally `database/schema/`) was the
  initial schema; `migrations/002_*.sql` through `011_*.sql` (originally
  `database/migrations/`) were applied on top of it, in order, over time.

Everything in both files is already reflected in `backend/prisma/schema.prisma`
and the baseline migration — there is nothing left to apply from here.

## Note: duplicate 008 pair

`008_location_type_varchar.sql` and `008_rollback_restore_location_type_enum.sql`
share the same number. The former converted `locations.type` from a fixed
enum to a free-form `VARCHAR(50)` (to support the dynamic "Location Types"
feature — see `docs/LOCATIONS_AND_LOCATION_TYPES.md`); the latter is its
rollback counterpart. The varchar version is what actually shipped and is
what the current schema/baseline reflects — the rollback file was never run
in production.
