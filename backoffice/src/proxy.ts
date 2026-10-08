import { NextResponse } from "next/server";
import { auth, PARTNER_ROLE } from "@/auth";

// Next.js 16 renamed the middleware file convention to proxy. Staff pages need
// a staff session and the partner portal (/partner) a partner session; each
// login page sends a signed-in visitor to their own home instead.
export default auth((req) => {
  const path = req.nextUrl.pathname;
  const role = req.auth?.user?.role;
  const partner = role === PARTNER_ROLE;
  const to = (target: string) => NextResponse.redirect(new URL(target, req.nextUrl));

  if (path === "/partner" || path.startsWith("/partner/")) {
    if (path === "/partner/login") return req.auth ? to(partner ? "/partner" : "/dashboard") : undefined;
    if (!req.auth) return to("/partner/login");
    if (!partner) return to("/dashboard");
    return;
  }

  const isLogin = path === "/login";
  if (partner) return to("/partner");
  if (!req.auth && !isLogin) return to("/login");
  if (req.auth && isLogin) return to("/dashboard");
});

export const config = {
  // Skips the Auth.js endpoints, Next.js internals and files with an extension.
  matcher: ["/((?!api/auth|_next/static|_next/image|.*\\..*).*)"],
};
