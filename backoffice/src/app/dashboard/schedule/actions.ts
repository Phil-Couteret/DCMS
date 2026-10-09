"use server";

import { revalidatePath } from "next/cache";
import {
  ApiError,
  assignStaff,
  createBooking,
  createCustomer,
  createTrip,
  getBooking,
  getTrip,
  linkBooking,
  removeStaff,
  updateBooking,
  updateTrip,
  type Language,
  type TimeSlot,
  type TripRole,
  type TripStatus,
} from "@/lib/api";
import { ACTIVITY_LABELS, buildNotes, EQUIPMENT_ITEMS, staffNotesOf } from "@/lib/bookings";
import { centerLocale } from "@/lib/center";
import { centerNow } from "@/lib/center-time";
import { LANGUAGES } from "@/lib/customers";
import { getT } from "@/lib/i18n/server";
import { SHORE_START_TIMES, TRIP_ROLES, TRIP_SLOTS, TRIP_STATUS_LABELS, TRIP_STATUSES, TRIP_TRANSITIONS } from "@/lib/trips";

export type TripFormState = { error?: string; ok?: boolean; tripId?: string } | null;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function fail(e: unknown, fallback: string): TripFormState {
  return { error: e instanceof ApiError ? e.message : fallback };
}

// Trips also show on the dive prep screen.
function refresh() {
  revalidatePath("/dashboard/schedule");
  revalidatePath("/dashboard/dive-prep");
}

export async function createTripAction(_prev: TripFormState, formData: FormData): Promise<TripFormState> {
  const t = await getT();
  const date = field(formData, "date");
  const timeSlot = field(formData, "timeSlot") as TimeSlot;
  const shore = field(formData, "kind") === "shore";
  const boatId = shore ? "" : field(formData, "boatId");
  const startTime = shore ? field(formData, "startTime") : "";
  const plannedSiteId = field(formData, "plannedSiteId");
  const maxDivers = Number(field(formData, "maxDivers") || 10);
  const notes = field(formData, "notes");
  if (!ISO_DATE.test(date)) return { error: t("Choose a valid date") };
  if (!TRIP_SLOTS.includes(timeSlot)) return { error: t("Choose a time slot") };
  if (!Number.isInteger(maxDivers) || maxDivers < 1) return { error: t("Max divers must be at least 1") };
  if (!shore && !boatId) return { error: t("Choose a boat") };
  if (shore && !SHORE_START_TIMES[timeSlot].includes(startTime)) return { error: t("Choose the shore session") };

  let tripId: string;
  try {
    const trip = await createTrip({
      date,
      timeSlot,
      maxDivers,
      ...(boatId && { boatId }),
      ...(startTime && { startTime }),
      ...(plannedSiteId && { plannedSiteId }),
      ...(notes && { notes }),
    });
    tripId = trip.id;
  } catch (e) {
    return fail(e, t("Could not create the trip"));
  }
  refresh();
  return { ok: true, tripId };
}

export async function changeTripStatus(_prev: TripFormState, formData: FormData): Promise<TripFormState> {
  const t = await getT();
  const id = field(formData, "tripId");
  const to = field(formData, "status") as TripStatus;
  if (!TRIP_STATUSES.includes(to)) return { error: t("Unknown status") };
  try {
    // Checked against the current status: the trip may have moved since the
    // panel was rendered.
    const current = await getTrip(id);
    if (!TRIP_TRANSITIONS[current.status].some((m) => m.to === to)) {
      return {
        error: t("Cannot move a {from} trip to {to}", {
          from: t(TRIP_STATUS_LABELS[current.status]).toLowerCase(),
          to: t(TRIP_STATUS_LABELS[to]).toLowerCase(),
        }),
      };
    }
    await updateTrip(id, { status: to });
  } catch (e) {
    return fail(e, t("Could not update the status"));
  }
  refresh();
  return { ok: true };
}

export async function assignStaffAction(_prev: TripFormState, formData: FormData): Promise<TripFormState> {
  const t = await getT();
  const id = field(formData, "tripId");
  const staffId = field(formData, "staffId");
  const role = field(formData, "role") as TripRole;
  if (!staffId) return { error: t("Choose a staff member") };
  if (!TRIP_ROLES.includes(role)) return { error: t("Choose a role") };
  try {
    await assignStaff(id, staffId, role);
  } catch (e) {
    return fail(e, t("Could not assign staff"));
  }
  refresh();
  return { ok: true };
}

export async function removeStaffAction(_prev: TripFormState, formData: FormData): Promise<TripFormState> {
  const t = await getT();
  try {
    await removeStaff(field(formData, "tripId"), field(formData, "staffId"));
  } catch (e) {
    return fail(e, t("Could not remove staff"));
  }
  refresh();
  return { ok: true };
}

