"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ApiError,
  changeBreachStatus,
  createBreach,
  deleteBreach,
  notifyBreachCustomers,
  updateBreach,
  type BreachData,
  type BreachSeverity,
  type BreachStatus,
  type BreachStatusChange,
  type BreachUpdate,
} from "@/lib/api";
import { BREACH_SEVERITIES, BREACH_STATUSES, BREACH_TYPE_LABELS, DATA_TYPE_LABELS, NOTIFY_METHOD_LABELS } from "@/lib/breaches";
import { centerLocale } from "@/lib/center";
import { centerLocalToUtc } from "@/lib/center-time";
import type { T } from "@/lib/i18n/core";
import { getT } from "@/lib/i18n/server";

export type BreachFormState = { error?: string; ok?: boolean } | null;

const DATETIME_LOCAL = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function fail(e: unknown, fallback: string): BreachFormState {
  return { error: e instanceof ApiError ? e.message : fallback };
}

// A datetime-local value, center time, as an ISO instant; null when empty,
// undefined when malformed.
function instant(timeZone: string, formData: FormData, name: string) {
  const raw = text(formData, name);
  if (raw === "") return null;
  const m = DATETIME_LOCAL.exec(raw);
  return m ? centerLocalToUtc(timeZone, m[1], m[2]).toISOString() : undefined;
}

function breachData(t: T, timeZone: string, formData: FormData): BreachData | string {
  const title = text(formData, "title");
  const description = text(formData, "description");
  const severity = text(formData, "severity") as BreachSeverity;
  const detectedAt = instant(timeZone, formData, "detectedAt");
  const affectedRaw = text(formData, "estimatedAffected");
  const estimatedAffected = affectedRaw === "" ? null : Number(affectedRaw);
  const affectedDataTypes = formData.getAll("affectedDataTypes").map(String);

  if (!title) return t("Enter a title");
  if (!detectedAt) return t("Enter when the breach was detected");
  if (!BREACH_SEVERITIES.includes(severity)) return t("Choose a severity");
  if (!description) return t("Describe the breach");
  if (estimatedAffected !== null && (!Number.isInteger(estimatedAffected) || estimatedAffected < 0)) {
    return t("People affected must be a whole number");
  }
  if (affectedDataTypes.some((d) => !(d in DATA_TYPE_LABELS))) return t("Choose data types from the list");
  const breachType = text(formData, "breachType") || null;
  if (breachType && !(breachType in BREACH_TYPE_LABELS)) return t("Choose a type of breach from the list");
  const occurredAt = instant(timeZone, formData, "occurredAt");
  if (occurredAt === undefined) return t("Enter a valid date for when it happened");
  if (occurredAt && occurredAt > detectedAt) return t("A breach cannot have happened after it was detected");
  return {
    title,
    detectedAt,
    severity,
    description,
    affectedDataTypes,
    estimatedAffected,
    breachType,
    occurredAt,
    rootCause: text(formData, "rootCause") || null,
    containmentMeasures: text(formData, "containmentMeasures") || null,
    mitigationMeasures: text(formData, "mitigationMeasures") || null,
  };
}

export async function saveBreach(_prev: BreachFormState, formData: FormData): Promise<BreachFormState> {
  const t = await getT();
  const id = text(formData, "breachId");
  const { timeZone } = await centerLocale();
  const data = breachData(t, timeZone, formData);
  if (typeof data === "string") return { error: data };

  let savedId = id;
  try {
    if (id) {
      const update: BreachUpdate = { ...data };
      // Sent only when the form shows them: once reported, once resolved.
      if (formData.has("reportedAt")) {
        const reportedAt = instant(timeZone, formData, "reportedAt");
        if (!reportedAt) return { error: t("Enter when the breach was reported") };
        update.reportedAt = reportedAt;
        update.authorityReference = text(formData, "authorityReference") || null;
      }
      if (formData.has("resolutionDate")) {
        const resolutionDate = instant(timeZone, formData, "resolutionDate");
        if (!resolutionDate) return { error: t("Enter when the breach was resolved") };
        const resolutionDetails = text(formData, "resolutionDetails");
        if (!resolutionDetails) return { error: t("Describe how the breach was resolved") };
        update.resolutionDate = resolutionDate;
        update.resolutionDetails = resolutionDetails;
      }
      if (formData.has("customersNotifiedAt")) {
        const notifiedAt = instant(timeZone, formData, "customersNotifiedAt");
        if (!notifiedAt) return { error: t("Enter when the customers were notified") };
        const method = text(formData, "customersNotifiedMethod");
        if (!(method in NOTIFY_METHOD_LABELS)) return { error: t("Choose how the customers were notified") };
        update.customersNotifiedAt = notifiedAt;
        update.customersNotifiedMethod = method;
      }
      await updateBreach(id, update);
    } else {
      savedId = (await createBreach(data)).id;
    }
  } catch (e) {
    return fail(e, t("The breach could not be saved"));
  }
  revalidatePath("/dashboard/breaches");
  redirect(`/dashboard/breaches?breach=${savedId}`);
}

export async function moveBreach(_prev: BreachFormState, formData: FormData): Promise<BreachFormState> {
  const t = await getT();
  const id = text(formData, "breachId");
  const status = text(formData, "status") as BreachStatus;
  if (!BREACH_STATUSES.includes(status)) return { error: t("Choose a status") };
  const change: BreachStatusChange = { status };
  const { timeZone } = await centerLocale();
  if (status === "REPORTED") {
    const reportedAt = instant(timeZone, formData, "reportedAt");
    if (reportedAt === undefined) return { error: t("Enter a valid report date") };
    if (reportedAt) change.reportedAt = reportedAt;
    const reference = text(formData, "authorityReference");
    if (reference) change.authorityReference = reference;
  }
  if (status === "RESOLVED") {
    const resolutionDate = instant(timeZone, formData, "resolutionDate");
    if (resolutionDate === undefined) return { error: t("Enter a valid resolution date") };
    if (resolutionDate) change.resolutionDate = resolutionDate;
    change.resolutionDetails = text(formData, "resolutionDetails");
  }
  try {
    await changeBreachStatus(id, change);
  } catch (e) {
    return fail(e, t("The status could not be changed"));
  }
  revalidatePath("/dashboard/breaches");
  return { ok: true };
}

// The people affected have been told: records how, and when (now when left
// empty).
export async function notifyCustomersAction(_prev: BreachFormState, formData: FormData): Promise<BreachFormState> {
  const t = await getT();
  const id = text(formData, "breachId");
  const method = text(formData, "method");
  if (!(method in NOTIFY_METHOD_LABELS)) return { error: t("Choose how the customers were notified") };
  const { timeZone } = await centerLocale();
  const notifiedAt = instant(timeZone, formData, "notifiedAt");
  if (notifiedAt === undefined) return { error: t("Enter a valid notification date") };
  try {
    await notifyBreachCustomers(id, method, notifiedAt ?? undefined);
  } catch (e) {
    return fail(e, t("The notification could not be recorded"));
  }
  revalidatePath("/dashboard/breaches");
  return { ok: true };
}

export async function removeBreach(_prev: BreachFormState, formData: FormData): Promise<BreachFormState> {
  const t = await getT();
  try {
    await deleteBreach(text(formData, "id"));
  } catch (e) {
    return fail(e, t("The breach could not be deleted"));
  }
  revalidatePath("/dashboard/breaches");
  redirect("/dashboard/breaches");
}
