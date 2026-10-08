import { NextResponse } from "next/server";
import { auth, PARTNER_ROLE, STAFF_ROLES, SUPERADMIN_ROLE } from "@/auth";

// Next.js 16 renamed the middleware file convention to proxy. Staff pages need
// a staff session for a center, the superadmin console (/superadmin) a
// superadmin, and the partner portal (/partner) a partner session; each login
// page sends a signed-in visitor to their own home instead.
export default auth((req) => {
  const path = req.nextUrl.pathname;
  const user = req.auth?.user;
  const role = user?.role;
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
  // Staff signed in to a center, or a superadmin in the console (no center).
  const staff = STAFF_ROLES.includes(role ?? "");
  const platform = role === SUPERADMIN_ROLE && user?.isSuperadmin === true;
  const home = platform ? "/superadmin" : "/dashboard";

  if (path === "/superadmin" || path.startsWith("/superadmin/")) {
    if (!req.auth) return to("/login");
    // Re-checked by the API on every call; this only keeps others out of the pages.
    if (!user?.isSuperadmin) return to(staff ? "/dashboard" : "/login");
    return;
  }

  // Only staff and superadmins get past the login page. A session with any
  // other role (one from before this check existed) stays on it, free to
  // sign in as staff.
  if (isLogin) return staff || platform ? to(home) : undefined;
  if (path === "/select-center") return staff || platform ? undefined : to("/login");
  if (platform) return to("/superadmin");
  if (!staff) return to(req.auth ? "/login?error=not_staff" : "/login");
});

export const config = {
  // Skips the Auth.js endpoints, Next.js internals and files with an extension.
  matcher: ["/((?!api/auth|_next/static|_next/image|.*\\..*).*)"],
};
