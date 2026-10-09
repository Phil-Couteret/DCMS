import { Badge } from "@/components/ui/badge";
import type { EquipmentCondition, EquipmentStatus } from "@/lib/api";
import { CONDITION_LABELS, CONDITION_STYLES, STATUS_LABELS, STATUS_STYLES } from "@/lib/equipment";
import { getT } from "@/lib/i18n/server";

// Server components (the equipment pages).
export async function EquipmentStatusBadge({ status }: { status: EquipmentStatus }) {
  const t = await getT();
  return <Badge className={STATUS_STYLES[status]}>{t(STATUS_LABELS[status])}</Badge>;
}

export async function ConditionBadge({ condition }: { condition: EquipmentCondition }) {
  const t = await getT();
  return <Badge className={CONDITION_STYLES[condition]}>{t(CONDITION_LABELS[condition])}</Badge>;
}
