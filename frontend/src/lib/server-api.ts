import { cache } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Prices } from "@/lib/booking-catalog";
import { requestHost, slugFromHost } from "@/lib/tenant-host";
import type { DiveSite } from "@/types/dive-site";

// Server-side API calls, for the center the request's host names. The API
// is told which center with X-Tenant-Slug; the proxy has already answered
// 404 for a host that names no active center.
const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// The request's center slug.
export const tenantSlug = cache(async () => {
  const slug = slugFromHost(requestHost(await headers()));
  if (!slug) notFound();
  return slug;
});

async function get<T>(path: string, locale?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      Accept: "application/json",
      "X-Tenant-Slug": await tenantSlug(),
      ...(locale && { "Accept-Language": locale }),
    },
    cache: "no-store",
  });
  if (res.status === 404 && path === "/center") notFound();
  if (!res.ok) throw new ApiError(res.status, `GET ${path} failed with ${res.status}`);
  return res.json() as Promise<T>;
}

// The center's public details: name, branding and regional settings.
export interface Center {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  timeZone: string;
  currency: string;
  defaultLanguage: string;
  logoUrl: string | null;
  primaryColor: string | null; // #rrggbb
  accentColor: string | null;
}

// Once per request: the layout, the navbar and the pages all use it.
export const getCenter = cache(() => get<Center>("/center"));

export function getDiveSites(
  locale: string,
  filters: { requiredCertLevel?: number; difficultyLevel?: number } = {},
): Promise<DiveSite[]> {
  const params = new URLSearchParams();
  if (filters.requiredCertLevel !== undefined) params.set("requiredCertLevel", String(filters.requiredCertLevel));
  if (filters.difficultyLevel !== undefined) params.set("difficultyLevel", String(filters.difficultyLevel));
  const query = params.size > 0 ? `?${params}` : "";
  return get<DiveSite[]>(`/dive-sites${query}`, locale);
}

// The current price list, net of tax. Not cached: a price changed in the
// backoffice shows at once.
export function getPrices(locale: string): Promise<Prices> {
  return get<Prices>("/pricing", locale);
}
