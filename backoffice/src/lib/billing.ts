import type { InvoiceStatus, PaymentMethod, PaymentStatus } from "@/lib/api";

export const INVOICE_STATUSES: InvoiceStatus[] = ["DRAFT", "SENT", "PARTIAL", "PAID", "CANCELLED"];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIAL: "Partially paid",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

export const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  DRAFT: "bg-zinc-200 text-zinc-700",
  SENT: "bg-blue-100 text-blue-900",
  PARTIAL: "bg-yellow-100 text-yellow-900",
  PAID: "bg-green-100 text-green-900",
  CANCELLED: "bg-red-100 text-red-900",
};

export const PAYMENT_METHODS: PaymentMethod[] = ["CARD", "CASH", "TRANSFER"];
export const METHOD_LABELS: Record<PaymentMethod, string> = { CARD: "Card", CASH: "Cash", TRANSFER: "Transfer" };

export const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-900",
  SUCCEEDED: "bg-green-100 text-green-900",
  FAILED: "bg-red-100 text-red-900",
};

// The API refuses to cancel an invoice with succeeded payments; the list
// cannot see payment statuses, so it offers Cancel on these and the API has
// the last word.
export const CANCELLABLE: InvoiceStatus[] = ["DRAFT", "SENT"];

export function eur(value: string | number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number(value));
}

export function formatDay(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Atlantic/Canary",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}
