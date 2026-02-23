# DCMS Multi-Tenant Design (ZBOX)

## 1. Overview

This document describes the design for running multiple dive centers (tenants) on a single DCMS deployment on the ZBOX server. Each tenant is an independent dive center with its own locations, customers, staff, bookings, and settings.

### 1.1 Model: Shared Database with Row-Level Isolation

- **One PostgreSQL database** shared by all tenants
- **tenant_id** on all tenant-scoped tables
- Every query filters by tenant (or uses tenant from JWT/context)
- Single backend process serving all tenants
- Tenant resolution via **subdomain** (e.g. `deepblue.dcms.couteret.fr`) or **X-Tenant-ID** header

### 1.2 Why Shared DB (vs Siloed)

- **Resource efficiency** on ZBOX: one Postgres, one backend
- **Simpler ops**: single deployment, single migration
- **Lower RAM/CPU** than N× (backend + DB) per tenant

---

## 2. Tenant Model

### 2.1 Tenants Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| slug | string (unique) | URL-safe identifier (e.g. `deepblue`, `centrex`) |
| name | string | Display name |
| domain | string? | Custom domain (optional) |
| subdomain | string | Used when domain is shared (e.g. dcms.couteret.fr) |
| is_active | boolean | Tenant can be suspended |
| settings | JSON | Tenant-level config |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 2.2 Tenant Resolution

1. **Subdomain**: `{slug}.dcms.couteret.fr` → tenant by slug
2. **Header** (for API/SSR): `X-Tenant-ID` or `X-Tenant-Slug`
3. **JWT**: After login, JWT contains `tenantId`; backend uses it for all subsequent requests

---

## 3. Schema Changes

### 3.1 New Table: tenants

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  domain VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Tables Adding tenant_id

| Table | Notes |
|-------|-------|
| **locations** | Root: tenant owns locations |
| **users** | Staff; superadmin has tenant_id=NULL (platform admin) |
| **partners** | Partners belong to tenant |
| **customers** | Customers book at tenant's locations |
| **settings** | key + tenant_id unique (key was global) |
| **certification_agencies** | Per-tenant or shared via NULL tenant_id |
| **government_bonos** | Per-tenant |
| **audit_logs** | For filtering by tenant |
| **data_breaches** | Per-tenant |

### 3.3 Tables with tenant_id via FK

These get tenant implicitly through their relations:
- boats → location_id → locations.tenant_id
- dive_sites → location_id
- equipment → location_id
- staff → location_id
- boat_preps → location_id
- bookings → location_id
- customer_bills → location_id
- partner_invoices → partner_id
- customer_consents → customer_id
- customer_certifications → customer_id
- customer_stays → customer_id
- data_subject_access_requests → customer_id
- bono_usage → via booking/customer
- pricing_configs → location_id

**Decision**: Add `tenant_id` explicitly to **all** tables that are tenant-scoped for:
- Simpler queries (no deep joins)
- Row-level security potential
- Clear auditability

### 3.4 Unique Constraints (per-tenant)

| Table | Current | New |
|-------|---------|-----|
| users | username unique | (tenant_id, username) unique; superadmin tenant_id=NULL |
| users | email unique | (tenant_id, email) unique |
| partners | contact_email unique | (tenant_id, contact_email) unique |
| partners | api_key unique | api_key stays global (used for auth) |
| settings | key unique | (tenant_id, key) unique |
| customers | email | (tenant_id, email) unique for non-null email |

---

## 4. Auth & Tenant Context

### 4.1 JWT Payload (Extended)

```json
{
  "sub": "user-uuid",
  "username": "admin",
  "tenantId": "tenant-uuid",
  "role": "admin",
  "permissions": ["dashboard", "bookings"],
  "iat": 1234567890,
  "exp": 1234571490
}
```

- **superadmin**: `tenantId` = null → can access any tenant (with tenant context header or switch)
- **admin, staff**: `tenantId` = their tenant → all queries scoped to that tenant

### 4.2 Tenant Context (Request Scoped)

- **TenantContext** service: provides current `tenantId` for the request
- **TenantMiddleware**: Resolves tenant from subdomain or `X-Tenant-ID` before auth
- **TenantGuard**: Ensures user has access to the resolved tenant (or is superadmin)

### 4.3 Login Flow

1. User hits `admin.deepblue.dcms.couteret.fr` (or `api.deepblue.dcms.couteret.fr`)
2. Middleware resolves tenant from subdomain `deepblue` → tenantId
3. Login: `POST /api/users/login` with `{ username, password }` + tenant in context
4. Backend verifies user belongs to tenant (or is superadmin)
5. JWT issued with `tenantId`
6. Subsequent requests use JWT tenantId; no need to resolve again

