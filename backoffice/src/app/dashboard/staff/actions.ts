"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addQualification,
  ApiError,
  createStaff,
  deleteQualification,
  setStaffAvailability,
  updateQualification,
  updateStaff,
  updateStaffStatus,
  type StaffStatus,
  type StaffType,
} from "@/lib/api";
import { getT } from "@/lib/i18n/server";
import { STAFF_STATUSES, STAFF_TYPES } from "@/lib/staff";

export type FormState = { error?: string; ok?: boolean } | null;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function refresh(id: string) {
  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${id}`);
  revalidatePath("/dashboard");
}

export async function changeStaffStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getT();
  const id = String(formData.get("staffId") ?? "");
  const status = String(formData.get("status") ?? "") as StaffStatus;
  if (!STAFF_STATUSES.includes(status)) return { error: t("Unknown status") };
  try {
    await updateStaffStatus(id, status);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : t("Update failed") };
  }
  refresh(id);
  return { ok: true };
}

export async function saveAvailability(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getT();
  const id = String(formData.get("staffId") ?? "");
  const date = String(formData.get("date") ?? "");
  const available = formData.get("available") === "yes";
  const reason = String(formData.get("reason") ?? "").trim();
  if (!ISO_DATE.test(date)) return { error: t("Choose a valid date") };
  if (!formData.get("available")) return { error: t("Choose available or unavailable") };
  try {
    await setStaffAvailability(id, date, available, reason || undefined);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : t("Could not save availability") };
  }
  refresh(id);
  return { ok: true };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function fail(e: unknown, fallback: string): FormState {
  return { error: e instanceof ApiError ? e.message : fallback };
}

// Create (no staffId; a userId picks the account) or edit a staff profile.
export async function saveStaff(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getT();
  const id = text(formData, "staffId");
  const data = {
    firstName: text(formData, "firstName"),
    lastName: text(formData, "lastName"),
    phone: text(formData, "phone"),
    type: text(formData, "type") as StaffType,
    status: text(formData, "status") as StaffStatus,
    hireDate: text(formData, "hireDate"),
  };
  if (!data.firstName || !data.lastName) return { error: t("Enter the first and last name") };
  if (!data.phone) return { error: t("Enter a phone number") };
  if (!STAFF_TYPES.includes(data.type)) return { error: t("Choose a type") };
  if (!STAFF_STATUSES.includes(data.status)) return { error: t("Choose a status") };
  if (!ISO_DATE.test(data.hireDate)) return { error: t("Enter the hire date") };
  let savedId = id;
  try {
    if (id) {
      await updateStaff(id, data);
    } else {
      const userId = text(formData, "userId");
      if (!UUID.test(userId)) return { error: t("Choose the account this profile belongs to") };
      savedId = (await createStaff({ ...data, userId })).id;
    }
  } catch (e) {
    return fail(e, t("The staff profile could not be saved"));
  }
  refresh(savedId);
  redirect(`/dashboard/staff/${savedId}`);
}

// Add (no qualificationId) or edit one of a staff member's qualifications.
export async function saveQualification(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getT();
  const staffId = text(formData, "staffId");
  const id = text(formData, "qualificationId");
  const data = {
    type: text(formData, "type"),
    agency: text(formData, "agency"),
    number: text(formData, "number"),
    issueDate: text(formData, "issueDate"),
    expiryDate: text(formData, "expiryDate") || null,
  };
  if (!data.type || !data.agency || !data.number) return { error: t("Enter the type, agency and number") };
  if (!ISO_DATE.test(data.issueDate)) return { error: t("Enter the issue date") };
  if (data.expiryDate && !ISO_DATE.test(data.expiryDate)) return { error: t("Enter a valid expiry date") };
  if (data.expiryDate && data.expiryDate < data.issueDate) return { error: t("The expiry date is before the issue date") };
  try {
    if (id) await updateQualification(staffId, id, data);
    else await addQualification(staffId, data);
  } catch (e) {
    return fail(e, t("The qualification could not be saved"));
  }
  refresh(staffId);
  redirect(`/dashboard/staff/${staffId}`);
}

export async function removeQualification(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getT();
  const staffId = text(formData, "staffId");
  try {
    await deleteQualification(staffId, text(formData, "qualificationId"));
  } catch (e) {
    return fail(e, t("The qualification could not be deleted"));
  }
  refresh(staffId);
  return { ok: true };
}
