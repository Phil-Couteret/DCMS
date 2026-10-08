import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

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
  tenant: { id: string; slug: string; name: string } | null;
}

interface PartnerLoginResponse {
  partner: { id: string; name: string; contactEmail: string };
  accessToken: string;
}

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

export async function apiPost<T>(path: string, body: unknown, accessToken?: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
    isSuperadmin: me.isSuperadmin,
    canSwitchCenter: count > 1,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
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
      // app/login/actions.ts), which can also ask "which center?"; this one
      // signs in only accounts with a single choice.
      async authorize(credentials) {
        const reply = await apiPost<LoginReply>("/auth/login", {
          email: credentials.email,
          password: credentials.password,
        });
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
      async authorize(credentials) {
        const identifier = String(credentials.identifier ?? "").trim();
        const body = identifier.includes("@") ? { email: identifier } : { apiKey: identifier };
        const res = await fetch(`${API_URL}/partner-auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, apiSecret: credentials.apiSecret }),
          cache: "no-store",
        }).catch(() => null);
        if (!res?.ok) throw new CredentialsSignin();

        const { partner, accessToken } = (await res.json()) as PartnerLoginResponse;
        return { id: partner.id, email: partner.contactEmail, name: partner.name, role: PARTNER_ROLE, accessToken };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
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
      session.accessToken = token.accessToken;
      return session;
    },
  },
});
