"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import {
  createTenant,
  inviteToTenant,
  QUOTA_LABELS,
  TENANT_PLANS,
  updateTenant,
  type Quotas,
  type SentInvitation,
  type TenantPlan,
} from "@/lib/platform";

export type TenantFormState = {
  error?: string;
  ok?: boolean;
  // After a create: the new center, and its first admin's invitation.
  created?: { id: string; name: string; invitation: SentInvitation | null };
  // After an invitation.
  invited?: SentInvitation;
} | null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const taxRateRaw = text(formData, "taxRate");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(taxRateRaw) || Number(taxRateRaw) > 100) {
    return { error: "Tax rate must be a percentage between 0 and 100, with at most 2 decimals" };
  }
  const taxName = text(formData, "taxName");
  if (!taxName) return { error: "Enter the tax name" };
  const adminEmail = text(formData, "adminEmail");
  if (adminEmail && !EMAIL.test(adminEmail)) return { error: "Enter a valid email for the first admin" };
  try {
    const { tenant, invitation } = await createTenant({
      ...parsed.data,
      timeZone: text(formData, "timeZone"),
      currency: text(formData, "currency"),
      defaultLanguage: text(formData, "defaultLanguage"),
      taxName,
      taxRate: Number(taxRateRaw),
      firstLocation: { name: text(formData, "locationName") || parsed.data.name, type: text(formData, "locationType") || "DIVING" },
      ...(adminEmail && { firstAdmin: { email: adminEmail, name: text(formData, "adminName") || undefined } }),
    });
    revalidatePath("/superadmin");
    return { created: { id: tenant.id, name: tenant.name, invitation } };
  } catch (e) {
    return fail(e, "The center could not be created");
  }
}

// Invites someone to a center's staff, by email.
export async function inviteAction(_prev: TenantFormState, formData: FormData): Promise<TenantFormState> {
  const email = text(formData, "email");
  if (!EMAIL.test(email)) return { error: "Enter a valid email" };
  const role = text(formData, "role") === "INSTRUCTOR" ? "INSTRUCTOR" : "ADMIN";
  try {
    const invited = await inviteToTenant(text(formData, "id"), { email, name: text(formData, "name") || undefined, role });
    revalidatePath(`/superadmin/tenants/${text(formData, "id")}`);
    return { invited };
  } catch (e) {
    return fail(e, "The invitation could not be sent");
  }
}

// The authorized limits shown against usage.
export async function saveQuotas(_prev: TenantFormState, formData: FormData): Promise<TenantFormState> {
  const quotas: Partial<Quotas> = {};
  for (const key of Object.keys(QUOTA_LABELS) as (keyof Quotas)[]) {
    const raw = text(formData, key);
    const n = Number(raw);
    const whole = key !== "storagePricePerGbMonth";
    if (raw === "" || !Number.isFinite(n) || n < 0 || (whole && !Number.isInteger(n))) {
      return { error: `${QUOTA_LABELS[key]}: enter ${whole ? "a whole number" : "an amount"} of 0 or more` };
    }
    quotas[key] = whole ? n : Math.round(n * 100) / 100;
  }
  try {
    await updateTenant(text(formData, "id"), { quotas });
  } catch (e) {
    return fail(e, "The quotas could not be saved");
  }
  revalidatePath("/superadmin");
  return { ok: true };
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
