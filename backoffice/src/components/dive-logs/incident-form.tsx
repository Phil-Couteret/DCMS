"use client";

import { useState } from "react";
import { submitIncident, type FormState } from "@/app/dashboard/dive-logs/actions";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/lib/use-form-action";
import { SEVERITIES, SEVERITY_LABELS } from "@/lib/dive-logs";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const label = "block text-sm font-medium text-zinc-700";

export function ReportIncident({ logId }: { logId: string }) {
  const [open, setOpen] = useState(false);
  const [state, onSubmit, pending] = useFormAction<FormState>(submitIncident, null);

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-zinc-500">No incident reported.</p>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Report Incident
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="logId" value={logId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          Type
          <input name="type" required maxLength={100} placeholder="e.g. Rapid ascent" className={control} />
        </label>
        <label className={label}>
          Severity
          <select name="severity" required defaultValue="" className={control}>
            <option value="" disabled>
              Choose…
            </option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={label}>
        Description
        <textarea name="description" required rows={3} className={control} />
      </label>
      <label className={label}>
        Actions taken
        <textarea name="actionsTaken" required rows={3} className={control} />
      </label>
      <label className="flex items-center gap-2 text-sm text-zinc-900">
        <input type="checkbox" name="reportedToAuthorities" className="h-4 w-4" /> Reported to authorities
      </label>
      {state?.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Reporting…" : "Submit report"}
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
