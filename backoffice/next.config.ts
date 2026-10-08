import type { NextConfig } from "next";

// Security headers on every response. The content security policy applies to
// production builds only: the dev server needs eval and its own websocket.
// Next.js injects inline scripts and styles, hence 'unsafe-inline'; images
// include data: URLs (dive log signatures). Nothing loads from elsewhere.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Ignored by browsers over plain http; the deployment serves https.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: CSP }] : []),
];

const nextConfig: NextConfig = {
  // A self-contained server (.next/standalone) for the Docker image.
  output: "standalone",
  outputFileTracingRoot: import.meta.dirname,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // The repo root holds another package-lock.json, so Next.js cannot infer
  // the project root on its own. Pin it to this folder.
  turbopack: {
    root: import.meta.dirname,
  },
  // The dev server is opened from the LAN address. Without this, Next.js
  // answers the browser's dev chunk requests with 403, the page never
  // hydrates, and the login form falls back to a native submit.
  allowedDevOrigins: ["192.168.1.5", "10.10.10.2", "10.10.10.1"],
};

export default nextConfig;
