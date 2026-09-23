import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Next.js 16 renamed the middleware file convention to proxy. Every page
// except /login needs a session; signed-in users visiting /login go to the
// dashboard instead.
export default auth((req) => {
  const isLogin = req.nextUrl.pathname === "/login";
  if (!req.auth && !isLogin) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  if (req.auth && isLogin) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
});

export const config = {
  // Skips the Auth.js endpoints, Next.js internals and files with an extension.
  matcher: ["/((?!api/auth|_next/static|_next/image|.*\\..*).*)"],
};
