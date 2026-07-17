# Consolidating to a single Prisma migration history

_Phase 2.3 follow-up. This needs your live Postgres database, which isn't reachable from
this session, so it's written up here as a guide for you to run locally rather than
executed automatically._

## The problem

Two disconnected schema-history mechanisms currently coexist:

- `database/migrations/*.sql` (hand-written, 002 through 011) — includes a genuine
  duplicate: `008_location_type_varchar.sql` and `008_rollback_restore_location_type_enum.sql`
  share the same number (one forward, one rollback).
- `backend/prisma/migrations/` — only 2 real entries (`20251227114043_add_partner_invoices`,
  `20251228212110_add_customer_bills`). The rest of `schema.prisma` was introspected or
  hand-maintained, never migrated through Prisma.

Goal: from now on, `backend/prisma/migrations/` is the *only* source of schema truth, and
`prisma migrate dev` / `prisma migrate deploy` are the only way schema changes happen.

## Before you start

1. **Back up the database.** This is schema-history surgery on a live DB — even though the
   steps below don't intend to change any actual table structure, always have a restore
   point:
   ```bash
   pg_dump "$DATABASE_URL" > backup-before-migration-baseline-$(date +%Y%m%d).sql
   ```
2. Make sure `backend/prisma/schema.prisma` genuinely matches the live database right now.
   Check with:
   ```bash
   cd backend
   npx prisma db pull --print
   ```
   Diff the output against the committed `schema.prisma`. If they differ, resolve that
   first (either the DB has drifted from what's committed, or vice versa) — baselining
   against a `schema.prisma` that doesn't match reality will bake the mismatch in.

## Baseline steps

1. **Generate the baseline migration SQL** (this only reads `schema.prisma`, doesn't touch
   the DB):
   ```bash
   cd backend
   mkdir -p prisma/migrations/0_baseline
   npx prisma migrate diff \
     --from-empty \
     --to-schema-datamodel prisma/schema.prisma \
     --script > prisma/migrations/0_baseline/migration.sql
   ```
2. **Review `prisma/migrations/0_baseline/migration.sql`.** It should look like a full
   `CREATE TABLE`/`CREATE TYPE` script for the current schema. Skim it for anything
   unexpected before proceeding.
3. **Mark the baseline as already applied** — critical: this tells Prisma "this schema
   already exists in the DB, don't try to create it again":
   ```bash
   npx prisma migrate resolve --applied 0_baseline
   ```
4. **Verify Prisma now considers the DB in sync:**
   ```bash
   npx prisma migrate status
   ```
   It should report no pending migrations (the two existing real migrations plus the new
   baseline should all show as applied).
5. **Retire the old migrations as historical record only** — don't delete them outright,
   move them somewhere clearly archival so nobody runs them again by habit:
   ```bash
   cd ..
   mkdir -p docs/archive/legacy-sql-migrations
   git mv database/migrations docs/archive/legacy-sql-migrations/
   git mv database/schema docs/archive/legacy-sql-migrations/
   ```
   Add a short `docs/archive/legacy-sql-migrations/README.md` noting these predate the
   Prisma baseline and are kept for reference only, plus flagging the duplicate `008_*`
   pair so nobody applies both by mistake.
6. From here on, every schema change goes through:
   ```bash
   npx prisma migrate dev --name describe_the_change
   ```
   in dev, and `npx prisma migrate deploy` in CI/production — never hand-written SQL
   against the live DB again.

## If `prisma migrate status` shows drift

If step 4 reports the DB isn't in sync (extra tables/columns Prisma doesn't know about, or
vice versa), stop and reconcile `schema.prisma` against the real DB first — either via
`prisma db pull` to update the schema file, or a manual migration to align the DB — before
re-attempting the baseline. Baselining over an actual mismatch just hides the problem.
