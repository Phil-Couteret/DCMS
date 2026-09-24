"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addPayment,
  addRefund,
  ApiError,
  cancelInvoice,
  createInvoiceFromBooking,
  markInvoiceSent,
  type PaymentMethod,
} from "@/lib/api";
import { PAYMENT_METHODS } from "@/lib/billing";

export type FormState = { error?: string; ok?: boolean } | null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function fail(e: unknown, fallback: string): FormState {
  return { error: e instanceof ApiError ? e.message : fallback };
}

function refresh(id: string) {
  revalidatePath("/dashboard/billing");
  revalidatePath(`/dashboard/billing/${id}`);
}

// Amounts in euros with at most two decimals, entered as text.
function money(raw: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const n = Number(raw);
  return n > 0 ? n : null;
}

export async function createFromBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  const bookingId = text(formData, "bookingId");
  if (!UUID.test(bookingId)) return { error: "Enter a booking ID (the booking reference)" };
  let id: string;
  try {
    id = (await createInvoiceFromBooking(bookingId)).id;
  } catch (e) {
    return fail(e, "Could not create the invoice");
  }
  revalidatePath("/dashboard/billing");
  redirect(`/dashboard/billing/${id}`);
}

export async function markSent(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "invoiceId");
  try {
    await markInvoiceSent(id);
  } catch (e) {
    return fail(e, "Could not mark as sent");
  }
  refresh(id);
  return { ok: true };
}

export async function cancel(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "invoiceId");
  try {
    await cancelInvoice(id);
  } catch (e) {
    return fail(e, "Could not cancel the invoice");
  }
  refresh(id);
  return { ok: true };
}

export async function recordPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "invoiceId");
  const amount = money(text(formData, "amount"));
  const method = text(formData, "method") as PaymentMethod;
  const stripePaymentId = text(formData, "stripePaymentId");
  if (amount === null) return { error: "Enter an amount above zero, with at most two decimals" };
  if (!PAYMENT_METHODS.includes(method)) return { error: "Choose a method" };
  try {
    await addPayment(id, { amount, method, ...(stripePaymentId && { stripePaymentId }) });
  } catch (e) {
    return fail(e, "Could not record the payment");
  }
  refresh(id);
  return { ok: true };
}

export async function recordRefund(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "invoiceId");
  const paymentId = text(formData, "paymentId");
  const amount = money(text(formData, "amount"));
  const reason = text(formData, "reason");
  if (amount === null) return { error: "Enter an amount above zero, with at most two decimals" };
  if (!reason) return { error: "Enter a reason" };
  try {
    await addRefund(id, paymentId, { amount, reason });
  } catch (e) {
    return fail(e, "Could not record the refund");
  }
  refresh(id);
  return { ok: true };
}
