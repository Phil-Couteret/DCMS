"use server";

import { revalidatePath } from "next/cache";
import {
  ApiError,
  assignStaff,
  createTrip,
  getTrip,
  linkBooking,
  removeStaff,
  updateTrip,
  type TimeSlot,
  type TripRole,
  type TripStatus,
} from "@/lib/api";
import { TRIP_ROLES, TRIP_SLOTS, TRIP_STATUSES, TRIP_TRANSITIONS } from "@/lib/trips";

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
  const date = field(formData, "date");
  const timeSlot = field(formData, "timeSlot") as TimeSlot;
  const boatId = field(formData, "boatId");
  const plannedSiteId = field(formData, "plannedSiteId");
  const maxDivers = Number(field(formData, "maxDivers") || 10);
  const notes = field(formData, "notes");
  if (!ISO_DATE.test(date)) return { error: "Choose a valid date" };
  if (!TRIP_SLOTS.includes(timeSlot)) return { error: "Choose a time slot" };
  if (!Number.isInteger(maxDivers) || maxDivers < 1) return { error: "Max divers must be at least 1" };

  let tripId: string;
  try {
    const trip = await createTrip({
      date,
      timeSlot,
      maxDivers,
      ...(boatId && { boatId }),
      ...(plannedSiteId && { plannedSiteId }),
      ...(notes && { notes }),
    });
    tripId = trip.id;
  } catch (e) {
    return fail(e, "Could not create the trip");
  }
  refresh();
  return { ok: true, tripId };
}

export async function changeTripStatus(_prev: TripFormState, formData: FormData): Promise<TripFormState> {
  const id = field(formData, "tripId");
  const to = field(formData, "status") as TripStatus;
  if (!TRIP_STATUSES.includes(to)) return { error: "Unknown status" };
  try {
    // Checked against the current status: the trip may have moved since the
    // panel was rendered.
    const current = await getTrip(id);
    if (!TRIP_TRANSITIONS[current.status].some((t) => t.to === to)) {
      return { error: `Cannot move a ${current.status.toLowerCase()} trip to ${to.toLowerCase()}` };
    }
    await updateTrip(id, { status: to });
  } catch (e) {
    return fail(e, "Could not update the status");
  }
  refresh();
  return { ok: true };
}

export async function assignStaffAction(_prev: TripFormState, formData: FormData): Promise<TripFormState> {
  const id = field(formData, "tripId");
  const staffId = field(formData, "staffId");
  const role = field(formData, "role") as TripRole;
  if (!staffId) return { error: "Choose a staff member" };
  if (!TRIP_ROLES.includes(role)) return { error: "Choose a role" };
  try {
    await assignStaff(id, staffId, role);
  } catch (e) {
    return fail(e, "Could not assign staff");
  }
  refresh();
  return { ok: true };
}

export async function removeStaffAction(_prev: TripFormState, formData: FormData): Promise<TripFormState> {
  try {
    await removeStaff(field(formData, "tripId"), field(formData, "staffId"));
  } catch (e) {
    return fail(e, "Could not remove staff");
  }
  refresh();
  return { ok: true };
}

export async function linkBookingAction(_prev: TripFormState, formData: FormData): Promise<TripFormState> {
  try {
    await linkBooking(field(formData, "tripId"), field(formData, "bookingId"));
  } catch (e) {
    return fail(e, "Could not add the booking");
  }
  refresh();
  revalidatePath("/dashboard/bookings");
  return { ok: true };
}
