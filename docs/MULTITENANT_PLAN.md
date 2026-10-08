# DCMS multi-tenant architecture plan

_Written 2026-10-08, against the rebuilt stack (`backend/` NestJS + Prisma, `backoffice/` and `frontend/` Next.js) at commit `294c2f8`._

This plan turns the rebuilt DCMS into a multi-tenant SaaS: one deployment serving several dive centers (tenants), each seeing only its own data. It builds on [`MULTITENANT_DESIGN.md`](MULTITENANT_DESIGN.md), [`target-architecture.md`](target-architecture.md) and the decisions recorded in [`roadmap.md`](roadmap.md), and corrects them where they no longer match the code.

**Starting point: the rebuild has no tenant support at all.** The ✅ phases in `MULTITENANT_DESIGN.md` and `roadmap.md` were done in the old system (`backend-old/`, `frontend-old/`) and none of that code was carried over. In the rebuild:

- None of the 34 Prisma models has a `tenantId`.
- About 210 Prisma calls and 25 raw SQL statements in the services assume a single center.
- Several things exist once for the whole database: the `CenterSettings` row (`id = "center"`), the price tables, invoice / partner invoice / dive log numbering, closed days, and the `Atlantic/Canary` time zone hard-coded in both the backend and the backoffice.

The work below is a fresh implementation, not a port.

---

## 1. Decisions for Philippe

Four decisions shape the schema. They should be settled before step 1 starts, because changing them later means migrating data twice.

### 1.1 Accounts: one account per person, or one per center?

| Option | What it means |
|---|---|
| **A. Global account + memberships** | A `User` row is one real person, email globally unique. A `Membership(userId, tenantId, role)` table grants access to each center, with its own role. Login asks "Which center?" when there are several; "Switch center" re-issues the token. |
| B. One account per center | `User` carries a `tenantId`; email unique per tenant. Someone working at two centers has two accounts and two passwords. |

**Already decided once:** for the old system, Philippe chose A (roadmap Phase 4.6, after staff turned out to work at more than one center) and chose to keep `users.email` globally unique (Phase 4, item 2).

**Recommendation: A, carried over unchanged.** It matches how staff actually work, it is what the original UI expected ("Which center?", "Switch center"), and it lets roles differ per center (instructor at one, admin at another). The rebuild's `User.role` becomes the platform-level role only (`SUPERADMIN` or none); staff roles move onto the membership. **Needs: a confirmation that the old decision still stands.**

### 1.2 Customers: separate per center, or shared?

| Option | What it means |
|---|---|
| **A. Separate per center** | A diver who books at two centers has two customer records and two logins, one per center. Each center sees and controls only its own. |
| B. Shared identity | One login for the diver across all centers on the platform, with a customer profile per center. |

**Recommendation: A.** Under GDPR each center is the controller of its customers' data and the platform is a processor. A shared customer login would make the platform hold one identity that links a person's relationships with several unrelated businesses. That makes erasure requests, data exports and breach scoping cross-tenant problems, and it needs consent to share. Separate records keep every customer fully inside one tenant.

Consequence for the schema: staff and platform logins stay globally unique (decision 1.1), while customer logins are unique **per tenant**. Either customer credentials move to their own per-tenant table, or `User` gets a nullable `tenantId` with two partial unique indexes (`email` where `tenantId IS NULL`, `(tenantId, email)` where it is set). The first option is cleaner in Prisma, which cannot express partial unique indexes in the schema.

### 1.3 URLs: subdomains only, or custom domains too?

| Option | What it means |
|---|---|
| **A. Subdomains first, custom domains later** | Public site at `{slug}.dcms.couteret.fr`, backoffice at `{slug}.admin.couteret.fr`, one API host. One wildcard DNS record and one wildcard certificate. Custom domains (`www.deepbluediving.com`) added in step 7. |
| B. Custom domains from day one | Every center can bring its own domain immediately. Needs a domain table, verification (DNS TXT record), and certificate issuance per domain before launch. |

**Recommendation: A.** The tenant must be resolved from the host either way, so the code doesn't change. What changes is the certificate and domain-verification machinery, which can wait until a center asks for it. For the backoffice, use `{slug}.admin.couteret.fr`, as the original frontend did (see the contradiction in §4.1). Keep `admin.couteret.fr` with no slug for the platform superadmin.

### 1.4 Locations: build them in the same pass, or after?

