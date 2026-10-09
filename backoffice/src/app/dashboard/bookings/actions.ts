"use server";

import { ADD_ONS } from "@/lib/add-ons";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ApiError,
  createBooking,
  createCustomer,
  getBooking,
  updateBooking,
  updateBookingStatus,
  type BookingData,
  type BookingStatus,
  type Language,
  type TimeSlot,
} from "@/lib/api";
import {
  ACTIVITY_LABELS,
  buildNotes,
  EQUIPMENT_ITEMS,
  isAllowedTransition,
  SOURCES,
  STATUS_LABELS,
  STATUSES,
} from "@/lib/bookings";
import { LANGUAGES } from "@/lib/customers";
import { getT } from "@/lib/i18n/server";
import { SHORE_START_TIMES, TRIP_SLOTS } from "@/lib/trips";

export type StatusActionState = { error: string } | null;

export async function changeStatus(
  _prev: StatusActionState,
  formData: FormData,
): Promise<StatusActionState> {
  const id = String(formData.get("bookingId") ?? "");
  const to = String(formData.get("status") ?? "") as BookingStatus;
  const t = await getT();
  if (!STATUSES.includes(to)) return { error: t("Unknown status") };

  try {
    // Checked against the current status, not the one the page showed: the
    // booking may have moved since the page was rendered.
    const current = await getBooking(id);
    if (!isAllowedTransition(current.status, to)) {
      return {
        error: t("Cannot move a booking from {from} to {to}", {
          from: t(STATUS_LABELS[current.status]),
          to: t(STATUS_LABELS[to]),
        }),
      };
    }
    await updateBookingStatus(id, to);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : t("Update failed") };
  }
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${id}`);
  revalidatePath("/dashboard");
  return null;
}

export type BookingFormState = {
  error?: string;
  // Set when a new customer was created but the booking then failed, so the
  // form switches to that customer instead of creating them twice.
  createdCustomer?: { id: string; label: string };
} | null;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function message(e: unknown, fallback: string) {
  return e instanceof ApiError ? e.message : fallback;
}

// Creates or updates a booking; with customerMode "new", creates the customer
// first. Redirects to the booking on success.
export async function saveBooking(_prev: BookingFormState, formData: FormData): Promise<BookingFormState> {
  const bookingId = text(formData, "bookingId");
  const activityType = text(formData, "activityType");
  const date = text(formData, "date");
  const timeSlot = text(formData, "timeSlot") as TimeSlot;
  const place = text(formData, "place") === "shore" ? "shore" : "boat";
  const boatId = text(formData, "boatId");
  const shoreTime = text(formData, "shoreTime");
  const siteId = text(formData, "siteId");
  const participantCount = Number(text(formData, "participantCount"));
  const numberOfDives = Number(text(formData, "numberOfDives"));
  const bookingSource = text(formData, "bookingSource");
  const partnerId = text(formData, "partnerId");
  const status = text(formData, "status") as BookingStatus;
  const t = await getT();

  if (!(activityType in ACTIVITY_LABELS)) return { error: t("Choose an activity") };
  if (!ISO_DATE.test(date)) return { error: t("Choose a valid date") };
  if (!TRIP_SLOTS.includes(timeSlot)) return { error: t("Choose a time slot") };
  if (place === "boat" && !UUID.test(boatId)) return { error: t("Choose a boat") };
  if (place === "shore" && !SHORE_START_TIMES[timeSlot].includes(shoreTime)) return { error: t("Choose the shore session") };
  if (siteId && !UUID.test(siteId)) return { error: t("Choose a valid dive site") };
  if (!Number.isInteger(participantCount) || participantCount < 1) return { error: t("Participants must be at least 1") };
  if (!Number.isInteger(numberOfDives) || numberOfDives < 1 || numberOfDives > 20) {
    return { error: t("The number of dives must be a whole number from 1 to 20") };
  }
  if (!SOURCES.includes(bookingSource as (typeof SOURCES)[number])) return { error: t("Choose a source") };
  if (partnerId && !UUID.test(partnerId)) return { error: t("Choose a valid partner") };
  // The partner is invoiced for partner bookings, so one must be named.
  if (bookingSource === "PARTNER" && !partnerId) return { error: t("Choose the partner who sold this booking") };
  if (bookingSource !== "PARTNER" && partnerId) return { error: t("Set the source to Partner, or choose no partner") };
  if (!bookingId && status !== "PENDING" && status !== "CONFIRMED") return { error: t("Choose a status") };

  const chosen = new Set(formData.getAll("equipment").map(String));
  const equipment = EQUIPMENT_ITEMS.filter((item) => chosen.has(item.key)).map((item) => {
    const size = text(formData, `size_${item.key}`);
    return item.sizes && item.sizes.includes(size) ? `${item.key}:${size}` : item.key;
  });

  const bonoCode = text(formData, "bonoCode").toUpperCase();
  if (bonoCode && !/^[A-Z0-9][A-Z0-9-]{1,39}$/.test(bonoCode)) return { error: t("A bono code is letters, digits and dashes") };

  let previousNotes: string | null = null;
  if (bookingId) {
    try {
      previousNotes = (await getBooking(bookingId)).notes;
    } catch (e) {
      return { error: message(e, t("The booking could not be loaded")) };
    }
  }

  let customerId = text(formData, "customerId");
  let createdCustomer: { id: string; label: string } | undefined;
  if (text(formData, "customerMode") === "new") {
    const firstName = text(formData, "new_firstName");
    const lastName = text(formData, "new_lastName");
    const email = text(formData, "new_email");
    const country = text(formData, "new_country");
    const language = text(formData, "new_language") as Language;
    if (!firstName || !lastName) return { error: t("Enter the new customer's first and last name") };
    if (!email) return { error: t("Enter the new customer's email") };
    if (!country) return { error: t("Enter the new customer's country") };
    if (!LANGUAGES.some((l) => l.code === language)) return { error: t("Choose the new customer's language") };
    try {
      const customer = await createCustomer({
        firstName,
        lastName,
        email,
        phone: text(formData, "new_phone") || null,
        country: country.toUpperCase(),
        language,
        birthdate: null,
        emergencyContact: null,
      });
      customerId = customer.id;
      createdCustomer = { id: customer.id, label: `${customer.firstName} ${customer.lastName} · ${customer.email}` };
      revalidatePath("/dashboard/customers");
    } catch (e) {
      return { error: message(e, t("The customer could not be created")) };
    }
  } else if (!UUID.test(customerId)) {
    return { error: t("Choose a customer") };
  }

  const data: BookingData = {
    customerId,
    // A shore booking has no boat, and goes on its shore session.
    boatId: place === "boat" ? boatId : null,
    shoreTime: place === "shore" ? shoreTime : null,
    siteId: siteId || null,
    activityType,
    date,
    timeSlot,
    participantCount,
    numberOfDives,
    bookingSource,
    partnerId: partnerId || null,
    notes: buildNotes(previousNotes, equipment, text(formData, "notes")),
    ...(!bookingId && { status }),
    bonoCode: bonoCode || (bookingId ? "" : null),
    addOns: ADD_ONS.map((a) => a.key).filter((k) => formData.getAll("addOns").includes(k)),
  };

  let savedId: string;
  try {
    savedId = (bookingId ? await updateBooking(bookingId, data) : await createBooking(data)).id;
  } catch (e) {
    return { error: message(e, t("The booking could not be saved")), createdCustomer };
  }
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${savedId}`);
  revalidatePath("/dashboard");
  redirect(`/dashboard/bookings/${savedId}`);
}
