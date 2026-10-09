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
import { CONDITIONS, EQUIPMENT_STATUSES, MAINTENANCE_TYPES, STATUS_ACTIONS, STATUS_LABELS } from "@/lib/equipment";
import { getT } from "@/lib/i18n/server";

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
  const t = await getT();
  if (!EQUIPMENT_STATUSES.includes(to)) return { error: t("Unknown status") };
  try {
    // Checked against the current status, which may have changed since the
    // page was rendered.
    const current = await getEquipmentItem(id);
    if (!STATUS_ACTIONS[current.status].some((a) => a.to === to)) {
      return {
        error: t("Cannot move {from} equipment to {to}", {
          from: t(STATUS_LABELS[current.status]).toLowerCase(),
          to: t(STATUS_LABELS[to]).toLowerCase(),
        }),
      };
    }
    await updateEquipment(id, { status: to });
  } catch (e) {
    return { error: message(e, t("Update failed")) };
  }
  refresh(id);
  return { ok: true };
}

export async function scheduleMaintenance(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("equipmentId") ?? "");
  const date = String(formData.get("nextMaintenance") ?? "");
  const t = await getT();
  // An empty date clears the schedule.
  if (date && !ISO_DATE.test(date)) return { error: t("Choose a valid date") };
  try {
    await updateEquipment(id, { nextMaintenance: date || null });
  } catch (e) {
    return { error: message(e, t("Could not save the date")) };
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

  const t = await getT();
  if (!ISO_DATE.test(date)) return { error: t("Choose a valid date") };
  if (!technician) return { error: t("Enter the technician") };
  if (!(MAINTENANCE_TYPES as readonly string[]).includes(type)) return { error: t("Choose a type") };
  if (cost !== undefined && (!Number.isFinite(cost) || cost < 0)) return { error: t("Cost must be a positive amount") };

  try {
    await addMaintenanceLog(id, { date, technician, type, ...(notes && { notes }), ...(cost !== undefined && { cost }) });
  } catch (e) {
    return { error: message(e, t("Could not save the entry")) };
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
  const t = await getT();
  if (!data.type) return { error: t("Choose a type") };
  if (!data.brand) return { error: t("Enter the brand") };
  if (!EQUIPMENT_STATUSES.includes(data.status)) return { error: t("Choose a status") };
  if (!CONDITIONS.includes(data.condition)) return { error: t("Choose a condition") };
  if (!ISO_DATE.test(data.purchaseDate)) return { error: t("Enter the purchase date") };
  if (!/^\d{1,8}([.,]\d{1,2})?$/.test(cost)) return { error: t("The purchase cost is an amount with at most 2 decimals") };
  data.purchaseCost = Number(cost.replace(",", "."));
  for (const [field, error] of [
    ["lastMaintenance", "Enter a valid last maintenance date"],
    ["nextMaintenance", "Enter a valid next maintenance date"],
  ] as const) {
    const v = data[field];
    if (v && !ISO_DATE.test(v)) return { error: t(error) };
  }
  try {
    if (id) await updateEquipment(id, data);
    else await createEquipment(data);
  } catch (e) {
    return { error: message(e, t("The equipment could not be saved")) };
  }
  revalidatePath("/dashboard/equipment");
  if (id) revalidatePath(`/dashboard/equipment/${id}`);
  const back = text("returnTo");
  redirect(back.startsWith("/dashboard/equipment") ? back : "/dashboard/equipment");
}

export async function removeEquipment(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("equipmentId") ?? "");
  const t = await getT();
  try {
    await deleteEquipment(id);
  } catch (e) {
    return { error: message(e, t("The equipment could not be deleted")) };
  }
  revalidatePath("/dashboard/equipment");
  return { ok: true };
}
