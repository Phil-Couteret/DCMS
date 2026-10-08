"use client";

import Link from "next/link";
import { useActionState } from "react";
import { moveBreach, removeBreach, saveBreach, type BreachFormState } from "@/app/dashboard/breaches/actions";
import { Button } from "@/components/ui/button";
import type { BreachStatus, DataBreach } from "@/lib/api";
import { BREACH_SEVERITIES, BREACH_STATUS_LABELS, DATA_TYPE_LABELS, nextStatuses, SEVERITY_LABELS } from "@/lib/breaches";
import { centerDateTimeInput } from "@/lib/center-time";
import { useFormAction } from "@/lib/use-form-action";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const label = "block text-sm font-medium text-zinc-700";
const hint = "mt-1 block text-xs font-normal text-zinc-500";

function Status({ state }: { state: BreachFormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {state.error}
    </p>
  );
}

// Create (breach null) or edit. Report details are editable once reported,
// the resolution once resolved; the status itself moves with StatusActions.
// timeZone: the center's; the datetime fields are its wall-clock time.
export function BreachForm({
  breach,
  cancelHref,
  timeZone,
}: {
  breach: DataBreach | null;
  cancelHref: string;
  timeZone: string;
}) {
  const [state, onSubmit, pending] = useFormAction<BreachFormState>(saveBreach, null);
  const selected = new Set(breach?.affectedDataTypes ?? []);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {breach && <input type="hidden" name="breachId" value={breach.id} />}
      <label className={label}>
        Title
        <input name="title" required maxLength={200} defaultValue={breach?.title ?? ""} className={control} />
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          Detected at (center time)
          <input
            type="datetime-local"
            name="detectedAt"
            required
            defaultValue={breach ? centerDateTimeInput(timeZone, breach.detectedAt) : ""}
            className={control}
          />
          <span className={hint}>When the center became aware of it. The 72-hour deadline runs from here.</span>
        </label>
        <label className={label}>
          Severity
          <select name="severity" required defaultValue={breach?.severity ?? "MEDIUM"} className={control}>
            {BREACH_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={label}>
        Description
        <textarea
          name="description"
          required
          rows={5}
          maxLength={20000}
          defaultValue={breach?.description ?? ""}
          className={control}
        />
        <span className={hint}>What happened, how it was found, and what was done to contain it.</span>
      </label>
      <fieldset>
        <legend className={label}>Affected data</legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Object.entries(DATA_TYPE_LABELS).map(([key, name]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                name="affectedDataTypes"
                value={key}
                defaultChecked={selected.has(key)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              {name}
            </label>
          ))}
        </div>
      </fieldset>
      <label className={`${label} sm:w-1/2`}>
        People affected (estimate)
        <input
          type="number"
          name="estimatedAffected"
          min={0}
          step={1}
          defaultValue={breach?.estimatedAffected ?? ""}
          className={control}
        />
        <span className={hint}>Leave empty if not known yet.</span>
      </label>

      {breach?.reportedToAuthority && (
        <fieldset className="space-y-4 border-t border-zinc-200 pt-4">
          <legend className="pt-4 text-sm font-semibold text-zinc-900">Report to the authority</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={label}>
              Reported at (center time)
              <input
                type="datetime-local"
                name="reportedAt"
                required
                defaultValue={breach.reportedAt ? centerDateTimeInput(timeZone, breach.reportedAt) : ""}
                className={control}
              />
            </label>
            <label className={label}>
              Authority reference
              <input
                name="authorityReference"
                maxLength={200}
                defaultValue={breach.authorityReference ?? ""}
                className={control}
              />
            </label>
          </div>
        </fieldset>
      )}

      {breach?.status === "RESOLVED" && (
        <fieldset className="space-y-4 border-t border-zinc-200 pt-4">
          <legend className="pt-4 text-sm font-semibold text-zinc-900">Resolution</legend>
          <label className={`${label} sm:w-1/2`}>
            Resolved at (center time)
            <input
              type="datetime-local"
              name="resolutionDate"
              required
              defaultValue={breach.resolutionDate ? centerDateTimeInput(timeZone, breach.resolutionDate) : ""}
              className={control}
            />
          </label>
          <label className={label}>
            Resolution details
            <textarea
              name="resolutionDetails"
              required
              rows={4}
              maxLength={20000}
              defaultValue={breach.resolutionDetails ?? ""}
              className={control}
            />
          </label>
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : breach ? "Save changes" : "Record breach"}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} prefetch={false} scroll={false} />}>
          Cancel
        </Button>
        <Status state={state} />
      </div>
    </form>
  );
}

