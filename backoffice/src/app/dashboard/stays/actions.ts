"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addStayCost, ApiError, billStay, deleteStayCost, updateStayCost, type StayCostCategory } from "@/lib/api";
import { getT } from "@/lib/i18n/server";
import { STAY_COST_CATEGORIES } from "@/lib/stays";

export type StayFormState = { error?: string; ok?: boolean } | null;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function fail(e: unknown, fallback: string): StayFormState {
  return { error: e instanceof ApiError ? e.message : fallback };
}

// Amounts in euros with at most two decimals, entered as text; a comma is
// accepted as the decimal separator.
function money(raw: string) {
  const value = raw.replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  return Number(value);
}

// Adds a cost (no costId) or replaces one.
export async function saveCostAction(_prev: StayFormState, formData: FormData): Promise<StayFormState> {
  const t = await getT();
  const customerId = text(formData, "customerId");
  const costId = text(formData, "costId");
  const date = text(formData, "date");
  const category = text(formData, "category") as StayCostCategory;
  const description = text(formData, "description");
  const quantity = Number(text(formData, "quantity"));
  const unitPrice = money(text(formData, "unitPrice"));
  const notes = text(formData, "notes");

  if (!UUID.test(customerId) || (costId && !UUID.test(costId))) return { error: t("Unknown stay") };
  if (!ISO_DATE.test(date)) return { error: t("Choose a date") };
  if (!STAY_COST_CATEGORIES.includes(category)) return { error: t("Choose a category") };
  if (!description && category !== "BEVERAGES") return { error: t("Enter a description") };
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return { error: t("Enter a quantity from 1 to 999") };
  if (unitPrice === null) return { error: t("Enter the unit price in euros, e.g. 2.50") };

  const data = { date, category, description: description || undefined, quantity, unitPrice, notes };
  try {
    await (costId ? updateStayCost(costId, data) : addStayCost(customerId, data));
  } catch (e) {
    return fail(e, t("Could not save the cost"));
  }
  revalidatePath("/dashboard/stays");
  return { ok: true };
}

export async function deleteCostAction(_prev: StayFormState, formData: FormData): Promise<StayFormState> {
  const t = await getT();
  const costId = text(formData, "costId");
  if (!UUID.test(costId)) return { error: t("Unknown cost") };
  try {
    await deleteStayCost(costId);
  } catch (e) {
    return fail(e, t("Could not delete the cost"));
  }
  revalidatePath("/dashboard/stays");
  return { ok: true };
}

export async function billStayAction(_prev: StayFormState, formData: FormData): Promise<StayFormState> {
  const t = await getT();
  const customerId = text(formData, "customerId");
  if (!UUID.test(customerId)) return { error: t("Unknown stay") };
  let invoiceId: string;
  try {
    invoiceId = (await billStay(customerId, formData.get("usePack") === "1")).invoiceId;
  } catch (e) {
    return fail(e, t("Could not bill the stay"));
  }
  revalidatePath("/dashboard/stays");
  revalidatePath("/dashboard/billing");
  redirect(`/dashboard/billing/${invoiceId}`);
}
