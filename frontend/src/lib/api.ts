import type { DiveSite } from '@/types/dive-site';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function get<T>(path: string, locale: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Accept: 'application/json', 'Accept-Language': locale },
    cache: 'no-store',
  });
  if (!res.ok) throw new ApiError(res.status, `GET ${path} failed with ${res.status}`);
  return res.json() as Promise<T>;
}

export function getDiveSites(
  locale: string,
  filters: { requiredCertLevel?: number; difficultyLevel?: number } = {},
): Promise<DiveSite[]> {
  const params = new URLSearchParams();
  if (filters.requiredCertLevel !== undefined) {
    params.set('requiredCertLevel', String(filters.requiredCertLevel));
  }
  if (filters.difficultyLevel !== undefined) {
    params.set('difficultyLevel', String(filters.difficultyLevel));
  }
  const query = params.size > 0 ? `?${params}` : '';
  return get<DiveSite[]>(`/dive-sites${query}`, locale);
}
