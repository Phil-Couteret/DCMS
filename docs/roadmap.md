# DCMS — Roadmap: Current → Target

_Phased plan to go from `current-architecture.md` to `target-architecture.md`. Phases are ordered by risk: security first, then cleanup, then the full multi-tenant data model, then polish. Don't reorder — each phase reduces risk for the next._

## Phase 0 — Stop the bleeding (security, days not weeks)

Do this before any further feature work, and before touching the multi-tenant schema.

**Status: items 1–4 done (2026-07-16). Item 5 intentionally deferred — see note.**

1. ✅ Add `JwtAuthGuard` to every controller currently unguarded — done via a global `APP_GUARD` (`app.module.ts`) plus an explicit `@Public()` decorator (`common/decorators/public.decorator.ts`) on the legitimate exceptions: `AppController` (root/health), `users/login` (+ the `GET /users/login` 405 stub), `partner-auth` (login), and the `partner/*` / `partner-invoices/my-invoices` routes that already enforce `PartnerAuthGuard`/`JwtPartnerGuard`.
2. ✅ Fixed `users.service.ts findAll()`/`remove()` and `partners.service.ts findAll()`/`findOne()`/`update()`/`remove()`/`create()`/`regenerateApiKey()` to strip `password_hash`/`api_secret_hash` from every response.
3. ✅ Removed the hardcoded JWT fallback from all 4 files; added `config/jwt-secret.util.ts` (`getRequiredJwtSecret()`), which throws at boot if `JWT_SECRET` is unset. Set a real generated secret in `backend/.env` and the root `.env` (read by `docker-compose.yml`, which now uses `${JWT_SECRET:?...}` to fail loudly if missing); added `backend/.env.example`. The ZBOX K8s manifests already sourced `JWT_SECRET` from a `Secret` correctly — no change needed there.
4. ✅ `tenant.interceptor.ts` now treats an authenticated admin/staff request's JWT `tenantId` as authoritative: a header/subdomain that disagrees is rejected with 403, and a JWT for a tenant that's since been deactivated is rejected rather than silently falling back to an unscoped view. Superadmins (`tenantId: null`) can still use the header/subdomain to switch tenant context, as originally designed.
5. **Deferred.** CORS is currently broad (LAN CIDR ranges + `*.couteret.fr`) because production runs on a ZBOX reached over the dive center's own local network with varying client IPs — tightening it risks locking out legitimate LAN clients without knowing the real set of origins in use. Revisit with actual deployment topology in hand before changing.

`npx tsc --noEmit` passes clean after these changes. Recommended before deploying: a manual smoke test of login (admin + partner), one request per previously-unguarded controller, and confirming the frontend (which already sends `Authorization: Bearer` + `X-Tenant-Slug` on every request via `httpClient.js`) still works end-to-end.

## Phase 1 — Cleanup & hygiene (low risk, improves everything after it)

**Status: done (2026-07-16).**