const MOVE_COPY: Record<Exclude<BreachStatus, "DETECTED">, { button: string; help: string }> = {
  ASSESSED: {
    button: "Mark as assessed",
    help: "The risk to the people affected has been evaluated.",
  },
  REPORTED: {
    button: "Mark as reported",
    help: "Notified to the supervisory authority (in Spain, the AEPD).",
  },
  RESOLVED: {
    button: "Mark as resolved",
    help: "Closes the incident. A breach unlikely to put anyone at risk can be resolved without reporting it: say why below.",
  },
};

function MoveForm({ breach, to }: { breach: DataBreach; to: Exclude<BreachStatus, "DETECTED"> }) {
  const [state, onSubmit, pending] = useFormAction<BreachFormState>(moveBreach, null);
  const copy = MOVE_COPY[to];
  return (
    <form
      onSubmit={(e) => {
        if (!window.confirm(`Move "${breach.title}" to ${BREACH_STATUS_LABELS[to]}? Statuses only move forward.`)) {
          e.preventDefault();
          return;
        }
        onSubmit(e);
      }}
      className="space-y-3 rounded-lg p-4 ring-1 ring-zinc-200"
    >
      <input type="hidden" name="breachId" value={breach.id} />
      <input type="hidden" name="status" value={to} />
      <p className="text-sm text-zinc-600">{copy.help}</p>
      {to === "REPORTED" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={label}>
            Reported at (center time)
            <input type="datetime-local" name="reportedAt" className={control} />
            <span className={hint}>Leave empty for now.</span>
          </label>
          <label className={label}>
            Authority reference
            <input name="authorityReference" maxLength={200} placeholder="e.g. AEPD case number" className={control} />
          </label>
        </div>
      )}
      {to === "RESOLVED" && (
        <>
          <label className={label}>
            Resolution details
            <textarea name="resolutionDetails" required rows={3} maxLength={20000} className={control} />
            {!breach.reportedToAuthority && (
              <span className={hint}>Not reported to the authority: include why reporting was not required.</span>
            )}
          </label>
          <label className={`${label} sm:w-1/2`}>
            Resolved at (center time)
            <input type="datetime-local" name="resolutionDate" className={control} />
            <span className={hint}>Leave empty for now.</span>
          </label>
        </>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" variant={to === "RESOLVED" ? "default" : "outline"} disabled={pending}>
          {pending ? "Saving…" : copy.button}
        </Button>
        <Status state={state} />
      </div>
    </form>
  );
}

// One form per status the breach can move to.
export function StatusActions({ breach }: { breach: DataBreach }) {
  const next = nextStatuses(breach.status) as Exclude<BreachStatus, "DETECTED">[];
  if (next.length === 0) return null;
  return (
    <div className="space-y-3">
      {next.map((to) => (
        <MoveForm key={`${breach.status}-${to}`} breach={breach} to={to} />
      ))}
    </div>
  );
}

// Only while Detected: a breach logged by mistake.
export function DeleteBreachButton({ breach }: { breach: DataBreach }) {
  const [state, action, pending] = useActionState<BreachFormState, FormData>(removeBreach, null);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Delete "${breach.title}"? Only do this for a breach recorded by mistake.`)) e.preventDefault();
      }}
      className="flex flex-col items-start gap-1"
    >
      <input type="hidden" name="id" value={breach.id} />
      <Button type="submit" size="sm" variant="ghost" className="text-destructive" disabled={pending}>
        {pending ? "Deleting…" : "Delete"}
      </Button>
      <Status state={state} />
    </form>
  );
}
