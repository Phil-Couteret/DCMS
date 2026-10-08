import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Matches the backend JWT, which expires after one day (JWT_EXPIRES_IN).
const ONE_DAY = 24 * 60 * 60;

interface LoginResponse {
  user: { id: string; email: string; name: string | null; role: string };
  accessToken: string;
}

interface PartnerLoginResponse {
  partner: { id: string; name: string; contactEmail: string };
  accessToken: string;
}

// The role given to partner portal sessions. Staff roles come from the API.
export const PARTNER_ROLE = "PARTNER";

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
      async authorize(credentials) {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          cache: "no-store",
        }).catch(() => null);
        if (!res?.ok) throw new CredentialsSignin();

        const { user, accessToken } = (await res.json()) as LoginResponse;
        return { id: user.id, email: user.email, name: user.name, role: user.role, accessToken };
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
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role;
      session.accessToken = token.accessToken;
      return session;
    },
  },
});
