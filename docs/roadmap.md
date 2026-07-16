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

1. Convert plain-interface DTOs to `class-validator` classes, module by module, starting with the highest-traffic ones (bookings, customers, users).
2. Re-enable `forbidNonWhitelisted: true` once a module's DTOs are converted — do this per-module, not globally in one step, so a forgotten field surfaces one module at a time.
3. Reconstruct a clean Prisma baseline migration reflecting the current schema; retire `database/migrations/*.sql` as historical reference; delete/resolve the duplicate `008_*` pair.

## Phase 3 — Test safety net (before touching the data model further)

1. Add backend unit tests for the services touched in phases 0–2 (auth, tenant resolution, bookings, customers, users).
2. Add e2e tests that specifically assert: unauthenticated requests are rejected on every controller; tenant A's JWT cannot read/write tenant B's data.
3. Treat these as a gate — phase 4 (adding `tenant_id` broadly) should not proceed until this suite exists and passes against phase 0–2 code.

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
