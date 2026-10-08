// Which center a request is for, from its host: {slug}.<TENANT_DOMAIN>
// (e.g. deepblue.dcms.couteret.fr). A host that is not a center subdomain
// (localhost, an IP address) uses DEFAULT_TENANT_SLUG when it is set, for
// development; otherwise it has no center and the site answers 404.
// Shared by the proxy and server code; no Next.js imports.

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function slugFromHost(host: string | null | undefined): string | null {
  const domain = (process.env.TENANT_DOMAIN ?? "").trim().toLowerCase().replace(/^\.+/, "");
  const name = (host ?? "").trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  if (domain && name.endsWith(`.${domain}`)) {
    const label = name.slice(0, -(domain.length + 1));
    return SLUG.test(label) ? label : null;
  }
  const fallback = (process.env.DEFAULT_TENANT_SLUG ?? "").trim().toLowerCase();
  return fallback && SLUG.test(fallback) ? fallback : null;
}

// The host the visitor used: the proxy in front of Next.js passes it as
// X-Forwarded-Host.
export function requestHost(headers: Headers) {
  return headers.get("x-forwarded-host")?.split(",")[0] ?? headers.get("host");
}
