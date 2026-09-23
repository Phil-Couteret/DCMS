import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/lib/api";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/bookings";

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>;
}
