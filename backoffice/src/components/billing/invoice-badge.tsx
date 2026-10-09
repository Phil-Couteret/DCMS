"use client";

import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@/lib/api";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_STYLES } from "@/lib/billing";
import { useT } from "@/lib/i18n/client";

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const t = useT();
  return <Badge className={INVOICE_STATUS_STYLES[status]}>{t(INVOICE_STATUS_LABELS[status])}</Badge>;
}
