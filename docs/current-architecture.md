# DCMS — Current Architecture (As-Is)

_Last reviewed: 2026-07-16. Updated 2026-07-16: Phase 0 security fixes from `roadmap.md` have been applied — see the "Phase 0 status" notes inline below. Updated 2026-07-17: Phase 1 cleanup, Phase 2 validation/migration work, and Phase 3 unit tests applied — see the "Phase 1/2/3" notes inline below. Updated 2026-07-21: Phase 2.3 Prisma migration baseline completed — the two disconnected migration systems described in §7 are reconciled; see the note there._

## 1. What DCMS is

DCMS (Dive Center Management System) is a booking and operations platform built originally for a single dive center (Deep Blue Diving, Fuerteventura), with an early, partially-built ambition to become multi-tenant SaaS for several dive centers. It covers bookings, customers, staff, equipment, boats, dive sites, partner (agency) sales, invoicing, government subsidy vouchers ("bonos"), and GDPR compliance workflows (consents, DSAR, breach register, data retention).

## 2. Repo layout

```
DCMS/
├── backend/            NestJS API (TypeScript, Prisma, Postgres)
├── frontend/            React 18 admin/staff PWA (CRA)
├── public-website/      React 18 customer-facing site (CRA)
├── sync-server/         POC-only localStorage sync hack (see §8)
├── database/            Seed/sample data only; old raw-SQL schema/migrations archived (see §7)
├── deploy/               ovh/ (public-website FTP deploy) + zbox/ (K3s manifests)
├── docs/                 ~25 markdown docs (GDPR, market research, pricing, multi-tenant design)
├── scripts/, logs/, database backups, dcms-backend.tar (173MB), "Data Saved/", "Open Source/"
└── ~45 loose markdown files at repo root (setup guides, cost breakdowns, status logs)
```

## 3. Tech stack

| Component | Stack | Version notes |
|---|---|---|
| backend | NestJS + TypeScript + Prisma + PostgreSQL | Nest ^10.3.0, Prisma ^5.7.1, TS ^5.3.3 |
| frontend | React + MUI, Create React App | React ^18.2.0, react-scripts 5.0.1 (deprecated) |
| public-website | React + MUI, Create React App | React ^18.2.0, react-scripts 5.0.1 (deprecated) |
| sync-server | Node/Express-style POC | localStorage relay, not a real backend |
| database | PostgreSQL 15 | Single migration mechanism: Prisma (§7) |
| infra | Docker Compose (local/dev), K3s on a ZBOX mini-server (prod); public-website separately FTP-deployed to OVH shared hosting | |

Root `package.json` requires Node ≥18, npm ≥9. No `engines` field on the sub-packages.

## 4. Backend

### 4.1 Module map (`backend/src/`, 26 folders)

| Module | Controller route | Auth guard? | Purpose |
|---|---|---|---|
| auth | — (no controller; login lives on `users`) | n/a | JWT strategy (`jwt-admin`) |
| audit | `audit-logs` | No | Audit log read/query |
| boat-preps | `boat-preps` | No | Daily boat/dive prep sheets |
| boats | `boats` | No | Boat fleet CRUD |
| **bookings** | `bookings` | **No** | Dive booking CRUD (core entity) |
| breaches | `breaches` | No | GDPR data-breach register |
| common | — | — | Shared guards (`partner-auth`, `superadmin`), decorators, exception filter |
| consents | `customers/:id/consents` | No | GDPR consent records |
| customer-bills | `customer-bills` | No | Stay billing |
| **customers** | `customers` | **No** | Customer CRUD (PII) |
| data-retention | `data-retention` | No | GDPR retention/deletion scheduler |
| dive-sites | `dive-sites` | No | Dive site catalog |
| dsar | `customers/:id/dsar` | No | GDPR data-subject access requests |
| **equipment** | `equipment` | **No** | Equipment inventory CRUD |
| government-bonos | `government-bonos` | No | Canary Islands subsidy vouchers |
| locations | `locations` | No | Dive center locations |
| partner | `partner`, `partner/bookings`, `partner/customers` | Yes (`PartnerAuthGuard`/`JwtPartnerGuard`) | Partner-facing booking API |
| partner-auth | `partner-auth` | No (login endpoint) | Partner login/token issue |
| partner-invoices | `partner-invoices` | Partial — only `GET my-invoices` guarded | Partner invoicing |
| partners | `partners` | No | Partner account CRUD (incl. `api_key`/`api_secret_hash`) |
| prisma | — | — | DB client wrapper |
| scripts | — | — | CLI: create-tenant-admin, reset-admin-password, seed-* |
| settings | `settings` | No | Tenant settings key/value |
| **staff** | `staff` | **No** | Staff CRUD |
| statistics | `statistics` | No | Dashboard stats |
| tenant | `tenants` | Yes (`JwtAuthGuard`, `SuperAdminGuard`) | Tenant admin + tenant resolution (`TenantInterceptor`, `TenantContextService`) |
| **users** | `users` | **No** (including login and CRUD) | User accounts + auth login endpoint |

