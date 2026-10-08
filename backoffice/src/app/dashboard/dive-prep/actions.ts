"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/action-button";
import {
  ApiError,
  assignStaff,
  autoAssignDivePrep,
  createTrip,
  getTrip,
  linkBooking,
  removeStaff,
  unlinkBooking,
  updateTrip,
  type TimeSlot,
  type TripRole,
} from "@/lib/api";
import { TRIP_ROLES, TRIP_SLOTS } from "@/lib/trips";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function fail(e: unknown, fallback: string): ActionState {
  return { error: e instanceof ApiError ? e.message : fallback };
}

// Trips also show on the schedule.
function refresh() {
  revalidatePath("/dashboard/dive-prep");
  revalidatePath("/dashboard/schedule");
}

function ids(formData: FormData, ...names: string[]) {
  const values = names.map((n) => field(formData, n));
  return values.every((v) => UUID.test(v)) ? values : null;
}

// Puts a diver's booking on a trip, moving it to the trip's boat if needed.
export async function assignDiver(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const found = ids(formData, "tripId", "bookingId");
  if (!found) return { error: "Unknown trip or booking" };
  try {
    await linkBooking(found[0], found[1], { reassignBoat: true });
  } catch (e) {
    return fail(e, "The diver could not be added");
  }
  refresh();
  return { ok: true };
}

export async function unassignDiver(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const found = ids(formData, "tripId", "bookingId");
  if (!found) return { error: "Unknown trip or booking" };
  try {
    await unlinkBooking(found[0], found[1]);
  } catch (e) {
    return fail(e, "The diver could not be removed");
  }
  refresh();
  return { ok: true };
}

export async function autoAssign(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const date = field(formData, "date");
  const timeSlot = field(formData, "timeSlot") as TimeSlot;
  if (!ISO_DATE.test(date) || !TRIP_SLOTS.includes(timeSlot)) return { error: "Unknown date or time slot" };
  let result;
  try {
    result = await autoAssignDivePrep(date, timeSlot, field(formData, "location") || undefined);
  } catch (e) {
    return fail(e, "Auto-assign failed");
  }
  refresh();
  const skipped = result.skipped.length;
  return {
    ok: true,
    message:
      `${result.assigned} booking${result.assigned === 1 ? "" : "s"} assigned` +
      (skipped > 0 ? `; ${skipped} not placed: ${result.skipped.map((s) => `${s.customer} (${s.reason})`).join(", ")}` : "."),
  };
}

// A trip for a boat in the slot, or a shore dive when no boat is given. A
// boat trip takes as many divers as the boat has seats; crew are counted
// against the boat when divers are added.
export async function addTrip(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const date = field(formData, "date");
  const timeSlot = field(formData, "timeSlot") as TimeSlot;
  const boatId = field(formData, "boatId");
  const capacity = Number(field(formData, "capacity") || 10);
  if (!ISO_DATE.test(date) || !TRIP_SLOTS.includes(timeSlot)) return { error: "Unknown date or time slot" };
  if (boatId && !UUID.test(boatId)) return { error: "Unknown boat" };
  try {
    await createTrip({ date, timeSlot, maxDivers: capacity > 0 ? capacity : 10, ...(boatId && { boatId }) });
  } catch (e) {
    return fail(e, "The trip could not be created");
  }
  refresh();
  return { ok: true };
}

export async function addCrew(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const found = ids(formData, "tripId", "staffId");
  const role = field(formData, "role") as TripRole;
  if (!found) return { error: "Choose a staff member" };
  if (!TRIP_ROLES.includes(role)) return { error: "Choose a role" };
  try {
    await assignStaff(found[0], found[1], role);
  } catch (e) {
    return fail(e, "The staff member could not be added");
  }
  refresh();
  return { ok: true };
}

export async function removeCrew(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const found = ids(formData, "tripId", "staffId");
  if (!found) return { error: "Unknown trip or staff member" };
  try {
    await removeStaff(found[0], found[1]);
  } catch (e) {
    return fail(e, "The staff member could not be removed");
  }
  refresh();
  return { ok: true };
}

export async function setPlannedSite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const tripId = field(formData, "tripId");
  const siteId = field(formData, "siteId");
  if (!UUID.test(tripId) || (siteId && !UUID.test(siteId))) return { error: "Unknown trip or site" };
  try {
    await updateTrip(tripId, { plannedSiteId: siteId || null });
  } catch (e) {
    return fail(e, "The site could not be saved");
  }
  refresh();
  return { ok: true };
}

// Saves the post-dive report; with complete, also closes an active trip.
export async function saveReport(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const tripId = field(formData, "tripId");
  const actualSiteId = field(formData, "actualSiteId");
  const entryTime = field(formData, "entryTime");
  const exitTime = field(formData, "exitTime");
  const complete = field(formData, "intent") === "complete";
  if (!UUID.test(tripId) || (actualSiteId && !UUID.test(actualSiteId))) return { error: "Unknown trip or site" };
  if ((entryTime && !TIME.test(entryTime)) || (exitTime && !TIME.test(exitTime))) {
    return { error: "Enter times as HH:mm" };
  }
  if (entryTime && exitTime && exitTime <= entryTime) return { error: "The exit time must be after the entry time" };
  try {
    if (complete) {
      const current = await getTrip(tripId);
      if (current.status !== "ACTIVE") return { error: "Only an active trip can be completed; start it first" };
    }
    await updateTrip(tripId, {
      // Left out when completing without one, so the planned site is taken.
      ...(actualSiteId ? { actualSiteId } : complete ? {} : { actualSiteId: null }),
      entryTime: entryTime || null,
      exitTime: exitTime || null,
      reportNotes: field(formData, "reportNotes") || null,
      ...(complete && { status: "COMPLETED" as const }),
    });
  } catch (e) {
    return fail(e, "The report could not be saved");
  }
  refresh();
  return { ok: true, message: complete ? "Dive completed." : "Report saved." };
}
