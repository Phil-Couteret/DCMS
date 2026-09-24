"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormAction } from "@/lib/use-form-action";
import { changeStaffStatus, saveAvailability, type FormState } from "@/app/dashboard/staff/actions";
import { Button } from "@/components/ui/button";
import type { StaffStatus } from "@/lib/api";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

export function StatusToggle({ staffId, status }: { staffId: string; status: StaffStatus }) {
  const [state, action, pending] = useActionState<FormState, FormData>(changeStaffStatus, null);
  const next: StaffStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="staffId" value={staffId} />
      <input type="hidden" name="status" value={next} />
      <Button type="submit" variant={next === "INACTIVE" ? "outline" : "default"} disabled={pending}>
        {pending ? "Saving…" : next === "INACTIVE" ? "Mark Inactive" : "Mark Active"}
      </Button>
      {state?.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function AvailabilityForm({ staffId, today }: { staffId: string; today: string }) {
  const [state, onSubmit, pending] = useFormAction<FormState>(saveAvailability, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="staffId" value={staffId} />
      <label className="block max-w-xs text-sm font-medium text-zinc-700">
        Date
        <input type="date" name="date" required min={today} defaultValue={today} className={control} />
      </label>
      <fieldset>
        <legend className="text-sm font-medium text-zinc-700">Available</legend>
        <div className="mt-1 flex gap-4 text-sm text-zinc-900">
          <label className="flex items-center gap-2">
            <input type="radio" name="available" value="yes" defaultChecked /> Yes
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="available" value="no" /> No
          </label>
        </div>
      </fieldset>
      <label className="block text-sm font-medium text-zinc-700">
        Reason (optional)
        <input name="reason" maxLength={200} placeholder="e.g. Course, holiday" className={control} />
      </label>
      <p className="text-xs text-zinc-500">Saving replaces any entry already set for that day.</p>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save availability"}
        </Button>
        {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
        {state?.ok && <p role="status" className="text-sm text-green-700">Saved.</p>}
      </div>
    </form>
  );
}