The original system had several **locations** per tenant (e.g. Caleta de Fuste, Las Playitas), each with a type (diving, bike rental, surf…) that switched parts of the UI on and off. The rebuild has no locations: boats, sites, equipment and bookings belong directly to "the center".

| Option | What it means |
|---|---|
| **A. Same pass** | Add `Location` (and location types) in step 1 alongside `tenantId`, and attach boats, dive sites, equipment, staff and bookings to a location as well as a tenant. The tenant- and location-specific screens are built once. |
| B. After | Ship multi-tenancy with one implicit location per tenant; add locations as a separate project later, with a second migration through the same tables. |

**Recommendation: A, if any tenant planned for the first year has more than one site; otherwise B.** Deep Blue Diving has two locations in the original data, so A is likely. It adds roughly one size step to steps 1 and 3 but avoids a second migration through every scoped table. The rental location types (bike, surf, kite) are a separate, larger feature and should stay out of this pass either way: add the `type` column, build only diving.

---

## 2. Implementation order

Seven steps, ordered by risk: isolation first, then identity, then everything that depends on knowing the tenant. Each step ships on its own and leaves the app working for the single existing center.

Complexity: **S** = about a day, **M** = a few days, **L** = one to two weeks, **XL** = more than two weeks or several independent parts.

### Step 1: Tenant foundation and isolation (XL)

**Build**
- `Tenant` model (`id`, `slug` unique, `name`, `isActive`, `createdAt`, `updatedAt`), plus `Location` if decision 1.4 is A.
- `tenantId` (required, indexed) on every tenant-scoped model: about 30 of the 34.
- **Uniqueness becomes per tenant:**
  - invoice, partner invoice and dive log numbers;
  - equipment serial numbers;
  - partner contact email;
  - closed-day date;
  - trip slot (`date, timeSlot, boatId`);
  - customer email, per decision 1.2.
- **Cross-tenant references become impossible:** composite foreign keys on `(tenantId, id)` wherever one tenant-scoped row points at another (booking → boat, customer, trip; invoice → booking …). Then the database itself refuses a booking in tenant A that points at a boat in tenant B.
- **Data migration:** create the default tenant (Deep Blue Diving), add `tenantId` as nullable, backfill every row, then make it `NOT NULL`. This must follow `prisma-migrations` practice here (`migrate diff` + `migrate deploy`, since `migrate dev` cannot create a shadow DB).
- **Request-scoped tenant context:** an `AsyncLocalStorage` store set once per request.
- **A Prisma client extension** that adds `where: { tenantId }` to every read, update and delete and sets `tenantId` on every create, from that context. It refuses to run a scoped query with no tenant in context, rather than running it unscoped.
- **Manual review of the 25 raw SQL statements:** advisory lock keys (`invoice_number`, `stay`, `partner_invoice`, `dive_log_number`, trips) must include the tenant, and every raw `SELECT` must filter by it.
- **Cross-tenant isolation test suite:** seed two tenants and assert that, for every controller, tenant A's token cannot list, read, change or delete tenant B's rows. This suite becomes a release gate: nothing ships while it fails.

**Unlocks:** every later step. After it, a second tenant can exist in the database without leaking, even before any UI knows about tenants.

**Status (2026-10-08): done**, with these decisions confirmed by Philippe: global accounts with memberships, customers separate per tenant, `{slug}.dcms.<domain>` URLs, locations in this pass. What was built:

