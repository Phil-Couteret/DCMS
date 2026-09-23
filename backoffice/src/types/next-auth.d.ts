import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    accessToken: string;
  }
  interface Session {
    accessToken: string;
    user: { id: string; role: string } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: string;
    accessToken: string;
  }
}
