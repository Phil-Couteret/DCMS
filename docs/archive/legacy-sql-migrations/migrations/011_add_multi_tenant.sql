-- Migration: Add multi-tenant support (tenants table + tenant_id on tenant-scoped tables)
-- Date: January 2026
-- Design: docs/MULTITENANT_DESIGN.md

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    domain VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);

-- 2. Add tenant_id to tenant-scoped tables (nullable for backward compat)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);

ALTER TABLE locations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_locations_tenant ON locations(tenant_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

ALTER TABLE partners ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_partners_tenant ON partners(tenant_id);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);

ALTER TABLE settings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_settings_tenant ON settings(tenant_id);

ALTER TABLE certification_agencies ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_certification_agencies_tenant ON certification_agencies(tenant_id);

ALTER TABLE government_bonos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_government_bonos_tenant ON government_bonos(tenant_id);

ALTER TABLE data_breaches ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_data_breaches_tenant ON data_breaches(tenant_id);

-- 3. Insert default tenant if none exists
INSERT INTO tenants (id, slug, name, is_active)
SELECT gen_random_uuid(), 'default', 'Default Tenant', true
WHERE NOT EXISTS (SELECT 1 FROM tenants LIMIT 1);

-- 4. Backfill existing rows with default tenant (optional - only if we want NOT NULL later)
-- UPDATE locations SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default') WHERE tenant_id IS NULL;
-- UPDATE users SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default') WHERE tenant_id IS NULL AND role != 'superadmin';
-- etc. - deferred to seed or Phase 2; keeping nullable for superadmin and gradual migration
