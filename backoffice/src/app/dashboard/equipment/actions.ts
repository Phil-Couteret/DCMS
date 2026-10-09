"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addMaintenanceLog,
  ApiError,
  createEquipment,
  deleteEquipment,
  getEquipmentItem,
  updateEquipment,
  type EquipmentCondition,
  type EquipmentData,
  type EquipmentStatus,
} from "@/lib/api";
import { CONDITIONS, EQUIPMENT_STATUSES, MAINTENANCE_TYPES, STATUS_ACTIONS } from "@/lib/equipment";

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

// Create (no equipmentId) or edit an item. Back to the list afterwards,
// keeping its filters (returnTo).
export async function saveEquipment(_prev: FormState, formData: FormData): Promise<FormState> {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const id = text("equipmentId");
  const cost = text("purchaseCost");
  const data: EquipmentData = {
    type: text("type").toLowerCase(),
    brand: text("brand"),
    model: text("model") || null,
    size: text("size") || null,
    serialNumber: text("serialNumber") || null,
    status: text("status") as EquipmentStatus,
    condition: text("condition") as EquipmentCondition,
    purchaseDate: text("purchaseDate"),
    purchaseCost: Number(cost),
    lastMaintenance: text("lastMaintenance") || null,
    nextMaintenance: text("nextMaintenance") || null,
  };
  if (!data.type) return { error: "Choose a type" };
  if (!data.brand) return { error: "Enter the brand" };
  if (!EQUIPMENT_STATUSES.includes(data.status)) return { error: "Choose a status" };
  if (!CONDITIONS.includes(data.condition)) return { error: "Choose a condition" };
  if (!ISO_DATE.test(data.purchaseDate)) return { error: "Enter the purchase date" };
  if (!/^\d{1,8}([.,]\d{1,2})?$/.test(cost)) return { error: "The purchase cost is an amount with at most 2 decimals" };
  data.purchaseCost = Number(cost.replace(",", "."));
  for (const [field, name] of [["lastMaintenance", "last maintenance"], ["nextMaintenance", "next maintenance"]] as const) {
    const v = data[field];
    if (v && !ISO_DATE.test(v)) return { error: `Enter a valid ${name} date` };
  }
  try {
    if (id) await updateEquipment(id, data);
    else await createEquipment(data);
  } catch (e) {
    return { error: message(e, "The equipment could not be saved") };
  }
  revalidatePath("/dashboard/equipment");
  if (id) revalidatePath(`/dashboard/equipment/${id}`);
  const back = text("returnTo");
  redirect(back.startsWith("/dashboard/equipment") ? back : "/dashboard/equipment");
}

export async function removeEquipment(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("equipmentId") ?? "");
  try {
    await deleteEquipment(id);
  } catch (e) {
    return { error: message(e, "The equipment could not be deleted") };
  }
  revalidatePath("/dashboard/equipment");
  return { ok: true };
}
