"use server";

import { revalidatePath } from "next/cache";
import { ApiError, setStaffAvailability, updateStaffStatus, type StaffStatus } from "@/lib/api";
import { STAFF_STATUSES } from "@/lib/staff";

export type FormState = { error?: string; ok?: boolean } | null;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function refresh(id: string) {
  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${id}`);
  revalidatePath("/dashboard");
}

export async function changeStaffStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("staffId") ?? "");
  const status = String(formData.get("status") ?? "") as StaffStatus;
  if (!STAFF_STATUSES.includes(status)) return { error: "Unknown status" };
  try {
    await updateStaffStatus(id, status);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Update failed" };
  }
  refresh(id);
  return { ok: true };
}

export async function saveAvailability(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("staffId") ?? "");
  const date = String(formData.get("date") ?? "");
  const available = formData.get("available") === "yes";
  const reason = String(formData.get("reason") ?? "").trim();
  if (!ISO_DATE.test(date)) return { error: "Choose a valid date" };
  if (!formData.get("available")) return { error: "Choose available or unavailable" };
  try {
    await setStaffAvailability(id, date, available, reason || undefined);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Could not save availability" };
  }
  refresh(id);
  return { ok: true };
}
