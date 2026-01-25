# DCMS Deployment: Single Instance vs Shared Cloud

**Question:** With the **current** DCMS, what is the best solution for customers—**one instance per customer** (dedicated DB + rest) or **shared cloud**?

**Short answer:** With the **current** version, **one instance per customer** (dedicated database + app) is the only viable and recommended model. Shared multi-tenant cloud would require substantial product changes.

---

## 1. How DCMS is built today

### 1.1 Architecture

- **One `DATABASE_URL`** per deployment → single PostgreSQL database.
- **No tenant/organization concept:** no `tenant_id`, `org_id`, or similar.
- **Data scope:** **location_id**. All data belongs to one “operator” (e.g. Deep Blue) with multiple **locations** (Caleta, Las Playitas, Bike).
- **Users (staff), settings, customers, bookings, etc.** are **global to that one database**; there is no cross-tenant isolation or multi-tenant auth.

### 1.2 Implication

- **One deployment = one customer** (one dive center or operator).
- **Multi-location** = multiple locations **within** that single customer, not across different DCMS customers.

---

## 2. Two deployment models

| | **A. Single instance per customer** | **B. Shared cloud (multi-tenant)** |
|--|-------------------------------------|------------------------------------|
| **DB** | Dedicated PostgreSQL per customer | One (or few) shared DB(s); rows isolated by `tenant_id` |
| **App** | One backend process per customer, or many on same host each with own DB | One backend serving all tenants; every query filtered by tenant |
| **Fit with current DCMS** | ✅ **Matches** current design | ❌ **Does not**; would need tenant_id everywhere |

---

## 3. What “shared” can mean (and what works today)

### 3.1 Shared **infrastructure** (VPS, reverse proxy) ✅

- **One VPS** (or a small cluster) runs **multiple DCMS instances**.
- Each instance = **own backend + own DB** (own `DATABASE_URL`).
- Reverse proxy (e.g. Nginx) routes `customer1.dcms.com` → instance 1, `customer2.dcms.com` → instance 2.
- **App code:** unchanged. Still **single instance per customer**; only the **hosting** is shared.

**Verdict:** Works with current DCMS. Low ops cost, good for 10–20 customers.

### 3.2 Shared **application** (one backend, one frontend) ✅

- **One** backend and **one** frontend build.
- Frontend points to different API base URLs per customer (e.g. `api.customer1.dcms.com`), or you use one domain and route by subdomain to **different backends** (each with its own DB).
- **Critical:** each backend still has **its own database**. The “shared” part is only the **codebase** and **deployment artefacts**, not the data.

**Verdict:** Works. Same app, many deployments, each with dedicated DB.

### 3.3 Shared **database** (multi-tenant) ❌

- **One** database for **all** customers; tables have `tenant_id`; every query scoped by tenant.
- Requires: tenant-aware auth, tenant context in all services, schema/migration changes, careful onboarding/offboarding.

**Verdict:** **Not** supported by current DCMS. Would require a significant refactor.

---

## 4. Best solution for customers **with the current DCMS**

### Recommended: **Single instance per customer (dedicated DB + app)**

**Model:**

- **One instance per customer** = one backend + one PostgreSQL database (+ optional separate frontend deployment per customer, or shared frontend routing to per-customer APIs).
- **Shared:** optional shared **infrastructure** (VPS, proxy, backups, monitoring) and **codebase** (same Docker image or build for all).
- **Not shared:** **data**. Each customer has their **own database**.

**Why this is best *today*:**

1. **Matches the product:** No tenant logic exists; the app implicitly assumes one operator per DB. No code changes.
2. **Strong isolation:** Data fully separated per customer. Simpler **GDPR** storytelling (data location, deletion, DSAR).
3. **No noisy neighbours:** One customer’s load or data volume doesn’t affect others.
4. **Easier compliance:** Per-customer DB can be in a specific region or under specific terms.
5. **Simpler recovery:** Restore/export per customer without touching others.

**Trade-offs:**

- **Ops:** More databases to manage (backups, migrations, monitoring). Mitigated by automation (scripts, Docker, IaC).
- **Resource use:** More RAM/CPU per customer than with a single shared DB. For tens of customers and modest load, one VPS or a small cluster is enough.

---

## 5. When would “shared cloud” (multi-tenant) make sense?

**Only** if you **change** the product:

- Add `tenant_id` (or equivalent) to all relevant tables and queries.
- Introduce tenant-aware auth and tenant context across the stack.
- Define tenant lifecycle (create, suspend, delete) and possibly separate **plans** per tenant.

**Then** you could consider:

- One shared DB (with row-level tenant isolation) **or** one DB per tenant behind a single app (often called “siloed” multi-tenancy).
- Shared app serving many customers from one deployment.

**Today:** that refactor is **not** done, so **shared DB / multi-tenant app** is **not** an option with the current version.

---

## 6. Practical recommendation

| Dimension | Recommendation |
|----------|----------------|
| **Model** | **Single instance per customer** with **dedicated database** per customer. |
| **Sharing** | **Shared infrastructure** (VPS, proxy, backups) and **shared codebase** (same Docker/build). **Do not** share the database across customers. |
| **Scaling** | Start with one VPS; run several backends + DBs (e.g. Docker Compose or VMs). Add more VPS or move to managed DBs as you grow. |
| **URLs** | Per-customer subdomains (e.g. `deepblue.dcms.app`, `centrex.dcms.app`) each pointing to that customer’s instance. |

**Summary:** With the **current** DCMS, the best solution for customers is **one instance per customer (dedicated DB + app)**, with optional **shared infra and code**. **Shared cloud** in the sense of a **shared multi-tenant database** is **not** possible without product changes.
