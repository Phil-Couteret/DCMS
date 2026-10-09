"use client";

import { Badge } from "@/components/ui/badge";
import type { StaffStatus } from "@/lib/api";
import { useT } from "@/lib/i18n/client";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/staff";

export function StaffStatusBadge({ status }: { status: StaffStatus }) {
  const t = useT();
  return <Badge className={STATUS_STYLES[status]}>{t(STATUS_LABELS[status])}</Badge>;
}
