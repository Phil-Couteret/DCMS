import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

// The API's origin, which the browser calls for guest bookings (baked in at
// build time, like NEXT_PUBLIC_API_URL itself).
const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? '').origin;
  } catch {
    return '';
  }
})();

// Security headers on every response. The content security policy applies to
// production builds only: the dev server needs eval and its own websocket.
// Next.js injects inline scripts and styles, hence 'unsafe-inline'. Images
// may come from any https host: each center's logo URL is its own.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ''}`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Ignored by browsers over plain http; the deployment serves https.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  ...(process.env.NODE_ENV === 'production' ? [{ key: 'Content-Security-Policy', value: CSP }] : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // A self-contained server (.next/standalone) for the Docker image.
  output: 'standalone',
  outputFileTracingRoot: import.meta.dirname,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  // The repo root holds another package-lock.json, so Next.js cannot infer
  // the project root on its own. Pin it to this folder.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default withNextIntl(nextConfig);
