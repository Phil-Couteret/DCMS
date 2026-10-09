"use client";

import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/lib/api";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/bookings";
import { useT } from "@/lib/i18n/client";

export function StatusBadge({ status }: { status: BookingStatus }) {
  const t = useT();
  return <Badge className={STATUS_STYLES[status]}>{t(STATUS_LABELS[status])}</Badge>;
}
