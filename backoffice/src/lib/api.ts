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

export type StaffType = "GUIDE" | "TRAINER" | "CAPTAIN" | "ADMIN";
export type StaffStatus = "ACTIVE" | "INACTIVE";

export interface Staff {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  // Only sent to signed-in callers, which the backoffice always is.
  phone?: string;
  type: StaffType;
  status: StaffStatus;
  hireDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffQualification {
  id: string;
  staffId: string;
  type: string;
  agency: string;
  number: string;
  issueDate: string;
  expiryDate: string | null;
  createdAt: string;
}

export interface StaffAvailability {
  id: string;
  staffId: string;
  date: string;
  available: boolean;
  reason: string | null;
}

export interface StaffDetail extends Staff {
  qualifications: StaffQualification[];
  availability: StaffAvailability[];
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

export function getStaff(filters: { type?: string; status?: string } = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const query = params.size > 0 ? `?${params}` : "";
  return apiFetch<Staff[]>(`/staff${query}`);
}

export function getStaffMember(id: string) {
  return apiFetch<StaffDetail>(`/staff/${id}`);
}

export function updateStaffStatus(id: string, status: StaffStatus) {
  return apiFetch<Staff>(`/staff/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
}

// Creates or replaces the entry for that day. A missing reason clears the
// stored one.
export function setStaffAvailability(id: string, date: string, available: boolean, reason?: string) {
  return apiFetch<StaffAvailability>(`/staff/${id}/availability`, {
    method: "PUT",
    body: JSON.stringify({ date, available, ...(reason && { reason }) }),
  });
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

export type EquipmentStatus = "AVAILABLE" | "RENTED" | "MAINTENANCE" | "DECOMMISSIONED";
export type EquipmentCondition = "EXCELLENT" | "GOOD" | "FAIR" | "POOR";

export interface Equipment {
  id: string;
  type: string;
  brand: string;
  model: string | null;
  size: string | null;
  serialNumber: string | null;
  status: EquipmentStatus;
  condition: EquipmentCondition;
  purchaseDate: string;
  purchaseCost: string; // Decimal, sent as a string
  lastMaintenance: string | null;
  nextMaintenance: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceLog {
  id: string;
  equipmentId: string;
  date: string;
  technician: string;
  type: string;
  notes: string | null;
  cost: string | null; // Decimal, sent as a string
  createdAt: string;
}

export function getEquipment(filters: { type?: string; size?: string; status?: string } = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const query = params.size > 0 ? `?${params}` : "";
  return apiFetch<Equipment[]>(`/equipment${query}`);
}

export function getEquipmentItem(id: string) {
  return apiFetch<Equipment>(`/equipment/${id}`);
}

export function updateEquipment(
  id: string,
  data: Partial<Pick<Equipment, "status" | "condition" | "nextMaintenance">>,
) {
  return apiFetch<Equipment>(`/equipment/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function getMaintenanceLogs(id: string) {
  return apiFetch<MaintenanceLog[]>(`/equipment/${id}/maintenance`);
}

export function addMaintenanceLog(
  id: string,
  data: { date: string; technician: string; type: string; notes?: string; cost?: number },
) {
  return apiFetch<MaintenanceLog>(`/equipment/${id}/maintenance`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export type IncidentSeverity = "MINOR" | "MODERATE" | "SERIOUS" | "CRITICAL";

export interface DiveSiteOption {
  id: string;
  nameEn: string;
}

export interface Incident {
  id: string;
  diveLogId: string;
  type: string;
  severity: IncidentSeverity;
  description: string;
  actionsTaken: string;
  reportedToAuthorities: boolean;
  createdAt: string;
}

interface DiveLogBase {
  id: string;
  logNumber: string;
  bookingId: string;
  siteId: string;
  guideId: string | null;
  date: string;
  entryTime: string;
  exitTime: string;
  maxDepth: number;
  avgDepth: number | null;
  duration: number;
  visibility: number | null;
  waterTemp: number | null;
  weatherConditions: string | null;
  seaConditions: string | null;
  airStartBar: number | null;
  airEndBar: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  site: { id: string; nameEn: string };
  guide: { id: string; firstName: string; lastName: string } | null;
}

export interface DiveLogListItem extends DiveLogBase {
  _count: { participants: number; signatures: number };
  incident: Pick<Incident, "id" | "type" | "severity"> | null;
}

export interface DiveLogDetail extends DiveLogBase {
  booking: { id: string; activityType: string; timeSlot: TimeSlot; status: BookingStatus };
  participants: {
    id: string;
    customerId: string;
    role: string;
    customer: { id: string; firstName: string; lastName: string };
  }[];
  signatures: { id: string; signerType: string; signerId: string; signerName: string; signedAt: string }[];
  incident: Incident | null;
}

export interface CreateDiveLogData {
  bookingId: string;
  siteId: string;
  guideId?: string;
  date: string;
  entryTime: string;
  exitTime: string;
  maxDepth: number;
  duration: number;
  avgDepth?: number;
  visibility?: number;
  waterTemp?: number;
  weatherConditions?: string;
  seaConditions?: string;
  airStartBar?: number;
  airEndBar?: number;
  notes?: string;
}

export interface SignatureData {
  signerType: string;
  signerId: string;
  signerName: string;
  signatureData: string;
}

export interface IncidentData {
  type: string;
  severity: IncidentSeverity;
  description: string;
  actionsTaken: string;
  reportedToAuthorities?: boolean;
}

export function getDiveSites() {
  return apiFetch<DiveSiteOption[]>("/dive-sites");
}

export function getDiveLogs(filters: { date?: string; siteId?: string; guideId?: string } = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const query = params.size > 0 ? `?${params}` : "";
  return apiFetch<DiveLogListItem[]>(`/dive-logs${query}`);
}

export function getDiveLog(id: string) {
  return apiFetch<DiveLogDetail>(`/dive-logs/${id}`);
}

export function createDiveLog(data: CreateDiveLogData) {
  return apiFetch<DiveLogDetail>("/dive-logs", { method: "POST", body: JSON.stringify(data) });
}

export function addParticipant(logId: string, customerId: string, role: string) {
  return apiFetch(`/dive-logs/${logId}/participants`, {
    method: "POST",
    body: JSON.stringify({ customerId, role }),
  });
}

export function addSignature(logId: string, data: SignatureData) {
  return apiFetch(`/dive-logs/${logId}/signatures`, { method: "POST", body: JSON.stringify(data) });
}

export function reportIncident(logId: string, data: IncidentData) {
  return apiFetch<Incident>(`/dive-logs/${logId}/incident`, { method: "POST", body: JSON.stringify(data) });
}