1. ✅ `dcms-backend.tar` (173MB, untracked/gitignored) deleted from disk. `Data Saved/Invoice BILL-1767117729046.pdf` removed from the working tree via `git rm` — **note: it was already committed to git history**, so it's still retrievable from old commits until a deliberate `git filter-repo`/BFG history-rewrite pass (out of scope for this pass; needs coordination since it requires a force-push and breaks any other existing clones). `Open Source/` was moved (not deleted) to `docs/planning/` since its content is still-relevant planning material.
2. ✅ Root markdown files consolidated into `docs/setup/`, `docs/guides/`, `docs/database/`, `docs/infra/`, `docs/business/`, and `docs/archive/` (superseded/point-in-time docs, including old POC/sync-server setup notes and a 6.7MB raw Cursor chat-session export that was mislabeled `API_ENDPOINTS_AUDIT.md` — **that file is also already in git history**, same caveat as the invoice PDF above). See `docs/README.md` for the index. `README.md` stays at the repo root as usual.
3. ✅ Added `.env.example` for `frontend` and `public-website` (backend's was added in Phase 0).
4. ✅ Retired `sync-server` entirely: confirmed via `frontend/src/config/apiConfig.js` (`mode: 'api'` hardcoded) that mock mode / sync-server was already dead in every real deployment, then deleted `sync-server/` and removed all references from `start-poc.sh`, `start-network.sh`, `start-standalone.sh`, `check-servers.sh`, `stop-servers.sh`, and their Windows equivalents (`start-windows.bat`, `setup-windows.bat`, `start-standalone.bat`, `check-services.bat`). While in those Windows scripts, also fixed two more hardcoded default JWT secrets (`your-super-secret-jwt-key-change-in-production`) that would have silently defeated the Phase 0 fix for anyone running the Windows setup path — they now generate a random secret via `node -e "...randomBytes..."` the same way Phase 0's `backend/.env` does.
5. ✅ Replaced the 17 `console.*` calls in application runtime code (`main.ts`, `bookings.controller.ts`, `bookings.service.ts`, `partner-bookings.service.ts`, `common/filters/http-exception.filter.ts`) with Nest's `Logger`. Left the 46 `console.log` calls in `backend/src/scripts/*.ts` alone — those are one-off CLI seed/admin scripts, not app runtime, where `console.log` is the normal idiom. While rewriting `http-exception.filter.ts`, also fixed it logging the **raw request body on every error** (including plaintext `password` on failed login) — it now redacts known-sensitive keys before logging.

`npx tsc --noEmit` and `nest build` both pass clean after these changes.

## Phase 2 — Validation & migrations (backend correctness)

**Status: items 1–2 done, item 3 written as a guide for you to run (2026-07-17).**

1. ✅ Converted every plain-`interface` DTO to a `class-validator` class, across all 24 modules that had one (users, customers, bookings, staff, equipment, boats, boat-preps, locations, dive-sites, government-bonos, settings, customer-bills, breaches, dsar, audit, partners, partner-invoices, partner bookings/customers, consents, tenant, partner-auth). Along the way, consolidated a few modules that had 2–3 duplicate DTO declarations down to one, and fixed inline untyped `@Body()` params in `tenants.controller.ts`. `bookings`'s `activityType` deliberately stays `@IsString()` rather than a strict enum — `BookingsService.mapActivityType()` remaps frontend aliases (e.g. `scuba_diving`) after validation; documented inline in the DTO. `settings`'s `value` field stays untyped/unvalidated — it's genuinely free-form JSON by design.
2. ✅ Flipped `forbidNonWhitelisted: false` → `true` globally in `main.ts` now that every module has a real DTO to validate against, instead of doing it module-by-module (the original plan) — since all modules were converted in the same pass, there was no partial state where some endpoints had DTOs and others didn't. **Not yet smoke-tested against the running frontend** — this is the one Phase 2 item with real regression risk if any frontend flow sends extra fields no DTO expects. `BookingForm.jsx` and `realApiAdapter.js` both have comments suggesting the frontend already assumed strict DTOs, but that needs verifying against the actual running app before this goes to production.
3. ⏳ Reconstructing the clean Prisma baseline needs a live DB connection this session doesn't have. Wrote `docs/guides/PRISMA_MIGRATION_BASELINE.md` — a step-by-step guide (back up DB, `prisma migrate diff --from-empty`, `prisma migrate resolve --applied`, verify with `prisma migrate status`, archive `database/migrations/*.sql` to `docs/archive/legacy-sql-migrations/`) for you to run locally.

`npx tsc --noEmit` passes clean. **2026-07-17, later the same day:** found and fixed an unrelated, uncommitted `schema.prisma` change (`locations.type` had been turned into a fixed 3-value enum, contradicting the already-shipped, documented dynamic Location Types feature — see the "stale multi-tenant admin bootstrap work" commit). That needed a `prisma generate` to pick up cleanly, which you've since run — confirmed clean against the regenerated client.

## Phase 3 — Test safety net (before touching the data model further)

**Status: item 1 done and passing; item 2's `unauthenticated-routes` suite written and passing; its `tenant-isolation` suite written but not yet run (needs a real DB) — see note.**

1. ✅ Added backend unit tests for the security-critical code from phases 0–2: `public.decorator.spec.ts` and `jwt-auth.guard.spec.ts` (the `@Public()`/global-guard bypass logic), `tenant.interceptor.spec.ts` (8 cases covering the JWT-authoritative tenant fix — header/JWT mismatch rejection, deactivated-tenant rejection, superadmin platform-level default and header-switch, pre-login and default-tenant fallback), `users.service.spec.ts` and `partners.service.spec.ts` (6 cases each confirming `password_hash`/`api_secret_hash` never appear in any returned object, across every service method), and `create-booking.dto.spec.ts` (a `class-validator`-direct test confirming valid payloads pass, invalid UUID/enum/negative values are rejected, and an unexpected extra field is rejected the same way `forbidNonWhitelisted` rejects it live). All 6 suites (32 tests) pass. Note: `UsersService`/`PartnersService`/`TenantsService` import `bcrypt` directly for password/secret hashing, which ships a native binary compiled for the machine it's installed on — the tests use `jest.mock('bcrypt', ...)` to stub it out, so they run without needing a matching native build.
2. Wrote `backend/test/unauthenticated-routes.e2e-spec.ts` and `backend/test/tenant-isolation.e2e-spec.ts`.
   - ✅ **`unauthenticated-routes.e2e-spec.ts` — 4/4 tests passing.** Boots the real app (with `PrismaService` stubbed out, since a rejection happens in the guard before any DB call) and uses Nest's own `DiscoveryService`/`MetadataScanner` to enumerate every registered route, then asserts every route that isn't genuinely credential-free gets a 401 with no `Authorization` header. This distinguishes `@Public()` (skips only the global admin guard) from "no auth at all" — `partner/*`, `partner/bookings`, `partner/customers`, and `partner-invoices/my-invoices` are `@Public()` but carry their own `@UseGuards(PartnerAuthGuard | JwtPartnerGuard)`, discovered generically via Nest's `GUARDS_METADATA`, so they're correctly expected to still 401. Only `AppController` (root/health) and the 3 login handlers are treated as truly open. Because it discovers routes at runtime instead of a hand-maintained list, a new controller or endpoint that forgets a guard is caught automatically. One real bug surfaced and fixed while getting this to pass: e2e tests built via `Test.createTestingModule` skip `main.ts`'s imperative `app.useGlobalPipes(...)` call (only the DI-registered global guard applies automatically), so the login endpoints were reaching their handlers with an unvalidated empty body and 401-ing from their own "invalid credentials" logic rather than 400-ing on missing fields — indistinguishable from a guard rejection. Fixed by replicating `main.ts`'s exact `ValidationPipe` config in the test's `app.init()`.
   - ⏳ **`tenant-isolation.e2e-spec.ts` — written, not yet run.** Seeds two real tenants + a customer each via Prisma, signs real JWTs via `AuthService`, and asserts tenant A's token can't list, read, update, or delete tenant B's customer (all expected 404, since `CustomersService` filters by `tenant_id` before any write), plus that a header disagreeing with the JWT still gets the Phase 0 403. Needs a real, reachable Postgres — this sandbox has no network path to one. Run locally with `cd backend && npm run test:e2e -- tenant-isolation` (your `DATABASE_URL` in `.env` already points at one).
3. Given item 1 and half of item 2 are passing, and the other half is written and just needs a DB to confirm, this gate is close to fully met - run `tenant-isolation` locally and confirm it's green before starting Phase 4.

## Phase 4 — Full multi-tenant data model

1. Add `tenant_id` to the 13 currently-missing tables (`bookings`, `staff`, `equipment`, `boat_preps`, `boats`, `dive_sites`, `customer_stays`, `customer_bills`, `partner_invoices`, `pricing_configs`, `customer_consents`, `customer_certifications`, `data_subject_access_requests`, `bono_usage`), backfilled from existing `location_id`/`customer_id` relations, via Prisma migration.
2. Update composite uniqueness constraints as described in the target doc (`(tenant_id, username)`, etc.).
3. Update every service's queries to filter by `TenantContextService`'s tenant — the tenant-isolation e2e tests from phase 3 should catch anything missed.
4. Implement the superadmin cross-tenant switch flow explicitly, with audit logging.
5. Optional: add Postgres RLS policies as defence-in-depth once application-level filtering is verified solid.

## Phase 5 — Frontend & public-website polish

1. Split `Settings.jsx`, `BoatPrep.jsx`, `Financial.jsx` into smaller components; introduce `hooks/` and a small state layer.
2. Add frontend tests for `ProtectedRoute`/`authContext` and core pages.
3. `public-website`: switch `HashRouter` → `BrowserRouter`, add SEO tags/`robots.txt`/`sitemap.xml`, route or delete orphaned pages.
4. Optional, lower priority: migrate both React apps from Create React App to Vite.

## Sequencing notes

- Phases 0–1 can start immediately and in parallel (different files, no schema risk).
- Phase 2 depends on phase 0 being deployed (don't tighten validation on endpoints that are still unauthenticated in prod).
- Phase 3 must exist before phase 4 — adding `tenant_id` everywhere without an isolation test suite risks shipping the exact bug being fixed, just moved.
- Phase 5 has no hard dependency on 3–4 and can be picked up whenever capacity allows.
