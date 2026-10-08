import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { requestHost, slugFromHost } from './lib/tenant-host';

const intl = createMiddleware(routing);

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const CACHE_MS = 60_000;
const known = new Map<string, { exists: boolean; at: number }>();

// Whether the API knows an active center with this slug. Cached for a
// minute. If the API cannot be reached, the request goes on: the pages show
// their own "unavailable" messages rather than a misleading 404.
async function centerExists(slug: string) {
  const hit = known.get(slug);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.exists;
  try {
    const res = await fetch(`${API_URL}/center`, { headers: { 'X-Tenant-Slug': slug }, cache: 'no-store' });
    if (res.status >= 500) return true;
    const exists = res.ok;
    known.set(slug, { exists, at: Date.now() });
    return exists;
  } catch {
    return true;
  }
}

const NOT_FOUND = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Not found</title></head>
<body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px;background:#f8fafc;color:#0f172a">
<main style="text-align:center"><h1 style="font-size:1.5rem">No dive center here</h1><p style="color:#475569">This address does not belong to a dive center on the platform.</p></main></body></html>`;

// Next.js 16 renamed the middleware file convention to proxy. Each center's
// site is its own subdomain ({slug}.<TENANT_DOMAIN>): a host that names no
// active center gets 404 before anything else runs; the others go on to the
// locale routing.
export default async function proxy(req: NextRequest) {
  const slug = slugFromHost(requestHost(req.headers));
  if (!slug || !(await centerExists(slug))) {
    return new NextResponse(NOT_FOUND, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  return intl(req);
}

export const config = {
  // Every path except API routes, Next.js internals and files with an extension.
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