Only 6 files anywhere use `@UseGuards`. There is no global `APP_GUARD`. Core operational and PII-bearing endpoints (bookings, customers, users, staff, equipment) are reachable without authentication.

**Phase 0 status: fixed.** `JwtAuthGuard` is now registered globally (`APP_GUARD` in `app.module.ts`), so every controller requires a valid admin JWT by default. A `@Public()` decorator (`common/decorators/public.decorator.ts`) marks the deliberate exceptions: the root/health endpoints (`AppController`), `POST/GET /users/login`, `partner-auth` (login), and the `partner/*` + `partner-invoices/my-invoices` routes that already enforce their own alternative auth (`PartnerAuthGuard` API-key or `JwtPartnerGuard`).

### 4.2 API surface (representative)

- `bookings`: `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`
- `customers`: `GET /`, `GET /email/:email`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`
- `users`: `POST /login`, `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`
- `staff`, `equipment`: standard CRUD, same shape as above

There is no dedicated `auth` controller — login is `POST /users/login`, validated only by the `jwt-admin` passport strategy afterward.

### 4.3 Data model (Prisma, `backend/prisma/schema.prisma`, 22 models)

Models: `tenants, audit_logs, boat_preps, boats, bono_usage, bookings, certification_agencies, customer_certifications, customer_consents, customer_stays, customers, data_breaches, data_subject_access_requests, dive_sites, equipment, government_bonos, locations, customer_bills, partner_invoices, partners, pricing_configs, settings, staff, users`.

**Have `tenant_id` (Phase 4, 2026-07-21):** all 23 tenant-scoped models — the original 9 (audit_logs, certification_agencies, customers, data_breaches, government_bonos, locations, partners, settings, users) plus the 14 added in Phase 4.1 (boat_preps, boats, bono_usage, bookings, customer_bills, customer_certifications, customer_consents, customer_stays, data_subject_access_requests, dive_sites, equipment, partner_invoices, pricing_configs, staff). `tenants` itself is the 24th model and isn't tenant-scoped (it *is* the tenant). Migration `20260721140235_phase4_tenant_id_everywhere` backfills every new column from the row's existing `location_id`/`customer_id` relation — **must be run (`prisma migrate deploy`) before deploying the updated service code**, or existing rows briefly disappear from tenant-scoped queries until backfilled. See `roadmap.md` Phase 4 for full detail, including which services previously had zero tenant filtering (`staff`, `equipment`, `boats`, `dive_sites`, `boat_preps`, `audit_logs`, `data_breaches`, `government_bonos`, `settings`, and the dashboard statistics endpoint) and the one composite-uniqueness item deliberately deferred (`users`/`partners`/`settings` login-lookup fields stay globally unique — see roadmap for why).

### 4.4 Validation

~~`ValidationPipe` is registered globally in `main.ts`, but `forbidNonWhitelisted: false` is set explicitly ("temporarily disabled to allow interfaces without decorators"). Only a handful of files define real `class-validator` DTO classes; most request bodies are typed as plain TypeScript `interface`s, which Nest's pipe cannot validate at runtime. In effect, input validation is mostly inert.~~ **Fixed (Phase 2):** every module's plain-`interface` DTO was converted to a real `class-validator` class (24 modules), and `forbidNonWhitelisted` is now `true` globally. Two fields stay deliberately loose: `bookings`' `activityType` is `@IsString()` rather than a strict enum, because `BookingsService.mapActivityType()` remaps frontend aliases after validation; `settings`' `value` is untyped, since it's genuinely free-form JSON. **Not yet smoke-tested against the running frontend** — verify no real request relies on a field outside its DTO before deploying.

### 4.5 Auth/secrets

- ~~JWT secret has a hardcoded fallback (`'your-secret-key-change-in-production'`) in 4 files, used whenever `JWT_SECRET` isn't set.~~ **Fixed (Phase 0):** all 4 files now call `getRequiredJwtSecret()` (`config/jwt-secret.util.ts`), which throws at boot if `JWT_SECRET` is unset. `backend/.env` and the root `.env` (used by `docker-compose.yml`) now set a real generated secret; `backend/.env.example` documents the required vars.
- CORS allows broad local-network CIDR ranges and `*.couteret.fr` subdomains, with `credentials: true`. **Not changed in Phase 0** — this is deliberately broad because production runs on a ZBOX server reached over the dive center's own LAN with varying client IPs; tightening it needs input on the real set of origins before changing, to avoid locking out legitimate LAN clients.
- ~~`TenantInterceptor` resolves the active tenant from a client-supplied `X-Tenant-ID`/`X-Tenant-Slug` header or the `Host` subdomain, with no cross-check against the tenant ID embedded in the caller's JWT.~~ **Fixed (Phase 0):** for any authenticated admin/staff request, the tenant is now taken from the JWT's `tenantId`, and a header/subdomain that disagrees with it is rejected (403). Superadmins (`tenantId: null`) may still use the header/subdomain to switch tenant context.
- ~~`users.service.ts findAll()` queries without a `select`, so `GET /users` returns bcrypt password hashes to any caller.~~ **Fixed (Phase 0):** `findAll()` and `remove()` now strip `password_hash`; `partners.service.ts` `findAll()`/`findOne()`/`update()`/`remove()`/`create()`/`regenerateApiKey()` now strip `api_secret_hash` the same way.

### 4.6 Tests

~~Zero unit spec files (`*.spec.ts`) under `backend/src`. One end-to-end test in total.~~ **Fixed (Phase 3):** 6 unit spec files cover the security-critical code from Phases 0–2 — `@Public()`/`JwtAuthGuard` bypass logic, the JWT-authoritative tenant fix (`tenant.interceptor.spec.ts`, 8 cases), `password_hash`/`api_secret_hash` stripping (`users.service.spec.ts`, `partners.service.spec.ts`, 6 cases each), and DTO validation (`create-booking.dto.spec.ts`). 32 tests total, all passing. Two e2e suites were added under `backend/test/`: `unauthenticated-routes.e2e-spec.ts` (auto-discovers every registered route via Nest's `DiscoveryService` and asserts each one that isn't genuinely credential-free rejects with 401 — **4/4 passing**) and `tenant-isolation.e2e-spec.ts` (seeds two real tenants and asserts one tenant's JWT can't read/write another's data — **6/6 passing**, verified against a real local Postgres). See `roadmap.md` Phase 3.

## 5. Frontend (staff/admin PWA)

- Routing (`frontend/src/App.jsx`, `BrowserRouter`): `/partner/login`, `/partner/dashboard` (guarded by `ProtectedPartnerRoute`); everything else (`/`, `/bookings`, `/bookings/new`, `/bookings/:id`, `/stays`, `/customers`, `/equipment`, `/boat-prep`, `/schedule`, `/schedule/trip/:date/:type/:boatId?/:session?`, `/settings`, `/breaches`, `/bill`, `/partners`, `/partner-invoices`, `/bills`, `/financial`) wrapped in `ProtectedRoute`.
- `ProtectedRoute.jsx`: checks `useAuth()`; if `isMockMode()` is on, shows a `UserSelector` with no real auth; otherwise checks `isAuthenticated() && localStorage.getItem('auth_token')`, plus a `canAccess(permission)` check. This is UI gating only. ~~Since most backend endpoints are unguarded, it doesn't back onto any server-side check.~~ **Fixed (Phase 0):** every backend controller now sits behind the global `JwtAuthGuard` by default, with only genuinely public routes (login endpoints, partner routes with their own guard) marked `@Public()` — see §4.5.
- Structure: 17 page files (some very large: `Settings.jsx` 3,544 lines, `BoatPrep.jsx` 2,721, `Financial.jsx` 2,370), 18 component files, 15 service files (`api/`, `apiService`, `bookingRepricingService`, `breachService`, `dataService`, `financialService`, `pricingService`, `sharedStorage`, `stayCostsService`, `stayService`, `syncService`, `tankService`), 8 util files including `authContext.js`. No `hooks/`, `context/`, or `store/` folder — state is managed ad hoc via `authContext.js` and local component state.
- Zero frontend tests found.

## 6. public-website (customer-facing)

- Uses `HashRouter` (URLs like `/#/pricing`), which is unfavorable for SEO/crawling.
- Routes wired in `App.jsx`: `/`, `/pricing` → Home, `/contact` → Contact, `/privacy-policy`, `/cookie-policy`, `/data-retention-policy`. Several page files exist but aren't routed (About, BookDive, DiveSites, Login, MyAccount, Price) — apparently orphaned or work-in-progress.
- `index.html` title is generic: "DCMS - Dive Center Management Software"; meta description is generic/product-focused rather than branded to the actual dive center; no Open Graph tags.
- No `robots.txt`, no `sitemap.xml` in either `public-website/public` or `frontend/public`.

