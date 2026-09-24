import { Badge } from "@/components/ui/badge";
import type { StaffStatus } from "@/lib/api";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/staff";

export function StaffStatusBadge({ status }: { status: StaffStatus }) {
  return <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>;
}
