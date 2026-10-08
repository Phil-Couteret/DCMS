import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { hostSlug, requestHost } from "@/lib/tenant-host";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Matches the backend JWT, which expires after one day (JWT_EXPIRES_IN).
const ONE_DAY = 24 * 60 * 60;

export interface CenterChoice {
  id: string;
  slug: string;
  name: string;
  role: string;
  member: boolean;
}

// POST /auth/login, /auth/select-tenant and /auth/switch-tenant. A login
// with several centers answers the second shape instead of a token.
export type LoginReply =
  | { accessToken: string; user: { role: string } }
  | { requiresTenantSelection: true; selectionToken: string; tenants: CenterChoice[]; platform: boolean };

interface MeResponse {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isSuperadmin: boolean;
  tenant: { id: string; slug: string; name: string; timeZone: string; currency: string } | null;
}

interface PartnerLoginResponse {
  partner: { id: string; name: string; contactEmail: string };
  center: CenterLocale & { name: string; slug: string | null };
  accessToken: string;
}

// The center's time zone and currency, which every date and amount is shown
// in. Used until a session has its own (and outside any center).
export interface CenterLocale {
  timeZone: string;
  currency: string;
}
export const DEFAULT_LOCALE: CenterLocale = { timeZone: "Atlantic/Canary", currency: "EUR" };

// How often a session re-reads its center's name, time zone and currency, so
// a change made in Settings reaches every signed-in user.
const REFRESH_MS = 5 * 60 * 1000;

// The role given to partner portal sessions. Staff roles come from the API.
export const PARTNER_ROLE = "PARTNER";

// A superadmin in the platform console, with no center.
export const SUPERADMIN_ROLE = "SUPERADMIN";

// Roles in a center that may use the backoffice. Customers sign in on the
// public site.
export const STAFF_ROLES = ["ADMIN", "INSTRUCTOR"];

// Shown on the login page instead of "Invalid credentials".
class NotStaffSignin extends CredentialsSignin {
  code = "not_staff";
}

// The account works at several centers: the login page asks which.
class SelectCenterSignin extends CredentialsSignin {
  code = "select_center";
}

export function canUseBackoffice(role: string | undefined) {
  return STAFF_ROLES.includes(role ?? "") || role === SUPERADMIN_ROLE;
}

// tenantSlug: the center the request is for (the backoffice's address),
// sent as X-Tenant-Slug.
export async function apiPost<T>(path: string, body: unknown, accessToken?: string, tenantSlug?: string | null) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(tenantSlug ? { "X-Tenant-Slug": tenantSlug } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  }).catch(() => null);
  if (!res) return { ok: false as const, status: 0, message: "The server could not be reached" };
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    return { ok: false as const, status: res.status, message: (message as string | undefined) ?? "Request failed" };
  }
  return { ok: true as const, data: data as T };
}

async function apiGet<T>(path: string, accessToken: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  }).catch(() => null);
  return res?.ok ? ((await res.json()) as T) : null;
}

// The session user for an API token: who it is, which center it is for,
// and whether the account has other centers (or the console) to switch to.
async function sessionUser(accessToken: string) {
  const me = await apiGet<MeResponse>("/auth/me", accessToken);
  if (!me) throw new CredentialsSignin();
  if (!canUseBackoffice(me.role)) throw new NotStaffSignin();
  const choices = await apiGet<{ tenants: CenterChoice[]; platform: boolean }>("/auth/tenants", accessToken);
  const count = (choices?.tenants.length ?? 0) + (choices?.platform ? 1 : 0);
  return {
    id: me.id,
    email: me.email,
    name: me.name,
    role: me.role,
    accessToken,
    tenantId: me.tenant?.id ?? null,
    tenantSlug: me.tenant?.slug ?? null,
    tenantName: me.tenant?.name ?? null,
    timeZone: me.tenant?.timeZone ?? DEFAULT_LOCALE.timeZone,
    currency: me.tenant?.currency ?? DEFAULT_LOCALE.currency,
    isSuperadmin: me.isSuperadmin,
    canSwitchCenter: count > 1,
  };
}

