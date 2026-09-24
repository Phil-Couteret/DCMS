"use client";

import { useActionState, useEffect, useRef } from "react";
import { logMaintenance, scheduleMaintenance, type FormState } from "@/app/dashboard/equipment/actions";
import { Button } from "@/components/ui/button";
import { MAINTENANCE_TYPES } from "@/lib/equipment";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

function Feedback({ state, success }: { state: FormState; success: string }) {
  if (state?.error) return <p role="alert" className="text-sm text-destructive">{state.error}</p>;
  if (state?.ok) return <p role="status" className="text-sm text-green-700">{success}</p>;
  return null;
}

export function ScheduleForm({ equipmentId, current }: { equipmentId: string; current: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(scheduleMaintenance, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="equipmentId" value={equipmentId} />
      <label className="block text-sm font-medium text-zinc-700">
        Next maintenance
        <input
          type="date"
          name="nextMaintenance"
          defaultValue={current?.slice(0, 10) ?? ""}
          className={control}
        />
      </label>
      <p className="text-xs text-zinc-500">Leave empty and save to clear the schedule.</p>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save date"}
        </Button>
        <Feedback state={state} success="Saved." />
      </div>
    </form>
  );
}

export function LogMaintenanceForm({ equipmentId, today }: { equipmentId: string; today: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(logMaintenance, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action} className="space-y-3">
      <input type="hidden" name="equipmentId" value={equipmentId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-zinc-700">
          Date
          <input type="date" name="date" required max={today} defaultValue={today} className={control} />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Type
          <select name="type" required defaultValue="routine" className={control}>
            {MAINTENANCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Technician
          <input name="technician" required maxLength={100} className={control} />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Cost (€, optional)
          <input name="cost" type="number" min="0" step="0.01" inputMode="decimal" className={control} />
        </label>
      </div>
      <label className="block text-sm font-medium text-zinc-700">
        Notes (optional)
        <textarea name="notes" rows={3} maxLength={2000} className={control} />
      </label>
      <p className="text-xs text-zinc-500">
        Logging the newest entry sets last maintenance to its date and clears the next date, so schedule it again.
      </p>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Log maintenance"}
        </Button>
        <Feedback state={state} success="Maintenance logged." />
      </div>
    </form>
  );
}
