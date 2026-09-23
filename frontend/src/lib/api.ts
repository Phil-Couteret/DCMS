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

export interface GuestBookingRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  language: string;
  activityType: string;
  timeSlot: string;
  date: string;
  participantCount: number;
  certificationLevel?: string;
  selectedEquipment?: string[];
  totalPrice?: number;
}

export type GuestBookingResult =
  | { ok: true; bookingId: string; reference: string }
  | { ok: false; status: number };

// Runs in the browser. Network failures come back as status 0.
export async function createGuestBooking(body: GuestBookingRequest): Promise<GuestBookingResult> {
  try {
    const res = await fetch(`${API_URL}/bookings/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const data = (await res.json()) as { bookingId: string; reference: string };
    return { ok: true, ...data };
  } catch {
    return { ok: false, status: 0 };
  }
}
