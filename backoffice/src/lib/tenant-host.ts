// The backoffice's addresses (TENANT_DOMAIN, e.g. admin.couteret.fr):
// - {slug}.<domain>: one center's backoffice. Sign-in is for that center,
//   and a session for another center is sent to that center's address.
// - <domain> itself: the platform address (superadmin console; staff may
//   choose any of their centers there).
// - any other host (localhost, an IP address, or TENANT_DOMAIN unset): no
//   center from the host, as before (development).
// Session cookies are host-only, so each address keeps its own sign-in.

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function domain() {
  return (process.env.TENANT_DOMAIN ?? "").trim().toLowerCase().replace(/^\.+/, "");
}

function hostname(host: string | null | undefined) {
  return (host ?? "").trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

export type HostKind = { kind: "center"; slug: string } | { kind: "platform" } | { kind: "other" };

export function hostKind(host: string | null | undefined): HostKind {
  const d = domain();
  const name = hostname(host);
  if (!d) return { kind: "other" };
  if (name === d) return { kind: "platform" };
  if (name.endsWith(`.${d}`)) {
    const label = name.slice(0, -(d.length + 1));
    if (SLUG.test(label)) return { kind: "center", slug: label };
  }
  return { kind: "other" };
}

export function hostSlug(host: string | null | undefined) {
  const k = hostKind(host);
  return k.kind === "center" ? k.slug : null;
}

// The address of a center's backoffice (slug), or of the platform (null),
// with the protocol and port the visitor is using.
export function backofficeOrigin(headers: Headers, fallbackProtocol: string, slug: string | null) {
  const proto = headers.get("x-forwarded-proto")?.split(",")[0] ?? fallbackProtocol.replace(/:$/, "");
  const port = (requestHost(headers) ?? "").match(/:(\d+)$/)?.[1];
  return `${proto}://${slug ? `${slug}.${domain()}` : domain()}${port ? `:${port}` : ""}`;
}

// The host the visitor used (X-Forwarded-Host behind a reverse proxy).
export function requestHost(headers: Headers) {
  return headers.get("x-forwarded-host")?.split(",")[0] ?? headers.get("host");
}
