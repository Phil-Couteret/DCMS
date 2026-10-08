// Browser-side API calls. Server-side ones are in server-api.ts.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface GuestBookingRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  language: string;
  activityType: string;
  siteId?: string;
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

// Runs in the browser, for the center whose site this is (tenantSlug, from
// the server; the API also checks it against the page's origin). Network
// failures come back as status 0.
export async function createGuestBooking(tenantSlug: string, body: GuestBookingRequest): Promise<GuestBookingResult> {
  try {
    const res = await fetch(`${API_URL}/bookings/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Tenant-Slug': tenantSlug },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const data = (await res.json()) as { bookingId: string; reference: string };
    return { ok: true, ...data };
  } catch {
    return { ok: false, status: 0 };
  }
}
