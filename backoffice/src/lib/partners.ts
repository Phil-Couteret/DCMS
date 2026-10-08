import type { PartnerInvoice, PartnerInvoiceStatus } from "@/lib/api";

export const PARTNER_INVOICE_STATUSES: PartnerInvoiceStatus[] = ["PENDING", "PARTIAL", "PAID", "CANCELLED"];

// "OVERDUE" is shown, never stored: unpaid and past its due date.
export type PartnerInvoiceDisplayStatus = PartnerInvoiceStatus | "OVERDUE";

export const PARTNER_INVOICE_LABELS: Record<PartnerInvoiceDisplayStatus, string> = {
  PENDING: "Pending",
  PARTIAL: "Partially paid",
  PAID: "Paid",
  CANCELLED: "Cancelled",
  OVERDUE: "Overdue",
};

export const PARTNER_INVOICE_STYLES: Record<PartnerInvoiceDisplayStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  PARTIAL: "bg-blue-100 text-blue-900",
  PAID: "bg-green-100 text-green-900",
  CANCELLED: "bg-zinc-200 text-zinc-700",
  OVERDUE: "bg-red-100 text-red-900",
};

export function displayStatus(invoice: Pick<PartnerInvoice, "status" | "dueDate">, today: string): PartnerInvoiceDisplayStatus {
  const open = invoice.status === "PENDING" || invoice.status === "PARTIAL";
  return open && invoice.dueDate.slice(0, 10) < today ? "OVERDUE" : invoice.status;
}

export function outstanding(invoice: Pick<PartnerInvoice, "status" | "total" | "paidAmount">) {
  return invoice.status === "CANCELLED" ? 0 : Number(invoice.total) - Number(invoice.paidAmount);
}

// "15.00" → "15%", "12.50" → "12.5%".
export function percent(value: string) {
  return `${Number(value)}%`;
}
