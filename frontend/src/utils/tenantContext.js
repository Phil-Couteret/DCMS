/**
 * Tenant context for multi-tenant API calls.
 * Resolves tenant slug from: subdomain > user > localStorage.
 * Platform URLs (admin.couteret.fr, api.couteret.fr) return null for superadmin platform access.
 */
export const getTenantSlug = () => {
  if (typeof window === 'undefined') return null;

  const host = window.location.hostname;

  // Platform-level: admin.domain or api.domain (no tenant subdomain) → no tenant
  const parts = host.split('.');
  if (parts[0] === 'admin' || parts[0] === 'api') {
    return null;
  }

  // Tenant subdomain: {slug}.admin.couteret.fr or {slug}.api.couteret.fr
  const subdomainMatch = host.match(/^([a-z0-9-]+)\.(dcms|admin|api)\./i);
  if (subdomainMatch && subdomainMatch[1] && subdomainMatch[1] !== 'admin' && subdomainMatch[1] !== 'api') {
    return subdomainMatch[1];
  }

  // 2. User tenant (from login)
  try {
    const user = localStorage.getItem('dcms_current_user');
    if (user) {
      const u = JSON.parse(user);
      if (u.tenantSlug) return u.tenantSlug;
      if (u.tenant_id) return null; // Have ID but need slug - backend uses header
    }
  } catch (_) {}

  // 3. Explicit tenant selection (superadmin switcher)
  return localStorage.getItem('dcms_tenant_slug');
};

export const setTenantSlug = (slug) => {
  if (slug) {
    localStorage.setItem('dcms_tenant_slug', slug);
  } else {
    localStorage.removeItem('dcms_tenant_slug');
  }
};