export async function linkBookingAction(_prev: TripFormState, formData: FormData): Promise<TripFormState> {
  const t = await getT();
  try {
    await linkBooking(field(formData, "tripId"), field(formData, "bookingId"));
  } catch (e) {
    return fail(e, t("Could not add the booking"));
  }
  refresh();
  revalidatePath("/dashboard/bookings");
  return { ok: true };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The rental items ticked on a diver's row, with their sizes ("key:size").
function chosenEquipment(formData: FormData) {
  const chosen = new Set(formData.getAll("equipment").map(String));
  return EQUIPMENT_ITEMS.filter((item) => chosen.has(item.key)).map((item) => {
    const size = field(formData, `size_${item.key}`);
    return item.sizes && item.sizes.includes(size) ? `${item.key}:${size}` : item.key;
  });
}

// A diver's rental equipment, changed from the trip panel. Their staff notes
// and anything from a guest booking are kept; a different set is priced at
// today's prices (as when editing the booking).
export async function saveDiverEquipment(_prev: TripFormState, formData: FormData): Promise<TripFormState> {
  const t = await getT();
  const bookingId = field(formData, "bookingId");
  if (!UUID.test(bookingId)) return { error: t("Unknown booking") };
  try {
    const { notes } = await getBooking(bookingId);
    await updateBooking(bookingId, { notes: buildNotes(notes, chosenEquipment(formData), staffNotesOf(notes)) });
  } catch (e) {
    return fail(e, t("The equipment could not be saved"));
  }
  refresh();
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  revalidatePath("/dashboard/stays");
  return { ok: true };
}

// Create diver: a new customer and their booking on this trip, in one step.
// A diving activity is a first dive with no insurance on file, so the
// insurance check applies: a signed waiver (saved on the customer), or the
// acknowledgement that insurance must be added to the stay.
export async function createDiverOnTrip(_prev: TripFormState, formData: FormData): Promise<TripFormState> {
  const t = await getT();
  const tripId = field(formData, "tripId");
  const firstName = field(formData, "firstName");
  const lastName = field(formData, "lastName");
  const email = field(formData, "email");
  const country = field(formData, "country");
  const language = field(formData, "language") as Language;
  const activityType = field(formData, "activityType");
  const numberOfDives = Number(field(formData, "numberOfDives"));
  const waiverSigned = formData.get("waiverSigned") === "on";
  const acknowledged = formData.get("insuranceAcknowledged") === "on";
  const plannedRaw = field(formData, "plannedStayDays");
  const plannedStayDays = plannedRaw ? Number(plannedRaw) : null;

  if (!UUID.test(tripId)) return { error: t("Unknown trip") };
  if (!firstName || !lastName) return { error: t("Enter the new customer's first and last name") };
  if (!email) return { error: t("Enter the new customer's email") };
  if (!country) return { error: t("Enter the new customer's country") };
  if (!LANGUAGES.some((l) => l.code === language)) return { error: t("Choose the new customer's language") };
  if (!(activityType in ACTIVITY_LABELS)) return { error: t("Choose an activity") };
  if (!Number.isInteger(numberOfDives) || numberOfDives < 1 || numberOfDives > 20) {
    return { error: t("The number of dives must be a whole number from 1 to 20") };
  }
  if (plannedStayDays !== null && !(Number.isInteger(plannedStayDays) && plannedStayDays >= 1 && plannedStayDays <= 3660)) {
    return { error: t("The planned stay length is a number of days, from 1 to 3660") };
  }
  if (activityType !== "SNORKELING" && !waiverSigned && !acknowledged) {
    return { error: t("This is the customer's first dive and they have no valid dive insurance: tick “Waiver signed” or acknowledge the warning.") };
  }

  let trip;
  try {
    trip = await getTrip(tripId);
  } catch (e) {
    return fail(e, t("The trip could not be loaded"));
  }
  if (!trip.boat && !trip.plannedSite) return { error: t("Choose the shore trip's site first") };

  let customerId: string;
  try {
    const today = waiverSigned ? centerNow((await centerLocale()).timeZone).isoDate : null;
    customerId = (
      await createCustomer({
        firstName,
        lastName,
        email,
        phone: field(formData, "phone") || null,
        country: country.toUpperCase(),
        language,
        birthdate: null,
        emergencyContact: null,
        ...(today && { waiverSignedAt: today }),
      })
    ).id;
  } catch (e) {
    return fail(e, t("The customer could not be created"));
  }
  revalidatePath("/dashboard/customers");

  try {
    const booking = await createBooking({
      customerId,
      boatId: trip.boat?.id ?? null,
      shoreTime: trip.boat ? null : trip.startTime,
      siteId: trip.plannedSite?.id ?? null,
      activityType,
      date: trip.date.slice(0, 10),
      timeSlot: trip.timeSlot,
      participantCount: 1,
      numberOfDives,
      bookingSource: "WALK_IN",
      partnerId: null,
      notes: null,
      status: "CONFIRMED",
      bonoCode: null,
      addOns: [],
      ...(plannedStayDays !== null && { plannedStayDays }),
    });
    if (booking.tripId !== tripId) await linkBooking(tripId, booking.id);
  } catch (e) {
    return { error: `${e instanceof ApiError ? e.message : t("The booking could not be saved")} ${t("The customer was saved; book them from their profile.")}` };
  }
  refresh();
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/stays");
  return { ok: true };
}