### 4.4 Customer Portal

- Customers belong to a tenant
- Public site URL: `deepblue.dcms.couteret.fr` or `dcms.couteret.fr/deepblue`
- Tenant from subdomain or path; customer registration/login scoped to that tenant

---

## 5. API Changes

### 5.1 New Endpoints

- `GET /api/tenants` – List tenants (superadmin only)
- `POST /api/tenants` – Create tenant (superadmin only)
- `GET /api/tenants/:id` – Get tenant
- `PUT /api/tenants/:id` – Update tenant
- Tenant resolution: from subdomain or `X-Tenant-ID` / `X-Tenant-Slug` header

### 5.2 Modified Endpoints

- All data endpoints: implicitly filter by tenant from context
- Login: require tenant context; return JWT with tenantId

---

## 6. Frontend Changes

### 6.1 Admin Portal

- **URL**: `admin.{slug}.dcms.couteret.fr` or `admin.dcms.couteret.fr?tenant=slug`
- API base URL includes tenant context (subdomain or header)
- Superadmin: tenant switcher to view/manage different tenants

### 6.2 Public Portal

- **URL**: `{slug}.dcms.couteret.fr` or `dcms.couteret.fr/{slug}`
- Customer registration/login scoped to tenant

---

## 7. ZBOX / K8s Routing

### 7.1 Ingress (Multi-Tenant)

```yaml
# Wildcard subdomain
- host: "*.dcms.couteret.fr"
- host: "*.admin.couteret.fr"
- host: "*.api.couteret.fr"
```

Or explicit per-tenant:
```yaml
- host: "deepblue.dcms.couteret.fr"
- host: "admin.deepblue.dcms.couteret.fr"
- host: "api.deepblue.dcms.couteret.fr"
```

All route to the same backend/public/admin services. Tenant resolution happens in-app from Host header.

### 7.2 DNS

- `*.dcms.couteret.fr` → ZBOX IP (wildcard A)
- `*.admin.couteret.fr` → ZBOX IP
- `*.api.couteret.fr` → ZBOX IP

---

## 8. Migration Strategy

### 8.1 Phase 1: Schema + Default Tenant ✅

1. Create `tenants` table
2. Add `tenant_id` to all tenant-scoped tables (nullable initially)
3. Create default tenant (e.g. slug `default`)
4. Migration: `database/migrations/011_add_multi_tenant.sql`, `backend/scripts/migrations/011_add_multi_tenant.sql`
5. Applied automatically when `tenants` table missing (docker-entrypoint)

### 8.2 Phase 2: Backend Tenant Context ✅ (partial)

1. TenantInterceptor – resolves tenant from X-Tenant-ID, X-Tenant-Slug, or Host subdomain
2. TenantContextService – request-scoped, provides `getTenantId()` / `getTenantSlug()`
3. JWT with tenantId – AuthService, JwtAdminStrategy, login returns `{ user, access_token }`
4. UsersService – login checks tenant, issues JWT with tenantId
5. LocationsService – filters by tenant; create assigns tenant_id (example pattern)
6. Remaining services – apply same pattern (Customers, Partners, etc.)

### 8.3 Phase 3: Frontend + Routing ✅

1. Ingress wildcard hosts: `*.dcms`, `*.admin`, `*.api`.couteret.fr
2. apiConfig: API URL derived from hostname (admin→api, dcms→api)
3. tenantContext.js: getTenantSlug from subdomain / user / localStorage
4. httpClient: adds X-Tenant-Slug header on every request
5. authContext: login stores tenantSlug; logout clears tenant

### 8.4 Phase 4: Tenant Management ✅ (partial)

1. Tenants CRUD: GET list, GET by id/slug, POST create, PUT update
2. Tenant filtering: Locations, Customers, Partners, Bookings services
3. Superadmin tenant switcher: use setTenantSlug() + dcms_tenant_slug

---

## 9. Rollback

- Keep migrations reversible where possible
- Feature flag for multi-tenant mode (fallback to single-tenant if slug/default)

---

## 10. Security Checklist

- [ ] No cross-tenant data leakage (every query has tenant filter)
- [ ] Superadmin explicitly allowed for cross-tenant
- [ ] Partner API: partner belongs to tenant; bookings/customers scoped
- [ ] Audit logs include tenant_id
- [ ] RLS (row-level security) as optional hardening layer
