"use server";

import { revalidatePath } from "next/cache";
import { ApiError, createPortalBooking, createPortalCustomer, type PortalCustomerData, type TimeSlot } from "@/lib/api";
import { ACTIVITY_LABELS } from "@/lib/bookings";
import { TRIP_SLOTS } from "@/lib/trips";

export type PortalFormState = { error?: string; ok?: boolean } | null;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function fail(e: unknown, fallback: string): PortalFormState {
  return { error: e instanceof ApiError ? e.message : fallback };
}

// The customer fields, from inputs named with a prefix ("" or "new_").
function customerFields(formData: FormData, prefix = ""): PortalCustomerData | string {
  const data = {
    firstName: text(formData, `${prefix}firstName`),
    lastName: text(formData, `${prefix}lastName`),
    email: text(formData, `${prefix}email`).toLowerCase(),
    phone: text(formData, `${prefix}phone`) || undefined,
    country: text(formData, `${prefix}country`).toUpperCase(),
    birthdate: text(formData, `${prefix}birthdate`) || undefined,
  };
  if (!data.firstName || !data.lastName) return "Enter the customer's first and last name";
  if (!EMAIL.test(data.email)) return "Enter the customer's email";
  if (!/^[A-Z]{2}$/.test(data.country)) return "Enter the nationality as a two-letter country code, e.g. DE";
  if (data.birthdate && !ISO_DATE.test(data.birthdate)) return "Enter a valid date of birth";
  return data;
}

export async function createCustomerAction(_prev: PortalFormState, formData: FormData): Promise<PortalFormState> {
  const data = customerFields(formData);
  if (typeof data === "string") return { error: data };
  try {
    await createPortalCustomer(data);
  } catch (e) {
    return fail(e, "Could not add the customer");
  }
  revalidatePath("/partner");
  return { ok: true };
}

export async function createBookingAction(_prev: PortalFormState, formData: FormData): Promise<PortalFormState> {
  const mode = text(formData, "mode");
  const activityType = text(formData, "activityType");
  const date = text(formData, "date");
  const timeSlot = text(formData, "timeSlot") as TimeSlot;
  const participantCount = Number(text(formData, "participantCount"));
  const notes = text(formData, "notes");

  if (!(activityType in ACTIVITY_LABELS)) return { error: "Choose an activity" };
  if (!ISO_DATE.test(date)) return { error: "Choose a date" };
  if (!TRIP_SLOTS.includes(timeSlot)) return { error: "Choose a time" };
  if (!Number.isInteger(participantCount) || participantCount < 1 || participantCount > 20) {
    return { error: "Divers must be from 1 to 20" };
  }

  let who: { customerId: string } | { customer: PortalCustomerData };
  if (mode === "new") {
    const customer = customerFields(formData, "new_");
    if (typeof customer === "string") return { error: customer };
    who = { customer };
  } else {
    const customerId = text(formData, "customerId");
    if (!UUID.test(customerId)) return { error: "Choose the customer" };
    who = { customerId };
  }

  try {
    await createPortalBooking({ ...who, activityType, date, timeSlot, participantCount, notes: notes || undefined });
  } catch (e) {
    return fail(e, "Could not create the booking");
  }
  revalidatePath("/partner");
  return { ok: true };
}
