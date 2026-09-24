"use server";

import { revalidatePath } from "next/cache";
import {
  addMaintenanceLog,
  ApiError,
  getEquipmentItem,
  updateEquipment,
  type EquipmentStatus,
} from "@/lib/api";
import { EQUIPMENT_STATUSES, MAINTENANCE_TYPES, STATUS_ACTIONS } from "@/lib/equipment";

export type FormState = { error?: string; ok?: boolean } | null;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function refresh(id: string) {
  revalidatePath("/dashboard/equipment");
  revalidatePath(`/dashboard/equipment/${id}`);
}

function message(e: unknown, fallback: string) {
  return e instanceof ApiError ? e.message : fallback;
}

export async function changeEquipmentStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("equipmentId") ?? "");
  const to = String(formData.get("status") ?? "") as EquipmentStatus;
  if (!EQUIPMENT_STATUSES.includes(to)) return { error: "Unknown status" };
  try {
    // Checked against the current status, which may have changed since the
    // page was rendered.
    const current = await getEquipmentItem(id);
    if (!STATUS_ACTIONS[current.status].some((a) => a.to === to)) {
      return { error: `Cannot move ${current.status.toLowerCase()} equipment to ${to.toLowerCase()}` };
    }
    await updateEquipment(id, { status: to });
  } catch (e) {
    return { error: message(e, "Update failed") };
  }
  refresh(id);
  return { ok: true };
}

export async function scheduleMaintenance(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("equipmentId") ?? "");
  const date = String(formData.get("nextMaintenance") ?? "");
  // An empty date clears the schedule.
  if (date && !ISO_DATE.test(date)) return { error: "Choose a valid date" };
  try {
    await updateEquipment(id, { nextMaintenance: date || null });
  } catch (e) {
    return { error: message(e, "Could not save the date") };
  }
  refresh(id);
  return { ok: true };
}

export async function logMaintenance(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("equipmentId") ?? "");
  const date = String(formData.get("date") ?? "");
  const technician = String(formData.get("technician") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const costText = String(formData.get("cost") ?? "").trim();
  const cost = costText === "" ? undefined : Number(costText);

  if (!ISO_DATE.test(date)) return { error: "Choose a valid date" };
  if (!technician) return { error: "Enter the technician" };
  if (!(MAINTENANCE_TYPES as readonly string[]).includes(type)) return { error: "Choose a type" };
  if (cost !== undefined && (!Number.isFinite(cost) || cost < 0)) return { error: "Cost must be a positive amount" };

  try {
    await addMaintenanceLog(id, { date, technician, type, ...(notes && { notes }), ...(cost !== undefined && { cost }) });
  } catch (e) {
    return { error: message(e, "Could not save the entry") };
  }
  refresh(id);
  return { ok: true };
}
