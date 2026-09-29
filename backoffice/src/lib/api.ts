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

export interface BookingData {
  customerId: string;
  boatId: string;
  siteId: string | null;
  activityType: string;
  date: string;
  timeSlot: TimeSlot;
  participantCount: number;
  bookingSource: string;
  notes: string | null;
  status?: BookingStatus; // create only; later changes go through the status actions
}

export function createBooking(data: BookingData) {
  return apiFetch<Booking>("/bookings", { method: "POST", body: JSON.stringify(data) });
}

export function updateBooking(id: string, data: BookingData) {
  return apiFetch<Booking>(`/bookings/${id}`, { method: "PATCH", body: JSON.stringify(data) });
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
}

export type DiveSiteData = Omit<DiveSite, "id" | "latitude" | "longitude"> & { latitude: number; longitude: number };

export function getDiveSites() {
  return apiFetch<DiveSite[]>("/dive-sites");
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
  bookingId: string;
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

export interface InvoiceDetail extends Omit<InvoiceListItem, "_count"> {
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

export interface TripDetail extends TripBase {
  boat: { id: string; name: string; capacity: number } | null;
  bookings: (Omit<Booking, "customer" | "boat" | "site"> & {
    customer: { id: string; firstName: string; lastName: string };
  })[];
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
}

// Both ends are inclusive calendar days (YYYY-MM-DD).
export function getTrips(from: string, to: string) {
  return apiFetch<TripListItem[]>(`/trips?${new URLSearchParams({ from, to })}`);
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

// The booking must match the trip's date, time slot and (if any) boat.
export function linkBooking(tripId: string, bookingId: string) {
  return apiFetch<TripDetail>(`/trips/${tripId}/bookings/${bookingId}`, { method: "POST" });
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
  updatedAt: string | null; // null until first saved
}

export type SettingsData = Omit<CenterSettings, "updatedAt" | "taxRate"> & { taxRate: number };

export function getSettings() {
  return apiFetch<CenterSettings>("/settings");
}

// Replaces every field; empty optional fields are cleared.
export function updateSettings(data: SettingsData) {
  return apiFetch<CenterSettings>("/settings", { method: "PUT", body: JSON.stringify(data) });
}

// The server's price list, the one invoices are built from. Net prices.
export interface Pricing {
  currency: string;
  taxName: string;
  taxRate: number; // a percentage, e.g. 7
  activities: { activityType: string; name: string; price: number | null }[];
  equipment: { key: string; name: string; price: number }[];
  fullEquipmentPackage: number;
}

export function getPricing() {
  return apiFetch<Pricing>("/settings/pricing");
}
