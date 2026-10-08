// Tenants are named by subdomain: {slug}.<domain> for each domain in
// TENANT_DOMAINS (comma-separated, e.g. "dcms.couteret.fr,admin.couteret.fr":
// the public sites and the backoffices). Read at call time so tests and
// deployments can set it.
export function tenantDomains(): string[] {
  return (process.env.TENANT_DOMAINS ?? '')
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^\.+/, ''))
    .filter(Boolean);
}

// A tenant slug is a DNS label (the superadmin console enforces the same).
const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function isSlug(value: string) {
  return SLUG.test(value);
}

// The slug a host names ("deepblue.dcms.couteret.fr:443" → "deepblue"), or
// null when the host is not one level below a tenant domain.
export function slugFromHost(host: string | undefined): string | null {
  if (!host) return null;
  const name = host.trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
  for (const domain of tenantDomains()) {
    if (!name.endsWith(`.${domain}`)) continue;
    const label = name.slice(0, -(domain.length + 1));
    if (isSlug(label)) return label;
  }
  return null;
}

// The slug an Origin header names ("https://deepblue.dcms.couteret.fr").
export function slugFromOrigin(origin: string | undefined): string | null {
  if (!origin) return null;
  try {
    return slugFromHost(new URL(origin).host);
  } catch {
    return null;
  }
}

// The API's CORS options (main.ts): the fixed origins and every tenant site.
export function corsOptions(fixed: string[]) {
  return {
    origin: (origin: string | undefined, done: (err: Error | null, allow?: boolean) => void) =>
      done(null, corsOriginAllowed(origin, fixed)),
    credentials: true,
  };
}

// CORS: the configured origins, plus any tenant subdomain over https (and
// http, for local test domains such as dcms.localhost).
export function corsOriginAllowed(origin: string | undefined, fixed: string[]) {
  if (!origin) return true; // same-origin and server-to-server requests
  if (fixed.includes(origin)) return true;
  try {
    const url = new URL(origin);
    return (url.protocol === 'https:' || url.hostname.endsWith('.localhost')) && slugFromHost(url.host) !== null;
  } catch {
    return false;
  }
}
