"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  assignStaffAction,
  changeTripStatus,
  createDiverOnTrip,
  createTripAction,
  linkBookingAction,
  removeStaffAction,
  saveDiverEquipment,
  type TripFormState,
} from "@/app/dashboard/schedule/actions";
import { Button } from "@/components/ui/button";
import type { Boat, DiveSiteOption, Language, Staff, TimeSlot, TripDiver, TripStatus } from "@/lib/api";
import { ACTIVITY_LABELS, EQUIPMENT_ITEMS, equipmentLabel } from "@/lib/bookings";
import { LANGUAGES } from "@/lib/customers";
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

// The size a diver's profile gives for a rental item, if it is one the item
// comes in.
function profileSize(key: string, diver: TripDiver) {
  const size = { wetsuit: diver.wetsuitSize, bcd: diver.bcdSize, maskFins: diver.finsSize }[key];
  return EQUIPMENT_ITEMS.find((i) => i.key === key)?.sizes?.includes(size ?? "") ? size! : "";
}

// A diver's rental items on the trip panel, with an inline editor: the items
// and sizes for this booking, saved without leaving the trip.
export function DiverEquipment({
  bookingId,
  items,
  diver,
  editable,
}: {
  bookingId: string;
  items: string[]; // "key" or "key:size"
  diver: TripDiver;
  editable: boolean;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [state, onSubmit, pending] = useFormAction<TripFormState>(saveDiverEquipment, null);
  const chosen = new Map(items.map((i) => i.split(":") as [string, string | undefined]));
  const [ticked, setTicked] = useState(() => new Set(chosen.keys()));
  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  if (!editing) {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-zinc-600">
          {items.length > 0 ? t("Rents: {items}", { items: items.map((i) => equipmentLabel(i, t)).join(", ") }) : t("Rents nothing")}
        </span>
        {editable && (
          <Button type="button" size="xs" variant="ghost" onClick={() => setEditing(true)}>
            {t("Edit")}
          </Button>
        )}
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="mt-2 space-y-2 rounded-md bg-zinc-50 p-2 ring-1 ring-zinc-200">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {EQUIPMENT_ITEMS.map((item) => (
          <div key={item.key} className="flex items-center gap-2 text-xs">
            <label className="flex min-w-28 items-center gap-1.5 text-zinc-900">
              <input
                type="checkbox"
                name="equipment"
                value={item.key}
                checked={ticked.has(item.key)}
                onChange={(e) =>
                  setTicked((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(item.key);
                    else next.delete(item.key);
                    return next;
                  })
                }
              />
              {t(item.label)}
            </label>
            {item.sizes && (
              <select
                name={`size_${item.key}`}
                aria-label={t("{item} size", { item: t(item.label) })}
                defaultValue={chosen.get(item.key) ?? profileSize(item.key, diver)}
                disabled={!ticked.has(item.key)}
                className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs disabled:opacity-40"
              >
                <option value="">{t("Size…")}</option>
                {item.sizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="xs" disabled={pending}>
          {pending ? t("Saving…") : t("Save")}
        </Button>
        <Button type="button" size="xs" variant="ghost" onClick={() => setEditing(false)}>
          {t("Cancel")}
        </Button>
        <span className="text-xs text-zinc-500">{t("A different set is charged at today's prices.")}</span>
      </div>
      <ErrorText state={state} />
    </form>
  );
}

// Create diver: a new customer and their booking on this trip in one step.
export function CreateDiverForm({ tripId, isShore }: { tripId: string; isShore: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [state, onSubmit, pending] = useFormAction<TripFormState>(createDiverOnTrip, null);
  const [activity, setActivity] = useState(isShore ? "DISCOVER_SCUBA" : "FUN_DIVE");
  const [waiver, setWaiver] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state?.ok) return;
    formRef.current?.reset();
    setWaiver(false);
    setAcknowledged(false);
    setOpen(false);
  }, [state]);
  const diving = activity !== "SNORKELING";
  const checked = !diving || waiver || acknowledged;

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          + {t("Create diver")}
        </Button>
        {state?.ok && <span className="text-xs text-green-700">{t("Diver added to the trip.")}</span>}
      </div>
    );
  }
  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3 rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200">
      <input type="hidden" name="tripId" value={tripId} />
      <p className="text-sm font-medium text-zinc-900">{t("New customer, booked on this trip")}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-xs font-medium text-zinc-700">
          {t("First name")}
          <input name="firstName" required maxLength={100} className={control} />
        </label>
        <label className="text-xs font-medium text-zinc-700">
          {t("Last name")}
          <input name="lastName" required maxLength={100} className={control} />
        </label>
        <label className="text-xs font-medium text-zinc-700">
          {t("Email")}
          <input type="email" name="email" required maxLength={254} className={control} />
        </label>
        <label className="text-xs font-medium text-zinc-700">
          {t("Phone (optional)")}
          <input type="tel" name="phone" maxLength={40} className={control} />
        </label>
        <label className="text-xs font-medium text-zinc-700">
          {t("Country code")}
          <input name="country" required maxLength={60} placeholder="ES, DE, GB…" className={control} />
        </label>
        <label className="text-xs font-medium text-zinc-700">
          {t("Language")}
          <select name="language" defaultValue={"EN" satisfies Language} className={control}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {t(l.label)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-zinc-700">
          {t("Activity")}
          <select name="activityType" value={activity} onChange={(e) => setActivity(e.target.value)} className={control}>
            {Object.entries(ACTIVITY_LABELS).map(([value, text]) => (
              <option key={value} value={value}>
                {t(text)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-zinc-700">
          {t("Number of dives")}
          <input type="number" name="numberOfDives" required min={1} max={20} step={1} defaultValue={1} className={control} />
        </label>
      </div>
      {diving && (
        <div className="space-y-2 rounded-md bg-amber-50 p-2 text-xs text-amber-950 ring-1 ring-amber-300">
          <p className="font-medium">{t("Insurance check: a new customer's first dive, with no insurance on file.")}</p>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="waiverSigned" checked={waiver} onChange={(e) => setWaiver(e.target.checked)} />
            {t("Waiver signed")}
          </label>
          {!waiver && (
            <>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="insuranceAcknowledged"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                />
                {t("I understand: dive insurance must be added to the stay before they dive")}
              </label>
              <label className="block font-medium">
                {t("Planned stay length (days)")}
                <input
                  type="number"
                  name="plannedStayDays"
                  min={1}
                  max={3660}
                  step={1}
                  className="mt-1 block w-24 rounded-md border border-amber-300 bg-white px-2 py-1 text-xs"
                />
              </label>
            </>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={pending || !checked}>
          {pending ? t("Saving…") : t("Create and add to trip")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {t("Cancel")}
        </Button>
      </div>
      <ErrorText state={state} />
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
