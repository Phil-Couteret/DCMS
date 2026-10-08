import type { DefaultSession } from "next-auth";

// tenantId/tenantSlug/tenantName: the center the session is for, null in the
// superadmin console (role SUPERADMIN) and for partner sessions.
interface CenterFields {
  tenantId?: string | null;
  tenantSlug?: string | null;
  tenantName?: string | null;
  isSuperadmin?: boolean;
  // The account has another center, or the console, to switch to.
  canSwitchCenter?: boolean;
  // The center's IANA time zone and ISO 4217 currency.
  timeZone?: string;
  currency?: string;
}

declare module "next-auth" {
  interface User extends CenterFields {
    role: string;
    accessToken: string;
  }
  interface Session {
    accessToken: string;
    user: { id: string; role: string } & Required<CenterFields> & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT extends CenterFields {
    role: string;
    accessToken: string;
    refreshedAt?: number;
  }
}
