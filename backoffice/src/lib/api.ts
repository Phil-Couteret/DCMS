import { auth } from "@/auth";
import { centerNow } from "@/lib/center-time";

// Server-side only: auth() reads the session from the request cookies.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type TimeSlot = "MORNING" | "AFTERNOON";

export interface Booking {
  id: string;
  customerId: string;
  boatId: string;
  siteId: string | null;
  activityType: string;
  date: string;
  timeSlot: TimeSlot;
  status: BookingStatus;
  participantCount: number;
  bookingSource: string;
  notes: string | null;
  createdAt: string;
  customer: { id: string; firstName: string; lastName: string };
  boat: { id: string; name: string; capacity: number };
  site: { id: string; nameEn: string } | null;
}

export type Language = "EN" | "ES" | "DE" | "FR";

export interface Customer {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  country: string;
  language: Language;
  birthdate: string | null;
  emergencyContact: unknown;
  loyaltyPoints: number;
  totalDives: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiveHistoryEntry {
  diveLogId: string;
  logNumber: string;
  date: string;
  siteId: string;
  siteName: string;
  maxDepth: number;
  duration: number;
  role: string;
}

export interface Boat {
  id: string;
  name: string;
  capacity: number;
  status: string;
}

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  type: "GUIDE" | "TRAINER" | "CAPTAIN" | "ADMIN";
  status: "ACTIVE" | "INACTIVE";
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = await auth();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    throw new ApiError(res.status, message ?? `${init.method ?? "GET"} ${path} failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getBookings(
  filters: { status?: string; date?: string; boatId?: string; customerId?: string } = {},
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const query = params.size > 0 ? `?${params}` : "";
  return apiFetch<Booking[]>(`/bookings${query}`);
}

export function getTodayBookings() {
  return getBookings({ date: centerNow().isoDate });
}

export function getBooking(id: string) {
  return apiFetch<Booking>(`/bookings/${id}`);
}

export function updateBookingStatus(id: string, status: BookingStatus) {
  return apiFetch<Booking>(`/bookings/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function getBoats() {
  return apiFetch<Boat[]>("/boats");
}

export function getStaff() {
  return apiFetch<Staff[]>("/staff");
}

export function checkInBooking(id: string) {
  return updateBookingStatus(id, "CONFIRMED");
}

export function getCustomers(filters: { country?: string; language?: string } = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const query = params.size > 0 ? `?${params}` : "";
  return apiFetch<Customer[]>(`/customers${query}`);
}

export function getCustomer(id: string) {
  return apiFetch<Customer>(`/customers/${id}`);
}

export function getCustomerDiveHistory(id: string) {
  return apiFetch<DiveHistoryEntry[]>(`/customers/${id}/dive-history`);
}
