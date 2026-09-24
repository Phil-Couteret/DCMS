"use client";

import { useActionState } from "react";
import { changeEquipmentStatus, type FormState } from "@/app/dashboard/equipment/actions";
import { Button } from "@/components/ui/button";
import type { EquipmentStatus } from "@/lib/api";
import { STATUS_ACTIONS } from "@/lib/equipment";

export function EquipmentStatusActions({ equipmentId, status }: { equipmentId: string; status: EquipmentStatus }) {
  const [state, action, pending] = useActionState<FormState, FormData>(changeEquipmentStatus, null);
  const actions = STATUS_ACTIONS[status];
  if (actions.length === 0) return <span className="text-xs text-zinc-400">—</span>;

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="equipmentId" value={equipmentId} />
      <div className="flex flex-wrap justify-end gap-1.5">
        {actions.map((a) => (
          <Button
            key={a.to}
            type="submit"
            name="status"
            value={a.to}
            size="sm"
            variant={a.to === "DECOMMISSIONED" ? "outline" : "default"}
            disabled={pending}
            onClick={(e) => {
              // Decommissioning takes the item out of service for good.
              if (a.to === "DECOMMISSIONED" && !window.confirm("Decommission this item? It will be taken out of service.")) {
                e.preventDefault();
              }
            }}
          >
            {a.label}
          </Button>
        ))}
      </div>
      {state?.error && (
        <p role="alert" className="max-w-64 text-right text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