- **Schema:** `Tenant` (with `plan`), `Location` and a minimal `Membership`, plus `tenantId` on all 33 tenant-scoped models. Migration `add_multitenancy` moves every existing row to the tenant `default` ("Default Center"); new tenants and locations are inserted inside the migration itself, so there is no window where a row has no tenant.
- **Uniqueness per tenant:** invoice, partner invoice and dive log numbers, equipment serials, partner contact email, closed days, trips, and the (tenant, user) pair for customer and staff profiles. `CenterSettings` and the three price tables are keyed by tenant.
- **Same-tenant triggers** (`enforce_tenant()`): the database refuses any row that references another tenant's row, and any change of a row's `tenantId`. `tenantId` defaults to the session setting `app.tenant_id` (unset outside the migration, so an insert without a tenant fails; step 6's row-level security will set it).
- **Request context:** `TenantMiddleware` (the `X-Tenant-ID` header), the JWT and partner strategies (the token's tenant wins; a header naming another tenant gets 403), and `TenantContext` for services.
- **Automatic filtering:** a Prisma extension (`src/prisma/tenant-extension.ts`) adds the tenant to every query and every created row, nested creates included, and fails rather than run unscoped. The 13 raw SQL statements filter by tenant, and their numbering and lock keys include it.
- **Release gate:** `test/tenant-isolation.e2e-spec.ts` (44 checks).

Pulled forward from step 2: the `Membership` table (staff need one to get a tenant in their token), tenant-scoped `/users`, and a guard on accounts shared with another tenant (their email, password, name and role can't be changed from one center).

**Transitional, to remove in step 4:** a request with no token and no `X-Tenant-ID` header uses the only active tenant, if there is exactly one. Once a second tenant is active, such requests get 400.

**Not yet:**
- **Default settings and prices for a new tenant** (step 5 onboarding). Until then, pricing and invoicing fail for a tenant with no price rows.
- **Attaching boats, sites and bookings to locations** (step 3).

### Step 2: Accounts, memberships and the token (L)

**Build**
- `Membership(userId, tenantId, role, isActive)` per decision 1.1. `User.role` keeps only the platform role (`SUPERADMIN`). Customer accounts per decision 1.2.
- **Login:**
  - one membership → token at once;
  - several → `{ requiresTenantSelection, tenants }`, then a select-tenant call;
  - an authenticated `switch-tenant` endpoint that re-issues the token.
- **The JWT carries `tenantId`.** `StaffAuthGuard` / `AdminAuthGuard` read the role from the membership for that tenant, re-checked against the database on each request as today, so revoking a membership takes effect at once.
- **Superadmin:** `tenantId: null`. They can act in a tenant only by naming it explicitly, and every such switch is written to an audit log.
- **Partners:** `Partner.tenantId`; partner tokens carry it; partner API keys stay globally unique (they are bearer credentials).
- **Backoffice:**
  - the NextAuth session stores `tenantId`;
  - login page "Which center?";
  - "Switch center" in the sidebar.
- **Users tab (feature 1)** lists the tenant's memberships instead of all users.

**Unlocks:** real staff at a second center. Superadmin operations. Partner portal per center.

**Status (2026-10-08): done.** What was built, and where it differs from the plan above:

- **Schema** (migration `multitenancy_accounts`): `Membership` gains `role` (`MembershipRole`: `ADMIN`, `INSTRUCTOR`), `isActive` and `updatedAt`; existing memberships took their account's role. Superadmin is a boolean, `User.isSuperadmin`, rather than a `SUPERADMIN` value of `User.role`; `User.role` still tells customer accounts from staff accounts, but staff permissions come from the membership. The earliest existing admin became superadmin, and a trigger makes the first account of an empty database one. `PlatformAuditLog` (global) records tenant creation and changes, and every entry by a superadmin into a tenant they are not a member of.
- **Login:** one choice gives a token at once; several give `{ requiresTenantSelection, tenants, platform, selectionToken }` (a 5-minute token usable only at `POST /auth/select-tenant`). `POST /auth/switch-tenant` and `GET /auth/tenants` for signed-in accounts. A superadmin's login offers their own centers plus the platform console (`tenantId: null`, role `SUPERADMIN`); other tenants are entered from the console, as their admin. A platform token reaches no tenant data, not even with `X-Tenant-ID`, and the single-tenant fallback does not apply to it.
- **The JWT** carries `tenantId`, `tenantSlug`, the role in that tenant and `isSuperadmin`. `StaffAuthGuard` reads the role from the active membership on every request.
- **`/superadmin`** API (SuperadminGuard, re-checked against the database): list, create, update and (de)activate tenants, per-tenant stats (bookings, customers, invoiced and collected revenue), audit log.
- **Backoffice:** "Which center?" on the login page, "Switch center" (`/select-center`), the session holds the tenant, and the superadmin console at `/superadmin` (center list with counts, create, activate/deactivate, open a center, stats and edit page, recent platform activity). Settings → Users shows the role in this center and can suspend an account's access here; adding an email that already has a staff account elsewhere gives it access instead of failing.
- **Center admins cannot change a superadmin's account** (password, name, account type, deletion only removes the membership).
- **Tests:** `test/accounts.e2e-spec.ts` (15 checks) next to the isolation suite.

**Not yet:** customer accounts unique per tenant (decision 1.2; customer logins are still global accounts), the invite-by-email onboarding of step 5 (a new tenant is empty: the superadmin opens it and adds its first admin), and partner logins naming a tenant (partners already belong to one, step 1).

### Step 3: Per-tenant configuration (L)

**Build**
- `CenterSettings` keyed by `tenantId`: name, legal details, tax name and rate (already there), plus the new fields:
  - **time zone:** replaces `Atlantic/Canary` everywhere — center days, closed days, the 72-hour breach deadline, datetime inputs;
  - currency;
  - default language;
  - logo and colours for the public site.
- **Price tables keyed by tenant:** `(tenantId, activityType)`, `(tenantId, key)`, `(tenantId, minDives)`.
- **Default rows when a tenant is created:** settings, prices and tiers, so a new center can invoice from day one.
- **Numbering:** sequences per `(tenantId, year)`, with per-tenant prefixes if centers want them (Spanish invoicing rules require a consecutive series per issuer; with several issuers on one platform this is a legal requirement, not a preference).
- **Locations UI** (list, create, edit, assign boats and sites) if decision 1.4 is A.

**Unlocks:** a second center can be configured and invoice correctly. Centers outside the Canary Islands (mainland Spain, France) get correct dates.

**Status (2026-10-09): done.** What was built (migration `tenant_configuration`):

- **`CenterSettings` per tenant** gains `timeZone` (IANA), `currency` (ISO 4217), `defaultLanguage`, `logoUrl` (https), `primaryColor` and `accentColor` (#rrggbb), and `invoicePrefix` / `partnerInvoicePrefix`. Every tenant has a row (the migration added the missing ones). Staff edit the contact details and tax; the regional, branding and numbering fields need an admin (enforced by the API). `GET /center` (public, like `/pricing`) serves the name, contact details, branding and regional settings, never the tax or numbering.
- **Time zone everywhere:** the backend's center days (closing a day, "today" for partners and stays, invoice years, the financial reports' day boundaries) and the backoffice's dates, datetime inputs and labels use the tenant's zone. `TenantConfig` reads it, cached 30 s per tenant and cleared on save. The backoffice session carries the zone and currency, re-read every 5 minutes and at once after a save. The 72-hour breach deadline is in absolute hours and needed no change.
- **Currency:** new invoices take the tenant's currency; prices, the public site, the backoffice and the superadmin stats show amounts in it. Invoices already issued keep their own.
- **Default language:** new customers without a language get the tenant's.
- **New tenants** (superadmin console) are created with their settings row (time zone, currency, language and tax chosen at creation) and the default price list and fun dive tiers, in the same transaction, so they can price and invoice at once.
- **Numbering:** `NumberSequence(tenantId, series, year, last)` replaces the `MAX()` scans. One atomic upsert per number inside the creating transaction: no duplicates, and a rollback returns the number, so each series has no gaps. Invoice and partner invoice numbers use the tenant's prefixes and the year at the center; dive logs keep `YYYY-NNN` by dive date. The migration seeded the counters from the numbers already given.
- **Tests:** `test/tenant-config.e2e-spec.ts` (defaults, public endpoints, permissions, validation, concurrent and rolled-back numbering, time zone).

**Locations (2026-10-09, migration `add_location_to_resources`):** boats, dive sites and bookings have an optional `locationId` (`onDelete: SetNull`), checked by the same-tenant triggers. A booking takes its boat's location (trigger `booking_location`, so staff, guest and partner bookings all get it). Existing boats and sites of a tenant with a single location were assigned to it. `/locations` API (staff read, admins manage), with boat and dive site counts. Backoffice: Settings → Locations (admins), a location selector on each boat and dive site (row and form), and a location filter on the Schedule and Dive Prep (trips by boat location, or planned site for shore dives; bookings, boats and sites; auto-assign stays within the location). Tests: `test/locations.e2e-spec.ts`.

**Not yet:** the public site's tenant name and branding, which come with step 4, when the site knows its tenant from the host.

### Step 4: Tenant from the host (M)

**Build**
- **Backend:** resolve the tenant from the `Host` header (or an `X-Tenant-Slug` header set by the trusted Next.js servers) for the public routes:
  - `POST /bookings/guest`, `GET /dive-sites`, `GET /pricing`;
  - `POST /auth/register`, `POST /auth/login`, `POST /partner-auth/login`.
- **Authenticated requests:** the token's tenant is authoritative. A host or header that disagrees gets a 403, as roadmap Phase 0 did in the old system.
- **Public site:** Next.js middleware maps the host to a tenant slug, passes it to every API call, and returns 404 for an unknown or inactive tenant. Name, sites and prices then come from that tenant.
- **Backoffice:** the host gives the tenant before login, and must match the session after.
- **Cookies:** session cookies scoped to the exact host, never to `.couteret.fr`, so a session from one center's subdomain is never sent to another's.
- **Rate limiting:** the throttler is keyed by tenant and IP, not IP alone.

**Unlocks:** each center gets its own public site and booking flow. This is the first step a customer can see.

**Status (2026-10-09): done.** What was built:

- **Backend:** `TenantMiddleware` takes the tenant from `X-Tenant-ID`, `X-Tenant-Slug`, or a tenant subdomain in the request's `Origin` or `Host` (`{slug}.<domain>` for each domain in `TENANT_DOMAINS`). Several sources must agree (400 otherwise); an unknown or inactive tenant is 404. A token's tenant still wins, and a request naming another tenant by any of these gets 403. The transitional single-tenant fallback (step 1) is removed: a public request that names no tenant gets 400, and a customer sign-in needs one. Rate limits (guest bookings, partner sign-in) are counted per tenant and IP (`TenantThrottlerGuard`). CORS accepts every tenant subdomain over https. Tests: `test/tenant-host.e2e-spec.ts`.
- **Public site** (`frontend/`): the proxy maps the host to a slug (`{slug}.<TENANT_DOMAIN>`) and answers 404 for a host that names no active center. Server-side calls send `X-Tenant-Slug`; the browser's guest booking sends it too (and its origin names the same center). The layout, navbar and home page show the center's name and logo, the page titles its name, and its primary and accent colours drive the site's blues (Tailwind `brand` and `accent`, from CSS variables; unset colours keep the original look). `DEFAULT_TENANT_SLUG` serves one center on hosts that are not subdomains, for development only.
- **Backoffice:** on `{slug}.<TENANT_DOMAIN>` sign-in is for that center (staff and partners); a session for another center (or the console) is redirected to its own address. `<TENANT_DOMAIN>` itself is the platform address (any session, the superadmin console). "Switch center" on a center address opens the other center's address. Session cookies are host-only (no cookie domain is set).

**Not yet / deployment notes:**
- Behind a reverse proxy, the API must trust it (`trust proxy`) for rate limits to see client IPs; today it counts the proxy's.
- Wildcard DNS and certificates (step 7).
- Customer accounts are still global (decision 1.2 asks for per-tenant customer logins).

### Step 5: Platform administration and onboarding (L)

**Build**
- Platform area on `admin.couteret.fr`, superadmin only:
  - tenant list with status and usage counts (locations, sites, boats, users, customers, storage), as the original TenantManagement showed;
  - create, edit and deactivate tenants (deactivating is a soft delete, as in the original);
  - jump into a tenant (an audited switch).
- **Onboarding in one transaction:** create the tenant, its default settings and prices, its first location, and invite its first admin (an email with a set-password link rather than a password typed by the superadmin).
- **Quotas stored per tenant** (the original's `settings.quotas`), shown as usage bars. Enforcement waits until step 7.

**Unlocks:** signing up a new center without database access.

**Status (2026-10-09): done.** What was built (migration `tenant_onboarding`):

- **Console** (`/superadmin`): a platform overview (centers, customers, bookings, storage), and per center its usage against its quotas as bars (locations, dive sites, boats, users, customers, storage; amber from 80%, red from 100%), its status, a link to its backoffice address, "Manage", "Open" (the audited switch) and activate/deactivate (soft delete). The center page adds its stats, usage, the quota form, its invitations and its details.
- **Onboarding in one transaction:** the tenant with its quotas, its settings and default price list (step 3), its first location (name and type), and an invitation for its first admin. The slug is filled in from the name, as in the original.
- **Invitations** (`Invitation`, a global model): a one-time link valid 7 days, emailed through `SMTP_URL` (nodemailer). Only the token's SHA-256 is stored. Without SMTP, or when sending fails, the console shows the link to pass on. The backoffice page `/invite/{token}` sets a name and password for a new account, or asks an existing staff account for its current password; customer accounts are refused. A new invitation to the same email replaces a pending one. Invitations and accepts are audited.
- **Quotas** (`Tenant.quotas`): the original's limits (locations 20, dive sites 15, boats 10, users 20, customers 500, storage 5 GB, price per GB per month 0) as defaults, editable per center. Storage is the size of the center's rows. Not enforced (step 7).
- **Tests:** `test/onboarding.e2e-spec.ts`.

**Not yet:** a center admin inviting staff from Settings → Users (they still create accounts with a password); custom domains (step 7).

### Step 6: Row-level security backstop (M)

**Build**
- **Postgres RLS policies** on every tenant-scoped table: `tenant_id = current_setting('app.tenant_id')::uuid`.
- **Setting the variable:** the Prisma extension from step 1 runs each request's queries in a transaction that first executes `SET LOCAL app.tenant_id`.
- **A dedicated non-owner database role for the app.** Table owners bypass RLS unless `FORCE ROW LEVEL SECURITY` is set, so set both.
- **A separate migration role** that owns the tables.
- **Platform queries** (superadmin metrics) go through an explicit bypass role or `SECURITY DEFINER` functions, never by switching RLS off.
- Run the step 1 isolation suite with the application-level filter deliberately disabled, to prove RLS alone holds.

**Unlocks:** a single missed filter in application code can no longer leak data. This is the hardening the old docs called "optional". Here it is recommended before a second paying tenant goes live.

### Step 7: Infrastructure, commercial and lifecycle (XL, splittable)

**Build**, in independent parts:
- **DNS and TLS:** wildcard DNS for `*.dcms.couteret.fr` and `*.admin.couteret.fr`. Wildcard certificates from Let's Encrypt need the DNS-01 challenge, so the DNS provider needs an API the certificate manager can use. **(M)**
- **Custom domains:** a domain table, ownership verification by DNS TXT record, and per-domain certificates (HTTP-01 or on-demand TLS). **(M)**
- **Quota enforcement:** refuse creates past a tenant's limits, with clear errors. **(S)**
- **SaaS billing:** subscriptions per tenant (e.g. Stripe Billing), the plans from `PRICING_STRUCTURE.md`, and suspension on non-payment. **(L)**
- **Tenant export and deletion:**
  - full export of one tenant's data (GDPR portability, a center leaving);
  - deletion at contract end;
  - the backup and restore procedure for one tenant inside a shared database. **(M)**
- **GDPR paperwork and process:**
  - a data processing agreement template;
  - a sub-processor list;
  - the procedure for a breach that affects several tenants, which must reach each center "without undue delay" (Art. 33(2));
  - `DataBreach` gets a `tenantId` in step 1, and platform-level breaches need a register of their own. **(S for code, M for documents)**

**Unlocks:** charging centers, custom branding domains, and a clean exit path, i.e. a sellable product.

### Summary

| Step | Complexity | Unlocks |
|---|---|---|
| 1. Tenant foundation and isolation | XL | Everything else; a second tenant can exist safely |
| 2. Accounts, memberships, token | L | Staff at several centers; superadmin; partners per center |
| 3. Per-tenant configuration | L | A second center can be configured and invoice correctly |
| 4. Tenant from the host | M | A public site and booking flow per center |
| 5. Platform admin and onboarding | L | New centers without database access |
| 6. Row-level security | M | One missed filter can no longer leak data |
| 7. Infrastructure, commercial, lifecycle | XL | Billing, custom domains, export and deletion |

Steps 1 to 4 are the minimum for a second center to use the system. Step 6 should come before a second **paying** center. Step 7's parts can be scheduled independently.

---

## 3. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| A query misses the tenant filter | One center sees another's customers, medical data or invoices: a GDPR breach affecting two controllers | Prisma extension (step 1), isolation suite as a release gate, RLS (step 6) |
| Raw SQL bypasses the Prisma extension | Same as above, and advisory locks shared across tenants serialise unrelated centers | Review all 25 raw statements in step 1; RLS catches the rest |
| Backfill migration on live data | Rows left without a tenant disappear from every list once filters apply (the old roadmap hit exactly this ordering problem in Phase 4) | Nullable column, backfill and verify counts, then `NOT NULL`, all in one migration; deploy migrations before code |
| Superadmin access becomes a back door | Platform staff read center data with no trace | Explicit switch only, every switch audited, no implicit "all tenants" queries |
| Cookies scoped to the parent domain | A session from one center's site is sent to another's | Host-only cookies (step 4) |
| Invoice numbering stays global | Gaps and shared sequences across issuers break Spanish invoicing rules | Per-tenant sequences (step 3), before any second tenant invoices |
| Hard-coded time zone | Wrong day boundaries, closed days and breach deadlines for any center outside the Canaries | Tenant time zone (step 3) |
| Scope creep from locations and rental types | Step 1 and 3 grow without bound | Decision 1.4; rental location types explicitly out of scope |
| Shared database restores | Restoring one center's data from backup is not a simple database restore | Per-tenant export tooling (step 7), tested before it is needed |
| Old docs mistaken for current state | Work skipped because a doc says ✅ | §4 below; mark the old docs as describing `backend-old` |

---

## 4. Contradictions in the existing docs

### 4.1 Between the docs and the code

1. **`MULTITENANT_DESIGN.md` §8 marks phases 1–4 ✅, and `roadmap.md` marks Phase 4 / 4.6 done.** Both describe `backend-old/` and `frontend-old/`. The rebuild contains none of it.
2. **`target-architecture.md` §5 says "`tenant_id` coverage: 9 of 22 models"** (old system). The rebuild has 0 of 34.
3. **`DEPLOYMENT_SINGLE_VS_SHARED.md` says DCMS has "no tenant/organization concept"** and recommends one instance per customer. This contradicts the design doc's ✅ status for the old system. It happens to be true of the rebuild today, but for a different reason.
4. **Login identifier:** the design doc (§4.3) logs in with `{ username, password }` and the old roadmap keeps `username` globally unique. The rebuild has no usernames; it logs in by email.
5. **Settings shape:** the design doc assumes a key–value `settings` table with `(tenant_id, key)` uniqueness. The rebuild uses a single typed `CenterSettings` row plus price tables.
6. **Tables listed in the design doc that the rebuild doesn't have:** `locations`, `government_bonos`, `certification_agencies`, `audit_logs`, `customer_consents`, `data_subject_access_requests`, `bono_usage`, `pricing_configs`. These need either rebuilding or dropping from the design.

### 4.2 Between the docs themselves

1. **Backoffice URL scheme:** the design doc uses `admin.{slug}.dcms.couteret.fr` (§4.3, §6.1). The old frontend (`ORIGINAL_FEATURES.md`, tenant resolution) and the ingress section use `{slug}.admin.couteret.fr`. **Resolution: use `{slug}.admin.couteret.fr`** (decision 1.3).
2. **User uniqueness:** the design doc §3.4 wants `(tenant_id, email)` unique on `users`. `target-architecture.md` §2 and `roadmap.md` Phase 4.6 supersede that with global uniqueness plus memberships. **Resolution: memberships** (decision 1.1).
3. **Customer uniqueness:** the design doc and `target-architecture.md` want `(tenant_id, email)` on customers. `roadmap.md` Phase 4 item 2 kept emails globally unique (for users). Since customers log in as users, the two goals conflict. **Resolution: customer logins unique per tenant** (decision 1.2).
4. **Row-level security:** the design doc and `target-architecture.md` call RLS "optional hardening… not a replacement". **This plan recommends it before a second paying tenant** (step 6). It is still a backstop, not a replacement for application filtering.
5. **Invoice numbers:** `roadmap.md` Phase 4 item 2 kept `invoice_number` globally unique. With several issuing centers this conflicts with per-issuer invoice series. **Resolution: unique per tenant** (step 3).
6. **API host:** the old frontend sent every tenant's API calls to `api.couteret.fr` with the tenant in a header. The design doc's ingress also lists `*.api.couteret.fr`. **Resolution: one API host.** The Next.js servers call the API server-side and pass the tenant explicitly; no per-tenant API hostnames are needed.

**Suggested doc cleanup** once this plan is accepted:
- add a banner to `MULTITENANT_DESIGN.md`, `roadmap.md` (Phases 0–4.6) and `DEPLOYMENT_SINGLE_VS_SHARED.md` saying they describe the old system;
- point readers here.

---

## 5. Recommendations at a glance

| Decision | Recommendation |
|---|---|
| 1.1 Accounts | Global account + memberships, as already chosen for the old system; confirm it carries over |
| 1.2 Customers | Separate per center; customer logins unique per tenant |
| 1.3 URLs | Subdomains first (`{slug}.dcms…`, `{slug}.admin…`, one API host); custom domains in step 7 |
| 1.4 Locations | Same pass if any first-year tenant has several sites (Deep Blue Diving does); rental location types out of scope |