## 7. Database migrations — baselined onto Prisma (2026-07-21)

**Status: done.** `backend/prisma/migrations/` is now the single source of truth for schema history:

- A `0_baseline/migration.sql` was generated via `prisma migrate diff --from-empty --to-schema-datamodel` against the real, current schema, then marked applied via `prisma migrate resolve --applied 0_baseline`. `prisma migrate status` confirms the schema is up to date with no drift.
- The old hand-written raw SQL (`database/schema/001_create_tables.sql`, `database/migrations/002`–`011`, including the genuine duplicate `008_location_type_varchar.sql`/`008_rollback_restore_location_type_enum.sql` pair) is archived at `docs/archive/legacy-sql-migrations/` (see its `README.md`) — kept for history only, not applied by anything.
- `backend/docker-entrypoint.sh`, `setup-database.sh`, and `setup-local-db.sh` all now create the schema via `prisma migrate deploy`/the baseline instead of the archived raw SQL.
- A real schema/DB drift was caught during baselining: `schema.prisma` declared `onDelete: SetNull` on 9 `tenant_id` relations that the live DB didn't actually have. Resolved by relaxing `schema.prisma` to match the DB's actual (safer) `NO ACTION` behavior — see `roadmap.md` Phase 2.3 for detail.
- `database/` now holds only `README.md` and `seeds/002_sample_data.sql` (optional demo data, loaded by `backend/docker-entrypoint.sh` when present and the `locations` table is empty — not part of schema history).
- A second migration, `20260721140235_phase4_tenant_id_everywhere`, was added on top of the baseline for Phase 4 (see §4.3 and `roadmap.md` Phase 4) — unlike the baseline, this one is a genuine forward migration (adds columns + backfills real data) and needs to actually **run** via `prisma migrate deploy`, not be marked applied.