// The session cookie is host-only (no cookie domain is ever set): a session
// on one center's address ({slug}.<TENANT_DOMAIN>) is never sent to another.
export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  session: { strategy: "jwt", maxAge: ONE_DAY },
  // Auth.js v5 rejects every request under `next start` unless the host is
  // trusted. NEXTAUTH_URL pins the URL it builds, so trusting the host header
  // does not let a request choose it.
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      // Runs on the server: the browser never talks to the API for login.
      // The login page uses the "token" provider instead (see
      // lib/centers.ts), which can also ask "which center?"; this one signs
      // in only accounts with a single choice, or for the center of the
      // address it is used on.
      async authorize(credentials, request) {
        const reply = await apiPost<LoginReply>(
          "/auth/login",
          { email: credentials.email, password: credentials.password },
          undefined,
          hostSlug(requestHost(request.headers)),
        );
        if (!reply.ok) throw new CredentialsSignin();
        if ("requiresTenantSelection" in reply.data) throw new SelectCenterSignin();
        return sessionUser(reply.data.accessToken);
      },
    }),
    // A token the server already obtained from the API (login with a chosen
    // center, switch center). Only server actions call it, but anyone who
    // already holds a valid API token could: that gives them nothing their
    // token does not, since the session is the token.
    Credentials({
      id: "token",
      credentials: { accessToken: { type: "text" } },
      async authorize(credentials) {
        const accessToken = String(credentials.accessToken ?? "");
        if (!accessToken) throw new CredentialsSignin();
        return sessionUser(accessToken);
      },
    }),
    // Partner portal: the contact email or the API key, with the API secret.
    // A browser holds one session, staff or partner, never both.
    Credentials({
      id: "partner",
      credentials: {
        identifier: { type: "text" },
        apiSecret: { type: "password" },
      },
      // A contact email is unique only within a center: the center comes from
      // the address (or DEFAULT_TENANT_SLUG, in development). An API key names
      // its center by itself.
      async authorize(credentials, request) {
        const identifier = String(credentials.identifier ?? "").trim();
        const body = identifier.includes("@") ? { email: identifier } : { apiKey: identifier };
        const slug = hostSlug(requestHost(request.headers)) ?? (process.env.DEFAULT_TENANT_SLUG || null);
        const res = await fetch(`${API_URL}/partner-auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(slug ? { "X-Tenant-Slug": slug } : {}) },
          body: JSON.stringify({ ...body, apiSecret: credentials.apiSecret }),
          cache: "no-store",
        }).catch(() => null);
        if (!res?.ok) throw new CredentialsSignin();

        const { partner, center, accessToken } = (await res.json()) as PartnerLoginResponse;
        return {
          id: partner.id,
          email: partner.contactEmail,
          name: partner.name,
          role: PARTNER_ROLE,
          accessToken,
          tenantName: center.name,
          tenantSlug: center.slug,
          timeZone: center.timeZone,
          currency: center.currency,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (!user && (trigger === "update" || Date.now() - (token.refreshedAt ?? 0) > REFRESH_MS)) {
        await refresh(token);
      }
      if (user) {
        token.refreshedAt = Date.now();
        token.timeZone = user.timeZone;
        token.currency = user.currency;
        token.role = user.role;
        token.accessToken = user.accessToken;
        token.tenantId = user.tenantId ?? null;
        token.tenantSlug = user.tenantSlug ?? null;
        token.tenantName = user.tenantName ?? null;
        token.isSuperadmin = user.isSuperadmin ?? false;
        token.canSwitchCenter = user.canSwitchCenter ?? false;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role;
      session.user.tenantId = token.tenantId ?? null;
      session.user.tenantSlug = token.tenantSlug ?? null;
      session.user.tenantName = token.tenantName ?? null;
      session.user.isSuperadmin = token.isSuperadmin ?? false;
      session.user.canSwitchCenter = token.canSwitchCenter ?? false;
      session.user.timeZone = token.timeZone ?? DEFAULT_LOCALE.timeZone;
      session.user.currency = token.currency ?? DEFAULT_LOCALE.currency;
      session.accessToken = token.accessToken;
      return session;
    },
  },
});

// Re-reads the center's name, time zone and currency into a session token.
// A failed read keeps the old values: the API decides on access, not this.
async function refresh(token: { accessToken: string; role: string; refreshedAt?: number } & Record<string, unknown>) {
  token.refreshedAt = Date.now();
  if (!token.accessToken) return;
  if (token.role === PARTNER_ROLE) {
    const me = await apiGet<{ center: CenterLocale & { name: string } }>("/partner/me", token.accessToken);
    if (me) Object.assign(token, { tenantName: me.center.name, timeZone: me.center.timeZone, currency: me.center.currency });
    return;
  }
  const me = await apiGet<MeResponse>("/auth/me", token.accessToken);
  if (me?.tenant) {
    Object.assign(token, { tenantName: me.tenant.name, timeZone: me.tenant.timeZone, currency: me.tenant.currency });
  }
}
