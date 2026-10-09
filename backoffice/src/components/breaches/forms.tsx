"use client";

import Link from "next/link";
import { useActionState } from "react";
import { moveBreach, notifyCustomersAction, removeBreach, saveBreach, type BreachFormState } from "@/app/dashboard/breaches/actions";
import { Button } from "@/components/ui/button";
import type { BreachStatus, DataBreach } from "@/lib/api";
import {
  BREACH_SEVERITIES,
  BREACH_STATUS_LABELS,
  BREACH_TYPE_LABELS,
  DATA_TYPE_LABELS,
  nextStatuses,
  NOTIFY_METHOD_LABELS,
  SEVERITY_LABELS,
} from "@/lib/breaches";
import { centerDateTimeInput } from "@/lib/center-time";
import { useT } from "@/lib/i18n/client";
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
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<BreachFormState>(saveBreach, null);
  const selected = new Set(breach?.affectedDataTypes ?? []);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {breach && <input type="hidden" name="breachId" value={breach.id} />}
      <label className={label}>
        {t("Title")}
        <input name="title" required maxLength={200} defaultValue={breach?.title ?? ""} className={control} />
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          {t("Detected at (center time)")}
          <input
            type="datetime-local"
            name="detectedAt"
            required
            defaultValue={breach ? centerDateTimeInput(timeZone, breach.detectedAt) : ""}
            className={control}
          />
          <span className={hint}>{t("When the center became aware of it. The 72-hour deadline runs from here.")}</span>
        </label>
        <label className={label}>
          {t("Severity")}
          <select name="severity" required defaultValue={breach?.severity ?? "MEDIUM"} className={control}>
            {BREACH_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {t(SEVERITY_LABELS[s])}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          {t("Type of breach")}
          <select name="breachType" defaultValue={breach?.breachType ?? ""} className={control}>
            <option value="">{t("Not yet known")}</option>
            {Object.entries(BREACH_TYPE_LABELS).map(([key, name]) => (
              <option key={key} value={key}>
                {t(name)}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t("Happened at (center time)")}
          <input
            type="datetime-local"
            name="occurredAt"
            defaultValue={breach?.occurredAt ? centerDateTimeInput(timeZone, breach.occurredAt) : ""}
            className={control}
          />
          <span className={hint}>{t("If known: it may have happened before it was detected.")}</span>
        </label>
      </div>
      <label className={label}>
        {t("Description")}
        <textarea
          name="description"
          required
          rows={5}
          maxLength={20000}
          defaultValue={breach?.description ?? ""}
          className={control}
        />
        <span className={hint}>{t("What happened, how it was found, and what was done to contain it.")}</span>
      </label>
      <fieldset>
        <legend className={label}>{t("Affected data")}</legend>
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
              {t(name)}
            </label>
          ))}
        </div>
      </fieldset>
      {(
        [
          ["rootCause", "Root cause", "What made it possible."],
          ["containmentMeasures", "Containment measures", "What was done to stop it."],
          ["mitigationMeasures", "Mitigation measures", "What was done to limit the harm, and to prevent it happening again."],
        ] as const
      ).map(([name, title, help]) => (
        <label key={name} className={label}>
          {t(title)}
          <textarea name={name} rows={2} maxLength={20000} defaultValue={breach?.[name] ?? ""} className={control} />
          <span className={hint}>{t(help)}</span>
        </label>
      ))}
      <label className={`${label} sm:w-1/2`}>
        {t("People affected (estimate)")}
        <input
          type="number"
          name="estimatedAffected"
          min={0}
          step={1}
          defaultValue={breach?.estimatedAffected ?? ""}
          className={control}
        />
        <span className={hint}>{t("Leave empty if not known yet.")}</span>
      </label>

      {breach?.reportedToAuthority && (
        <fieldset className="space-y-4 border-t border-zinc-200 pt-4">
          <legend className="pt-4 text-sm font-semibold text-zinc-900">{t("Report to the authority")}</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={label}>
              {t("Reported at (center time)")}
              <input
                type="datetime-local"
                name="reportedAt"
                required
                defaultValue={breach.reportedAt ? centerDateTimeInput(timeZone, breach.reportedAt) : ""}
                className={control}
              />
            </label>
            <label className={label}>
              {t("Authority reference")}
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

      {breach?.customersNotified && (
        <fieldset className="space-y-4 border-t border-zinc-200 pt-4">
          <legend className="pt-4 text-sm font-semibold text-zinc-900">{t("Customer notification")}</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={label}>
              {t("Notified at (center time)")}
              <input
                type="datetime-local"
                name="customersNotifiedAt"
                required
                defaultValue={breach.customersNotifiedAt ? centerDateTimeInput(timeZone, breach.customersNotifiedAt) : ""}
                className={control}
              />
            </label>
            <label className={label}>
              {t("How")}
              <select name="customersNotifiedMethod" required defaultValue={breach.customersNotifiedMethod ?? "email"} className={control}>
                {Object.entries(NOTIFY_METHOD_LABELS).map(([key, name]) => (
                  <option key={key} value={key}>
                    {t(name)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
      )}

      {breach?.status === "RESOLVED" && (
        <fieldset className="space-y-4 border-t border-zinc-200 pt-4">
          <legend className="pt-4 text-sm font-semibold text-zinc-900">{t("Resolution")}</legend>
          <label className={`${label} sm:w-1/2`}>
            {t("Resolved at (center time)")}
            <input
              type="datetime-local"
              name="resolutionDate"
              required
              defaultValue={breach.resolutionDate ? centerDateTimeInput(timeZone, breach.resolutionDate) : ""}
              className={control}
            />
          </label>
          <label className={label}>
            {t("Resolution details")}
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
          {pending ? t("Saving…") : breach ? t("Save changes") : t("Record breach")}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} prefetch={false} scroll={false} />}>
          {t("Cancel")}
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
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<BreachFormState>(moveBreach, null);
  const copy = MOVE_COPY[to];
  return (
    <form
      onSubmit={(e) => {
        if (!window.confirm(t("Move \"{title}\" to {status}? Statuses only move forward.", { title: breach.title, status: t(BREACH_STATUS_LABELS[to]) }))) {
          e.preventDefault();
          return;
        }
        onSubmit(e);
      }}
      className="space-y-3 rounded-lg p-4 ring-1 ring-zinc-200"
    >
      <input type="hidden" name="breachId" value={breach.id} />
      <input type="hidden" name="status" value={to} />
      <p className="text-sm text-zinc-600">{t(copy.help)}</p>
      {to === "REPORTED" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={label}>
            {t("Reported at (center time)")}
            <input type="datetime-local" name="reportedAt" className={control} />
            <span className={hint}>{t("Leave empty for now.")}</span>
          </label>
          <label className={label}>
            {t("Authority reference")}
            <input name="authorityReference" maxLength={200} placeholder={t("e.g. AEPD case number")} className={control} />
          </label>
        </div>
      )}
      {to === "RESOLVED" && (
        <>
          <label className={label}>
            {t("Resolution details")}
            <textarea name="resolutionDetails" required rows={3} maxLength={20000} className={control} />
            {!breach.reportedToAuthority && (
              <span className={hint}>{t("Not reported to the authority: include why reporting was not required.")}</span>
            )}
          </label>
          <label className={`${label} sm:w-1/2`}>
            {t("Resolved at (center time)")}
            <input type="datetime-local" name="resolutionDate" className={control} />
            <span className={hint}>{t("Leave empty for now.")}</span>
          </label>
        </>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" variant={to === "RESOLVED" ? "default" : "outline"} disabled={pending}>
          {pending ? t("Saving…") : t(copy.button)}
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

// Notify customers: records that the people affected have been told of the
// breach (GDPR Art. 34), how, and when.
export function NotifyCustomersForm({ breach }: { breach: DataBreach }) {
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<BreachFormState>(notifyCustomersAction, null);
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg p-4 ring-1 ring-zinc-200">
      <input type="hidden" name="breachId" value={breach.id} />
      <p className="text-sm text-zinc-600">
        {t("Required when the breach is likely to put people at high risk: tell them what happened and what to do.")}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={label}>
          {t("How")}
          <select name="method" defaultValue="email" className={control}>
            {Object.entries(NOTIFY_METHOD_LABELS).map(([key, name]) => (
              <option key={key} value={key}>
                {t(name)}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t("Notified at (center time)")}
          <input type="datetime-local" name="notifiedAt" className={control} />
          <span className={hint}>{t("Leave empty for now.")}</span>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? t("Saving…") : t("Notify customers")}
        </Button>
        <Status state={state} />
      </div>
    </form>
  );
}

// Only while Detected: a breach logged by mistake.
export function DeleteBreachButton({ breach }: { breach: DataBreach }) {
  const t = useT();
  const [state, action, pending] = useActionState<BreachFormState, FormData>(removeBreach, null);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(t("Delete \"{title}\"? Only do this for a breach recorded by mistake.", { title: breach.title }))) e.preventDefault();
      }}
      className="flex flex-col items-start gap-1"
    >
      <input type="hidden" name="id" value={breach.id} />
      <Button type="submit" size="sm" variant="ghost" className="text-destructive" disabled={pending}>
        {pending ? t("Deleting…") : t("Delete")}
      </Button>
      <Status state={state} />
    </form>
  );
}
