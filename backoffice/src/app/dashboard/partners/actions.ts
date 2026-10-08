"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ApiError,
  cancelPartnerInvoice,
  createPartner,
  createPartnerInvoice,
  deletePartner,
  recordPartnerPayment,
  regeneratePartnerCredentials,
  updatePartner,
  type PartnerCredentials,
} from "@/lib/api";

// credentials: the API key and the one-time secret, shown once by the page.
export type PartnerFormState = {
  error?: string;
  ok?: boolean;
  partnerId?: string;
  credentials?: PartnerCredentials;
} | null;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function fail(e: unknown, fallback: string): PartnerFormState {
  return { error: e instanceof ApiError ? e.message : fallback };
}

// Euros or percentages with at most two decimals; a comma is accepted.
function decimal(raw: string) {
  const value = raw.replace(",", ".");
  return /^\d+(\.\d{1,2})?$/.test(value) ? Number(value) : null;
}

function refresh(partnerId?: string) {
  revalidatePath("/dashboard/partners");
  if (partnerId) revalidatePath(`/dashboard/partners/${partnerId}`);
}

// Creates a partner (no partnerId) or updates one. A new partner's
// credentials come back in the state, to be shown once.
export async function savePartnerAction(_prev: PartnerFormState, formData: FormData): Promise<PartnerFormState> {
  const partnerId = text(formData, "partnerId");
  const data = {
    name: text(formData, "name"),
    companyName: text(formData, "companyName"),
    contactEmail: text(formData, "contactEmail").toLowerCase(),
    contactPhone: text(formData, "contactPhone") || null,
    commissionRate: decimal(text(formData, "commissionRate")),
    isActive: formData.get("isActive") === "on",
    notes: text(formData, "notes") || null,
  };
  if (partnerId && !UUID.test(partnerId)) return { error: "Unknown partner" };
  if (!data.name) return { error: "Enter the partner's name" };
  if (!data.companyName) return { error: "Enter the company name" };
  if (!EMAIL.test(data.contactEmail)) return { error: "Enter a valid contact email" };
  if (data.commissionRate === null || data.commissionRate > 100) {
    return { error: "Enter the commission as a percentage from 0 to 100, e.g. 15" };
  }
  const values = { ...data, commissionRate: data.commissionRate };

  try {
    if (partnerId) {
      await updatePartner(partnerId, values);
      refresh(partnerId);
      return { ok: true, partnerId };
    }
    const { partner, apiKey, apiSecret } = await createPartner(values);
    refresh();
    return { ok: true, partnerId: partner.id, credentials: { apiKey, apiSecret } };
  } catch (e) {
    return fail(e, "Could not save the partner");
  }
}

export async function regenerateCredentialsAction(_prev: PartnerFormState, formData: FormData): Promise<PartnerFormState> {
  const partnerId = text(formData, "partnerId");
  if (!UUID.test(partnerId)) return { error: "Unknown partner" };
  try {
    const credentials = await regeneratePartnerCredentials(partnerId);
    refresh(partnerId);
    return { ok: true, partnerId, credentials };
  } catch (e) {
    return fail(e, "Could not create new credentials");
  }
}

export async function deletePartnerAction(_prev: PartnerFormState, formData: FormData): Promise<PartnerFormState> {
  const partnerId = text(formData, "partnerId");
  if (!UUID.test(partnerId)) return { error: "Unknown partner" };
  try {
    await deletePartner(partnerId);
  } catch (e) {
    return fail(e, "Could not delete the partner");
  }
  refresh();
  redirect("/dashboard/partners");
}

export async function createPartnerInvoiceAction(_prev: PartnerFormState, formData: FormData): Promise<PartnerFormState> {
  const partnerId = text(formData, "partnerId");
  const from = text(formData, "from");
  const to = text(formData, "to");
  if (!UUID.test(partnerId)) return { error: "Unknown partner" };
  if (!ISO_DATE.test(from) || !ISO_DATE.test(to)) return { error: "Choose the period" };
  let invoiceId: string;
  try {
    invoiceId = (await createPartnerInvoice(partnerId, from, to)).id;
  } catch (e) {
    return fail(e, "Could not create the invoice");
  }
  refresh(partnerId);
  redirect(`/dashboard/partners/invoices/${invoiceId}`);
}

export async function recordPartnerPaymentAction(_prev: PartnerFormState, formData: FormData): Promise<PartnerFormState> {
  const invoiceId = text(formData, "invoiceId");
  const paidAmount = decimal(text(formData, "paidAmount"));
  if (!UUID.test(invoiceId)) return { error: "Unknown invoice" };
  if (paidAmount === null) return { error: "Enter the total paid so far in euros, e.g. 191.00" };
  try {
    const invoice = await recordPartnerPayment(invoiceId, paidAmount);
    refresh(invoice.partnerId);
    revalidatePath(`/dashboard/partners/invoices/${invoiceId}`);
  } catch (e) {
    return fail(e, "Could not record the payment");
  }
  return { ok: true };
}

export async function cancelPartnerInvoiceAction(_prev: PartnerFormState, formData: FormData): Promise<PartnerFormState> {
  const invoiceId = text(formData, "invoiceId");
  if (!UUID.test(invoiceId)) return { error: "Unknown invoice" };
  try {
    const invoice = await cancelPartnerInvoice(invoiceId);
    refresh(invoice.partnerId);
    revalidatePath(`/dashboard/partners/invoices/${invoiceId}`);
  } catch (e) {
    return fail(e, "Could not cancel the invoice");
  }
  return { ok: true };
}
