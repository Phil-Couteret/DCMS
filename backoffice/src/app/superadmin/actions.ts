"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { createTenant, TENANT_PLANS, updateTenant, type TenantPlan } from "@/lib/platform";

export type TenantFormState = { error?: string; ok?: boolean } | null;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function fail(e: unknown, fallback: string): TenantFormState {
  return { error: e instanceof ApiError ? e.message : fallback };
}

function fields(formData: FormData) {
  const name = text(formData, "name");
  const slug = text(formData, "slug").toLowerCase();
  const plan = text(formData, "plan") as TenantPlan;
  if (!name) return { error: "Enter the center's name" };
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
    return { error: "The slug takes lowercase letters, digits and hyphens, and cannot start or end with a hyphen" };
  }
  if (!TENANT_PLANS.includes(plan)) return { error: "Choose a plan" };
  return { data: { name, slug, plan } };
}

export async function addTenant(_prev: TenantFormState, formData: FormData): Promise<TenantFormState> {
  const parsed = fields(formData);
  if (!parsed.data) return { error: parsed.error };
  let id: string;
  try {
    ({ id } = await createTenant(parsed.data));
  } catch (e) {
    return fail(e, "The center could not be created");
  }
  revalidatePath("/superadmin");
  redirect(`/superadmin/tenants/${id}`);
}

export async function saveTenant(_prev: TenantFormState, formData: FormData): Promise<TenantFormState> {
  const parsed = fields(formData);
  if (!parsed.data) return { error: parsed.error };
  try {
    await updateTenant(text(formData, "id"), parsed.data);
  } catch (e) {
    return fail(e, "The center could not be saved");
  }
  revalidatePath("/superadmin");
  return { ok: true };
}

// Activate or deactivate (a soft delete: its staff and customers are signed
// out and its data is kept).
export async function setTenantActive(_prev: TenantFormState, formData: FormData): Promise<TenantFormState> {
  try {
    await updateTenant(text(formData, "id"), { isActive: text(formData, "isActive") === "true" });
  } catch (e) {
    return fail(e, "The center could not be updated");
  }
  revalidatePath("/superadmin");
  return { ok: true };
}
