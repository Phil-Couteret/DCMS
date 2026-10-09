"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  assignStaffAction,
  changeTripStatus,
  createTripAction,
  linkBookingAction,
  removeStaffAction,
  type TripFormState,
} from "@/app/dashboard/schedule/actions";
import { Button } from "@/components/ui/button";
import type { Boat, DiveSiteOption, Staff, TimeSlot, TripStatus } from "@/lib/api";
import { useT } from "@/lib/i18n/client";
import { useFormAction } from "@/lib/use-form-action";
import { SHORE_START_TIMES, shoreSession, ROLE_LABELS, SLOT_NAMES, TRIP_ROLES, TRIP_SLOTS, TRIP_TRANSITIONS } from "@/lib/trips";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

function ErrorText({ state, className = "" }: { state: TripFormState; className?: string }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className={`text-xs text-destructive ${className}`}>
      {state.error}
    </p>
  );
}

// startIssues: what stops the trip from starting. When given and non-empty,
// "Start trip" is shown disabled; the API still enforces it.
export function TripStatusActions({
  tripId,
  status,
  startIssues,
}: {
  tripId: string;
  status: TripStatus;
  startIssues?: string[];
}) {
  const [state, action, pending] = useActionState<TripFormState, FormData>(changeTripStatus, null);
  const tr = useT();
  const transitions = TRIP_TRANSITIONS[status];
  if (transitions.length === 0) return null;
  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="tripId" value={tripId} />
      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => {
          const notReady = t.to === "ACTIVE" && (startIssues?.length ?? 0) > 0;
          return (
            <Button
              key={t.to}
              type="submit"
              name="status"
              value={t.to}
              size="sm"
              variant={t.to === "CANCELLED" ? "outline" : "default"}
              disabled={pending || notReady}
              title={notReady ? tr("Not ready: {issues}", { issues: startIssues!.join("; ") }) : undefined}
              className={
                notReady
                  ? "disabled:pointer-events-auto disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 disabled:opacity-100"
                  : undefined
              }
            >
              {tr(t.label)}
            </Button>
          );
        })}
      </div>
      <ErrorText state={state} />
    </form>
  );
}

export function AssignStaffForm({ tripId, staff }: { tripId: string; staff: Staff[] }) {
  const [state, onSubmit, pending] = useFormAction<TripFormState>(assignStaffAction, null);
  const t = useT();
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  if (staff.length === 0) {
    return <p className="text-sm text-zinc-500">{t("Every active staff member is already on this trip.")}</p>;
  }
  return (
    <form ref={form} onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="tripId" value={tripId} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <label className="block text-sm font-medium text-zinc-700">
          {t("Staff member")}
          <select name="staffId" required defaultValue="" className={control}>
            <option value="" disabled>
              {t("Choose…")}
            </option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          {t("Role")}
          <select name="role" defaultValue="GUIDE" className={control}>
            {TRIP_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(ROLE_LABELS[r])}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? t("Adding…") : t("Add")}
        </Button>
      </div>
      <ErrorText state={state} />
    </form>
  );
}

export function RemoveStaffButton({ tripId, staffId, name }: { tripId: string; staffId: string; name: string }) {
  const [state, action, pending] = useActionState<TripFormState, FormData>(removeStaffAction, null);
  const t = useT();
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="staffId" value={staffId} />
      <Button type="submit" size="xs" variant="ghost" disabled={pending} aria-label={t("Remove {name}", { name })}>
        {pending ? t("Removing…") : t("Remove")}
      </Button>
      <ErrorText state={state} className="text-right" />
    </form>
  );
}

export function LinkBookingButton({ tripId, bookingId }: { tripId: string; bookingId: string }) {
  const [state, action, pending] = useActionState<TripFormState, FormData>(linkBookingAction, null);
  const t = useT();
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <Button type="submit" size="xs" variant="outline" disabled={pending}>
        {pending ? t("Adding…") : t("Add to trip")}
      </Button>
      <ErrorText state={state} className="max-w-48 text-right" />
    </form>
  );
}

export function NewTripForm({
  date,
  boats,
  sites,
  tripHrefPrefix,
}: {
  date: string;
  boats: Boat[];
  sites: (DiveSiteOption & { isShore?: boolean })[];
  // The schedule URL the new trip's id is appended to, to open its panel.
  tripHrefPrefix: string;
}) {
  const router = useRouter();
  const [state, onSubmit, pending] = useFormAction<TripFormState>(createTripAction, null);
  const t = useT();
  const [kind, setKind] = useState<"boat" | "shore">("boat");
  const [timeSlot, setTimeSlot] = useState<TimeSlot>("MORNING");
  const shoreSites = sites.filter((s) => s.isShore);
  useEffect(() => {
    if (state?.tripId) router.push(`${tripHrefPrefix}${state.tripId}`, { scroll: false });
  }, [state, router, tripHrefPrefix]);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-zinc-700">
          {t("Date")}
          <input type="date" name="date" required defaultValue={date} className={control} />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          {t("Time slot")}
          <select name="timeSlot" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value as TimeSlot)} className={control}>
            {TRIP_SLOTS.map((s) => (
              <option key={s} value={s}>
                {t(SLOT_NAMES[s])}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium text-zinc-700">{t("Where")}</legend>
          <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
            {(
              [
                ["boat", t("Boat trip")],
                ["shore", t("Shore (beach, harbour or pool; no boat)")],
              ] as const
            ).map(([value, text]) => (
              <label key={value} className="flex items-center gap-2 text-sm text-zinc-800">
                <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} className="size-4" />
                {text}
              </label>
            ))}
          </div>
        </fieldset>
        {kind === "boat" ? (
          <>
            <label className="block text-sm font-medium text-zinc-700">
              {t("Boat")}
              <select name="boatId" required defaultValue="" className={control}>
                <option value="" disabled>
                  {t("Choose…")}
                </option>
                {boats.map((b) => (
                  <option key={b.id} value={b.id}>
                    {t("{boat} ({count} places)", { boat: b.name, count: b.capacity })}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              {t("Planned site")}
              <select name="plannedSiteId" defaultValue="" className={control}>
                <option value="">{t("Not decided")}</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameEn}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <label className="block text-sm font-medium text-zinc-700">
              {t("Shore session")}
              <select name="startTime" required key={timeSlot} defaultValue="" className={control}>
                <option value="" disabled>
                  {t("Choose…")}
                </option>
                {SHORE_START_TIMES[timeSlot].map((time) => (
                  <option key={time} value={time}>
                    {shoreSession(time)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              {t("Shore dive site")}
              {shoreSites.length === 0 ? (
                <span role="alert" className="mt-1 block text-sm font-normal text-red-700">
                  {t("No shore dive site yet: mark one as a shore site in Settings → Dive Sites.")}
                </span>
              ) : (
                <select name="plannedSiteId" required defaultValue={shoreSites[0].id} className={control}>
                  {shoreSites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameEn}
                    </option>
                  ))}
                </select>
              )}
            </label>
          </>
        )}
        <label className="block text-sm font-medium text-zinc-700">
          {t("Max divers")}
          <input type="number" name="maxDivers" min={1} step={1} required defaultValue={10} className={control} />
        </label>
      </div>
      <label className="block text-sm font-medium text-zinc-700">
        {t("Notes (optional)")}
        <textarea name="notes" rows={3} maxLength={1000} className={control} />
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("Creating…") : t("Create trip")}
        </Button>
        <ErrorText state={state} className="text-sm" />
      </div>
    </form>
  );
}
