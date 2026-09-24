import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@/lib/api";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_STYLES } from "@/lib/billing";

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge className={INVOICE_STATUS_STYLES[status]}>{INVOICE_STATUS_LABELS[status]}</Badge>;
}
