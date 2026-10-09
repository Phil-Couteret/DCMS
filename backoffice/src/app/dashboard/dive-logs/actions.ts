"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, createDiveLog, reportIncident, type CreateDiveLogData, type IncidentSeverity } from "@/lib/api";
import { centerLocalToUtc } from "@/lib/center-time";
import { SEVERITIES } from "@/lib/dive-logs";
import { centerLocale } from "@/lib/center";
import type { T } from "@/lib/i18n/core";
import { getT } from "@/lib/i18n/server";

export type FormState = { error?: string } | null;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^\d{2}:\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

// Optional whole numbers: empty means "not recorded", anything else must parse.
function optionalInt(formData: FormData, name: string, label: string, t: T) {
  const raw = text(formData, name);
  if (raw === "") return { value: undefined };
  const n = Number(raw);
  return Number.isInteger(n) ? { value: n } : { error: t("{field} must be a whole number", { field: t(label) }) };
}

export async function createLog(_prev: FormState, formData: FormData): Promise<FormState> {
  const { timeZone } = await centerLocale();
  const t = await getT();
  const bookingId = text(formData, "bookingId");
  const siteId = text(formData, "siteId");
  const guideId = text(formData, "guideId");
  const date = text(formData, "date");
  const entry = text(formData, "entryTime");
  const exit = text(formData, "exitTime");

  if (!UUID.test(bookingId)) return { error: t("Booking ID must be a booking reference (UUID)") };
  if (!UUID.test(siteId)) return { error: t("Choose a dive site") };
  if (guideId && !UUID.test(guideId)) return { error: t("Choose a guide") };
  if (!ISO_DATE.test(date)) return { error: t("Choose a date") };
  if (!CLOCK.test(entry) || !CLOCK.test(exit)) return { error: t("Enter entry and exit times") };

  // Times are entered as the center's wall-clock time.
  const entryTime = centerLocalToUtc(timeZone, date, entry);
  const exitTime = centerLocalToUtc(timeZone, date, exit);
  const duration = Math.round((exitTime.getTime() - entryTime.getTime()) / 60000);
  if (duration <= 0) return { error: t("Exit time must be after entry time") };

  const numbers: Record<string, string> = {
    maxDepth: "Max depth",
    avgDepth: "Average depth",
    visibility: "Visibility",
    waterTemp: "Water temperature",
    airStartBar: "Air at start",
    airEndBar: "Air at end",
  };
  const parsed: Record<string, number | undefined> = {};
  for (const [name, label] of Object.entries(numbers)) {
    const r = optionalInt(formData, name, label, t);
    if (r.error) return { error: r.error };
    parsed[name] = r.value;
  }
  if (parsed.maxDepth === undefined) return { error: t("Enter the max depth") };

  const data: CreateDiveLogData = {
    bookingId,
    siteId,
    ...(guideId && { guideId }),
    date,
    entryTime: entryTime.toISOString(),
    exitTime: exitTime.toISOString(),
    duration,
    maxDepth: parsed.maxDepth,
  };
  for (const name of ["avgDepth", "visibility", "waterTemp", "airStartBar", "airEndBar"] as const) {
    if (parsed[name] !== undefined) data[name] = parsed[name];
  }
  for (const name of ["weatherConditions", "seaConditions", "notes"] as const) {
    const v = text(formData, name);
    if (v) data[name] = v;
  }

  let id: string;
  try {
    id = (await createDiveLog(data)).id;
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : t("Could not create the dive log") };
  }
  revalidatePath("/dashboard/dive-logs");
  redirect(`/dashboard/dive-logs/${id}`);
}

export async function submitIncident(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getT();
  const logId = text(formData, "logId");
  const type = text(formData, "type");
  const severity = text(formData, "severity") as IncidentSeverity;
  const description = text(formData, "description");
  const actionsTaken = text(formData, "actionsTaken");
  if (!type || !description || !actionsTaken) return { error: t("Fill in type, description and actions taken") };
  if (!SEVERITIES.includes(severity)) return { error: t("Choose a severity") };
  try {
    await reportIncident(logId, {
      type,
      severity,
      description,
      actionsTaken,
      reportedToAuthorities: formData.get("reportedToAuthorities") === "on",
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : t("Could not report the incident") };
  }
  revalidatePath(`/dashboard/dive-logs/${logId}`);
  revalidatePath("/dashboard/dive-logs");
  return null;
}

