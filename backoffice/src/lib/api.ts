import { auth } from "@/auth";
import { centerLocale } from "@/lib/center";
import { centerNow } from "@/lib/center-time";

// Server-side only: auth() reads the session from the request cookies.
import { API_URL, forwardedFor } from "@/lib/forwarded";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type TimeSlot = "MORNING" | "AFTERNOON" | "NIGHT";

export interface Booking {
  id: string;
  customerId: string;
  boatId: string;
  siteId: string | null;
  tripId: string | null;
  activityType: string;
  date: string;
  timeSlot: TimeSlot;
  status: BookingStatus;
  participantCount: number;
  numberOfDives: number;
  bookingSource: string;
  notes: string | null;
  createdAt: string;
  customer: { id: string; firstName: string; lastName: string };
  boat: { id: string; name: string; capacity: number };
  site: { id: string; nameEn: string } | null;
  partnerId: string | null;
  partner: { id: string; name: string } | null;
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
  email: string; // the customer's account email
  gender: string | null;
  notes: string | null; // staff notes
  loyaltyPoints: number;
  totalDives: number;
  customerType: CustomerType;
  centerSkillLevel: SkillLevel | null;
  isApproved: boolean; // may book online
  medicalCertNumber: string | null;
  medicalCertExpiry: string | null;
  medicalCertVerifiedAt: string | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  insuranceExpiry: string | null;
  insuranceVerifiedAt: string | null;
  ownEquipment: boolean; // a full set of their own; the tank is always the center's
  tankSize: string | null;
  bcdSize: string | null;
  wetsuitSize: string | null;
  finsSize: string | null;
  bootsSize: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CustomerType = "TOURIST" | "LOCAL" | "RECURRENT";
export type SkillLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

export interface CustomerCertification {
  id: string;
  customerId: string;
  agency: string;
  level: string;
  cardNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null; // staff email
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
  registrationNumber: string;
  length: string | null; // Decimal, sent as a string
  engine: string | null;
  insuranceExpiry: string | null;
  lastServiceDate: string | null;
  nextServiceDate: string | null;
  locationId: string | null;
  location: LocationRef | null;
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

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = await auth();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...(await forwardedFor()),
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

export async function getTodayBookings() {
  const { timeZone } = await centerLocale();
  return getBookings({ date: centerNow(timeZone).isoDate });
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

// locationId: only that location's boats ("none": the unassigned ones).
export function getBoats(locationId?: string) {
  return apiFetch<Boat[]>(`/boats${locationId ? `?${new URLSearchParams({ locationId })}` : ""}`);
}

// Assigns a boat or dive site to a location (null: unassigned).
export function setResourceLocation(kind: "boat" | "site", id: string, locationId: string | null) {
  const path = kind === "boat" ? `/boats/${id}` : `/dive-sites/${id}`;
  return apiFetch<Boat | DiveSite>(path, { method: "PATCH", body: JSON.stringify({ locationId }) });
}

export type LocationType = "DIVING" | "BIKE" | "SURF" | "KITE";

export interface LocationRef {
  id: string;
  name: string;
}

export interface LocationAddress {
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface LocationContact {
  phone?: string;
  mobile?: string;
  email?: string;
  website?: string;
}

// A site the center operates from, with how many boats and dive sites are
// assigned to it.
export interface Location {
  id: string;
  name: string;
  type: LocationType;
  address: LocationAddress | null;
  contactInfo: LocationContact | null;
  isActive: boolean; // inactive ones are left out of selection lists
  boatCount: number;
  diveSiteCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocationData {
  name: string;
  type: LocationType;
  address: LocationAddress;
  contactInfo: LocationContact;
  isActive: boolean;
}

// active: only the locations offered in selection lists.
export function getLocations(active?: boolean) {
  return apiFetch<Location[]>(`/locations${active ? "?active=true" : ""}`);
}

export function createLocation(data: LocationData) {
  return apiFetch<Location>("/locations", { method: "POST", body: JSON.stringify(data) });
}

export function updateLocation(id: string, data: LocationData) {
  return apiFetch<Location>(`/locations/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteLocation(id: string) {
  return apiFetch<Location>(`/locations/${id}`, { method: "DELETE" });
}

export function getBoat(id: string) {
  return apiFetch<Boat>(`/boats/${id}`);
}

export interface BoatData {
  name: string;
  capacity: number;
  status: string;
  registrationNumber: string;
  // null clears the value on update.
  length?: number | null;
  engine?: string | null;
  insuranceExpiry?: string | null;
  lastServiceDate?: string | null;
  nextServiceDate?: string | null;
  locationId?: string | null; // null: not assigned
}

export function createBoat(data: BoatData) {
  return apiFetch<Boat>("/boats", { method: "POST", body: JSON.stringify(data) });
}

export function updateBoat(id: string, data: BoatData) {
  return apiFetch<Boat>(`/boats/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteBoat(id: string) {
  return apiFetch<Boat>(`/boats/${id}`, { method: "DELETE" });
}

export type UserRole = "ADMIN" | "INSTRUCTOR" | "CUSTOMER";

// A login account. staffId/customerId are its profiles; an account with one
// cannot be deleted.
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole; // the role in this center
  isActive: boolean; // false: staff access to this center suspended
  createdAt: string;
  updatedAt: string;
  staffId: string | null;
  customerId: string | null;
}

export function getUsers() {
  return apiFetch<User[]>("/users");
}

export function createUser(data: { email: string; password: string; name: string | null; role: UserRole }) {
  return apiFetch<User>("/users", { method: "POST", body: JSON.stringify(data) });
}

export function updateUser(id: string, data: { name: string | null; role?: UserRole; isActive?: boolean }) {
  return apiFetch<User>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteUser(id: string) {
  return apiFetch<User>(`/users/${id}`, { method: "DELETE" });
}

// Admin only: sets any user's password without the old one.
export function setUserPassword(id: string, password: string) {
  return apiFetch<{ ok: true }>(`/users/${id}/change-password`, { method: "POST", body: JSON.stringify({ password }) });
}

// The signed-in user's own password.
export function changeOwnPassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ ok: true }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export interface BookingData {
  customerId: string;
  boatId: string;
  siteId: string | null;
  activityType: string;
  date: string;
  timeSlot: TimeSlot;
  participantCount: number;
  numberOfDives: number; // at least 1; fun dives are billed per dive
  bookingSource: string;
  partnerId: string | null; // a partner makes the source PARTNER
  notes: string | null;
  status?: BookingStatus; // create only; later changes go through the status actions
}

export function createBooking(data: BookingData) {
  return apiFetch<Booking>("/bookings", { method: "POST", body: JSON.stringify(data) });
}

export function updateBooking(id: string, data: BookingData) {
  return apiFetch<Booking>(`/bookings/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

// The dashboard's figures (GET /dashboard/overview). revenue is null for
// non-admins. Amounts are decimal strings in the center's currency.
export interface DashboardOverview {
  currency: string;
  today: string;
  bookingsByActivity: { activityType: string; count: number }[];
  bookingsPeriod: { from: string; to: string };
  upcoming: {
    id: string;
    date: string;
    timeSlot: TimeSlot;
    activityType: string;
    participantCount: number;
    numberOfDives: number;
    status: BookingStatus;
    customer: { id: string; firstName: string; lastName: string };
    boat: { name: string };
  }[];
  revenue: { month: string; monthStart: string; trend: { date: string; amount: string }[] } | null;
}

export function getDashboardOverview() {
  return apiFetch<DashboardOverview>("/dashboard/overview");
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

export interface StaffData {
  firstName: string;
  lastName: string;
  phone: string;
  type: StaffType;
  status: StaffStatus;
  hireDate: string; // YYYY-MM-DD
}

// A staff profile for one of the center's accounts (Settings → Users).
export function createStaff(data: StaffData & { userId: string }) {
  return apiFetch<Staff>("/staff", { method: "POST", body: JSON.stringify(data) });
}

export function updateStaff(id: string, data: StaffData) {
  return apiFetch<Staff>(`/staff/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export interface QualificationData {
  type: string;
  agency: string;
  number: string;
  issueDate: string; // YYYY-MM-DD
  expiryDate: string | null; // null: no expiry
}

export function addQualification(staffId: string, data: QualificationData) {
  const { expiryDate, ...rest } = data;
  return apiFetch<StaffQualification>(`/staff/${staffId}/qualifications`, {
    method: "POST",
    body: JSON.stringify({ ...rest, ...(expiryDate && { expiryDate }) }),
  });
}

export function updateQualification(staffId: string, id: string, data: QualificationData) {
  return apiFetch<StaffQualification>(`/staff/${staffId}/qualifications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteQualification(staffId: string, id: string) {
  return apiFetch<StaffQualification>(`/staff/${staffId}/qualifications/${id}`, { method: "DELETE" });
}

export function updateStaffStatus(id: string, status: StaffStatus) {
  return apiFetch<Staff>(`/staff/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
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

export interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  country: string;
  language: Language;
  birthdate: string | null;
  // Left out, these keep their values (or the defaults, on create). Changing
  // the medical or insurance details clears their verification unless the
  // same request sets it.
  gender?: string | null;
  notes?: string | null;
  loyaltyPoints?: number;
  totalDives?: number;
  customerType?: CustomerType;
  centerSkillLevel?: SkillLevel | null;
  isApproved?: boolean;
  medicalCertNumber?: string | null;
  medicalCertExpiry?: string | null;
  medicalCertVerifiedAt?: string | null;
  insuranceProvider?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceExpiry?: string | null;
  insuranceVerifiedAt?: string | null;
  ownEquipment?: boolean;
  tankSize?: string | null;
  bcdSize?: string | null;
  wetsuitSize?: string | null;
  finsSize?: string | null;
  bootsSize?: string | null;
  emergencyContact: Record<string, unknown> | null;
}

// Finds or creates the customer's account by email.
export function createCustomer(data: CustomerData) {
  return apiFetch<Customer>("/customers", { method: "POST", body: JSON.stringify(data) });
}

export function updateCustomer(id: string, data: Partial<CustomerData>) {
  return apiFetch<Customer>(`/customers/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function getCustomerDiveHistory(id: string) {
  return apiFetch<DiveHistoryEntry[]>(`/customers/${id}/dive-history`);
}

export function getCustomerCertifications(customerId: string) {
  return apiFetch<CustomerCertification[]>(`/customers/${customerId}/certifications`);
}

export interface CertificationData {
  agency: string;
  level: string;
  cardNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
}

export function createCustomerCertification(customerId: string, data: CertificationData) {
  return apiFetch<CustomerCertification>(`/customers/${customerId}/certifications`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// verified: true records the signed-in staff member; false clears it.
export function updateCustomerCertification(
  customerId: string,
  certId: string,
  data: Partial<CertificationData> & { verified?: boolean },
) {
  return apiFetch<CustomerCertification>(`/customers/${customerId}/certifications/${certId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteCustomerCertification(customerId: string, certId: string) {
  return apiFetch<CustomerCertification>(`/customers/${customerId}/certifications/${certId}`, { method: "DELETE" });
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

export function updateEquipment(id: string, data: Partial<EquipmentData>) {
  return apiFetch<Equipment>(`/equipment/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

// The equipment form. null clears an optional field on update.
export interface EquipmentData {
  type: string;
  brand: string;
  model: string | null;
  size: string | null;
  serialNumber: string | null;
  status: EquipmentStatus;
  condition: EquipmentCondition;
  purchaseDate: string; // YYYY-MM-DD
  purchaseCost: number;
  lastMaintenance: string | null;
  nextMaintenance: string | null;
}

export function createEquipment(data: EquipmentData) {
  // A create leaves out what is not set rather than sending null.
  const body = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null));
  return apiFetch<Equipment>("/equipment", { method: "POST", body: JSON.stringify(body) });
}

export function deleteEquipment(id: string) {
  return apiFetch<Equipment>(`/equipment/${id}`, { method: "DELETE" });
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

export interface DiveSite extends DiveSiteOption {
  nameEs: string;
  nameDe: string;
  nameFr: string;
  descriptionEn: string;
  descriptionEs: string;
  descriptionDe: string;
  descriptionFr: string;
  latitude: string; // Decimal, sent as a string
  longitude: string;
  depthMin: number;
  depthMax: number;
  requiredCertLevel: number;
  difficultyLevel: number;
  typicalVisibility: number | null;
  typicalCurrent: string | null;
  waterTempRange: unknown;
  marineLife: unknown;
  pointsOfInterest: unknown;
  bestSeason: unknown;
  facilities: unknown;
  travelTimeMinutes: number;
  maxDiversPerTrip: number;
  accessibility: string | null;
  locationId: string | null;
  location: LocationRef | null;
}

export type DiveSiteData = Omit<DiveSite, "id" | "latitude" | "longitude" | "location"> & { latitude: number; longitude: number };

// locationId: only that location's sites ("none": the unassigned ones).
export function getDiveSites(locationId?: string) {
  return apiFetch<DiveSite[]>(`/dive-sites${locationId ? `?${new URLSearchParams({ locationId })}` : ""}`);
}

export function getDiveSite(id: string) {
  return apiFetch<DiveSite>(`/dive-sites/${id}`);
}

export function createDiveSite(data: DiveSiteData) {
  return apiFetch<DiveSite>("/dive-sites", { method: "POST", body: JSON.stringify(data) });
}

export function updateDiveSite(id: string, data: DiveSiteData) {
  return apiFetch<DiveSite>(`/dive-sites/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteDiveSite(id: string) {
  return apiFetch<DiveSite>(`/dive-sites/${id}`, { method: "DELETE" });
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

export type InvoiceStatus = "DRAFT" | "SENT" | "PARTIAL" | "PAID" | "CANCELLED";
export type PaymentMethod = "CARD" | "CASH" | "TRANSFER";
export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED";

// Money arrives as strings: the API sends Decimal columns that way.
export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  // An invoice bills one booking or a whole stay: exactly one is set.
  bookingId: string | null;
  stayId: string | null;
  customerId: string;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; firstName: string; lastName: string };
  _count: { items: number; payments: number };
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
  type: string;
}

export interface Refund {
  id: string;
  paymentId: string;
  amount: string;
  reason: string;
  stripeRefundId: string | null;
  processedAt: string;
}

export interface Payment {
  id: string;
  amount: string;
  currency: string;
  method: PaymentMethod;
  stripePaymentId: string | null;
  status: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
  refunds: Refund[];
}

export interface InvoiceDetail extends Omit<InvoiceListItem, "_count" | "customer"> {
  // With the contact details for the "Bill to" block.
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    country: string | null;
    user: { email: string } | null;
  };
  items: InvoiceItem[];
  payments: Payment[];
  amountPaid: string;
  balance: string;
}

export interface CreateInvoiceData {
  bookingId: string;
  customerId: string;
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;
  dueDate: string;
  items: { description: string; quantity?: number; unitPrice: number; total: number; type: string }[];
}

export interface PaymentData {
  amount: number;
  method: PaymentMethod;
  stripePaymentId?: string;
}

export interface RefundData {
  amount: number;
  reason: string;
}

export function getInvoices(filters: { status?: string; customerId?: string } = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const query = params.size > 0 ? `?${params}` : "";
  return apiFetch<InvoiceListItem[]>(`/billing${query}`);
}

// Emails the rendered invoice (base64 PDF) to the customer's email on record.
export function emailInvoicePdf(id: string, pdf: Buffer, filename: string) {
  return apiFetch<{ sent: boolean; to: string }>(`/billing/${id}/email`, {
    method: "POST",
    body: JSON.stringify({ pdf: pdf.toString("base64"), filename }),
  });
}

export function getInvoice(id: string) {
  return apiFetch<InvoiceDetail>(`/billing/${id}`);
}

// Full invoice with amounts supplied by the caller.
export function createInvoice(data: CreateInvoiceData) {
  return apiFetch<InvoiceDetail>("/billing", { method: "POST", body: JSON.stringify(data) });
}

// Invoice built by the API from the booking and its own price list.
export function createInvoiceFromBooking(bookingId: string) {
  return apiFetch<InvoiceDetail>(`/billing/from-booking/${bookingId}`, { method: "POST" });
}

export function markInvoiceSent(id: string) {
  return apiFetch<InvoiceDetail>(`/billing/${id}`, { method: "PATCH", body: JSON.stringify({ status: "SENT" }) });
}

export function addPayment(invoiceId: string, data: PaymentData) {
  return apiFetch<Payment>(`/billing/${invoiceId}/payments`, { method: "POST", body: JSON.stringify(data) });
}

export function addRefund(invoiceId: string, paymentId: string, data: RefundData) {
  return apiFetch<Refund>(`/billing/${invoiceId}/payments/${paymentId}/refunds`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function cancelInvoice(invoiceId: string) {
  return apiFetch<InvoiceDetail>(`/billing/${invoiceId}`, { method: "DELETE" });
}

export type TripStatus = "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type TripRole = "CAPTAIN" | "GUIDE" | "TRAINEE_GUIDE";

export interface TripStaffMember {
  id: string;
  tripId: string;
  staffId: string;
  role: TripRole;
  confirmedAt: string | null;
  staff: { id: string; firstName: string; lastName: string; type: StaffType };
}

interface TripBase {
  id: string;
  date: string; // the day at 00:00 UTC
  timeSlot: TimeSlot;
  boatId: string | null; // null for a shore dive
  plannedSiteId: string | null;
  actualSiteId: string | null;
  status: TripStatus;
  maxDivers: number;
  notes: string | null;
  // Post-dive report; times are HH:mm, center local time.
  entryTime: string | null;
  exitTime: string | null;
  reportNotes: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  plannedSite: DiveSiteOption | null;
  actualSite: DiveSiteOption | null;
  staff: TripStaffMember[];
}

export interface TripListItem extends TripBase {
  boat: { id: string; name: string } | null;
  // Bookings holding a place: pending, confirmed or completed.
  _count: { bookings: number };
}

// Divers holding a place, crew, and how many more divers fit (on a boat the
// crew takes seats too).
export interface TripCapacity {
  divers: number;
  crew: number;
  limit: number;
  available: number;
}

export interface TripDetail extends TripBase {
  boat: { id: string; name: string; capacity: number } | null;
  bookings: (Omit<Booking, "customer" | "boat" | "site"> & {
    customer: { id: string; firstName: string; lastName: string };
  })[];
  issues: string[]; // what stops the trip from starting
  capacity: TripCapacity;
}

export interface CreateTripData {
  date: string;
  timeSlot: TimeSlot;
  boatId?: string;
  plannedSiteId?: string;
  maxDivers?: number;
  notes?: string;
}

export interface UpdateTripData {
  status?: TripStatus;
  plannedSiteId?: string | null;
  actualSiteId?: string | null;
  notes?: string | null;
  entryTime?: string | null;
  exitTime?: string | null;
  reportNotes?: string | null;
}

// Both ends are inclusive calendar days (YYYY-MM-DD).
export function getTrips(from: string, to: string, locationId?: string) {
  return apiFetch<TripListItem[]>(`/trips?${new URLSearchParams({ from, to, ...(locationId && { locationId }) })}`);
}

export function getTrip(id: string) {
  return apiFetch<TripDetail>(`/trips/${id}`);
}

export function createTrip(data: CreateTripData) {
  return apiFetch<TripDetail>("/trips", { method: "POST", body: JSON.stringify(data) });
}

export function updateTrip(id: string, data: UpdateTripData) {
  return apiFetch<TripDetail>(`/trips/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function assignStaff(tripId: string, staffId: string, role: TripRole) {
  return apiFetch<TripDetail>(`/trips/${tripId}/staff`, {
    method: "POST",
    body: JSON.stringify({ staffId, role }),
  });
}

export function removeStaff(tripId: string, staffId: string) {
  return apiFetch<TripDetail>(`/trips/${tripId}/staff/${staffId}`, { method: "DELETE" });
}

// The booking must match the trip's date and time slot, and its boat when it
// has one; with reassignBoat a booking on another boat is moved to it.
export function linkBooking(tripId: string, bookingId: string, opts: { reassignBoat?: boolean } = {}) {
  return apiFetch<TripDetail>(`/trips/${tripId}/bookings/${bookingId}`, {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export function unlinkBooking(tripId: string, bookingId: string) {
  return apiFetch<TripDetail>(`/trips/${tripId}/bookings/${bookingId}`, { method: "DELETE" });
}

// A diver as the preparation screen shows them.
export interface PrepBooking {
  id: string;
  tripId: string | null;
  boatId: string;
  activityType: string;
  participantCount: number;
  status: BookingStatus;
  createdAt: string;
  warnings: string[];
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    gender: string | null;
    country: string;
    centerSkillLevel: SkillLevel | null;
    isApproved: boolean;
    medicalCertExpiry: string | null;
    insuranceExpiry: string | null;
    ownEquipment: boolean;
    tankSize: string | null;
    bcdSize: string | null;
    wetsuitSize: string | null;
    finsSize: string | null;
    bootsSize: string | null;
    certifications: { agency: string; level: string; expiryDate: string | null }[];
  };
}

export interface PrepSite {
  id: string;
  nameEn: string;
  difficultyLevel: number;
}

export interface PrepTrip extends Omit<TripDetail, "bookings"> {
  bookings: PrepBooking[];
  suggestedSites: PrepSite[];
}

export interface DivePrep {
  date: string;
  timeSlot: TimeSlot;
  trips: PrepTrip[];
  unassigned: PrepBooking[]; // confirmed bookings on no trip
  pendingCount: number; // pending bookings on no trip, not listed
  boatsWithoutTrip: { id: string; name: string; capacity: number }[];
  hasShoreTrip: boolean;
  // Active staff, with the trip they are on in this slot.
  staff: { id: string; firstName: string; lastName: string; type: StaffType; tripId: string | null; role: TripRole | null }[];
  sites: PrepSite[];
}

export function getDivePrep(date: string, timeSlot: TimeSlot, locationId?: string) {
  return apiFetch<DivePrep>(`/dive-prep?${new URLSearchParams({ date, timeSlot, ...(locationId && { locationId }) })}`);
}

export interface AutoAssignResult {
  assigned: number;
  skipped: { bookingId: string; customer: string; reason: string }[];
}

// locationId: only that location's bookings and trips.
export function autoAssignDivePrep(date: string, timeSlot: TimeSlot, locationId?: string) {
  return apiFetch<AutoAssignResult>("/dive-prep/auto-assign", {
    method: "POST",
    body: JSON.stringify({ date, timeSlot, ...(locationId && { locationId }) }),
  });
}

export interface ComplianceTrip {
  id: string;
  timeSlot: TimeSlot;
  boat: { id: string; name: string; capacity: number } | null;
  plannedSite: DiveSiteOption | null;
  actualSite: DiveSiteOption | null;
  entryTime: string | null;
  exitTime: string | null;
  reportNotes: string | null;
  completedAt: string | null;
  captain: { id: string; firstName: string; lastName: string } | null;
  guides: { id: string; firstName: string; lastName: string; role: TripRole }[];
  divers: {
    bookingId: string;
    customerId: string;
    name: string;
    gender: string | null;
    nationality: string;
    certification: { agency: string; level: string } | null;
    companions: number; // others on the booking, not named
  }[];
  totals: { divers: number; male: number; female: number; unspecified: number };
}

export function getComplianceReport(date: string) {
  return apiFetch<{ date: string; trips: ComplianceTrip[] }>(`/dive-prep/compliance?${new URLSearchParams({ date })}`);
}

export interface CenterSettings {
  name: string;
  legalName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  taxRate: string; // a percentage, as a decimal string, e.g. "7"
  taxName: string;
  // Admins only, from here on.
  timeZone: string; // IANA, e.g. "Atlantic/Canary"
  currency: string; // ISO 4217, e.g. "EUR"
  defaultLanguage: Language;
  logoUrl: string | null; // https
  primaryColor: string | null; // #rrggbb
  accentColor: string | null;
  invoicePrefix: string; // PREFIX-YYYY-0001
  partnerInvoicePrefix: string;
  updatedAt: string | null; // null until first saved
}

// Left out, the admin-only fields keep their values.
export type SettingsData = Pick<CenterSettings, "name" | "legalName" | "address" | "phone" | "email" | "website" | "taxName"> & {
  taxRate: number;
} & Partial<
    Pick<
      CenterSettings,
      | "timeZone"
      | "currency"
      | "defaultLanguage"
      | "logoUrl"
      | "primaryColor"
      | "accentColor"
      | "invoicePrefix"
      | "partnerInvoicePrefix"
    >
  >;

export function getSettings() {
  return apiFetch<CenterSettings>("/settings");
}

// Replaces every field; empty optional fields are cleared.
export function updateSettings(data: SettingsData) {
  return apiFetch<CenterSettings>("/settings", { method: "PUT", body: JSON.stringify(data) });
}

// The server's price list, the one invoices are built from. Net prices.
export type ActivityPriceKey = "snorkeling" | "discoverScuba" | "funDive" | "owCert" | "aowCert" | "rescueCert" | "dmCert";
export type EquipmentPriceKey = "wetsuit" | "bcd" | "regulator" | "maskFins" | "diveComputer" | "fullPackage";

// Per-dive rate for fun dives billed together in a stay, from minDives on.
export interface FunDiveTier {
  minDives: number;
  tourist: number;
  local: number;
  recurrent: number;
}

// The price list, net of tax.
export interface PriceList {
  activities: Record<ActivityPriceKey, number | null>; // null: no price, cannot be invoiced
  equipment: Record<EquipmentPriceKey, number>;
  funDiveTiers: FunDiveTier[]; // ascending, the first at 1
}

export interface Pricing extends PriceList {
  currency: string;
  taxName: string;
  taxRate: number; // a percentage, e.g. 7
}

export function getPricing() {
  return apiFetch<Pricing>("/settings/pricing");
}

// Admin only: replaces the whole price list.
export function updatePricing(data: PriceList) {
  return apiFetch<Pricing>("/settings/pricing", { method: "PUT", body: JSON.stringify(data) });
}

// Financial page.

export type ExpenseCategory = "GASOLINE" | "TANK_NET" | "GLUE" | "EQUIPMENT" | "MAINTENANCE" | "OTHER";

interface FinancialInvoiceRef {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  activityType: string;
}

export interface Expense {
  id: string;
  date: string; // midnight UTC of the day
  category: ExpenseCategory;
  description: string;
  amount: string; // tax included
  tax: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface ManualIncome {
  id: string;
  date: string;
  description: string;
  amount: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface FinancialTotals {
  payments: string; // invoice payments less refunds
  manualIncome: string;
  income: string;
  expenses: string;
  net: string;
}

export interface DailyFinancial {
  date: string;
  taxName: string;
  payments: (FinancialInvoiceRef & { id: string; paidAt: string; method: PaymentMethod; amount: string })[];
  refunds: (FinancialInvoiceRef & {
    id: string;
    processedAt: string;
    method: PaymentMethod;
    amount: string;
    reason: string;
  })[];
  byActivity: { activityType: string; label: string; amount: string }[];
  byMethod: Record<PaymentMethod, string>;
  manualIncome: ManualIncome[];
  expenses: Expense[];
  totals: FinancialTotals;
  closed: { closedAt: string; closedBy: string } | null;
}

export interface ClosedDayListItem {
  id: string;
  date: string;
  closedBy: string;
  closedAt: string;
  totals: FinancialTotals;
}

export interface ClosedDay {
  id: string;
  date: string;
  closedBy: string;
  closedAt: string;
  summary: Omit<DailyFinancial, "closed">;
}

export interface FinancialInvoices {
  from: string;
  to: string;
  invoices: Omit<InvoiceListItem, "_count">[];
  totals: { count: number; subtotal: string; tax: string; discount: string; total: string };
}

export interface TaxDeclaration {
  year: number;
  quarter: number;
  from: string;
  to: string;
  taxName: string;
  taxRate: string;
  sales: { count: number; base: string; tax: string; discount: string; total: string };
  purchases: { count: number; base: string; tax: string; total: string };
  net: string; // positive: to pay; negative: to offset
}

export interface ExpenseData {
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  tax?: number;
  notes?: string;
}

export interface IncomeData {
  date: string;
  description: string;
  amount: number;
  notes?: string;
}

export function getDailyFinancial(date: string) {
  return apiFetch<DailyFinancial>(`/financial/daily?${new URLSearchParams({ date })}`);
}

export function getClosedDays() {
  return apiFetch<ClosedDayListItem[]>("/financial/closed-days");
}

export function getClosedDay(date: string) {
  return apiFetch<ClosedDay>(`/financial/closed-days/${date}`);
}

export function closeDay(date: string) {
  return apiFetch<ClosedDay>(`/financial/closed-days/${date}`, { method: "POST" });
}

export function addExpense(data: ExpenseData) {
  return apiFetch<Expense>("/financial/expenses", { method: "POST", body: JSON.stringify(data) });
}

export function deleteExpense(id: string) {
  return apiFetch<Expense>(`/financial/expenses/${id}`, { method: "DELETE" });
}

export function addManualIncome(data: IncomeData) {
  return apiFetch<ManualIncome>("/financial/income", { method: "POST", body: JSON.stringify(data) });
}

export function deleteManualIncome(id: string) {
  return apiFetch<ManualIncome>(`/financial/income/${id}`, { method: "DELETE" });
}

export function getFinancialInvoices(from: string, to: string) {
  return apiFetch<FinancialInvoices>(`/financial/invoices?${new URLSearchParams({ from, to })}`);
}

export function getTaxDeclaration(year: number, quarter: number) {
  return apiFetch<TaxDeclaration>(
    `/financial/tax-declaration?${new URLSearchParams({ year: String(year), quarter: String(quarter) })}`,
  );
}

// Stays: a customer's bookings over up to 30 days, billed on one invoice.

export type StayCostCategory = "INSURANCE" | "EQUIPMENT" | "CLOTHES" | "GOODIES" | "BEVERAGES" | "OTHER";

export interface StayCost {
  id: string;
  stayId: string;
  date: string; // midnight UTC of the day
  category: StayCostCategory;
  description: string;
  quantity: number;
  unitPrice: string; // net
  total: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StayBooking {
  id: string;
  date: string; // YYYY-MM-DD
  timeSlot: TimeSlot;
  activityType: string;
  activityName: string;
  participantCount: number;
  status: BookingStatus;
  boatName: string;
  partner: boolean; // the activity is the partner's to pay
  partnerName: string | null;
  unitPrice: string | null; // null: no price set for this activity
  activityTotal: string;
  equipment: { description: string; total: string }[];
  total: string;
}

export interface Stay {
  stayId: string | null; // null until a cost is added or it is billed
  customer: { id: string; firstName: string; lastName: string; email: string; customerType: CustomerType };
  startDate: string | null; // null when it only has extra costs
  endDate: string | null;
  totalDives: number; // fun dives, per diver
  pricePerDive: string;
  unpriced: string[];
  bookings: StayBooking[];
  costs: StayCost[];
  totals: { bookings: string; costs: string; subtotal: string; tax: string; total: string };
}

export interface StayCostData {
  date: string;
  category: StayCostCategory;
  description?: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export function getStays() {
  return apiFetch<Stay[]>("/stays");
}

export function addStayCost(customerId: string, data: StayCostData) {
  return apiFetch<StayCost>(`/stays/customer/${customerId}/costs`, { method: "POST", body: JSON.stringify(data) });
}

export function updateStayCost(id: string, data: StayCostData) {
  return apiFetch<StayCost>(`/stays/costs/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteStayCost(id: string) {
  return apiFetch<StayCost>(`/stays/costs/${id}`, { method: "DELETE" });
}

export function billStay(customerId: string) {
  return apiFetch<{ stayId: string; invoiceId: string; invoiceNumber: string }>(`/stays/customer/${customerId}/bill`, {
    method: "POST",
  });
}

// Partners: agencies selling the center's activities. Commission rates are
// percentages; money arrives as decimal strings.

export interface Partner {
  id: string;
  name: string;
  companyName: string;
  contactEmail: string;
  contactPhone: string | null;
  commissionRate: string;
  isActive: boolean;
  apiKey: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerListItem extends Partner {
  _count: { bookings: number; customers: number };
  outstanding: string;
}

export interface PartnerDetail extends Partner {
  _count: { bookings: number; customers: number; invoices: number };
}

export interface PartnerData {
  name: string;
  companyName: string;
  contactEmail: string;
  contactPhone: string | null;
  commissionRate: number;
  isActive: boolean;
  notes: string | null;
}

export interface PartnerCredentials {
  apiKey: string;
  apiSecret: string; // shown once
}

export type PartnerInvoiceStatus = "PENDING" | "PARTIAL" | "PAID" | "CANCELLED";

export interface PartnerInvoice {
  id: string;
  invoiceNumber: string;
  partnerId: string;
  periodFrom: string;
  periodTo: string;
  dueDate: string;
  commissionRate: string;
  gross: string;
  commission: string;
  subtotal: string;
  taxName: string;
  taxRate: string;
  tax: string;
  total: string;
  paidAmount: string;
  status: PartnerInvoiceStatus;
  paidAt: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerInvoiceListItem extends PartnerInvoice {
  partner: { id: string; name: string; companyName: string };
}

export interface PartnerInvoiceDetail extends PartnerInvoice {
  partner: { id: string; name: string; companyName: string; contactEmail: string };
  lines: { id: string; bookingId: string; date: string; description: string; quantity: number; unitPrice: string; total: string }[];
}

export interface PartnerInvoicePreview {
  from: string;
  to: string;
  taxName: string;
  taxRate: string;
  commissionRate: string;
  pendingBookings: number; // not confirmed yet, so not on the invoice
  unpriced: string[];
  bookings: {
    id: string;
    date: string;
    timeSlot: TimeSlot;
    activityName: string;
    participantCount: number;
    status: BookingStatus;
    customerName: string;
    unitPrice: string | null;
    total: string | null;
  }[];
  gross: string;
  commission: string;
  subtotal: string;
  tax: string;
  total: string;
}

export function getPartners() {
  return apiFetch<PartnerListItem[]>("/partners");
}

export function getPartner(id: string) {
  return apiFetch<PartnerDetail>(`/partners/${id}`);
}

export function createPartner(data: PartnerData) {
  return apiFetch<PartnerCredentials & { partner: Partner }>("/partners", { method: "POST", body: JSON.stringify(data) });
}

export function updatePartner(id: string, data: PartnerData) {
  return apiFetch<Partner>(`/partners/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function regeneratePartnerCredentials(id: string) {
  return apiFetch<PartnerCredentials>(`/partners/${id}/regenerate-credentials`, { method: "POST" });
}

export function deletePartner(id: string) {
  return apiFetch<Partner>(`/partners/${id}`, { method: "DELETE" });
}

export function getPartnerInvoicePreview(partnerId: string, from: string, to: string) {
  return apiFetch<PartnerInvoicePreview>(`/partners/${partnerId}/invoice-preview?${new URLSearchParams({ from, to })}`);
}

export function createPartnerInvoice(partnerId: string, from: string, to: string) {
  return apiFetch<PartnerInvoiceDetail>(`/partners/${partnerId}/invoices`, {
    method: "POST",
    body: JSON.stringify({ from, to }),
  });
}

export function getPartnerInvoices(filters: { partnerId?: string; status?: string } = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  return apiFetch<PartnerInvoiceListItem[]>(`/partner-invoices${params.size > 0 ? `?${params}` : ""}`);
}

export function getPartnerInvoice(id: string) {
  return apiFetch<PartnerInvoiceDetail>(`/partner-invoices/${id}`);
}

export function recordPartnerPayment(id: string, paidAmount: number) {
  return apiFetch<PartnerInvoiceDetail>(`/partner-invoices/${id}/payment`, {
    method: "PATCH",
    body: JSON.stringify({ paidAmount }),
  });
}

export function cancelPartnerInvoice(id: string) {
  return apiFetch<PartnerInvoiceDetail>(`/partner-invoices/${id}`, { method: "DELETE" });
}

// Partner portal: called with a partner session, scoped to that partner.

export interface PortalMe {
  partner: Partner;
  stats: { customers: number; bookings: number; invoices: number; invoiced: string; commissionEarned: string; outstanding: string };
}

export interface PortalCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  country: string;
  email: string;
}

export interface PortalBooking {
  id: string;
  date: string; // YYYY-MM-DD
  timeSlot: TimeSlot;
  activityType: string;
  activityName: string;
  participantCount: number;
  status: BookingStatus;
  notes: string | null;
  createdAt: string;
  value: string | null; // catalogue value
  customer: { id: string; firstName: string; lastName: string };
  partnerInvoice: { id: string; invoiceNumber: string } | null;
}

export interface PortalCustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  birthdate?: string;
}

export interface PortalBookingData {
  customerId?: string;
  customer?: PortalCustomerData;
  activityType: string;
  date: string;
  timeSlot: TimeSlot;
  participantCount: number;
  notes?: string;
}

export function getPortalMe() {
  return apiFetch<PortalMe>("/partner/me");
}

export function getPortalCustomers() {
  return apiFetch<PortalCustomer[]>("/partner/customers");
}

export function createPortalCustomer(data: PortalCustomerData) {
  return apiFetch<PortalCustomer>("/partner/customers", { method: "POST", body: JSON.stringify(data) });
}

export function getPortalBookings() {
  return apiFetch<PortalBooking[]>("/partner/bookings");
}

export function createPortalBooking(data: PortalBookingData) {
  return apiFetch<{ id: string }>("/partner/bookings", { method: "POST", body: JSON.stringify(data) });
}

export function getPortalInvoices() {
  return apiFetch<PartnerInvoice[]>("/partner/invoices");
}

export function getPortalInvoice(id: string) {
  return apiFetch<PartnerInvoiceDetail>(`/partner/invoices/${id}`);
}

// GDPR data breach register (admins only).

export type BreachSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type BreachStatus = "DETECTED" | "ASSESSED" | "REPORTED" | "RESOLVED";

export interface DataBreach {
  id: string;
  title: string;
  detectedAt: string;
  severity: BreachSeverity;
  status: BreachStatus;
  description: string;
  affectedDataTypes: string[];
  estimatedAffected: number | null;
  reportedToAuthority: boolean;
  reportedAt: string | null;
  authorityReference: string | null;
  resolutionDetails: string | null;
  resolutionDate: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string | null; email: string };
  reportingDeadline: string; // detectedAt + 72 hours
  overdue: boolean; // DETECTED or ASSESSED, unreported, past the deadline
}

export interface BreachData {
  title: string;
  detectedAt: string; // ISO instant
  severity: BreachSeverity;
  description: string;
  affectedDataTypes: string[];
  estimatedAffected: number | null;
}

// Edits; the reporting fields once reported, the resolution fields once resolved.
export interface BreachUpdate extends BreachData {
  reportedAt?: string;
  authorityReference?: string | null;
  resolutionDetails?: string;
  resolutionDate?: string;
}

export interface BreachStatusChange {
  status: BreachStatus;
  reportedAt?: string;
  authorityReference?: string;
  resolutionDetails?: string;
  resolutionDate?: string;
}

export function getBreaches(status?: BreachStatus) {
  return apiFetch<DataBreach[]>(`/breaches${status ? `?status=${status}` : ""}`);
}

export function createBreach(data: BreachData) {
  return apiFetch<DataBreach>("/breaches", { method: "POST", body: JSON.stringify(data) });
}

export function updateBreach(id: string, data: BreachUpdate) {
  return apiFetch<DataBreach>(`/breaches/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function changeBreachStatus(id: string, data: BreachStatusChange) {
  return apiFetch<DataBreach>(`/breaches/${id}/status`, { method: "POST", body: JSON.stringify(data) });
}

export function deleteBreach(id: string) {
  return apiFetch<DataBreach>(`/breaches/${id}`, { method: "DELETE" });
}
