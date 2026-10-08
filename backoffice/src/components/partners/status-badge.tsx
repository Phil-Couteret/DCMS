import type { PartnerInvoice } from "@/lib/api";
import { displayStatus, PARTNER_INVOICE_LABELS, PARTNER_INVOICE_STYLES } from "@/lib/partners";

export function PartnerInvoiceBadge({ invoice, today }: { invoice: Pick<PartnerInvoice, "status" | "dueDate">; today: string }) {
  const status = displayStatus(invoice, today);
  return <span className={`rounded px-2 py-0.5 text-xs font-semibold ${PARTNER_INVOICE_STYLES[status]}`}>{PARTNER_INVOICE_LABELS[status]}</span>;
}