## 8. sync-server

**Removed (Phase 1).** It only ever mattered in "mock mode" (localStorage, no real backend) — `frontend/src/config/apiConfig.js` hardcodes `mode: 'api'`, so every real deployment already talked to the NestJS backend directly and sync-server was dead weight. The folder and all references in start/stop/check scripts (both `.sh` and Windows `.bat`) have been removed.

## 9. Infra

- `docker-compose.yml`: `db` (postgres:15-alpine), `backend` (port 3003), `frontend` (port 3000). `docker-compose.import.yml` overrides `db` for restoring a host DB dump. ~~env includes `JWT_SECRET=change-me-in-production` hardcoded in the compose file~~ **Fixed (Phase 0):** now `${JWT_SECRET:?Set JWT_SECRET in a .env file at the repo root before running docker compose}`, failing loudly instead of silently using a known default.
- `deploy/ovh/`: scripts to FTP-deploy `public-website` to OVH shared hosting under the `couteret.fr` domain.
- `deploy/zbox/`: K3s manifests (`namespace, backend, admin, public, postgres+pv, ingress, cert-manager-issuer, traefik-cors-middleware, secrets.yaml.example`) for the real production target, a ZBOX CI331 nano server.
- ~~No `.env.example` exists~~ **Fixed (Phase 0/1):** `backend/.env.example`, `frontend/.env.example`, and `public-website/.env.example` now exist. Env vars referenced in code: `CORS_ORIGIN, JWT_SECRET, LOCAL_NETWORK_IP, PORT, RESET_ADMIN_PASSWORD, RESET_ADMIN_USER, TENANT_SLUG`.

## 10. Repo hygiene

**Fixed (Phase 1):**
- Root markdown files consolidated into `docs/setup/`, `docs/guides/`, `docs/database/`, `docs/infra/`, `docs/business/`, `docs/planning/` (former `Open Source/` content), and `docs/archive/` (superseded/point-in-time docs). See `docs/README.md` for the index. `dcms-backend.tar` (173MB, untracked) deleted from disk.
- **Still needs a follow-up decision:** `Data Saved/Invoice BILL-1767117729046.pdf` (real customer PII) and the 6.7MB Cursor chat-session export (formerly `API_ENDPOINTS_AUDIT.md`, now `docs/archive/cursor-chat-exports/2026-01-08-git-sync-session.md`) were both already committed to git history before Phase 1. Removing them from the working tree doesn't remove them from history — that needs a deliberate `git filter-repo`/BFG pass, which requires a force-push and will break any other existing clones. Flagged here rather than done silently.
- `cursor_git_sync_completion_status.md` moved to `docs/archive/` (still gitignored at its new path, so it stays untracked going forward).

## 11. Existing multi-tenant work

A design document already exists at `docs/MULTITENANT_DESIGN.md` (shared database, row-level isolation via `tenant_id`, subdomain/header tenant resolution, JWT carrying `tenantId`). Its own checklist marks phases 1–4 as "done/partial" and its final security checklist (§10 of that doc) is entirely unchecked — no item is ticked off, including "no cross-tenant data leakage." The current codebase matches that partial state: a `tenants` table and interceptor exist, but tenant resolution trusts the client-supplied header instead of enforcing the JWT's `tenantId`, and most tables still lack `tenant_id` entirely.
