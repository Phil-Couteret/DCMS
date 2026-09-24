import { Badge } from "@/components/ui/badge";
import type { EquipmentCondition, EquipmentStatus } from "@/lib/api";
import { CONDITION_LABELS, CONDITION_STYLES, STATUS_LABELS, STATUS_STYLES } from "@/lib/equipment";

export function EquipmentStatusBadge({ status }: { status: EquipmentStatus }) {
  return <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function ConditionBadge({ condition }: { condition: EquipmentCondition }) {
  return <Badge className={CONDITION_STYLES[condition]}>{CONDITION_LABELS[condition]}</Badge>;
}
