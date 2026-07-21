# DCMS — Target Architecture (To-Be)

_Companion to `current-architecture.md`. Describes the state to reach after cleanup/optimization and secure multi-tenancy._

## 1. Goals

1. Every request is authenticated and authorized at the server — the frontend's route guarding becomes a UX convenience, not the security boundary.
2. Tenant isolation is enforced by the backend, not by trusting whatever the client claims — a bug or malicious client cannot read or write another dive center's data.
3. Input validation actually validates.
4. One migration system, one source of schema truth.
5. Code that's maintainable: reasonably sized components, a real test suite, consistent logging, no committed build artifacts or generated customer data.
6. `public-website` is a proper, crawlable marketing/booking front door.

This builds on the existing `docs/MULTITENANT_DESIGN.md` (shared DB, row-level isolation via `tenant_id`, JWT carrying `tenantId`) — it's the right model. The target below closes the gaps its own checklist already flagged as unchecked, rather than replacing the design.

## 2. Multi-tenant data model

- **Every** tenant-scoped table gets an explicit `tenant_id` column with an FK to `tenants(id)`, not just the 9 that have it today. Add it to: `bookings`, `staff`, `equipment`, `boat_preps`, `boats`, `dive_sites`, `customer_stays`, `customer_bills`, `partner_invoices`, `pricing_configs`, `customer_consents`, `customer_certifications`, `data_subject_access_requests`, `bono_usage`. Deriving tenant only through a `location_id`/`customer_id` join is fragile and makes it easy to forget a filter in a new query.
- Composite uniqueness moves from global to per-tenant where appropriate: `(tenant_id, contact_email)` on `partners`; `(tenant_id, key)` on `settings`; `(tenant_id, email)` on `customers`. `partners.api_key` stays globally unique (it's a bearer credential, not a display field).
  - **Superseded for `users.username`/`email` (Phase 4/4.6, decided with you directly — see `roadmap.md`).** Making these tenant-composite would have broken the `findUnique`-by-field login lookups and, more fundamentally, assumed "one tenant relationship = one login," which turned out to be false: staff genuinely work at more than one center. `users.username`/`email` stay globally unique — a `users` row is one real person — and multi-center access is modeled as a separate many-to-many `user_tenant_memberships` table instead (own `role`/`permissions`/`location_access` per membership, login-time tenant picker, post-login "switch center"). This is the actual target now for that specific case; `partners`/`settings`/`customers` composite uniqueness above is unaffected and still the goal.
- `superadmin` users keep `tenant_id = NULL` and are the only principals allowed to act across tenants, and only when explicitly requesting a cross-tenant view (see §3).
- Optional hardening once the above is solid: Postgres Row-Level Security policies keyed on a session-local `tenant_id`, as defence-in-depth behind the application-level filtering — not a replacement for it.

## 3. Tenant resolution & auth (the core fix)

Today: tenant comes from a client-supplied header/subdomain and is trusted as-is; most controllers have no guard at all.

Target:

- **A global auth guard** (`APP_GUARD` provider, or applied per-module consistently) so every controller requires a valid JWT by default. Public endpoints (login, partner-auth, health checks) are the explicit, deliberate exceptions via `@Public()` decorator, not the default.
- **Tenant resolution is JWT-authoritative for authenticated requests.** The header/subdomain may be used to pick which tenant a *login* targets (before a JWT exists), but once a request carries a JWT, the resolved tenant must equal the JWT's `tenantId`. A mismatched header is rejected (403), not silently followed — except for `superadmin`, whose JWT has `tenantId = NULL` and who must pass an explicit tenant-switch header to act on a specific tenant, itself logged to `audit_logs`.
- **`TenantGuard`** enforces the above and runs before any controller logic executes; `TenantContextService` becomes the single place the rest of the app reads the current tenant from.
- **Never return credential material.** Every `users` (and `partners`) query that can be reached by a client uses an explicit `select` that excludes `password_hash`/`api_secret_hash`.
- **No hardcoded secret fallback.** `JWT_SECRET` (and any other secret) is required at boot — the app should fail to start rather than silently fall back to a public default. Secrets live in environment variables sourced from the deploy target's secret store (K8s `Secret` on ZBOX, `.env` locally, never committed).
- **CORS** is scoped to the actual known origins per environment (admin/public frontend URLs), not open CIDR ranges.

## 4. Input validation

- Replace plain TypeScript `interface`s used as DTOs with real `class-validator`-decorated classes for every write endpoint (`Create*Dto`, `Update*Dto`).
- Re-enable `forbidNonWhitelisted: true` (and keep `whitelist: true`) once DTOs are real, so unexpected fields are rejected rather than silently passed through or silently dropped.
- Add DTOs incrementally, module by module, verified by the new test suite (§6) rather than as a single risky rewrite.

## 5. Schema & migrations

- Pick **one** system: Prisma migrations. Treat `database/migrations/*.sql` as historical record only, then retire it.
- Reconstruct a clean Prisma migration history (a single "baseline" migration reflecting current production schema, generated via `prisma migrate diff`/`db pull`, is acceptable — it doesn't need to replay every historical raw-SQL step) so future changes go through `prisma migrate dev`/`deploy` exclusively.
- Delete the duplicate/ambiguous `008_*` pair once the baseline is captured.

## 6. Testing

- Backend: unit tests per service (especially bookings, customers, users, tenant resolution), plus e2e tests that specifically assert cross-tenant isolation (tenant A's JWT cannot read/write tenant B's rows) and that unauthenticated requests are rejected on every controller.
- Frontend: at minimum, tests for `ProtectedRoute`/`authContext` and the components most central to daily use (Bookings, Schedule).
- Treat the tenant-isolation tests as a release gate — no schema/auth change ships without them passing.

## 7. Code quality / structure

- ✅ Backend: consistent Nest logger (`Logger` from `@nestjs/common`) instead of raw `console.*` — done in Phase 1 for runtime code (CLI scripts under `backend/src/scripts/` still use `console.log`, which is fine for one-off tooling). The enum-remapping band-aids in `bookings.service.ts` are still there — that's a schema/frontend consistency fix, not a logging one, still open.
- Frontend: split the largest pages (`Settings.jsx` 3,544 lines, `BoatPrep.jsx` 2,721, `Financial.jsx` 2,370) into smaller feature components with a `hooks/` and possibly a lightweight store (context or a small state library) instead of everything living in page components plus `authContext.js`.
- ✅ `sync-server` retired entirely in Phase 1 (folder deleted, all references removed from start/stop/check scripts including Windows `.bat` equivalents) — confirmed dead first via `apiConfig.js`'s hardcoded `mode: 'api'`.
- Consider migrating both React apps off Create React App (deprecated, unmaintained) to Vite — not urgent, but worth scheduling once higher-priority items are done.

## 8. public-website

- Switch from `HashRouter` to `BrowserRouter` (needs a small server/hosting config change to serve `index.html` for unknown paths, which OVH/ZBOX hosting supports).
- Real per-page `<title>`/meta description, Open Graph tags, `robots.txt`, `sitemap.xml`.
- Route or remove the orphaned pages (About, BookDive, DiveSites, Login, MyAccount, Price) — either finish and wire them in, or delete them so the codebase doesn't carry dead work.
- If organic search matters, consider server-side rendering or static pre-rendering for the marketing pages (a CRA SPA with client-only rendering is weak for SEO regardless of meta tags).

## 9. Repo hygiene

- Remove `dcms-backend.tar`, the `Data Saved/` invoice PDF, and the `Open Source/` folder from the working tree (or relocate anything genuinely needed outside the repo).
- Consolidate the ~45 root-level markdown files into `docs/` with a short index, archiving anything purely historical (e.g. `cursor_git_sync_completion_status.md`).
- Add a proper `.env.example` per app listing required variables without values.

## 10. Target module/auth matrix (summary)

| Concern | Current | Target |
|---|---|---|
| Auth guard coverage | 6 files, no global guard | Global guard by default, explicit `@Public()` exceptions |
| Tenant source of truth | Client header/subdomain, unchecked | JWT `tenantId`, header only pre-login |
| `tenant_id` coverage | 9 of 22 models | 22 of 22 tenant-scoped models |
| DTO validation | Mostly plain interfaces, pipe permissive | class-validator classes, pipe strict |
| Migrations | Two disconnected systems | Prisma only, single baseline |
| Tests | ~0 backend, 0 frontend | Unit + e2e incl. tenant-isolation gate |
| Secrets | Hardcoded JWT fallback, no `.env.example` | Required env vars, no fallback, documented |
| public-website routing | HashRouter, no SEO tags | BrowserRouter, full SEO basics |
